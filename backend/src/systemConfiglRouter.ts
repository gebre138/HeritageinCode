import express, { Response, Router } from "express";
import { supabase } from "./supabase";
import { protect } from "./authRouter";

interface AuthRequest extends express.Request {
  user?: { email: string; id: string; role?: string };
}

const router: Router = express.Router();

const getFirstRowId = async (): Promise<number | null> => {
  const { data } = await supabase
    .from("system_controls")
    .select("id")
    .order("id", { ascending: true })
    .limit(1)
    .maybeSingle();
  return data ? data.id : null;
};

router.get("/controls", async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("system_controls")
      .select("min_audio_length, max_audio_length, max_similarity_allowed, min_volume_threshold, group_by_category, group_by_country")
      .order("id", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (error) throw error;
    res.json(data || {});
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/controls", protect, async (req: AuthRequest, res: Response) => {
  if (req.user?.role !== "superadmin") {
    return res.status(403).json({ error: "forbidden: superadmin access required" });
  }
  try {
    const firstId = await getFirstRowId();
    if (firstId) {
      const { error } = await supabase
        .from("system_controls")
        .update(req.body)
        .eq("id", firstId);
      if (error) throw error;
    } else {
      const { error } = await supabase
        .from("system_controls")
        .insert([req.body]);
      if (error) throw error;
    }
    res.json({ message: "system updated successfully" });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/pricing", async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("system_controls")
      .select("heritage_download, fused_download, daily_sub, weekly_sub, monthly_sub, yearly_sub")
      .order("id", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (error) throw error;
    res.json(data || {});
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.put("/pricing/update", protect, async (req: AuthRequest, res: Response) => {
  if (req.user?.role !== "superadmin") {
    return res.status(403).json({ error: "forbidden: superadmin access required" });
  }
  try {
    const firstId = await getFirstRowId();
    if (firstId) {
      const { error } = await supabase
        .from("system_controls")
        .update(req.body)
        .eq("id", firstId);
      if (error) throw error;
    } else {
      const { error } = await supabase
        .from("system_controls")
        .insert([req.body]);
      if (error) throw error;
    }
    res.json({ message: "pricing updated successfully" });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;