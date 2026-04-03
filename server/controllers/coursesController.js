import db from '../src/config/db.js';

export const getAllCourses = async (req, res) => {
  try {
    const [rows] = await pool.query("SELECT * FROM courses");
    res.json(rows);
  } catch (err) {
    console.error("Error fetching courses:", err);
    res.status(500).json({ error: "Database error" });
  }
};

export const getCourseById = async (req, res) => {
  const { id } = req.params;
  try {
    const [rows] = await pool.query("SELECT * FROM courses WHERE course_id = ?", [id]);
    if (rows.length === 0) {
    return res.status(404).json({ error: "Course not found" });
    }
    res.json(rows[0]);
  } catch (err) {
    console.error("Error fetching course by ID:", err);
    res.status(500).json({ error: "Database error" });
  }
};

export const createCourse = async (req, res) => {
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
      term: term || null
    };

    res.status(201).json(newCourse);
  } catch (err) {
    console.error("Error creating course:", err);
    res.status(500).json({ error: "Database error" });
  }
};

export const updateCourse = async (req, res) => {
  const { id } = req.params;
  const { user_id, code, name, instructor, term } = req.body;

  if (!user_id || !code || !name) {
    return res.status(400).json({
      error: "user_id, code, and name are required"
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

    await pool.query(
      `UPDATE courses 
       SET user_id = ?, code = ?, name = ?, instructor = ?, term = ?
       WHERE course_id = ?`,
      [user_id, code, name, instructor || null, term || null, id]
    );

    res.json({
      message: "Course updated successfully",
      course: {
        course_id: Number(id),
        user_id,
        code,
        name,
        instructor: instructor || null,
        term: term || null
      }
    });
  } catch (err) {
    console.error("Error updating course:", err);
    res.status(500).json({ error: "Database error" });
  }
};

export const deleteCourse = async (req, res) => {
  const { id } = req.params;

  try {
    const [existing] = await pool.query(
      "SELECT * FROM courses WHERE course_id = ?",
      [id]
    );

    if (existing.length === 0) {
      return res.status(404).json({ error: "Course not found" });
    }

    await pool.query(
      "DELETE FROM courses WHERE course_id = ?",
      [id]
    );

    res.json({ message: "Course deleted successfully" });
  } catch (err) {
    console.error("Error deleting course:", err);
    res.status(500).json({ error: "Database error" });
  }
};