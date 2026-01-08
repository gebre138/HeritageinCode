import express, { Request, Response, Router } from "express";
import multer from "multer";
import { supabase } from "./supabase";
import { v4 as uuidv4 } from "uuid";
import { protect } from "./authRouter";
import { exec } from "child_process";
import fs from "fs";
import path from "path";
import os from "os";
import { sendTrackApprovalEmail } from "./mailer";

interface AuthRequest extends Request {
  user?: { email: string; id: string; role?: string };
}

const router: Router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });
const singleUpload = upload.fields([
  { name: "sound_track_url", maxCount: 1 },
  { name: "album_file_url", maxCount: 1 }
]);

async function getSystemConfig() {
  const { data } = await supabase.from("system_controls").select("key, value");
  const config: Record<string, number> = {};
  const defaults: Record<string, number> = {
    min_audio_length: 10,
    max_audio_length: 120,
    max_similarity_allowed: 1.0,
    min_volume_threshold: 20
  };
  data?.forEach(item => {
    config[item.key] = parseFloat(item.value);
  });
  return { ...defaults, ...config };
}

async function getAudioDuration(buffer: Buffer): Promise<number> {
  const tempPath = path.join(os.tmpdir(), `dur_${uuidv4()}.mp3`);
  fs.writeFileSync(tempPath, buffer);
  return new Promise((resolve, reject) => {
    exec(`ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${tempPath}"`, (err, stdout) => {
      if (fs.existsSync(tempPath)) try { fs.unlinkSync(tempPath); } catch (e) {}
      if (err) return reject(err);
      resolve(parseFloat(stdout));
    });
  });
}

async function getLoudnessScore(buffer: Buffer): Promise<number> {
  const tempPath = path.join(os.tmpdir(), `vol_${uuidv4()}.mp3`);
  fs.writeFileSync(tempPath, buffer);

  return new Promise((resolve, reject) => {
    exec(`ffmpeg -i "${tempPath}" -af volumedetect -f null /dev/null`, (err, stdout, stderr) => {
      if (fs.existsSync(tempPath)) {
        try { fs.unlinkSync(tempPath); } catch (e) {}
      }
      const match = stderr.match(/mean_volume: ([\-\d.]+) dB/);
      if (match) {
        const db = parseFloat(match[1]);
        let score = Math.max(0, Math.min(100, ((db + 60) / 60) * 100));
        resolve(Math.round(score));
      } else {
        reject(new Error("Loudness analysis failed."));
      }
    });
  });
}

async function getFingerprintFromBuffer(buffer: Buffer): Promise<number[]> {
  const tempPath = path.join(os.tmpdir(), `fp_${uuidv4()}.mp3`);
  if (!buffer || buffer.length === 0) throw new Error("Empty buffer.");

  try {
    fs.writeFileSync(tempPath, buffer);
    return await new Promise((resolve, reject) => {
      exec(`fpcalc -raw "${tempPath}"`, (err, stdout, stderr) => {
        if (fs.existsSync(tempPath)) {
          try { fs.unlinkSync(tempPath); } catch (e) {}
        }
        const match = stdout.match(/FINGERPRINT=(.+)/);
        if (match) return resolve(match[1].split(",").map(Number));
        reject(new Error("Fingerprint generation failed."));
      });
    });
  } catch (error: any) {
    if (fs.existsSync(tempPath)) try { fs.unlinkSync(tempPath); } catch (e) {}
    throw error;
  }
}

function computeSimilarity(fp1: number[], fp2: number[]): number {
  const s1 = new Set(fp1), s2 = new Set(fp2);
  const common = [...s1].filter(x => s2.has(x));
  return (common.length / Math.min(s1.size, s2.size)) * 100;
}

const processUpload = async (req: AuthRequest, uploaderEmail?: string) => {
  const body = { ...req.body }, files = req.files as any;
  if (uploaderEmail) body.contributor = uploaderEmail;
  let fingerprintData = null;

  const config = await getSystemConfig();

  if (files?.sound_track_url?.[0]) {
    const audioBuffer = files.sound_track_url[0].buffer;
    
    const duration = await getAudioDuration(audioBuffer);
    if (duration < config.min_audio_length || duration > config.max_audio_length) {
      const error: any = new Error(`Audio duration (${duration.toFixed(1)}s) must be between ${config.min_audio_length}s and ${config.max_audio_length}s.`);
      error.step = "duration";
      throw error;
    }

    const loudness = await getLoudnessScore(audioBuffer);
    if (loudness < config.min_volume_threshold) {
      const error: any = new Error(`Audio is not Audible (Volume: ${loudness}/100). Minimum Req. ${config.min_volume_threshold}DB`);
      error.step = "loudness";
      throw error;
    }

    fingerprintData = await getFingerprintFromBuffer(audioBuffer);
    const { data: existing } = await supabase.from("audiofingerprint").select("*");
    if (existing) {
      for (const rec of existing) {
        if (req.params.id && rec.sound_id === req.params.id) continue;
        const sim = computeSimilarity(fingerprintData, rec.fingerprint_data);
        if (sim > config.max_similarity_allowed) {
          const { data: similarTrack } = await supabase
            .from("tracks")
            .select("sound_id, title, performer, album_file_url, sound_track_url")
            .eq("sound_id", rec.sound_id)
            .single();

          const error: any = new Error(`Similar Sound Exist (${sim.toFixed(2)}% similarity).`);
          error.similarTrack = similarTrack;
          error.step = "similarity";
          throw error;
        }
      }
    }
    const audioPath = `audio-tracks/${uuidv4()}.${files.sound_track_url[0].originalname.split(".").pop()}`;
    await supabase.storage.from("audio-tracks").upload(audioPath, audioBuffer);
    body.sound_track_url = supabase.storage.from("audio-tracks").getPublicUrl(audioPath).data.publicUrl;
  } else {
    delete body.sound_track_url;
  }
  
  if (files?.album_file_url?.[0]) {
    const imgPath = `album-art/${uuidv4()}.${files.album_file_url[0].originalname.split(".").pop()}`;
    await supabase.storage.from("album-art").upload(imgPath, files.album_file_url[0].buffer);
    body.album_file_url = supabase.storage.from("album-art").getPublicUrl(imgPath).data.publicUrl;
  } else {
    delete body.album_file_url;
  }

  return { body, fingerprintData };
};

