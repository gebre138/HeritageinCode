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

const COLAB_URL = process.env.FUSION_COLAB_URL;
const HF_URL = process.env.FUSION_HF_URL || "";

const httpAgent = new http.Agent({ keepAlive: true });
const httpsAgent = new https.Agent({ keepAlive: true });

router.get("/history", async (req: Request, res: Response) => {
  try {
    const { data, error } = await supabase.from("fused_tracks").select("*");
    if (error) throw error;
    res.json(data || []);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/check", async (req: Request, res: Response) => {
  try {
    const { sound_id, modern_sound, user_mail } = req.query;
    if (!sound_id || !modern_sound || !user_mail) {
      return res.status(400).json({ error: "missing query parameters" });
    }
    const { data, error } = await supabase
      .from("fused_tracks")
      .select("fusedtrack_url")
      .eq("sound_id", String(sound_id))
      .eq("modern_sound", String(modern_sound))
      .eq("user_mail", String(user_mail))
      .maybeSingle();

    if (error) throw error;
    res.json({ fused_url: data?.fusedtrack_url || null });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/process", upload.any(), async (req: Request, res: Response) => {
  console.log("fusion request received from frontend");
  const files = req.files as Express.Multer.File[];
  const melodyFile = files.find(f => f.fieldname === "melody");
  const styleFile = files.find(f => f.fieldname === "style");
  
  if (!melodyFile || !styleFile) {
    return res.status(400).json({ error: "missing files" });
  }

  const engines = [
    { name: "colab", url: COLAB_URL },
    { name: "huggingface", url: HF_URL }
  ].filter(e => e.url);

  for (const engine of engines) {
    try {
      console.log(`attempting fusion with ${engine.name}: ${engine.url}/fuse`);

      const engineForm = new FormData();
      engineForm.append("melody", melodyFile.buffer, { filename: "m.wav" });
      engineForm.append("style", styleFile.buffer, { filename: "s.wav" });
      engineForm.append("gate", String(req.body.gate || "-45"));
      engineForm.append("clarity", String(req.body.clarity || "1.0"));
      engineForm.append("mode", String(req.body.mode || "balanced"));

      const response = await axios.post(`${engine.url!.replace(/\/$/, "")}/fuse`, engineForm, {
        headers: { 
          ...engineForm.getHeaders(), 
          "ngrok-skip-browser-warning": "69420",
          "User-Agent": "Mozilla/5.0"
        },
        responseType: "arraybuffer",
        timeout: 900000,
        maxContentLength: Infinity,
        maxBodyLength: Infinity,
        httpAgent,
        httpsAgent
      });

      console.log(`${engine.name} processing complete`);

      res.set({
        "Content-Type": "audio/wav",
        "x-harmonic-percent": response.headers["x-harmonic-percent"] || "0",
        "x-percussive-percent": response.headers["x-percussive-percent"] || "0",
        "x-analysis-label": response.headers["x-analysis-label"] || "processed",
        "Access-Control-Expose-Headers": "*"
      });

      return res.send(Buffer.from(response.data));
    } catch (err: any) {
      console.error(`${engine.name} failed:`, err.message);
    }
  }

  res.status(500).json({ error: "all fusion engines (colab and hf) failed" });
});

router.post("/save", upload.single("audio"), async (req: Request, res: Response) => {
  try {
    if (!req.file) throw new Error("no audio data");
    const path = `fused_${Date.now()}.wav`;
    const { error: upErr } = await supabase.storage.from("fused_results").upload(path, req.file.buffer, { contentType: "audio/wav" });
    if (upErr) throw upErr;
    const { data: { publicUrl } } = supabase.storage.from("fused_results").getPublicUrl(path);
    const { error: dbErr } = await supabase.from("fused_tracks").insert([{
      sound_id: String(req.body.sound_id),
      heritage_sound: req.body.heritage_sound,
      modern_sound: req.body.modern_sound,
      style: req.body.style || "balanced",
      user_mail: req.body.user_mail,
      fusedtrack_url: publicUrl,
      contributor_email: req.body.user_mail,
      community: req.body.community
    }]);
    if (dbErr) throw dbErr;
    res.status(201).json({ url: publicUrl });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.delete("/delete/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { data: track, error: fetchError } = await supabase.from("fused_tracks").select("fusedtrack_url").eq("id", id).maybeSingle();
    if (fetchError) throw fetchError;
    if (!track) return res.status(404).json({ error: "track not found" });
    if (track.fusedtrack_url) {
      const fileName = track.fusedtrack_url.split("/").pop();
      if (fileName) await supabase.storage.from("fused_results").remove([fileName]);
    }
    const { error: deleteError } = await supabase.from("fused_tracks").delete().eq("id", id);
    if (deleteError) throw deleteError;
    res.json({ message: "deleted successfully" });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;