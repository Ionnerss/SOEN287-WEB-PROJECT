import express from "express";
import crypto from "node:crypto";
import { webcrypto } from "node:crypto";
import bcrypt from "bcryptjs";
import * as QRCode from "qrcode";

if (!globalThis.crypto) {
  globalThis.crypto = webcrypto;
}

import { generateSecret, verify } from "otplib";
import db from "../config/db.js";

const router = express.Router();

const SESSION_COOKIE_NAME = process.env.SESSION_COOKIE_NAME || "scc_session";
const PENDING_2FA_COOKIE_NAME = process.env.PENDING_2FA_COOKIE_NAME || "scc_pending_2fa";
const SESSION_TTL_HOURS = Number(process.env.SESSION_TTL_HOURS || 24);
const PENDING_2FA_TTL_MINUTES = Number(process.env.PENDING_2FA_TTL_MINUTES || 10);
const COOKIE_SECURE = process.env.NODE_ENV === "production";
const ISSUER = "Smart Course Companion";

function parseCookies(req) {
  const header = req.headers.cookie || "";
  return header
    .split(";")
    .map((part) => part.trim())
    .filter(Boolean)
    .reduce((acc, part) => {
      const index = part.indexOf("=");
      if (index === -1) return acc;
      const key = decodeURIComponent(part.slice(0, index));
      const value = decodeURIComponent(part.slice(index + 1));
      acc[key] = value;
      return acc;
    }, {});
}

function buildCookie(name, value, options = {}) {
  const parts = [`${encodeURIComponent(name)}=${encodeURIComponent(value)}`];

  if (options.maxAge !== undefined) parts.push(`Max-Age=${options.maxAge}`);
  if (options.httpOnly) parts.push("HttpOnly");
  if (options.sameSite) parts.push(`SameSite=${options.sameSite}`);
  if (options.secure) parts.push("Secure");
  parts.push(`Path=${options.path || "/"}`);

  return parts.join("; ");
}

function setCookie(res, name, value, options = {}) {
  const nextCookie = buildCookie(name, value, options);
  const existing = res.getHeader("Set-Cookie");

  if (!existing) {
    res.setHeader("Set-Cookie", nextCookie);
    return;
  }

  const cookies = Array.isArray(existing) ? existing : [existing];
  cookies.push(nextCookie);
  res.setHeader("Set-Cookie", cookies);
}

function clearCookie(res, name) {
  setCookie(res, name, "", {
    httpOnly: true,
    sameSite: "Lax",
    secure: COOKIE_SECURE,
    maxAge: 0,
    path: "/",
  });
}

function randomToken() {
  return crypto.randomBytes(32).toString("hex");
}

function futureDate(minutesOrHours, unit = "hours") {
  const now = new Date();

  if (unit === "minutes") {
    now.setMinutes(now.getMinutes() + minutesOrHours);
    return now;
  }

  now.setHours(now.getHours() + minutesOrHours);
  return now;
}

async function getUserByEmail(email) {
  const [rows] = await db.query(
    `SELECT
      user_id,
      full_name,
      email,
      password_hash,
      role,
      twofa_secret,
      twofa_enabled,
      twofa_last_timestep
     FROM users
     WHERE email = ?
     LIMIT 1`,
    [email]
  );

  return rows[0] || null;
}

async function getUserById(userId) {
  const [rows] = await db.query(
    `SELECT
      user_id,
      full_name,
      email,
      role,
      twofa_secret,
      twofa_enabled,
      twofa_last_timestep
     FROM users
     WHERE user_id = ?
     LIMIT 1`,
    [userId]
  );

  return rows[0] || null;
}

async function createPendingChallenge(userId) {
  const challengeId = randomToken();
  const expiresAt = futureDate(PENDING_2FA_TTL_MINUTES, "minutes");

  await db.query(
    `INSERT INTO auth_challenges (challenge_id, user_id, expires_at)
     VALUES (?, ?, ?)`,
    [challengeId, userId, expiresAt]
  );

  return challengeId;
}

async function consumePendingChallenge(challengeId) {
  const [rows] = await db.query(
    `SELECT challenge_id, user_id, expires_at
     FROM auth_challenges
     WHERE challenge_id = ?
     LIMIT 1`,
    [challengeId]
  );

  const challenge = rows[0];
  if (!challenge) return null;

  if (new Date(challenge.expires_at) < new Date()) {
    await db.query("DELETE FROM auth_challenges WHERE challenge_id = ?", [challengeId]);
    return null;
  }

  return challenge;
}

