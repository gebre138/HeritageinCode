import express, { Request, Response, Router } from "express";
import { createClient } from "@supabase/supabase-js";
import multer from "multer";
import axios from "axios";
import FormData from "form-data";

const router: Router = express.Router();
const supabase = createClient(process.env.SUPABASE_URL || "", process.env.SUPABASE_SERVICE_ROLE_KEY || "");
const upload = multer({ storage: multer.memoryStorage() });

const FUSION_MODEL_URL = process.env.FUSION_MODEL_URL;

router.get("/", async (req: Request, res: Response) => {
  try {
    const { data, error } = await supabase.from("moderntrack").select("*");
    if (error) throw error;
    res.status(200).json(data || []);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/jamendo", async (req: Request, res: Response) => {
  try {
    const { data, error } = await supabase
      .from("moderntrack")
      .select("*")
      .eq("category", "jamendo");
    if (error) throw error;
    res.status(200).json(data || []);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/repository", async (req: Request, res: Response) => {
  try {
    const { data, error } = await supabase
      .from("moderntrack")
      .select("*")
      .eq("isapproved", true);
    if (error) throw error;
    res.status(200).json(data || []);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.patch("/approve-track/:id", async (req: Request, res: Response) => {
  try {
    const { error } = await supabase
      .from("moderntrack")
      .update({ isapproved: true })
      .eq("sound_id", req.params.id);
    if (error) throw error;
    res.status(200).json({ message: "Track approved" });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.patch("/unapprove-track/:id", async (req: Request, res: Response) => {
  try {
    const { error } = await supabase
      .from("moderntrack")
      .update({ isapproved: false })
      .eq("sound_id", req.params.id);
    if (error) throw error;
    res.status(200).json({ message: "Track moved to pending" });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.delete("/delete-track/:id", async (req: Request, res: Response) => {
  try {
    const { error } = await supabase
      .from("moderntrack")
      .delete()
      .eq("sound_id", req.params.id);
    if (error) throw error;
    res.status(200).json({ message: "Track deleted" });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/upload", upload.single("modernaudio"), async (req: Request, res: Response) => {
  try {
    const { 
      category, 
      country, 
      isapproved, 
      rhythm_style, 
      harmony_type, 
      bpm, 
      mood 
    } = req.body;
    
    const file = req.file;
    if (!file) return res.status(400).json({ message: "Audio file required" });
    
    const fileExt = file.originalname.split(".").pop();
    const fileName = `${Date.now()}.${fileExt}`;
    const filePath = `uploads/${fileName}`;
    
    const { error: uploadError } = await supabase.storage
      .from("moderntracks")
      .upload(filePath, file.buffer, { contentType: file.mimetype, upsert: true });
      
    if (uploadError) throw uploadError;
    
    const { data: urlData } = supabase.storage.from("moderntracks").getPublicUrl(filePath);
    
    const { error: dbError } = await supabase.from("moderntrack").insert([{
      category,
      country,
      rhythm_style,
      harmony_type,
      bpm,
      mood,
      modernaudio_url: urlData.publicUrl,
      isapproved: isapproved === "true"
    }]);
    
    if (dbError) throw dbError;
    res.status(201).json({ message: "Track uploaded successfully" });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

router.put("/:id", upload.single("modernaudio"), async (req: Request, res: Response) => {
  try {
    const { 
      category, 
      country, 
      isapproved, 
      rhythm_style, 
      harmony_type, 
      bpm, 
      mood 
    } = req.body;
    
    let updateData: any = { 
      category, 
      country, 
      isapproved: isapproved === "true",
      rhythm_style,
      harmony_type,
      bpm,
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
    res.status(200).json({ message: "Update successful" });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

router.post("/ai-fusion", upload.fields([{ name: "melody" }, { name: "style" }]), async (req: Request, res: Response) => {
  try {
    const files = req.files as { [fieldname: string]: Express.Multer.File[] };
    const { description } = req.body;

    if (!files.melody) return res.status(400).json({ error: "Melody track is required" });
    
    const formData = new FormData();
    formData.append("melody", files.melody[0].buffer, { 
      filename: files.melody[0].originalname,
      contentType: files.melody[0].mimetype 
    });

    if (files.style) {
      formData.append("style", files.style[0].buffer, { 
        filename: files.style[0].originalname,
        contentType: files.style[0].mimetype 
      });
    } else if (description) {
      formData.append("description", description);
    } else {
      return res.status(400).json({ error: "Provide either a style track or a text description" });
    }

    const response = await axios.post(`${FUSION_MODEL_URL}/fuse`, formData, {
      headers: { 
        ...formData.getHeaders(),
        "Accept": "audio/wav"
      },
      responseType: "arraybuffer",
      maxContentLength: Infinity,
      maxBodyLength: Infinity,
      timeout: 600000 
    });

    res.set("Content-Type", "audio/wav");
    res.set("Content-Disposition", "attachment; filename=fused_track.wav");
    res.send(Buffer.from(response.data));
  } catch (err: any) {
    console.error("AI Fusion Error:", err.response?.data?.toString() || err.message);
    res.status(500).json({ error: "FusionModel failed: " + (err.response?.data?.toString() || err.message) });
  }
});

export default router;