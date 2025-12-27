import express, { Request, Response, Router } from "express";
import multer from "multer";
import { supabase } from "./supabase";
import { v4 as uuidv4 } from "uuid";
import { protect } from "./authRouter";
import { exec } from "child_process";
import fs from "fs";
import path from "path";
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
    min_volume_threshold: 5
  };
  data?.forEach(item => {
    config[item.key] = parseFloat(item.value);
  });
  return { ...defaults, ...config };
}

async function getFingerprintFromBuffer(buffer: Buffer): Promise<number[]> {
  const tempPath = path.join(__dirname, `temp_${uuidv4()}.mp3`);
  fs.writeFileSync(tempPath, buffer);
  return new Promise((resolve, reject) => {
    exec(`fpcalc -raw "${tempPath}"`, (err, stdout) => {
      if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
      if (err) return reject(err);
      const match = stdout.match(/FINGERPRINT=(.+)/);
      if (!match) return reject("Fingerprint failed");
      resolve(match[1].split(",").map(Number));
    });
  });
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
    fingerprintData = await getFingerprintFromBuffer(audioBuffer);
    const { data: existing } = await supabase.from("audiofingerprint").select("*");
    if (existing) {
      for (const rec of existing) {
        if (req.params.id && rec.sound_id === req.params.id) continue;
        const sim = computeSimilarity(fingerprintData, rec.fingerprint_data);
        if (sim > config.max_similarity_allowed) {
          throw new Error(`Duplicate Audio Detected (${sim.toFixed(2)}% similarity). Limit: ${config.max_similarity_allowed}%`);
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
    const uploaderEmail = req.user?.email || "anonymous@heritage.org";
    const { body, fingerprintData } = await processUpload(req, uploaderEmail);
    const { data: track, error: tErr } = await supabase.from("tracks").insert([body]).select().single();
    if (tErr) throw tErr;
    if (fingerprintData) {
      await supabase.from("audiofingerprint").insert([{ sound_id: track.sound_id, fingerprint_data: fingerprintData }]);
    }
    res.status(201).json(track);
  } catch (err: any) { res.status(400).json({ error: err.message }); }
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
  } catch (err: any) { res.status(400).json({ error: err.message }); }
});

router.delete("/delete-track/:id", protect, async (req, res) => {
  await supabase.from("audiofingerprint").delete().eq("sound_id", req.params.id);
  const { error } = await supabase.from("tracks").delete().eq("sound_id", req.params.id);
  res.status(error ? 500 : 200).json({ message: "Deleted" });
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