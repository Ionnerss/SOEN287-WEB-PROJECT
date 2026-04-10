import express from "express";
import db from "../config/db.js";
import { requireAuth } from "./usersRoutes.js";

const router = express.Router();

router.use(requireAuth);

/* ENROLL */
router.post("/", async (req, res) => {

    const userId = req.sessionUser.user_id;
    const { courseId } = req.body;

    if (!courseId) {
        return res.status(400).json({ error: "courseId is required" });
    }

    try {
        const [result] = await db.query(
            "INSERT IGNORE INTO enrollments (user_id, course_id) VALUES (?,?)",
            [userId, courseId]
        );
        res.json({ success: true, affectedRows: result.affectedRows });
    } catch(err) {
        console.error("[enroll POST] error:", err);
        res.status(500).json({ error: "enroll failed", detail: err.message });
    }
});

/* GET ENROLLED (current user) */
router.get("/", async (req, res) => {

    const userId = req.sessionUser.user_id;

    try {
        const [rows] = await db.query(`
            SELECT c.*
            FROM courses c
            JOIN enrollments e ON e.course_id = c.course_id
            WHERE e.user_id = ?
        `, [userId]);
        res.json(rows);
    } catch(err) {
        console.error("[enroll GET] error:", err);
        res.status(500).json({ error: "fetch failed", detail: err.message });
    }
});

/* ADMIN - enrollment counts per course */
router.get("/counts", async (req, res) => {

    if (req.sessionUser.role !== "admin") {
        return res.status(403).json({ error: "Admin only" });
    }

    try {
        const [rows] = await db.query(`
            SELECT course_id, COUNT(*) as student_count
            FROM enrollments
            WHERE user_id IS NOT NULL
            GROUP BY course_id
        `);
        res.json(rows);
    } catch(err) {
        console.error("[enroll counts] error:", err);
        res.status(500).json({ error: "fetch failed" });
    }
});

/* DROP (unenroll) */
router.delete("/:courseId", async (req, res) => {

    const userId   = req.sessionUser.user_id;
    const courseId = req.params.courseId;

    try {
        await db.query(
            "DELETE FROM enrollments WHERE user_id = ? AND course_id = ?",
            [userId, courseId]
        );
        res.json({ success: true });
    } catch(err) {
        console.error("[enroll DELETE] error:", err);
        res.status(500).json({ error: "drop failed", detail: err.message });
    }
});

export default router;