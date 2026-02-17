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

const COLAB_URL: string | undefined = process.env.FUSION_COLAB_URL;
const httpAgent = new http.Agent({ keepAlive: true });
const httpsAgent = new https.Agent({ keepAlive: true });

async function getActiveFusionUrl(): Promise<string> {
  if (!COLAB_URL) throw new Error("fusion_colab_url is missing in .env");
  return COLAB_URL;
}

router.get("/history", async (req: Request, res: Response) => {
  try {
    const { data, error } = await supabase.from("fused_tracks").select("*");
    if (error) throw error;
    res.json(data || []);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/process", upload.any(), async (req: Request, res: Response) => {
  console.log("fusion request received from frontend");
  try {
    const files = req.files as Express.Multer.File[];
    const melodyFile = files.find(f => f.fieldname === "melody");
    const styleFile = files.find(f => f.fieldname === "style");
    
    if (!melodyFile || !styleFile) {
      console.log("error: melody or style file missing in request");
      return res.status(400).json({ error: "missing files" });
    }

    const activeUrl = await getActiveFusionUrl();
    const engineForm = new FormData();
    engineForm.append("melody", melodyFile.buffer, { filename: "m.wav" });
    engineForm.append("style", styleFile.buffer, { filename: "s.wav" });
    engineForm.append("gate", String(req.body.gate || "-45"));
    engineForm.append("clarity", String(req.body.clarity || "1.0"));
    engineForm.append("mode", String(req.body.mode || "balanced"));

    console.log(`forwarding to colab: ${activeUrl}/fuse`);

    const response = await axios.post(`${activeUrl.replace(/\/$/, "")}/fuse`, engineForm, {
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

    console.log("colab processing complete");

    res.set({
      "Content-Type": "audio/wav",
      "x-harmonic-percent": response.headers["x-harmonic-percent"] || "0",
      "x-percussive-percent": response.headers["x-percussive-percent"] || "0",
      "x-analysis-label": response.headers["x-analysis-label"] || "processed",
      "Access-Control-Expose-Headers": "*"
    });

    res.send(Buffer.from(response.data));
  } catch (err: any) {
    console.error("fusion error:", err.message);
    res.status(500).json({ error: `fusion engine failed: ${err.message}` });
  }
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