// ── assessments.html ──────────────────────────────
async function initAssessmentsPage() {
  var tbody = document.getElementById('assessmentsBody');
  if (!tbody) return;

  const res = await fetch('/api/assessments');
  const assessments = await res.json();

  tbody.innerHTML = '';

  if (assessments.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6">No assessments yet. Click "New Assessment" to add one.</td></tr>';
    return;
  }

  // Group by courseId
  var grouped = {};
  assessments.forEach(function(a) {
    if (!grouped[a.courseId]) grouped[a.courseId] = [];
    grouped[a.courseId].push(a);
  });

  var courseLinks = {
    'SOEN287': '/pages/studentSide/course.html?courseId=SOEN287',
    'COMP248': '/pages/studentSide/course.html?courseId=COMP248'
  };

  Object.entries(grouped).forEach(function(entry) {
    var courseId = entry[0];
    var items = entry[1];

    var headerRow = document.createElement('tr');
    headerRow.innerHTML = '<td colspan="6" style="background:#f5f5f5; font-weight:bold; color:#800020; padding: 0.6rem 1rem;">' + courseId + '</td>';
    tbody.appendChild(headerRow);

    items.forEach(function(a) {
      var studentLink = courseLinks[a.courseId] || '/pages/studentSide/course.html?courseId=' + a.courseId;
      var tr = document.createElement('tr');
      tr.innerHTML =
        '<td style="text-align:center; font-weight:bold; vertical-align:middle;">' +
          '<a href="' + studentLink + '" style="color:#800020;">' + a.title + '</a>' +
        '</td>' +
        '<td style="text-align:center; font-weight:bold; vertical-align:middle;">' + a.type + '</td>' +
        '<td style="text-align:center; font-weight:bold; vertical-align:middle;">' + a.weight + '%</td>' +
        '<td style="text-align:center; font-weight:bold; vertical-align:middle;">' + (a.dueDate || '—') + '</td>' +
        '<td style="text-align:center; font-weight:bold; vertical-align:middle;">' + a.courseId + '</td>' +
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
  if (subtext) subtext.textContent = 'Editing: ' + assessment.title + ' (' + assessment.courseId + ')';

  document.getElementById('titleInput').value = assessment.title;
  document.getElementById('typeInput').value = assessment.type;
  document.getElementById('weightInput').value = assessment.weight;
  if (assessment.dueDate && assessment.dueDate !== '—') {
    document.getElementById('dueDateInput').value = assessment.dueDate;
  }

  // Remove Final option if another Final already exists for this course
  const allForCourse = all.filter(a => a.courseId === assessment.courseId && a.id !== id);
  const hasFinal = allForCourse.some(a => a.type === 'Final');
  if (hasFinal) {
    const finalOption = document.getElementById('typeInput').querySelector('option[value="Final"]');
    if (finalOption) finalOption.remove();
  }

  form.addEventListener('submit', async function(e) {
    e.preventDefault();
    const formError = document.getElementById('formError');
    const title = document.getElementById('titleInput').value.trim();
    const type = document.getElementById('typeInput').value;
    const weight = Number(document.getElementById('weightInput').value);
    const dueDate = document.getElementById('dueDateInput').value;

    const updateRes = await fetch('/api/assessments/' + id, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, type, weight, dueDate })
    });

    const data = await updateRes.json();
    if (data.error) {
      formError.textContent = data.error;
      formError.style.display = 'block';
      return;
    }

    window.location.href = 'assessments.html';
  });

  var deleteBtn = document.getElementById('deleteBtn');
  if (deleteBtn) {
    deleteBtn.addEventListener('click', async function() {
      if (!confirm('Are you sure you want to delete "' + assessment.title + '"?')) return;
      await fetch('/api/assessments/' + id, { method: 'DELETE' });
      window.location.href = 'assessments.html';
    });
  }
}

// ── create-category.html ──────────────────────────
function initCreatePage() {
  var form = document.getElementById('createCategoryForm');
  if (!form) return;

  const courseSelect = document.getElementById('courseId');
  const typeSelect = document.getElementById('type');

  // When course changes, check if Final already exists for that course
  courseSelect.addEventListener('change', async function() {
    const courseId = courseSelect.value;
    if (!courseId) return;

    const res = await fetch('/api/assessments?courseId=' + courseId);
    const assessments = await res.json();
    const hasFinal = assessments.some(a => a.type === 'Final');

    const existingFinalOption = typeSelect.querySelector('option[value="Final"]');
    if (hasFinal && existingFinalOption) {
      existingFinalOption.remove();
    } else if (!hasFinal && !existingFinalOption) {
      const option = document.createElement('option');
      option.value = 'Final';
      option.textContent = 'Final';
      typeSelect.appendChild(option);
    }
  });

  form.addEventListener('submit', async function(e) {
    e.preventDefault();

    var courseId = document.getElementById('courseId').value;
    var title = document.getElementById('title').value.trim();
    var type = document.getElementById('type').value;
    var weight = Number(document.getElementById('weight').value);
    var dueDate = document.getElementById('dueDate').value;
    var errorEl = document.getElementById('createError');

    const res = await fetch('/api/assessments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ courseId, title, type, weight, dueDate })
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