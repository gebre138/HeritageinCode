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

const httpAgent = new http.Agent({ keepAlive: true });
const httpsAgent = new https.Agent({ keepAlive: true });

router.get("/engines-health", async (req: Request, res: Response) => {
  const colabUrl = process.env.FUSION_COLAB_URL;
  const hfUrl = process.env.FUSION_HF_URL;
  const results = { colab: false, hf: false };
  
  try {
    if (colabUrl) {
      const cleanUrl = colabUrl.replace(/\/$/, "");
      await axios.get(`${cleanUrl}/health`, { timeout: 5000 });
      results.colab = true;
    }
  } catch (e) {
    try {
      if (colabUrl) {
        await axios.get(colabUrl.replace(/\/$/, ""), { timeout: 5000 });
        results.colab = true;
      }
    } catch (inner) {
      console.warn(">>> Status check: colab offline");
    }
  }

  try {
    if (hfUrl) {
      const cleanUrl = hfUrl.replace(/\/$/, "");
      await axios.get(`${cleanUrl}/health`, { timeout: 5000 });
      results.hf = true;
    }
  } catch (e) {
    try {
      if (hfUrl) {
        await axios.get(hfUrl.replace(/\/$/, ""), { timeout: 5000 });
        results.hf = true;
      }
    } catch (inner) {
      console.warn(">>> Status check: hf offline");
    }
  }
  
  res.json(results);
});

router.post("/process", upload.any(), async (req: Request, res: Response) => {
  const files = req.files as Express.Multer.File[];
  const melodyFile = files.find(f => f.fieldname === "melody");
  const styleFile = files.find(f => f.fieldname === "style");
  if (!melodyFile || !styleFile) return res.status(400).json({ error: "missing files" });
  const colabUrl = process.env.FUSION_COLAB_URL;
  const hfUrl = process.env.FUSION_HF_URL;
  const engines = [];
  if (colabUrl) engines.push({ name: "colab", url: colabUrl });
  if (hfUrl) engines.push({ name: "huggingface", url: hfUrl });
  for (const engine of engines) {
    try {
      const targetUrl = engine.url.replace(/\/$/, "");
      console.log(`>>> trying engine priority: ${engine.name} at ${targetUrl}`);
      const engineForm = new FormData();
      engineForm.append("melody", melodyFile.buffer, { filename: "m.wav", contentType: "audio/wav" });
      engineForm.append("style", styleFile.buffer, { filename: "s.wav", contentType: "audio/wav" });
      const response = await axios.post(`${targetUrl}/fuse`, engineForm, {
        headers: { 
          ...engineForm.getHeaders(), 
          "User-Agent": "Mozilla/5.0"
        },
        responseType: "arraybuffer",
        timeout: 600000, 
        maxContentLength: Infinity,
        maxBodyLength: Infinity,
        httpAgent,
        httpsAgent
      });
      console.log(`>>> success using ${engine.name}`);
      res.set({ "Content-Type": "audio/wav", "x-engine": engine.name });
      return res.send(Buffer.from(response.data));
    } catch (err: any) {
      console.warn(`>>> ${engine.name} engine failed or offline, checking next...`);
    }
  }
  res.status(503).json({ error: "all fusion engines (colab & hf) are offline" });
});

router.get("/check", async (req: Request, res: Response) => {
  try {
    const { sound_id, modern_sound } = req.query;
    const { data } = await supabase.from("fused_tracks").select("fusedtrack_url").eq("sound_id", String(sound_id)).eq("modern_sound", String(modern_sound)).limit(1);
    res.json({ fused_url: data && data.length > 0 ? data[0].fusedtrack_url : null });
  } catch (err) {
    res.status(500).json({ error: "check failed" });
  }
});

router.post("/save", upload.single("audio"), async (req: Request, res: Response) => {
  try {
    const { sound_id, modern_sound, heritage_sound, community, user_mail } = req.body;
    const path = `fused_${Date.now()}.wav`;
    await supabase.storage.from("fused_results").upload(path, req.file!.buffer, { contentType: "audio/wav" });
    const { data: { publicUrl } } = supabase.storage.from("fused_results").getPublicUrl(path);
    await supabase.from("fused_tracks").insert([{
      sound_id: String(sound_id),
      heritage_sound,
      modern_sound,
      user_mail: user_mail || "system",
      fusedtrack_url: publicUrl,
      community
    }]);
    res.status(201).json({ url: publicUrl });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;