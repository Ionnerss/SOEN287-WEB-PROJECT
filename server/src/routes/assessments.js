import express from "express";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const router = express.Router();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Double check this path! 
// If your file is in 'server/data/assessments.json', this path is correct.
const FILE = path.join(__dirname, "../../data/assessments.json");

function getAssessments() {
  try {
    if (!fs.existsSync(FILE)) {
      console.warn("Warning: assessments.json not found. Creating a new one.");
      // Create the directory if it doesn't exist
      const dir = path.dirname(FILE);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      
      fs.writeFileSync(FILE, JSON.stringify([]));
      return [];
    }
    const content = fs.readFileSync(FILE, 'utf8');
    return content ? JSON.parse(content) : [];
  } catch (err) {
    console.error("Critical Error reading assessments.json:", err);
    return []; // Return empty array instead of crashing the server
  }
}

function saveAssessments(data) {
  try {
    fs.writeFileSync(FILE, JSON.stringify(data, null, 2));
  } catch (err) {
    console.error("Error saving assessments.json:", err);
  }
}

// ── ADMIN ROUTES ──

router.get('/admin/all', (req, res) => {
  try {
    const all = getAssessments();
    const { courseId } = req.query;
    const result = courseId ? all.filter(a => a.courseId === courseId) : all;
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch assessments" });
  }
});

router.post('/admin', (req, res) => {
  try {
    const { courseId, title, type, weight, dueDate } = req.body;
    if (!courseId || !title || !type || weight === undefined) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const all = getAssessments();

    if (type === 'Final') {
      const hasFinal = all.some(a => a.courseId === courseId && (a.type === 'Final' || a.category === 'Final'));
      if (hasFinal) return res.status(400).json({ error: 'A Final already exists for this course.' });
    }

    const newEntry = {
      assessment_id: Date.now().toString(),
      courseId,
      title,
      type,
      weight: Number(weight),
      due_date: dueDate || '—'
    };

    all.push(newEntry);
    saveAssessments(all);
    res.status(201).json(newEntry);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to create assessment" });
  }
});

router.put('/admin/:id', (req, res) => {
  try {
    const all = getAssessments();
    const idx = all.findIndex(a => String(a.assessment_id) === String(req.params.id));
    
    if (idx === -1) return res.status(404).json({ error: 'Assessment not found' });

    all[idx] = { ...all[idx], ...req.body };
    saveAssessments(all);
    res.json(all[idx]);
  } catch (err) {
    res.status(500).json({ error: "Failed to update assessment" });
  }
});

router.delete('/admin/:id', (req, res) => {
  try {
    let all = getAssessments();
    all = all.filter(a => String(a.assessment_id) !== String(req.params.id));
    saveAssessments(all);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete assessment" });
  }
});

// GET /api/assessments (Public/Student)
router.get('/', (req, res) => {
  res.json(getAssessments());
});

export default router;