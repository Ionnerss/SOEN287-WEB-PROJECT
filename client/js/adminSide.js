// ── assessments.html ──────────────────────────────
async function initAssessmentsPage() {
  const tbody = document.getElementById('assessmentsBody');
  if (!tbody) return;

  const res = await fetch('/api/assessments');
  const assessments = await res.json();

  tbody.innerHTML = '';

  if (assessments.length === 0) {
    tbody.innerHTML = '<tr><td colspan="3">No assessments yet. Click "New Assessment" to add one.</td></tr>';
    return;
  }

  assessments.forEach(a => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${a.category}</td>
      <td>${a.weight}%</td>
      <td>${a.courseId}</td>
      <td>
        <a href="manage287.html?id=${a.id}" class="action-button action-button--compact">Manage</a>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

// ── manage287.html ────────────────────────────────
async function initManagePage() {
  const form = document.getElementById('weightsForm');
  if (!form) return;

  const params = new URLSearchParams(window.location.search);
  const id = params.get('id');
  if (!id) {
    window.location.href = 'assessments.html';
    return;
  }

  const res = await fetch('/api/assessments');
  const all = await res.json();
  const assessment = all.find(a => a.id === id);

  if (!assessment) {
    window.location.href = 'assessments.html';
    return;
  }

  const subtext = document.getElementById('manageSubtext');
  if (subtext) subtext.textContent = `Editing: ${assessment.category} (${assessment.courseId})`;

  document.getElementById('weightInput').value = assessment.weight;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const weight = Number(document.getElementById('weightInput').value);

    await fetch(`/api/assessments/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ weight })
    });

    window.location.href = 'assessments.html';
  });

  const deleteBtn = document.getElementById('deleteBtn');
  if (deleteBtn) {
    deleteBtn.addEventListener('click', async () => {
      if (!confirm(`Are you sure you want to delete "${assessment.category}"?`)) return;

      await fetch(`/api/assessments/${id}`, { method: 'DELETE' });
      window.location.href = 'assessments.html';
    });
  }
}

// ── create-category.html ──────────────────────────
function initCreatePage() {
  const form = document.getElementById('createCategoryForm');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const courseId = document.getElementById('courseId').value;
    const category = document.getElementById('categoryName').value.trim();
    const weight = Number(document.getElementById('weight').value);
    const errorEl = document.getElementById('createError');

    const res = await fetch('/api/assessments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ courseId, category, weight })
    });

    const data = await res.json();

    if (data.error) {
      errorEl.textContent = data.error;
      errorEl.style.display = 'block';
      return;
    }

    window.location.href = 'assessments.html';
  });
}

document.addEventListener('DOMContentLoaded', () => {
  initAssessmentsPage();
  initManagePage();
  initCreatePage();
});