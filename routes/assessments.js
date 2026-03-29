const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');

const FILE = path.join(__dirname, '../data/assessments.json');

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

// POST /api/assessments — create a new category
router.post('/', (req, res) => {
  const { courseId, category, weight } = req.body;
  if (!courseId || !category || weight === undefined)
    return res.status(400).json({ error: 'Missing fields' });

  const all = getAssessments();
  const newEntry = {
    id: Date.now().toString(),
    courseId,
    category,
    weight: Number(weight)
  };
  all.push(newEntry);
  saveAssessments(all);
  res.json(newEntry);
});

// PUT /api/assessments/:id — update weight
router.put('/:id', (req, res) => {
  const all = getAssessments();
  const idx = all.findIndex(a => a.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Not found' });

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

module.exports = router;