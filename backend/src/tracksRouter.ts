import express, { Request, Response, Router } from "express";
import multer from "multer";
import { supabase } from "./supabase";
import { v4 as uuidv4 } from "uuid";
import { protect } from "./authRouter";
import { exec } from "child_process";
import fs from "fs";
import path from "path";
import os from "os";
import { sendTrackApprovalEmail, sendTrackRejectionEmail } from "./mailer";

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
  const { data, error } = await supabase
    .from("system_controls")
    .select("*")
    .order("id", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (!data || error) {
    return {
      min_audio_length: 10,
      max_audio_length: 120,
      max_similarity_allowed: 0.95,
      min_volume_threshold: 20
    };
  }

  return {
    min_audio_length: Number(data.min_audio_length) || 10,
    max_audio_length: Number(data.max_audio_length) || 120,
    max_similarity_allowed: Number(data.max_similarity_allowed),
    min_volume_threshold: Number(data.min_volume_threshold) || 20
  };
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
      if (fs.existsSync(tempPath)) try { fs.unlinkSync(tempPath); } catch (e) {}
      const match = stderr.match(/mean_volume: ([\-\d.]+) dB/);
      if (match) {
        const db = parseFloat(match[1]);
        let score = Math.max(0, Math.min(100, ((db + 60) / 60) * 100));
        resolve(Math.round(score));
      } else {
        reject(new Error("loudness analysis failed."));
      }
    });
  });
}

async function getFingerprintFromBuffer(buffer: Buffer): Promise<number[]> {
  const tempPath = path.join(os.tmpdir(), `fp_${uuidv4()}.mp3`);
  if (!buffer || buffer.length === 0) throw new Error("empty buffer.");
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

function computeSimilarity(fp1: number[], fp2: number[]): number {
  if (!fp1 || !fp2 || fp1.length === 0 || fp2.length === 0) return 0;
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
      const error: any = new Error(`audio duration (${duration.toFixed(1)}s) must be between ${config.min_audio_length}s and ${config.max_audio_length}s.`);
      error.step = "duration";
      throw error;
    }
    const loudness = await getLoudnessScore(audioBuffer);
    if (loudness < config.min_volume_threshold) {
      const error: any = new Error(`audio is not audible (volume: ${loudness}/100). minimum req. ${config.min_volume_threshold}%`);
      error.step = "loudness";
      throw error;
    }
    
    fingerprintData = await getFingerprintFromBuffer(audioBuffer);

    const [heritageRes, fusionRes] = await Promise.all([
      supabase.from("audiofingerprint").select("*"),
      supabase.from("fusion_audiofingerprint").select("*")
    ]);

    const allFingerprints = [
      ...(heritageRes.data || []).map(f => ({ ...f, type: 'heritage' })),
      ...(fusionRes.data || []).map(f => ({ ...f, type: 'fusion' }))
    ];

    if (allFingerprints.length > 0) {
      const thresholdPercent = config.max_similarity_allowed;
      
      for (const rec of allFingerprints) {
        if (req.params.id && rec.sound_id === req.params.id) continue;
        
        const sim = computeSimilarity(fingerprintData, rec.fingerprint_data);
        if (sim >= thresholdPercent) {
          let similarTrack = null;
          
          if (rec.type === 'heritage') {
            const { data } = await supabase
              .from("tracks")
              .select("sound_id, title, performer, album_file_url, sound_track_url")
              .eq("sound_id", rec.sound_id)
              .maybeSingle();
            similarTrack = data;
          } else {
            const { data } = await supabase
              .from("fused_tracks")
              .select("sound_id, heritage_sound, fusedtrack_url")
              .eq("sound_id", rec.sound_id)
              .maybeSingle();
            
            if (data) {
              similarTrack = {
                sound_id: data.sound_id,
                title: data.heritage_sound,
                performer: "AI Fusion Result",
                album_file_url: "/fuse.png",
                sound_track_url: data.fusedtrack_url
              };
            }
          }

          if (similarTrack) {
            const error: any = new Error(`Similar audio is existing (${sim.toFixed(2)}% similarity).`);
            error.similarTrack = similarTrack;
            error.step = "similarity";
            error.source = rec.type;
            throw error;
          }
        }
      }
    }

    const audioPath = `audio-tracks/${uuidv4()}.${files.sound_track_url[0].originalname.split(".").pop()}`;
    await supabase.storage.from("audio-tracks").upload(audioPath, audioBuffer);
    body.sound_track_url = supabase.storage.from("audio-tracks").getPublicUrl(audioPath).data.publicUrl;
  } else { delete body.sound_track_url; }
  
  if (files?.album_file_url?.[0]) {
    const imgPath = `album-art/${uuidv4()}.${files.album_file_url[0].originalname.split(".").pop()}`;
    await supabase.storage.from("album-art").upload(imgPath, files.album_file_url[0].buffer);
    body.album_file_url = supabase.storage.from("album-art").getPublicUrl(imgPath).data.publicUrl;
  } else { delete body.album_file_url; }
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
    res.status(200).json({ message: "status updated", track });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
};

