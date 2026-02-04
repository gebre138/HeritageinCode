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

const supabaseUrl = process.env.SUPABASE_URL || "";
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const supabase = createClient(supabaseUrl, supabaseKey);

const upload = multer({ storage: multer.memoryStorage() });

const HF_URL: string = process.env.FUSION_HF_URL || "";
const COLAB_URL: string | undefined = process.env.FUSION_COLAB_URL;

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
      if (responseData.includes("ERR_NGROK_3200") || responseData.includes("tunnel is offline")) return HF_URL;
      return COLAB_URL;
    } catch (e: any) {
      return HF_URL;
    }
  }
  return HF_URL;
}

router.get("/status", async (req: Request, res: Response) => {
  try {
    const activeUrl = await getActiveFusionUrl();
    res.status(200).json({ online: true, provider: activeUrl.includes("ngrok") ? "colab" : "huggingface" });
  } catch (err) {
    res.status(500).json({ online: false });
  }
});

router.get("/history", async (req: Request, res: Response) => {
  try {
    const { data, error } = await supabase
      .from("fused_tracks")
      .select("*");
    if (error) return res.status(500).json({ error: error.message });
    res.status(200).json(data || []);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/process", upload.fields([{ name: "melody" }, { name: "style" }]), async (req: Request, res: Response) => {
  try {
    const files = req.files as { [fieldname: string]: Express.Multer.File[] };
    const { description } = req.body;
    if (!files.melody) return res.status(400).json({ error: "melody track is required" });
    const activeBaseUrl = await getActiveFusionUrl();
    const cleanBaseUrl = activeBaseUrl.replace(/\/$/, "");
    const formData = new FormData();
    formData.append("melody", files.melody[0].buffer, { filename: "melody.wav", contentType: files.melody[0].mimetype });
    if (files.style) {
      formData.append("style", files.style[0].buffer, { filename: "style.wav", contentType: files.style[0].mimetype });
    } else if (description) {
      formData.append("description", description);
    } else {
      return res.status(400).json({ error: "provide style track or description" });
    }
    const response = await axios.post(`${cleanBaseUrl}/fuse`, formData, {
      headers: { ...formData.getHeaders(), "Accept": "audio/wav", "ngrok-skip-browser-warning": "69420" },
      responseType: "arraybuffer",
      maxContentLength: Infinity,
      maxBodyLength: Infinity,
      timeout: 900000,
      httpAgent,
      httpsAgent
    });
    res.set("Content-Type", "audio/wav");
    res.send(Buffer.from(response.data));
  } catch (err: any) {
    res.status(500).json({ error: "fusion process failed: " + err.message });
  }
});

router.post("/save", upload.single("audio"), async (req: Request, res: Response) => {
  try {
    const { sound_id, heritage_sound, modern_sound, style, user_mail, community } = req.body;
    const file = req.file;
    if (!file) throw new Error("no audio file provided");
    const fingerprintData = await getFingerprintFromBuffer(file.buffer);
    const fileName = `fused_${Date.now()}.wav`;
    const { error: uploadError } = await supabase.storage.from("fused_results").upload(fileName, file.buffer, { contentType: "audio/wav", upsert: true });
    if (uploadError) throw uploadError;
    const { data: urlData } = supabase.storage.from("fused_results").getPublicUrl(fileName);
    const finalSoundId = sound_id && sound_id !== "undefined" && sound_id !== "null" ? sound_id : `FUSE-${uuidv4().split('-')[0].toUpperCase()}`;
    const { error: dbError } = await supabase.from("fused_tracks").insert([{
      sound_id: finalSoundId,
      heritage_sound: heritage_sound || "unknown",
      modern_sound: modern_sound || "unknown",
      style: style || "ai",
      user_mail: user_mail || "anonymous",
      community: community || "general community",
      contributor_email: user_mail || "anonymous",
      fusedtrack_url: urlData.publicUrl
    }]);
    if (dbError) throw dbError;
    await supabase.from("fusion_audiofingerprint").insert([{
      sound_id: finalSoundId,
      fingerprint_data: fingerprintData
    }]);
    if (sound_id && sound_id !== "undefined" && sound_id !== null) {
      const { data: trackData } = await supabase.from("tracks").select("fusion_count").eq("sound_id", sound_id).single();
      await supabase.from("tracks").update({ fusion_count: (trackData?.fusion_count || 0) + 1 }).eq("sound_id", sound_id);
    }
    res.status(201).json({ success: true, url: urlData.publicUrl, sound_id: finalSoundId });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.delete("/delete/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { data: tracks, error: fetchError } = await supabase
      .from("fused_tracks")
      .select("fusedtrack_url")
      .eq("sound_id", id);

    if (fetchError) throw fetchError;
    if (!tracks || tracks.length === 0) {
      return res.status(404).json({ error: "track not found" });
    }

    for (const track of tracks) {
      const urlParts = track.fusedtrack_url.split("/");
      const fileName = urlParts[urlParts.length - 1];
      await supabase.storage.from("fused_results").remove([fileName]);
    }

    await supabase.from("fusion_audiofingerprint").delete().eq("sound_id", id);
    const { error: deleteError } = await supabase.from("fused_tracks").delete().eq("sound_id", id);
    
    if (deleteError) throw deleteError;

    res.status(200).json({ message: "fused track deleted successfully" });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;