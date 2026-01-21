import express, { Request, Response, Router } from "express";
import { createClient } from "@supabase/supabase-js";
import multer from "multer";
import axios from "axios";
import FormData from "form-data";
import http from "http";
import https from "https";

const router: Router = express.Router();
const supabase = createClient(process.env.SUPABASE_URL || "", process.env.SUPABASE_SERVICE_ROLE_KEY || "");
const upload = multer({ storage: multer.memoryStorage() });

const HF_URL: string = process.env.FUSION_HF_URL || "";
const COLAB_URL: string | undefined = process.env.FUSION_COLAB_URL;

const httpAgent = new http.Agent({ keepAlive: true });
const httpsAgent = new https.Agent({ keepAlive: true });

async function getActiveFusionUrl(): Promise<string> {
  if (COLAB_URL && COLAB_URL.includes("ngrok")) {
    try {
      const check = await axios.get(COLAB_URL, { 
        timeout: 3000, 
        httpAgent, 
        httpsAgent,
        headers: { "ngrok-skip-browser-warning": "69420" },
        validateStatus: (status) => status < 500
      });
      
      const responseData = check.data ? check.data.toString() : "";
      if (responseData.includes("ERR_NGROK_3200") || responseData.includes("tunnel is offline")) {
        console.log("Colab is offline. Falling back to HF.");
        return HF_URL;
      }
      
      console.log("Colab is ACTIVE.");
      return COLAB_URL;
    } catch (e: any) {
      console.log("Colab check failed. Falling back to HF.");
      return HF_URL;
    }
  }
  return HF_URL;
}

router.get("/status", async (req: Request, res: Response) => {
  try {
    const activeUrl = await getActiveFusionUrl();
    res.status(200).json({ 
      online: true, 
      provider: activeUrl.includes("ngrok") ? "colab" : "huggingface" 
    });
  } catch (err) {
    res.status(500).json({ online: false });
  }
});

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
    const activeBaseUrl = await getActiveFusionUrl();
    const cleanBaseUrl = activeBaseUrl.replace(/\/$/, "");
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
    const response = await axios.post(`${cleanBaseUrl}/fuse`, formData, {
      headers: { 
        ...formData.getHeaders(),
        "Accept": "audio/wav",
        "ngrok-skip-browser-warning": "69420"
      },
      responseType: "arraybuffer",
      maxContentLength: Infinity,
      maxBodyLength: Infinity,
      timeout: 900000,
      httpAgent,
      httpsAgent
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