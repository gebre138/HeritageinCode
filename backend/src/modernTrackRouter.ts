import express, { Request, Response, Router } from "express";
import multer from "multer";
import { createClient } from "@supabase/supabase-js";
import { protect } from "./authRouter";
import { v4 as uuidv4 } from "uuid";

const router: Router = express.Router();
const supabase = createClient(process.env.SUPABASE_URL || "", process.env.SUPABASE_SERVICE_ROLE_KEY || "");
const upload = multer({ storage: multer.memoryStorage() });

router.get("/", async (req, res) => {
  const { data, error } = await supabase.from("moderntrack").select("*");
  error ? res.status(500).json({ error: error.message }) : res.status(200).json(data);
});



router.post("/upload", protect, upload.single("modernaudio"), async (req: Request, res: Response) => {
  try {
    const { category, country, isapproved } = req.body, file = req.file;
    if (!category || !country || !file) return res.status(400).json({ message: "Missing required fields" });

    const path = `${uuidv4()}.${file.originalname.split(".").pop()}`;
    const { error: upErr } = await supabase.storage.from("moderntracks").upload(path, file.buffer, { contentType: file.mimetype });
    if (upErr) throw upErr;

    const { data: url } = supabase.storage.from("moderntracks").getPublicUrl(path);
    const { data, error: dbErr } = await supabase.from("moderntrack").insert([{ category, country, modernaudio_url: url.publicUrl, isapproved: isapproved === "true" }]).select();

    if (dbErr) throw dbErr;
    res.status(201).json(data[0]);
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

const updateStatus = (status: boolean) => async (req: Request, res: Response) => {
  try {
    const { data, error } = await supabase.from("moderntrack").update({ isapproved: status }).eq("sound_id", req.params.id).select();
    if (error) throw error;
    res.status(200).json({ message: status ? "Approved" : "Moved to pending", track: data?.[0] });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
};

router.patch("/approve-track/:id", protect, updateStatus(true));
router.patch("/unapprove-track/:id", protect, updateStatus(false));

router.delete("/delete-track/:id", protect, async (req, res) => {
  const { error } = await supabase.from("moderntrack").delete().eq("sound_id", req.params.id);
  error ? res.status(500).json({ error: error.message }) : res.status(200).json({ message: "Deleted" });
});

export default router;