import express from "express";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const router = express.Router();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);


const FILE = path.join(__dirname, "../../data/assessments.json");

function getAssessments() {
  return JSON.parse(fs.readFileSync(FILE, 'utf8'));
}
function saveAssessments(data) {
  fs.writeFileSync(FILE, JSON.stringify(data, null, 2));
}

// GET /api/assessments?courseId=SOEN287
router.get('/', (req, res) => {
  const all = getAssessments();
  const { courseId } = req.query;
  const result = courseId ? all.filter(a => a.courseId === courseId) : all;
  res.json(result);
});

// POST /api/assessments
router.post('/', (req, res) => {
  const { courseId, title, type, weight, dueDate } = req.body;
  if (!courseId || !title || !type || weight === undefined)
    return res.status(400).json({ error: 'Missing fields' });

  const all = getAssessments();

  // Only 1 Final per course
  if (type === 'Final') {
    const alreadyHasFinal = all.some(a => a.courseId === courseId && a.type === 'Final');
    if (alreadyHasFinal)
      return res.status(400).json({ error: 'A Final already exists for this course.' });
  }

  const newEntry = {
    id: Date.now().toString(),
    courseId,
    title,
    type,
    weight: Number(weight),
    dueDate: dueDate || '—'
  };
  all.push(newEntry);
  saveAssessments(all);
  res.json(newEntry);
});

// PUT /api/assessments/:id
router.put('/:id', (req, res) => {
  const all = getAssessments();
  const idx = all.findIndex(a => a.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Not found' });

  // If changing to Final, check no other Final exists for this course
  if (req.body.type === 'Final') {
    const courseId = all[idx].courseId;
    const alreadyHasFinal = all.some(a => a.courseId === courseId && a.type === 'Final' && a.id !== req.params.id);
    if (alreadyHasFinal)
      return res.status(400).json({ error: 'A Final already exists for this course.' });
  }

  all[idx] = { ...all[idx], ...req.body };
  saveAssessments(all);
  res.json(all[idx]);
});

// DELETE /api/assessments/:id
router.delete('/:id', (req, res) => {
  let all = getAssessments();
  const before = all.length;
  all = all.filter(a => a.id !== req.params.id);
  if (all.length === before) return res.status(404).json({ error: 'Not found' });
  saveAssessments(all);
  res.json({ success: true });
});

// module.exports = router;
export default router;