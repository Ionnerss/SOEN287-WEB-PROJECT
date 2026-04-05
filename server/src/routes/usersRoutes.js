// server/src/routes/usersRoutes.js
// Handles all user-related CRUD operations.
// Relies on the session cookie set by authRoutes.js — no extra tokens needed.

import express from "express";
import bcrypt from "bcryptjs";
import db from "../config/db.js";

const router = express.Router();

// ─────────────────────────────────────────────
//  Shared helpers (mirrors authRoutes.js style)
// ─────────────────────────────────────────────

const SESSION_COOKIE_NAME = process.env.SESSION_COOKIE_NAME || "scc_session";

/** Parse the raw Cookie header into a plain object. */
function parseCookies(req) {
  const header = req.headers.cookie || "";
  return header
    .split(";")
    .map((part) => part.trim())
    .filter(Boolean)
    .reduce((acc, part) => {
      const index = part.indexOf("=");
      if (index === -1) return acc;
      acc[decodeURIComponent(part.slice(0, index))] = decodeURIComponent(
        part.slice(index + 1)
      );
      return acc;
    }, {});
}

/** Pull the session ID out of the cookie jar. */
function getSessionId(req) {
  return parseCookies(req)[SESSION_COOKIE_NAME] || null;
}

/**
 * Resolve the session cookie → a live user row.
 * Returns null if the cookie is missing, the session is expired, or the
 * user no longer exists.
 */
async function getSessionUser(sessionId) {
  if (!sessionId) return null;

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

  // Purge and reject expired sessions
  if (new Date(session.expires_at) < new Date()) {
    await db.query("DELETE FROM auth_sessions WHERE session_id = ?", [
      sessionId,
    ]);
    return null;
  }

  return session;
}

// ─────────────────────────────────────────────
//  Middleware
// ─────────────────────────────────────────────

/**
 * requireAuth
 * Attaches `req.sessionUser` or replies 401.
 * Use on any route that needs a logged-in user.
 */
export async function requireAuth(req, res, next) {
  try {
    const sessionId = getSessionId(req);
    const user = await getSessionUser(sessionId);

    if (!user) {
      return res.status(401).json({ error: "Not authenticated." });
    }

    req.sessionUser = user; // available in every downstream handler
    next();
  } catch (err) {
    console.error("requireAuth error:", err);
    return res.status(500).json({ error: "Authentication check failed." });
  }
}

/**
 * requireAdmin
 * Must come after requireAuth in the middleware chain.
 * Rejects non-admin users with 403.
 */
export function requireAdmin(req, res, next) {
  if (req.sessionUser.role !== "admin") {
    return res.status(403).json({ error: "Admin access required." });
  }
  next();
}

// ─────────────────────────────────────────────
//  Input validation helpers
// ─────────────────────────────────────────────

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function isStrongEnoughPassword(password) {
  return typeof password === "string" && password.length >= 8;
}

/** Strip sensitive fields before sending a user object to the client. */
function sanitizeUser(user) {
  return {
    userId: user.user_id,
    fullName: user.full_name,
    email: user.email,
    role: user.role,
    twofaEnabled: Boolean(user.twofa_enabled),
    createdAt: user.created_at,
  };
}

// ─────────────────────────────────────────────
//  Routes
// ─────────────────────────────────────────────

