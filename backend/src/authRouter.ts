import express, { Request, Response, Router, NextFunction } from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { supabase } from "./supabase";
import crypto from "crypto";
import { sendVerificationEmail, sendRoleUpdateEmail, sendPasswordResetEmail } from "./mailer";

const router: Router = express.Router();
const SALT_ROUNDS = 10;
const JWT_SECRET = process.env.JWT_SECRET || "";
const BASE_URL = process.env.CLIENT_URL || "";

export const protect = async (req: Request, res: Response, next: NextFunction) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: "No token" });
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    (req as any).user = decoded;
    await supabase.from("users").update({ last_active: new Date().toISOString() }).eq("id", decoded.id);
    next();
  } catch (err) {
    res.status(401).json({ error: "Invalid token" });
  }
};

router.get("/log-visit", async (req: Request, res: Response) => {
  try {
    const { error } = await supabase.rpc('increment_visitor_count');
    if (error) {
      const { data: current } = await supabase.from("system_controls").select("value").eq("key", "visitor_count").maybeSingle();
      const newValue = (current?.value || 0) + 1;
      await supabase.from("system_controls").update({ value: newValue }).eq("key", "visitor_count");
    }
    res.status(200).json({ message: "Logged" });
  } catch (err) {
    res.status(500).json({ error: "Counter failed" });
  }
});

router.post("/signup", async (req: Request, res: Response) => {
  try {
    const { name, country, email, password } = req.body;
    if (!name || !email || !password) return res.status(400).json({ error: "Missing fields" });
    const { data: existingUser } = await supabase.from("users").select("id").eq("email", email).maybeSingle();
    if (existingUser) return res.status(400).json({ error: "User already exists" });
    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS), email_token = crypto.randomBytes(32).toString("hex");
    const { error } = await supabase.from("users").insert([{ name, country, email, password: hashedPassword, role: "user", email_verified: false, email_token, last_active: new Date().toISOString() }]);
    if (error) return res.status(500).json({ error: "DB Error" });
    await sendVerificationEmail(email, name, `${BASE_URL}/verify-email?token=${email_token}`);
    res.status(201).json({ message: "Registration successful" });
  } catch (err) { res.status(500).json({ error: "Server Crash" }); }
});

router.post("/login", async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    const { data: user } = await supabase.from("users").select("*").eq("email", email).maybeSingle();
    if (!user || !user.email_verified || !(await bcrypt.compare(password, user.password))) 
      return res.status(user?.email_verified === false ? 403 : 401).json({ error: user?.email_verified === false ? "Verify email" : "Invalid login" });
    await supabase.from("users").update({ last_active: new Date().toISOString() }).eq("id", user.id);
    const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: "1d" });
    res.status(200).json({ token, role: user.role, email: user.email, user: { id: user.id, name: user.name } });
  } catch (err) { res.status(500).json({ error: "Login failed" }); }
});

router.get("/activate", async (req: Request, res: Response) => {
  try {
    const { data: user } = await supabase.from("users").select("id").eq("email_token", req.query.token).maybeSingle();
    if (!user) return res.status(400).json({ error: "Link expired" });
    await supabase.from("users").update({ email_verified: true, email_token: null, last_active: new Date().toISOString() }).eq("id", user.id);
    res.status(200).json({ message: "Verified" });
  } catch (err) { res.status(500).json({ error: "Error" }); }
});

router.post("/forgot-password", async (req: Request, res: Response) => {
  try {
    const { email } = req.body;
    const { data: user } = await supabase.from("users").select("id, name").eq("email", email).maybeSingle();
    if (!user) return res.status(200).json({ message: "If account exists, email sent" });
    const email_token = crypto.randomBytes(32).toString("hex");
    const { error } = await supabase.from("users").update({ email_token }).eq("id", user.id);
    if (error) throw error;
    await sendPasswordResetEmail(email, user.name, `${BASE_URL}/reset-password?token=${email_token}`);
    res.status(200).json({ message: "Reset email sent" });
  } catch (err) { res.status(500).json({ error: "Server error" }); }
});

router.post("/reset-password", async (req: Request, res: Response) => {
  try {
    const { token, password } = req.body;
    if (!token || !password) return res.status(400).json({ error: "Missing token or password" });
    const { data: user, error: findError } = await supabase.from("users").select("id").eq("email_token", token).maybeSingle();
    if (findError || !user) return res.status(400).json({ error: "Invalid or expired token" });
    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
    const { error: updateError } = await supabase.from("users").update({ password: hashedPassword, email_token: null, last_active: new Date().toISOString() }).eq("id", user.id);
    if (updateError) throw updateError;
    res.status(200).json({ message: "Password updated" });
  } catch (err) { res.status(500).json({ error: "Reset failed" }); }
});

router.get("/users", protect, async (req: Request, res: Response) => {
  try {
    const role = (req as any).user.role;
    if (role !== "admin" && role !== "superadmin") return res.status(403).json({ error: "Unauthorized" });
    const { data, error } = await supabase.from("users").select("id, name, email, country, role, email_verified, last_active").order('id', { ascending: true });
    if (error) throw error;
    res.status(200).json(data);
  } catch (err) { res.status(500).json({ error: "Failed to fetch users" }); }
});

router.patch("/users/:id/role", protect, async (req: Request, res: Response) => {
  try {
    const role = (req as any).user.role;
    if (role !== "admin" && role !== "superadmin") return res.status(403).json({ error: "Unauthorized" });
    const { data: user } = await supabase.from("users").select("email, name").eq("id", req.params.id).maybeSingle();
    if (!user) return res.status(404).json({ error: "User not found" });
    const { error } = await supabase.from("users").update({ role: req.body.role }).eq("id", req.params.id);
    if (error) throw error;
    await sendRoleUpdateEmail(user.email, user.name, req.body.role);
    res.status(200).json({ message: "Update successful" });
  } catch (err) { res.status(500).json({ error: "Update failed" }); }
});

router.patch("/approve-track/:id", protect, async (req: Request, res: Response) => {
  try {
    const role = (req as any).user.role;
    if (role !== "admin" && role !== "superadmin") return res.status(403).json({ error: "Unauthorized" });
    const { error } = await supabase.from("tracks").update({ isapproved: true }).eq("id", req.params.id);
    if (error) throw error;
    res.status(200).json({ message: "Track approved" });
  } catch (err) { res.status(500).json({ error: "Approval failed" }); }
});

router.patch("/unapprove-track/:id", protect, async (req: Request, res: Response) => {
  try {
    const role = (req as any).user.role;
    if (role !== "admin" && role !== "superadmin") return res.status(403).json({ error: "Unauthorized" });
    const { error } = await supabase.from("tracks").update({ isapproved: false }).eq("id", req.params.id);
    if (error) throw error;
    res.status(200).json({ message: "Track unapproved" });
  } catch (err) { res.status(500).json({ error: "Action failed" }); }
});

router.delete("/delete-track/:id", protect, async (req: Request, res: Response) => {
  try {
    const role = (req as any).user.role;
    if (role !== "admin" && role !== "superadmin") return res.status(403).json({ error: "Unauthorized" });
    const { error } = await supabase.from("tracks").delete().eq("id", req.params.id);
    if (error) throw error;
    res.status(200).json({ message: "Track deleted" });
  } catch (err) { res.status(500).json({ error: "Deletion failed" }); }
});

export default router;