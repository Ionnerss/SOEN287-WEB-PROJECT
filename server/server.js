import "dotenv/config";
import express from "express";
import cors from "cors";
import path from "path"; // 1. Added this
import { fileURLToPath } from "url"; // 2. Added this

// 3. Define __dirname for ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

import crypto from "crypto";
import db from "./src/config/db.js";

import authRoutes from "./src/routes/authRoutes.js";
import coursesRoutes from "./src/routes/courses.js";
import assessmentsRoutes from "./src/routes/assessments.js";

const app = express();
const PORT = Number(process.env.PORT || 3000);
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || "http://127.0.0.1:5500";

app.use(
  cors({
    origin: CLIENT_ORIGIN,
    credentials: true,
  })
);

app.use(express.json());

// This will now work because path and __dirname are defined above
app.use(express.static(path.join(__dirname, "../client")));

app.use("/api/auth", authRoutes);
app.use("/api/courses", coursesRoutes);
app.use("/api/assessments", assessmentsRoutes);

app.get("/", (req, res) => {
  res.redirect("pages/index/index.html");
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);

  
// ------------------------------------------------------
// TEMPORARY DEV LOGIN ROUTE (for bypassing login page)
// ------------------------------------------------------

app.get("/api/auth/dev-login", async (req, res) => {
  try {
    const userId = 1; // your test user, create this user in your DB if it doesn't exist

    // Create session in DB
    const sessionId = crypto.randomBytes(32).toString("hex");
    await db.query(
      "INSERT INTO auth_sessions (session_id, user_id, expires_at) VALUES (?, ?, NOW() + INTERVAL 1 DAY)",
      [sessionId, userId]
    );

    // Set cookie manually using your backend's expected cookie name
    res.setHeader("Set-Cookie", [
      `scc_session=${sessionId}; HttpOnly; SameSite=None; Secure=false; Path=/`
    ]);

    res.json({ ok: true, sessionId });
  } catch (err) {
    console.error("DEV LOGIN ERROR:", err);
    res.status(500).json({ error: "Dev login failed" });
  }
});

// ------------------------------------------------------
// TEMPORARY DEV LOGIN ROUTE FOR ADMIN
// ------------------------------------------------------

app.get("/api/auth/dev-login-admin", async (req, res) => {
  try {
    const adminId = 2; // your admin user, ensure this exists in your DB

    // Create session in DB
    const sessionId = crypto.randomBytes(32).toString("hex");
    await db.query(
      "INSERT INTO auth_sessions (session_id, user_id, expires_at) VALUES (?, ?, NOW() + INTERVAL 1 DAY)",
      [sessionId, adminId]
    );

    // Set cookie manually
    res.setHeader("Set-Cookie", [
      `scc_session=${sessionId}; HttpOnly; SameSite=None; Secure=false; Path=/`
    ]);

    res.json({ ok: true, sessionId, role: "admin" });
  } catch (err) {
    console.error("ADMIN DEV LOGIN ERROR:", err);
    res.status(500).json({ error: "Admin dev login failed" });
  }
});

app.listen(PORT, "127.0.0.1", () => {
  console.log(`Server running on http://127.0.0.1:${PORT}`);
});