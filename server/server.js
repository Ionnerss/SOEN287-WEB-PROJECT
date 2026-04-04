import "dotenv/config";
import express from "express";
import cors from "cors";

import crypto from "crypto";
import db from "./src/config/db.js";

import authRoutes from "./src/routes/authRoutes.js";
import coursesRoutes from "./src/routes/courses.js";

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

app.use("/api/auth", authRoutes);
app.use("/api/courses", coursesRoutes);

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

app.listen(PORT, "127.0.0.1", () => {
  console.log(`Server running on http://127.0.0.1:${PORT}`);
});