router.patch("/unapprove-track/:id", protect, handleStatus(false));
router.patch("/approve-track/:id", protect, handleStatus(true));

router.get("/get-balance/:email", async (req: Request, res: Response) => {
  try {
    const { email } = req.params;
    const { data, error } = await supabase.from("holder_balances").select("balance").eq("holder_name", email).maybeSingle();
    if (error) throw error;
    res.status(200).json({ success: true, balance: data ? data.balance : 0 });
  } catch (err: any) { res.status(500).json({ success: false, error: err.message }); }
});

router.post("/", singleUpload, async (req: AuthRequest, res: Response) => {
  try {
    const uploaderEmail = req.user?.email || "";
    const { body, fingerprintData } = await processUpload(req, uploaderEmail);
    const { data: track, error: tErr } = await supabase.from("tracks").insert([body]).select().single();
    if (tErr) {
      if (tErr.code === "23505" || tErr.message.includes("unique constraint")) {
        return res.status(400).json({ error: "track id already registered" });
      }
      throw tErr;
    }
    if (fingerprintData) {
      await supabase.from("audiofingerprint").insert([{ sound_id: track.sound_id, fingerprint_data: fingerprintData }]);
    }
    res.status(201).json(track);
  } catch (err: any) { 
    res.status(400).json({ 
      error: err.message, 
      similarTrack: err.similarTrack || null, 
      step: err.step || "unknown",
      source: err.source || null 
    }); 
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
    res.status(400).json({ 
      error: err.message, 
      similarTrack: err.similarTrack || null, 
      step: err.step || "unknown",
      source: err.source || null
    }); 
  }
});

router.delete("/delete-track/:id", protect, async (req, res) => {
  try {
    const { data: track } = await supabase.from("tracks").select("*").eq("sound_id", req.params.id).single();
    if (track) {
      if (!track.isapproved && track.contributor) {
        await sendTrackRejectionEmail(track.contributor, "", track.title);
      }
      const getRelativePath = (url: string, bucket: string) => {
        if (!url) return null;
        const parts = url.split(`${bucket}/`);
        return parts.length > 1 ? parts[1].split('?')[0] : null;
      };
      const audioPath = getRelativePath(track.sound_track_url, "audio-tracks");
      if (audioPath) await supabase.storage.from("audio-tracks").remove([audioPath]);
      const imagePathInArt = getRelativePath(track.album_file_url, "album-art");
      if (imagePathInArt) await supabase.storage.from("album-art").remove([imagePathInArt]);
    }
    await supabase.from("audiofingerprint").delete().eq("sound_id", req.params.id);
    const { error } = await supabase.from("tracks").delete().eq("sound_id", req.params.id);
    res.status(error ? 500 : 200).json({ message: "deleted" });
  } catch (err) { res.status(500).json({ error: "deletion failed" }); }
});

router.get("/:id", async (req, res) => {
  const { data, error } = await supabase.from("tracks").select("*").eq("sound_id", req.params.id).single();
  if (error || !data) return res.status(404).json({ error: "not found" });
  res.status(200).json(data);
});

router.get("/", async (req, res) => {
  const { data } = await supabase.from("tracks").select("*");
  res.json(data || []);
});

export default router;