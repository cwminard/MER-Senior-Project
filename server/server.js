// server/server.js
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { body, validationResult } from "express-validator";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import multer from "multer";
import { join } from "node:path";
import db from "./db.js";

// --- config ---
dotenv.config({ path: join(process.cwd(), "server", ".env") });
const app = express();
const PORT = process.env.PORT || 4000;
const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-change-me";

// --- middleware ---
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use("/uploads", express.static(join(process.cwd(), "server", "uploads")));

// --- health ---
app.get("/api/health", (_req, res) => res.json({ ok: true }));

/* ===================== AUTH ===================== */
app.post(
  "/api/signup",
  [
    body("first").trim().notEmpty(),
    body("last").trim().notEmpty(),
    body("email").isEmail().normalizeEmail(),
    body("password").isLength({ min: 6 })
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
    const { first, last, email, phone, password } = req.body;
    try {
      const existing = await db.get("SELECT id FROM users WHERE email = ?", [email]);
      if (existing) return res.status(409).json({ error: "Email already registered" });

      const hash = await bcrypt.hash(password, 12);
      const { id } = await db.run(
        "INSERT INTO users (first_name,last_name,email,phone,password_hash) VALUES (?,?,?,?,?)",
        [first, last, email, phone || null, hash]
      );
      await db.run("INSERT INTO profiles (user_id, goal, mood) VALUES (?,?,?)", [id, null, null]);
      const token = jwt.sign({ id, email }, JWT_SECRET, { expiresIn: "7d" });
      res.json({ token, user: { id, first, last, email, phone } });
    } catch (e) {
      res.status(500).json({ error: "Signup failed", detail: e.message });
    }
  }
);

app.post(
  "/api/login",
  [body("email").isEmail(), body("password").notEmpty()],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
    const { email, password } = req.body;
    try {
      const user = await db.get("SELECT * FROM users WHERE email = ?", [email]);
      if (!user) return res.status(401).json({ error: "Invalid credentials" });
      const ok = await bcrypt.compare(password, user.password_hash);
      if (!ok) return res.status(401).json({ error: "Invalid credentials" });
      const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: "7d" });
      res.json({
        token,
        user: {
          id: user.id,
          first: user.first_name,
          last: user.last_name,
          email: user.email,
          phone: user.phone
        }
      });
    } catch (e) {
      res.status(500).json({ error: "Login failed", detail: e.message });
    }
  }
);

/* ===================== AUTH MIDDLEWARE ===================== */
function auth(req, res, next) {
  const hdr = req.headers.authorization || "";
  const token = hdr.startsWith("Bearer ") ? hdr.slice(7) : null;
  if (!token) return res.status(401).json({ error: "Missing token" });
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: "Invalid token" });
  }
}

app.get("/api/me", auth, async (req, res) => {
  const id = req.user.id;
  const user = await db.get(
    `SELECT u.id, u.first_name as first, u.last_name as last, u.email, u.phone,
            p.goal, p.mood
     FROM users u LEFT JOIN profiles p ON p.user_id = u.id WHERE u.id = ?`,
    [id]
  );
  res.json(user);
});

app.put("/api/me", auth, async (req, res) => {
  const id = req.user.id;
  const updates = [];
  const params = [];
  const { first, last, email, phone, password } = req.body;

  if (first) { updates.push("first_name = ?"); params.push(first); }
  if (last)  { updates.push("last_name = ?"); params.push(last); }
  if (email) { updates.push("email = ?"); params.push(email); }
  if (phone !== undefined) { updates.push("phone = ?"); params.push(phone); }
  if (password) {
    const hash = await bcrypt.hash(password, 12);
    updates.push("password_hash = ?"); params.push(hash);
  }
  if (updates.length) {
    params.push(id);
    await db.run(`UPDATE users SET ${updates.join(", ")}, updated_at=datetime('now') WHERE id = ?`, params);
  }
  res.json({ ok: true });
});

app.put("/api/preferences", auth, async (req, res) => {
  const id = req.user.id;
  const { goal = null, mood = null } = req.body;
  await db.run(
    "UPDATE profiles SET goal = ?, mood = ?, updated_at=datetime('now') WHERE user_id = ?",
    [goal, mood, id]
  );
  res.json({ ok: true });
});

/* ===================== UPLOADS (optional) ===================== */
import { existsSync, mkdirSync } from "node:fs";
const uploadDir = join(process.cwd(), "server", "uploads");
if (!existsSync(uploadDir)) mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: uploadDir,
  filename: (_req, file, cb) => {
    const stamp = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const safe = file.originalname.replace(/[^\w.-]+/g, "_");
    cb(null, `${stamp}-${safe}`);
  }
});
const upload = multer({ storage });

app.post("/api/upload", auth, upload.single("file"), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: "No file" });
  await db.run(
    "INSERT INTO uploads (user_id, filename, stored_as, size_bytes) VALUES (?,?,?,?)",
    [req.user.id, req.file.originalname, req.file.filename, req.file.size]
  );
  res.json({ ok: true, url: `/uploads/${req.file.filename}` });
});


app.use(express.static(join(process.cwd())));
app.get(/^(?!\/api\/).*/, (_req, res) => {
  res.sendFile(join(process.cwd(), "index.html"));
});

/* ===================== Start server ===================== */
app.listen(PORT, () => {
  console.log(`API on http://localhost:${PORT}`);
});