async function deletePendingChallenge(challengeId) {
  await db.query("DELETE FROM auth_challenges WHERE challenge_id = ?", [challengeId]);
}

async function createSession(userId) {
  const sessionId = randomToken();
  const expiresAt = futureDate(SESSION_TTL_HOURS, "hours");

  await db.query(
    `INSERT INTO auth_sessions (session_id, user_id, expires_at)
     VALUES (?, ?, ?)`,
    [sessionId, userId, expiresAt]
  );

  return sessionId;
}

async function getSessionUser(sessionId) {
  const [rows] = await db.query(
    `SELECT
      s.session_id,
      s.expires_at,
      u.user_id,
      u.full_name,
      u.email,
      u.role,
      u.twofa_enabled
     FROM auth_sessions s
     INNER JOIN users u ON u.user_id = s.user_id
     WHERE s.session_id = ?
     LIMIT 1`,
    [sessionId]
  );

  const session = rows[0] || null;
  if (!session) return null;

  if (new Date(session.expires_at) < new Date()) {
    await db.query("DELETE FROM auth_sessions WHERE session_id = ?", [sessionId]);
    return null;
  }

  return session;
}

async function deleteSession(sessionId) {
  await db.query("DELETE FROM auth_sessions WHERE session_id = ?", [sessionId]);
}

function sanitizeUser(user) {
  return {
    userId: user.user_id,
    fullName: user.full_name,
    email: user.email,
    role: user.role,
    twofaEnabled: Boolean(user.twofa_enabled),
  };
}

function getPendingChallengeId(req) {
  const cookies = parseCookies(req);
  return cookies[PENDING_2FA_COOKIE_NAME] || null;
}

function getSessionId(req) {
  const cookies = parseCookies(req);
  return cookies[SESSION_COOKIE_NAME] || null;
}