// ── GET /api/users/me ──────────────────────────────────────────────────────
// Returns the profile of the currently logged-in user.
router.get("/me", requireAuth, async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT user_id, full_name, email, role, twofa_enabled, created_at
       FROM users
       WHERE user_id = ?
       LIMIT 1`,
      [req.sessionUser.user_id]
    );

    if (!rows[0]) {
      return res.status(404).json({ error: "User not found." });
    }

    return res.json({ user: sanitizeUser(rows[0]) });
  } catch (err) {
    console.error("GET /me error:", err);
    return res.status(500).json({ error: "Failed to fetch profile." });
  }
});

// ── PUT /api/users/me ──────────────────────────────────────────────────────
// Update the current user's full name and/or email.
// Students can only update themselves; admins are also restricted to this
// endpoint for self-edits (use /api/users/:id for editing others).
router.put("/me", requireAuth, async (req, res) => {
  try {
    const fullName = String(req.body.fullName || "").trim();
    const email = String(req.body.email || "")
      .trim()
      .toLowerCase();

    if (!fullName) {
      return res.status(400).json({ error: "Full name is required." });
    }

    if (!isValidEmail(email)) {
      return res.status(400).json({ error: "Enter a valid email address." });
    }

    // Make sure the new email isn't already taken by someone else
    const [conflict] = await db.query(
      "SELECT user_id FROM users WHERE email = ? AND user_id != ? LIMIT 1",
      [email, req.sessionUser.user_id]
    );

    if (conflict.length > 0) {
      return res
        .status(409)
        .json({ error: "That email is already used by another account." });
    }

    await db.query(
      "UPDATE users SET full_name = ?, email = ? WHERE user_id = ?",
      [fullName, email, req.sessionUser.user_id]
    );

    const [updated] = await db.query(
      "SELECT user_id, full_name, email, role, twofa_enabled, created_at FROM users WHERE user_id = ?",
      [req.sessionUser.user_id]
    );

    return res.json({
      message: "Profile updated successfully.",
      user: sanitizeUser(updated[0]),
    });
  } catch (err) {
    console.error("PUT /me error:", err);
    return res.status(500).json({ error: "Failed to update profile." });
  }
});

// ── PUT /api/users/me/password ─────────────────────────────────────────────
// Change the current user's password.
// Requires the existing password to prevent session-hijacking abuse.
router.put("/me/password", requireAuth, async (req, res) => {
  try {
    const currentPassword = String(req.body.currentPassword || "");
    const newPassword = String(req.body.newPassword || "");

    if (!currentPassword || !newPassword) {
      return res
        .status(400)
        .json({ error: "Current password and new password are required." });
    }

    if (!isStrongEnoughPassword(newPassword)) {
      return res
        .status(400)
        .json({ error: "New password must be at least 8 characters." });
    }

    // Fetch the stored hash
    const [rows] = await db.query(
      "SELECT password_hash FROM users WHERE user_id = ? LIMIT 1",
      [req.sessionUser.user_id]
    );

    if (!rows[0]) {
      return res.status(404).json({ error: "User not found." });
    }

    const passwordMatches = await bcrypt.compare(
      currentPassword,
      rows[0].password_hash
    );

    if (!passwordMatches) {
      return res
        .status(401)
        .json({ error: "Current password is incorrect." });
    }

    const newHash = await bcrypt.hash(newPassword, 12);

    await db.query("UPDATE users SET password_hash = ? WHERE user_id = ?", [
      newHash,
      req.sessionUser.user_id,
    ]);

    return res.json({ message: "Password changed successfully." });
  } catch (err) {
    console.error("PUT /me/password error:", err);
    return res.status(500).json({ error: "Failed to change password." });
  }
});

// ── DELETE /api/users/me ───────────────────────────────────────────────────
// Delete the current user's own account.
// Also deletes all their courses and assessments (via ON DELETE CASCADE —
// make sure your FK constraints are in place, or use explicit deletes below).
router.delete("/me", requireAuth, async (req, res) => {
  try {
    const userId = req.sessionUser.user_id;

    // Explicitly delete dependent data in case CASCADE isn't set up yet
    // Step 1: get all course IDs belonging to this user
    const [courses] = await db.query(
      "SELECT course_id FROM courses WHERE user_id = ?",
      [userId]
    );

    if (courses.length > 0) {
      const courseIds = courses.map((c) => c.course_id);

      // Step 2: delete assessments for those courses
      await db.query(
        `DELETE FROM assessments WHERE course_id IN (${courseIds.map(() => "?").join(",")})`,
        courseIds
      );

      // Step 3: delete the courses themselves
      await db.query(
        `DELETE FROM courses WHERE course_id IN (${courseIds.map(() => "?").join(",")})`,
        courseIds
      );
    }

    // Step 4: delete sessions & challenges
    await db.query("DELETE FROM auth_sessions WHERE user_id = ?", [userId]);
    await db.query("DELETE FROM auth_challenges WHERE user_id = ?", [userId]);

    // Step 5: delete the user
    await db.query("DELETE FROM users WHERE user_id = ?", [userId]);

    return res.json({ message: "Account deleted successfully." });
  } catch (err) {
    console.error("DELETE /me error:", err);
    return res.status(500).json({ error: "Failed to delete account." });
  }
});

// ─────────────────────────────────────────────
//  Admin-only routes  (require both middlewares)
// ─────────────────────────────────────────────

// ── GET /api/users ─────────────────────────────────────────────────────────
// List all users (admin only).
// Supports optional ?role=student|admin query filter.
router.get("/", requireAuth, requireAdmin, async (req, res) => {
  try {
    const role = req.query.role; // optional filter

    let sql = `SELECT user_id, full_name, email, role, twofa_enabled, created_at
               FROM users`;
    const params = [];

    if (role === "student" || role === "admin") {
      sql += " WHERE role = ?";
      params.push(role);
    }

    sql += " ORDER BY created_at DESC";

    const [rows] = await db.query(sql, params);
    return res.json({ users: rows.map(sanitizeUser) });
  } catch (err) {
    console.error("GET /users error:", err);
    return res.status(500).json({ error: "Failed to fetch users." });
  }
});

// ── GET /api/users/:id ─────────────────────────────────────────────────────
// Get a specific user by ID (admin only).
router.get("/:id", requireAuth, requireAdmin, async (req, res) => {
  try {
    const userId = Number(req.params.id);

    if (!Number.isInteger(userId) || userId <= 0) {
      return res.status(400).json({ error: "Invalid user ID." });
    }

    const [rows] = await db.query(
      `SELECT user_id, full_name, email, role, twofa_enabled, created_at
       FROM users
       WHERE user_id = ?
       LIMIT 1`,
      [userId]
    );

    if (!rows[0]) {
      return res.status(404).json({ error: "User not found." });
    }

    return res.json({ user: sanitizeUser(rows[0]) });
  } catch (err) {
    console.error("GET /users/:id error:", err);
    return res.status(500).json({ error: "Failed to fetch user." });
  }
});

// ── PUT /api/users/:id ─────────────────────────────────────────────────────
// Admin edits another user's full name, email, or role.
router.put("/:id", requireAuth, requireAdmin, async (req, res) => {
  try {
    const userId = Number(req.params.id);

    if (!Number.isInteger(userId) || userId <= 0) {
      return res.status(400).json({ error: "Invalid user ID." });
    }

    const fullName = String(req.body.fullName || "").trim();
    const email = String(req.body.email || "")
      .trim()
      .toLowerCase();
    const role = req.body.role === "admin" ? "admin" : "student";

    if (!fullName) {
      return res.status(400).json({ error: "Full name is required." });
    }

    if (!isValidEmail(email)) {
      return res.status(400).json({ error: "Enter a valid email address." });
    }

    // Check the user exists
    const [existing] = await db.query(
      "SELECT user_id FROM users WHERE user_id = ? LIMIT 1",
      [userId]
    );

    if (!existing[0]) {
      return res.status(404).json({ error: "User not found." });
    }

    // Email conflict check (exclude the target user)
    const [conflict] = await db.query(
      "SELECT user_id FROM users WHERE email = ? AND user_id != ? LIMIT 1",
      [email, userId]
    );

    if (conflict.length > 0) {
      return res
        .status(409)
        .json({ error: "That email is already used by another account." });
    }

    await db.query(
      "UPDATE users SET full_name = ?, email = ?, role = ? WHERE user_id = ?",
      [fullName, email, role, userId]
    );

    const [updated] = await db.query(
      "SELECT user_id, full_name, email, role, twofa_enabled, created_at FROM users WHERE user_id = ?",
      [userId]
    );

    return res.json({
      message: "User updated successfully.",
      user: sanitizeUser(updated[0]),
    });
  } catch (err) {
    console.error("PUT /users/:id error:", err);
    return res.status(500).json({ error: "Failed to update user." });
  }
});

// ── DELETE /api/users/:id ──────────────────────────────────────────────────
// Admin deletes another user (and all their data).
router.delete("/:id", requireAuth, requireAdmin, async (req, res) => {
  try {
    const userId = Number(req.params.id);

    if (!Number.isInteger(userId) || userId <= 0) {
      return res.status(400).json({ error: "Invalid user ID." });
    }

    // Prevent an admin from deleting themselves via this endpoint
    if (userId === req.sessionUser.user_id) {
      return res
        .status(400)
        .json({ error: "Use DELETE /api/users/me to delete your own account." });
    }

    const [existing] = await db.query(
      "SELECT user_id FROM users WHERE user_id = ? LIMIT 1",
      [userId]
    );

    if (!existing[0]) {
      return res.status(404).json({ error: "User not found." });
    }

    // Delete dependent data
    const [courses] = await db.query(
      "SELECT course_id FROM courses WHERE user_id = ?",
      [userId]
    );

    if (courses.length > 0) {
      const courseIds = courses.map((c) => c.course_id);

      await db.query(
        `DELETE FROM assessments WHERE course_id IN (${courseIds.map(() => "?").join(",")})`,
        courseIds
      );

      await db.query(
        `DELETE FROM courses WHERE course_id IN (${courseIds.map(() => "?").join(",")})`,
        courseIds
      );
    }

    await db.query("DELETE FROM auth_sessions WHERE user_id = ?", [userId]);
    await db.query("DELETE FROM auth_challenges WHERE user_id = ?", [userId]);
    await db.query("DELETE FROM users WHERE user_id = ?", [userId]);

    return res.json({ message: "User deleted successfully." });
  } catch (err) {
    console.error("DELETE /users/:id error:", err);
    return res.status(500).json({ error: "Failed to delete user." });
  }
});

export default router;