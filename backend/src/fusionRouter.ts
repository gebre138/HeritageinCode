import express, { Request, Response, Router } from "express";
import { createClient } from "@supabase/supabase-js";
import multer from "multer";
import axios from "axios";
import FormData from "form-data";
import http from "http";
import https from "https";
import { exec } from "child_process";
import fs from "fs";
import path from "path";
import os from "os";
import { v4 as uuidv4 } from "uuid";

const router: Router = express.Router();
const supabase = createClient(process.env.SUPABASE_URL || "", process.env.SUPABASE_SERVICE_ROLE_KEY || "");
const upload = multer({ storage: multer.memoryStorage() });

const httpAgent = new http.Agent({ keepAlive: true });
const httpsAgent = new https.Agent({ keepAlive: true });

async function getFingerprintFromBuffer(buffer: Buffer): Promise<number[]> {
  const tempPath = path.join(os.tmpdir(), `fp_${uuidv4()}.wav`);
  try {
    fs.writeFileSync(tempPath, buffer);
    return await new Promise((resolve, reject) => {
      exec(`fpcalc -raw "${tempPath}"`, (err, stdout) => {
        if (fs.existsSync(tempPath)) try { fs.unlinkSync(tempPath); } catch (e) {}
        const match = stdout.match(/FINGERPRINT=(.+)/);
        if (match) return resolve(match[1].split(",").map(Number));
        reject(new Error("fingerprint generation failed."));
      });
    });
  } catch (error: any) {
    if (fs.existsSync(tempPath)) try { fs.unlinkSync(tempPath); } catch (e) {}
    throw error;
  }
}

router.get("/engines-health", async (req: Request, res: Response) => {
  const colabUrl = process.env.FUSION_COLAB_URL;
  const hfUrl = process.env.FUSION_HF_URL;
  const results = { colab: false, hf: false };
  try {
    if (colabUrl) {
      const cleanUrl = colabUrl.replace(/\/$/, "");
      await axios.get(`${cleanUrl}/health`, { timeout: 8000 });
      results.colab = true;
    }
  } catch (e) {}
  try {
    if (hfUrl) {
      await axios.get(`${hfUrl.replace(/\/$/, "")}/`, { 
        timeout: 12000,
        headers: { "x-wait-for-model": "true", "User-Agent": "Mozilla/5.0" }
      });
      results.hf = true;
    }
  } catch (e) {}
  res.json(results);
});

router.get("/history", async (req: Request, res: Response) => {
  try {
    const { data, error } = await supabase.from("fused_tracks").select("*").order("id", { ascending: false });
    if (error) throw error;
    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.delete("/delete/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { error } = await supabase.from("fused_tracks").delete().eq("id", id);
    if (error) throw error;
    res.status(200).json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/process", upload.any(), async (req: Request, res: Response) => {
  const files = req.files as Express.Multer.File[];
  const melodyFile = files.find(f => f.fieldname === "melody");
  const styleFile = files.find(f => f.fieldname === "style");

  const { gate, clarity, strength, temp, mode } = req.body;

  if (!melodyFile || !styleFile) return res.status(400).json({ error: "missing files" });
  
  const colabUrl = process.env.FUSION_COLAB_URL;
  const hfUrl = process.env.FUSION_HF_URL;
  const engines = [];
  if (colabUrl) engines.push({ name: "colab", url: colabUrl });
  if (hfUrl) engines.push({ name: "huggingface", url: hfUrl });
  
  for (const engine of engines) {
    try {
      const targetUrl = engine.url.replace(/\/$/, "");
      const engineForm = new FormData();
      engineForm.append("melody", melodyFile.buffer, { filename: "m.wav", contentType: "audio/wav" });
      engineForm.append("style", styleFile.buffer, { filename: "s.wav", contentType: "audio/wav" });
      
      if (gate !== undefined) engineForm.append("gate", String(gate));
      if (clarity !== undefined) engineForm.append("clarity", String(clarity));
      if (strength !== undefined) engineForm.append("strength", String(strength));
      if (temp !== undefined) engineForm.append("temp", String(temp));
      if (mode !== undefined) engineForm.append("mode", String(mode));

      const response = await axios.post(`${targetUrl}/fuse`, engineForm, {
        headers: { ...engineForm.getHeaders(), "User-Agent": "Mozilla/5.0", "x-wait-for-model": "true" },
        responseType: "arraybuffer",
        timeout: 0, 
        maxContentLength: Infinity,
        maxBodyLength: Infinity,
        httpAgent,
        httpsAgent
      });

      res.set({ 
        "Content-Type": "audio/wav", 
        "x-engine": engine.name,
        "x-sent-gate": String(gate),
        "x-sent-strength": String(strength)
      });

      return res.send(Buffer.from(response.data));
    } catch (err: any) {
      if (engine.name === "huggingface" && err.response?.status === 503) return res.status(503).json({ error: "hf booting" });
    }
  }
  res.status(503).json({ error: "engines offline" });
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
    const { sound_id, modern_sound, heritage_sound, community, user_mail, gate, clarity, strength, temp } = req.body;
    if (!req.file) return res.status(400).json({ error: "no audio" });
    
    const fingerprintData = await getFingerprintFromBuffer(req.file.buffer);
    
    const filePath = `fused_${Date.now()}.wav`;
    await supabase.storage.from("fused_results").upload(filePath, req.file.buffer, { contentType: "audio/wav" });
    const { data: { publicUrl } } = supabase.storage.from("fused_results").getPublicUrl(filePath);
    
    await supabase.from("fused_tracks").insert([{
      sound_id: String(sound_id),
      heritage_sound,
      modern_sound,
      user_mail: user_mail || "system",
      fusedtrack_url: publicUrl,
      community,
      gate: gate ? Number(gate) : null,
      clarity: clarity ? Number(clarity) : null,
      strength: strength ? Number(strength) : null,
      temp: temp ? Number(temp) : null
    }]);

    await supabase.from("fusion_audiofingerprint").insert([{
      sound_id: String(sound_id),
      fingerprint_data: fingerprintData
    }]);

    const { data: currentTrack } = await supabase.from("tracks").select("fusion_count").eq("sound_id", String(sound_id)).single();
    const newCount = (currentTrack?.fusion_count || 0) + 1;
    await supabase.from("tracks").update({ fusion_count: newCount }).eq("sound_id", String(sound_id));
    
    res.status(201).json({ url: publicUrl });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;