async function loadPendingUser(req) {
  const challengeId = getPendingChallengeId(req);
  if (!challengeId) return { challenge: null, user: null };

  const challenge = await consumePendingChallenge(challengeId);
  if (!challenge) return { challenge: null, user: null };

  const user = await getUserById(challenge.user_id);
  return { challenge, user };
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function isStrongEnoughPassword(password) {
  return typeof password === "string" && password.length >= 8;
}

router.post("/signup", async (req, res) => {
  try {
    const fullName = String(req.body.fullName || "").trim();
    const email = String(req.body.email || "").trim().toLowerCase();
    const password = String(req.body.password || "");
    //const role = req.body.role === "admin" ? "admin" : "student";

    const ADMIN_SECRET_KEY = process.env.ADMIN_SECRET_KEY || "changeme123";

    let role = "student";
    if (req.body.role === "admin") {
      if (req.body.adminKey !== ADMIN_SECRET_KEY) {
        return res.status(403).json({ error: "Invalid admin key." });
      }
      role = "admin";
    }

    if (!fullName) {
      return res.status(400).json({ error: "Full name is required." });
    }

    if (!isValidEmail(email)) {
      return res.status(400).json({ error: "Enter a valid email address." });
    }

    if (!isStrongEnoughPassword(password)) {
      return res.status(400).json({ error: "Password must be at least 8 characters." });
    }

    const existingUser = await getUserByEmail(email);
    if (existingUser) {
      return res.status(409).json({ error: "An account with this email already exists." });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const secret = generateSecret();

    const [result] = await db.query(
      `INSERT INTO users (full_name, email, password_hash, role, twofa_secret, twofa_enabled)
       VALUES (?, ?, ?, ?, ?, FALSE)`,
      [fullName, email, passwordHash, role, secret]
    );

    const challengeId = await createPendingChallenge(result.insertId);

    setCookie(res, PENDING_2FA_COOKIE_NAME, challengeId, {
      httpOnly: true,
      sameSite: "Lax",
      secure: COOKIE_SECURE,
      maxAge: PENDING_2FA_TTL_MINUTES * 60,
      path: "/",
    });

    return res.status(201).json({
      message: "Account created. Finish 2FA setup.",
      requiresTwoFactor: true,
      mode: "setup",
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Failed to create account." });
  }
});

router.post("/login", async (req, res) => {
  try {
    const email = String(req.body.email || "").trim().toLowerCase();
    const password = String(req.body.password || "");

    if (!isValidEmail(email) || !password) {
      return res.status(400).json({ error: "Email and password are required." });
    }

    const user = await getUserByEmail(email);
    if (!user) {
      return res.status(401).json({ error: "Invalid email or password." });
    }

    const passwordMatches = await bcrypt.compare(password, user.password_hash);
    if (!passwordMatches) {
      return res.status(401).json({ error: "Invalid email or password." });
    }

    const challengeId = await createPendingChallenge(user.user_id);

    setCookie(res, PENDING_2FA_COOKIE_NAME, challengeId, {
      httpOnly: true,
      sameSite: "Lax",
      secure: COOKIE_SECURE,
      maxAge: PENDING_2FA_TTL_MINUTES * 60,
      path: "/",
    });

    return res.json({
      message: "Password verified. Complete 2FA.",
      requiresTwoFactor: true,
      mode: user.twofa_enabled ? "verify" : "setup",
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Failed to log in." });
  }
});

router.get("/2fa/setup", async (req, res) => {
  try {
    const { user } = await loadPendingUser(req);

    if (!user) {
      return res.status(401).json({ error: "2FA session expired. Log in again." });
    }

    if (!user.twofa_secret) {
      const secret = generateSecret();
      await db.query(
        "UPDATE users SET twofa_secret = ?, twofa_enabled = FALSE WHERE user_id = ?",
        [secret, user.user_id]
      );
      user.twofa_secret = secret;
      user.twofa_enabled = false;
    }

    const otpAuthUrl = `otpauth://totp/${encodeURIComponent(`${ISSUER}:${user.email}`)}?secret=${encodeURIComponent(user.twofa_secret)}&issuer=${encodeURIComponent(ISSUER)}`;
    const qrCodeDataUrl = await QRCode.toDataURL(otpAuthUrl);

    return res.json({
      email: user.email,
      manualEntryKey: user.twofa_secret,
      qrCodeDataUrl,
      twofaEnabled: Boolean(user.twofa_enabled),
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Failed to load 2FA setup." });
  }
});

router.post("/2fa/verify", async (req, res) => {
  try {
    const token = String(req.body.token || "").trim();
    const challengeId = getPendingChallengeId(req);
    const { challenge, user } = await loadPendingUser(req);

    if (!challengeId || !challenge || !user) {
      return res.status(401).json({ error: "2FA session expired. Log in again." });
    }

    if (!/^\d{6}$/.test(token)) {
      return res.status(400).json({ error: "Enter the 6-digit code from your authenticator app." });
    }

    if (!user.twofa_secret) {
      return res.status(400).json({ error: "2FA is not set up for this account." });
    }

    const result = await verify({
      secret: user.twofa_secret,
      token,
      ...(user.twofa_last_timestep ? { afterTimeStep: user.twofa_last_timestep } : {}),
      epochTolerance: 30,
    });

    if (!result.valid) {
      return res.status(401).json({ error: "Invalid authentication code." });
    }

    await db.query(
      `UPDATE users
       SET twofa_enabled = TRUE,
           twofa_last_timestep = ?
       WHERE user_id = ?`,
      [result.timeStep, user.user_id]
    );

    const sessionId = await createSession(user.user_id);

    setCookie(res, SESSION_COOKIE_NAME, sessionId, {
      httpOnly: true,
      sameSite: "Lax",
      secure: COOKIE_SECURE,
      maxAge: SESSION_TTL_HOURS * 60 * 60,
      path: "/",
    });

    await deletePendingChallenge(challengeId);
    clearCookie(res, PENDING_2FA_COOKIE_NAME);

    const freshUser = await getUserById(user.user_id);

    return res.json({
      message: "2FA verified.",
      user: sanitizeUser(freshUser),
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Failed to verify 2FA." });
  }
});

router.get("/guard", async (req, res) => {
  try {
    const sessionId = getSessionId(req);
    if (!sessionId) {
      return res.status(401).json({ authenticated: false, error: "Not authenticated." });
    }

    const sessionUser = await getSessionUser(sessionId);
    if (!sessionUser) {
      clearCookie(res, SESSION_COOKIE_NAME);
      return res.status(401).json({ authenticated: false, error: "Session expired." });
    }

    return res.json({
      authenticated: true,
      user: sanitizeUser(sessionUser),
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ authenticated: false, error: "Failed to validate session." });
  }
});

router.post("/logout", async (req, res) => {
  try {
    const sessionId = getSessionId(req);
    if (sessionId) {
      await deleteSession(sessionId);
    }

    clearCookie(res, SESSION_COOKIE_NAME);
    clearCookie(res, PENDING_2FA_COOKIE_NAME);

    return res.json({ message: "Logged out." });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Failed to log out." });
  }
});

export default router;