import express, { Request, Response, Router } from "express";
import axios from "axios";
import { createClient } from "@supabase/supabase-js";
import multer from "multer";

const router: Router = express.Router();
const supabase = createClient(process.env.SUPABASE_URL || "", process.env.SUPABASE_SERVICE_ROLE_KEY || "");
const upload = multer({ storage: multer.memoryStorage() });

const JAMENDO_CLIENT_ID = process.env.JAMENDO_CLIENT_ID;

router.get("/", async (req: Request, res: Response) => {
  try {
    const { data, error } = await supabase.from("moderntrack").select("*");
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

router.get("/jamendo", async (req: Request, res: Response) => {
  try {
    const response = await axios.get("https://api.jamendo.com/v3.0/tracks/", {
      params: {
        client_id: JAMENDO_CLIENT_ID,
        format: "json",
        limit: 50,
        order: "popularity_month",
        audioformat: "mp32"
      }
    });
    const mappedTracks = response.data.results.map((track: any) => ({
      sound_id: `jam-${track.id}`,
      category: track.name,
      country: "Global",
      modernaudio_url: track.audio,
      isapproved: true,
      performer: track.artist_name,
      rhythm_style: "Modern",
      harmony_type: "Unknown",
      bpm: "N/A",
      mood: "Unknown"
    }));
    res.status(200).json(mappedTracks);
  } catch (err: any) {
    res.status(500).json({ error: "Failed to fetch from Jamendo" });
  }
});

router.get("/proxy-audio", async (req: Request, res: Response) => {
  const audioUrl = req.query.url as string;
  if (!audioUrl) return res.status(400).send("URL is required");
  try {
    const response = await axios({
      method: "get",
      url: audioUrl,
      responseType: "stream",
      headers: { 'User-Agent': 'Mozilla/5.0', 'Referer': 'https://www.jamendo.com/' }
    });
    res.setHeader("Content-Type", "audio/mpeg");
    res.setHeader("Access-Control-Allow-Origin", "*");
    response.data.pipe(res);
  } catch (err) {
    res.status(500).send("Error fetching audio stream");
  }
});

export default router;