const handleStatus = (isapproved: boolean) => async (req: Request, res: Response) => {
  try {
    const { data, error } = await supabase.from("tracks").update({ isapproved }).eq("sound_id", req.params.id).select();
    if (error) throw error;
    const track = data?.[0];
    if (isapproved && track && track.contributor) {
      sendTrackApprovalEmail(track.contributor, "", track.title);
    }
    res.status(200).json({ message: "Status updated", track });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
};

router.get("/admin/controls", protect, async (req: AuthRequest, res: Response) => {
  if (req.user?.role !== 'superadmin') return res.status(403).json({ error: "Forbidden" });
  const { data } = await supabase.from("system_controls").select("*");
  res.json(data || []);
});

router.post("/admin/controls", protect, async (req: AuthRequest, res: Response) => {
  if (req.user?.role !== 'superadmin') return res.status(403).json({ error: "Forbidden" });
  const { error } = await supabase.from("system_controls").upsert(req.body, { onConflict: 'key' });
  if (error) return res.status(500).json({ error: error.message });
  res.json({ message: "Updated" });
});

router.patch("/unapprove-track/:id", protect, handleStatus(false));
router.patch("/approve-track/:id", protect, handleStatus(true));

router.post("/", protect, singleUpload, async (req: AuthRequest, res: Response) => {
  try {
    const uploaderEmail = req.user?.email || "";
    const { body, fingerprintData } = await processUpload(req, uploaderEmail);
    const { data: track, error: tErr } = await supabase.from("tracks").insert([body]).select().single();
    if (tErr) {
      if (tErr.code === "23505" || tErr.message.includes("unique constraint")) {
        return res.status(400).json({ error: "Track ID already registered" });
      }
      throw tErr;
    }
    if (fingerprintData) {
      await supabase.from("audiofingerprint").insert([{ sound_id: track.sound_id, fingerprint_data: fingerprintData }]);
    }
    res.status(201).json(track);
  } catch (err: any) { 
    res.status(400).json({ error: err.message, similarTrack: err.similarTrack || null, step: err.step || "unknown" }); 
  }
});

router.put("/:id", protect, singleUpload, async (req: AuthRequest, res: Response) => {
  try {
    const { body, fingerprintData } = await processUpload(req);
    delete body.contributor;
    const { data, error } = await supabase.from("tracks").update(body).eq("sound_id", req.params.id).select().single();
    if (error) throw error;
    if (fingerprintData) {
      await supabase.from("audiofingerprint").upsert({ sound_id: req.params.id, fingerprint_data: fingerprintData }, { onConflict: 'sound_id' });
    }
    res.status(200).json(data);
  } catch (err: any) { 
    res.status(400).json({ error: err.message, similarTrack: err.similarTrack || null, step: err.step || "unknown" }); 
  }
});

router.delete("/delete-track/:id", protect, async (req, res) => {
  try {
    const { data: track } = await supabase.from("tracks").select("*").eq("sound_id", req.params.id).single();
    
    if (track) {
      const getRelativePath = (url: string, bucket: string) => {
        if (!url) return null;
        const parts = url.split(`${bucket}/`);
        return parts.length > 1 ? parts[1].split('?')[0] : null;
      };

      const audioPath = getRelativePath(track.sound_track_url, "audio-tracks");
      if (audioPath) await supabase.storage.from("audio-tracks").remove([audioPath]);

      const imagePathInArt = getRelativePath(track.album_file_url, "album-art");
      const imagePathInAudio = getRelativePath(track.album_file_url, "audio-tracks");
      
      if (imagePathInArt) await supabase.storage.from("album-art").remove([imagePathInArt]);
      if (imagePathInAudio) await supabase.storage.from("audio-tracks").remove([imagePathInAudio]);

      const videoPath = getRelativePath(track.video_url, "videos");
      if (videoPath) await supabase.storage.from("videos").remove([videoPath]);
    }

    await supabase.from("audiofingerprint").delete().eq("sound_id", req.params.id);
    const { error } = await supabase.from("tracks").delete().eq("sound_id", req.params.id);
    
    res.status(error ? 500 : 200).json({ message: "Deleted" });
  } catch (err) {
    res.status(500).json({ error: "Deletion failed" });
  }
});

router.get("/:id", async (req, res) => {
  const { data, error } = await supabase.from("tracks").select("*").eq("sound_id", req.params.id).single();
  if (error || !data) return res.status(404).json({ error: "Not found" });
  res.status(200).json(data);
});

router.get("/", async (req, res) => {
  const { data } = await supabase.from("tracks").select("*");
  res.json(data || []);
});

export default router;