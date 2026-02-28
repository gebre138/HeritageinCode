import express, { Request, Response, Router } from "express";
import { createClient } from "@supabase/supabase-js";
import multer from "multer";

const router: Router = express.Router();
const supabase = createClient(process.env.SUPABASE_URL || "", process.env.SUPABASE_SERVICE_ROLE_KEY || "");
const upload = multer({ storage: multer.memoryStorage() });

router.get("/", async (req: Request, res: Response) => {
  try {
    const { data, error } = await supabase.from("moderntrack").select("*");
    if (error) throw error;
    res.status(200).json(data || []);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/repository", async (req: Request, res: Response) => {
  try {
    const { data, error } = await supabase.from("moderntrack").select("*").eq("isapproved", true);
    if (error) throw error;
    res.status(200).json(data || []);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.patch("/approve-track/:id", async (req: Request, res: Response) => {
  try {
    const { error } = await supabase.from("moderntrack").update({ isapproved: true }).eq("sound_id", req.params.id);
    if (error) throw error;
    res.status(200).json({ message: "track approved" });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.patch("/unapprove-track/:id", async (req: Request, res: Response) => {
  try {
    const { error } = await supabase.from("moderntrack").update({ isapproved: false }).eq("sound_id", req.params.id);
    if (error) throw error;
    res.status(200).json({ message: "track moved to pending" });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.delete("/delete-track/:id", async (req: Request, res: Response) => {
  try {
    const { error } = await supabase.from("moderntrack").delete().eq("sound_id", req.params.id);
    if (error) throw error;
    res.status(200).json({ message: "track deleted" });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/upload", upload.single("modernaudio"), async (req: Request, res: Response) => {
  try {
    const { category, isapproved, rhythm_style, bpm, mood } = req.body;
    const file = req.file;
    if (!category || !rhythm_style || !bpm || !mood) {
      return res.status(400).json({ message: "all fields are required" });
    }
    if (!file) return res.status(400).json({ message: "audio file required" });
    const fileExt = file.originalname.split(".").pop();
    const fileName = `${Date.now()}.${fileExt}`;
    const filePath = `uploads/${fileName}`;
    const { error: uploadError } = await supabase.storage.from("moderntracks").upload(filePath, file.buffer, { contentType: file.mimetype, upsert: true });
    if (uploadError) throw uploadError;
    const { data: urlData } = supabase.storage.from("moderntracks").getPublicUrl(filePath);
    const { error: dbError } = await supabase.from("moderntrack").insert([{ 
      category, 
      rhythm_style, 
      bpm: parseInt(String(bpm)) || 0, 
      mood, 
      modernaudio_url: urlData.publicUrl, 
      isapproved: isapproved === "true" 
    }]);
    if (dbError) throw dbError;
    res.status(201).json({ message: "track uploaded successfully" });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

router.put("/:id", upload.single("modernaudio"), async (req: Request, res: Response) => {
  try {
    const { category, isapproved, rhythm_style, bpm, mood } = req.body;
    let updateData: any = { 
      category, 
      isapproved: isapproved === "true", 
      rhythm_style, 
      bpm: parseInt(String(bpm)) || 0, 
      mood 
    };
    if (req.file) {
      const fileExt = req.file.originalname.split(".").pop();
      const fileName = `${Date.now()}.${fileExt}`;
      const filePath = `uploads/${fileName}`;
      await supabase.storage.from("moderntracks").upload(filePath, req.file.buffer, { contentType: req.file.mimetype });
      const { data: urlData } = supabase.storage.from("moderntracks").getPublicUrl(filePath);
      updateData.modernaudio_url = urlData.publicUrl;
    }
    const { error } = await supabase.from("moderntrack").update(updateData).eq("sound_id", req.params.id);
    if (error) throw error;
    res.status(200).json({ message: "update successful" });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;