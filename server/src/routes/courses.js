import express from "express";
import { requireAuth } from "./usersRoutes.js";
import pool from "../config/db.js";

const router = express.Router();

async function getAllCourses(req, res) {
  try {
    let rows;

    if (req.sessionUser.role === "admin") {
      // Admin sees all courses
      [rows] = await pool.query("SELECT * FROM courses");
    } else {
      // Student sees only their own
      [rows] = await pool.query(
        "SELECT * FROM courses WHERE user_id = ?",
        [req.sessionUser.user_id]
      );
    }

    res.json(rows);
  } catch (err) {
    console.error("Error fetching courses:", err);
    res.status(500).json({ error: "Database error" });
  }
}

async function getCourseById(req, res) {
  const { id } = req.params;
  try {
    const [rows] = await pool.query(
      "SELECT * FROM courses WHERE course_id = ?",
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: "Course not found" });
    }

    res.json(rows[0]);
  } catch (err) {
    console.error("Error fetching course by ID:", err);
    res.status(500).json({ error: "Database error" });
  }
}

async function createCourse(req, res) {
  const { user_id, code, name, instructor, term } = req.body;

  if (!user_id || !code || !name) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  try {
    const [result] = await pool.query(
      "INSERT INTO courses (user_id, code, name, instructor, term) VALUES (?, ?, ?, ?, ?)",
      [user_id, code, name, instructor || null, term || null]
    );

    const newCourse = {
      course_id: result.insertId,
      user_id,
      code,
      name,
      instructor: instructor || null,
      term: term || null,
    };

    res.status(201).json(newCourse);
  } catch (err) {
    console.error("Error creating course:", err);
    res.status(500).json({ error: "Database error" });
  }
}

async function updateCourse(req, res) {
  const { id } = req.params;
  const { code, name, instructor, term, enabled } = req.body;

  if (!code || !name) {
    return res.status(400).json({
      error: "code and name are required",
    });
  }

  try {
    const [existing] = await pool.query(
      "SELECT * FROM courses WHERE course_id = ?",
      [id]
    );

    if (existing.length === 0) {
      return res.status(404).json({ error: "Course not found" });
    }

    // ⭐ If enabled is undefined (student), default to 1
    const finalEnabled = enabled !== undefined ? enabled : 1;

    await pool.query(
      `UPDATE courses 
       SET code = ?, name = ?, instructor = ?, term = ?, enabled = ?
       WHERE course_id = ?`,
      [code, name, instructor || null, term || null, finalEnabled, id]
    );

    res.json({
      message: "Course updated successfully",
      course: {
        course_id: Number(id),
        code,
        name,
        instructor: instructor || null,
        term: term || null,
        enabled: finalEnabled
      },
    });
  } catch (err) {
    console.error("Error updating course:", err);
    res.status(500).json({ error: "Database error" });
  }
}

async function deleteCourse(req, res) {
  const { id } = req.params;

  try {
    const [existing] = await pool.query(
      "SELECT * FROM courses WHERE course_id = ?",
      [id]
    );

    if (existing.length === 0) {
      return res.status(404).json({ error: "Course not found" });
    }

    await pool.query("DELETE FROM courses WHERE course_id = ?", [id]);

    res.json({ message: "Course deleted successfully" });
  } catch (err) {
    console.error("Error deleting course:", err);
    res.status(500).json({ error: "Database error" });
  }
}

async function enableCourse(req, res) {
  const { id } = req.params;
  try {
    const [result] = await pool.query(
      "UPDATE courses SET enabled = 1 WHERE course_id = ?",
      [id]
    );
    res.json({ message: "Course enabled" });
  } catch (err) {
    console.error("Error enabling course:", err);
    res.status(500).json({ error: "Database error" });
  }
}

async function disableCourse(req, res) {
  const { id } = req.params;
  try {
    const [result] = await pool.query(
      "UPDATE courses SET enabled = 0 WHERE course_id = ?",
      [id]
    );
    res.json({ message: "Course disabled" });
  } catch (err) {
    console.error("Error disabling course:", err);
    res.status(500).json({ error: "Database error" });
  }
}

async function getAvailableCourses(req, res) {
  try {
    const [rows] = await pool.query(
      "SELECT * FROM courses WHERE enabled = 1"
    );
    res.json(rows);
  } catch (err) {
    console.error("Error fetching available courses:", err);
    res.status(500).json({ error: "Database error" });
  }
}

/* -----------------------------------------
   Routes
------------------------------------------ */
router.use(requireAuth);
router.get("/available", getAvailableCourses);
router.get("/", getAllCourses);
router.get("/:id", getCourseById);
router.post("/", createCourse);
router.put("/:id", updateCourse);
router.delete("/:id", deleteCourse);
router.put("/:id/enable", enableCourse);
router.put("/:id/disable", disableCourse);

export default router;