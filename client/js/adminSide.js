// ── assessments.html ──────────────────────────────
async function initAssessmentsPage() {
  var tbody = document.getElementById('assessmentsBody');
  if (!tbody) return;

  const res = await fetch('/api/assessments');
  const assessments = await res.json();

  tbody.innerHTML = '';

  if (assessments.length === 0) {
    tbody.innerHTML = '<tr><td colspan="4">No assessments yet. Click "New Assessment" to add one.</td></tr>';
    return;
  }

  // Group by courseId
  var grouped = {};
  assessments.forEach(function(a) {
    if (!grouped[a.courseId]) grouped[a.courseId] = [];
    grouped[a.courseId].push(a);
  });

  // Render each group with a course header row
  Object.entries(grouped).forEach(function(entry) {
    var courseId = entry[0];
    var items = entry[1];

    var headerRow = document.createElement('tr');
    headerRow.innerHTML = '<td colspan="4" style="background:#f5f5f5; font-weight:bold; color:#800020; padding: 0.6rem 1rem;">' + courseId + '</td>';
    tbody.appendChild(headerRow);

    items.forEach(function(a) {
      var tr = document.createElement('tr');
      tr.innerHTML =
        '<td style="text-align:center; font-weight:bold;">' + a.category + '</td>' +
        '<td style="text-align:center; font-weight:bold;">' + a.weight + '%</td>' +
        '<td style="text-align:center; font-weight:bold;">' + a.courseId + '</td>' +
        '<td style="text-align:center; vertical-align:middle;"><a href="manage287.html?id=' + a.id + '" class="action-button action-button--compact">Manage</a></td>';
      tbody.appendChild(tr);
    });
  });
}

// ── manage287.html ────────────────────────────────
async function initManagePage() {
  var form = document.getElementById('weightsForm');
  if (!form) return;

  var params = new URLSearchParams(window.location.search);
  var id = params.get('id');
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

  var subtext = document.getElementById('manageSubtext');
  if (subtext) subtext.textContent = 'Editing: ' + assessment.category + ' (' + assessment.courseId + ')';

  document.getElementById('weightInput').value = assessment.weight;

  form.addEventListener('submit', async function(e) {
    e.preventDefault();
    var weight = Number(document.getElementById('weightInput').value);

    await fetch('/api/assessments/' + id, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ weight: weight })
    });

    window.location.href = 'assessments.html';
  });

  var deleteBtn = document.getElementById('deleteBtn');
  if (deleteBtn) {
    deleteBtn.addEventListener('click', async function() {
      if (!confirm('Are you sure you want to delete "' + assessment.category + '"?')) return;

      await fetch('/api/assessments/' + id, { method: 'DELETE' });
      window.location.href = 'assessments.html';
    });
  }
}

// ── create-category.html ──────────────────────────
function initCreatePage() {
  var form = document.getElementById('createCategoryForm');
  if (!form) return;

  form.addEventListener('submit', async function(e) {
    e.preventDefault();

    var courseId = document.getElementById('courseId').value;
    var category = document.getElementById('categoryName').value.trim();
    var weight = Number(document.getElementById('weight').value);
    var errorEl = document.getElementById('createError');

    const res = await fetch('/api/assessments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ courseId: courseId, category: category, weight: weight })
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

document.addEventListener('DOMContentLoaded', function() {
  initAssessmentsPage();
  initManagePage();
  initCreatePage();
});