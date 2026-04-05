/****************************************************
 * 1. INITIALIZATION & ENTRY POINT
 ****************************************************/

document.addEventListener('DOMContentLoaded', () => {
  initDashboardPage();
  initCoursePage();
});

/****************************************************
 * 2. LOCALSTORAGE HELPERS
 ****************************************************/

function getSubmissions() {
  return JSON.parse(localStorage.getItem('submissions')) || {};
}

function saveSubmissions(submissions) {
  localStorage.setItem('submissions', JSON.stringify(submissions));
}

function getSubmissionStats() {
  return JSON.parse(localStorage.getItem('submissionStats')) || { total: 0 };
}

function saveSubmissionStats(stats) {
  localStorage.setItem('submissionStats', JSON.stringify(stats));
}

// Student-added assessments (personal goals) stored by course code
function getStudentAssessments(courseCode) {
  const all = JSON.parse(localStorage.getItem('studentAssessments') || '{}');
  return all[courseCode] || [];
}

function saveStudentAssessments(courseCode, assessments) {
  const all = JSON.parse(localStorage.getItem('studentAssessments') || '{}');
  all[courseCode] = assessments;
  localStorage.setItem('studentAssessments', JSON.stringify(all));
}

/****************************************************
 * 3. DASHBOARD PAGE LOGIC
 ****************************************************/

function initDashboardPage() {
  const coursesGrid = document.getElementById('coursesGrid');
  if (!coursesGrid) return;

  renderCoursesDashboard();

  const openAddBtn = document.getElementById('openAddAssessmentModalBtn');
  const modal = document.getElementById('addAssessmentModal');
  const cancelBtn = document.getElementById('cancelAddAssessmentBtn');

  if (openAddBtn && modal) openAddBtn.addEventListener('click', () => modal.showModal());
  if (cancelBtn && modal) cancelBtn.addEventListener('click', () => modal.close());
}

async function renderCoursesDashboard() {
  const coursesGrid = document.getElementById('coursesGrid');
  const coursesEmpty = document.getElementById('coursesEmpty');
  if (!coursesGrid) return;

  try {
    const res = await fetch('/api/courses');
    const courses = await res.json();

    coursesGrid.innerHTML = '';

    if (!courses || courses.length === 0) {
      if (coursesEmpty) coursesEmpty.hidden = false;
      return;
    } else {
      if (coursesEmpty) coursesEmpty.hidden = true;
    }

    courses.forEach((course) => {
      const card = document.createElement('article');
      card.className = 'coursecard';
      card.innerHTML = `
        <div class="coursecard__main">
          <div class="coursecard__title">${course.code}</div>
          <div class="muted small">${course.name} • ${course.term || ''}</div>
          <div class="row row--wrap gap small">
            <span class="chip">Avg: --%</span>
            <span class="chip">Progress: --</span>
          </div>
        </div>
        <div class="coursecard__side">
          <div class="progress">
            <div class="progress__bar" style="width: 0%"></div>
          </div>
          <div class="row gap">
            <a class="btn btn--small" href="./course.html?courseId=${course.code}">View</a>
          </div>
        </div>
      `;
      coursesGrid.appendChild(card);
    });
  } catch (err) {
    console.error('Failed to load courses:', err);
  }
}

/****************************************************
 * 4. COURSE PAGE LOGIC
 ****************************************************/

function initCoursePage() {
  const titleEl = document.getElementById('courseTitle');
  const table = document.getElementById('assessmentsTable');
  if (!titleEl || !table) return;

  const urlParams = new URLSearchParams(window.location.search);
  const courseCode = urlParams.get('courseId'); // e.g. "SOEN287"
  if (!courseCode) return;

  loadCourseData(courseCode);
}

async function loadCourseData(courseCode) {
  try {
    const res = await fetch('/api/courses');
    const courses = await res.json();
    const course = courses.find(c => c.code === courseCode);

    if (course) {
      const titleEl = document.getElementById('courseTitle');
      const metaEl = document.getElementById('courseMeta');
      if (titleEl) titleEl.textContent = `${course.code} • ${course.name}`;
      if (metaEl) metaEl.textContent = `${course.term || ''} • Instructor: ${course.instructor || 'TBD'}`;

      const realId = course.course_id || course.id;

      // Render local student data
      renderStudentAssessments(courseCode);
      
      // Render DB admin data using numerical ID
      loadAdminCategories(realId);

      // Pass both to interactions
      setupCoursePageInteractions(courseCode, realId);
    }
  } catch (err) {
    console.error('Failed to load course:', err);
  }
}

/****************************************************
 * 5. RENDERING ASSESSMENTS
 ****************************************************/

function renderStudentAssessments(courseCode) {
  const assessments = getStudentAssessments(courseCode);
  const table = document.getElementById('assessmentsTable');
  if (!table) return;

  table.innerHTML = ''; // Fresh start

  assessments.forEach((a) => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${a.title}</td>
      <td>${a.category}</td>
      <td>${a.dueDate}</td>
      <td>${a.earned}/${a.total}</td>
      <td>${a.completed ? 'Submitted' : 'Not Submitted'}</td>
      <td class="right">
        <button class="btn btn--ghost btn--small"
          data-action="delete-assessment"
          data-assessment-id="${a.id}">🗑</button>
      </td>
    `;
    table.appendChild(row);
  });
}

function renderAdminRow(a, isSubmitted) {
  const row = document.createElement('tr');
  const aid = a.assessment_id;
  row.id = 'adminrow-' + aid;
  row.innerHTML = `
    <td>${a.title}</td>
    <td>${a.type || a.category}</td>
    <td>${a.due_date ? a.due_date.slice(0,10) : '—'}</td>
    <td>${a.weight ? a.weight + '%' : '—'}</td>
    <td id="status-${aid}">${isSubmitted ? 'Submitted' : 'Not Submitted'}</td>
    <td class="right">
      ${isSubmitted
        ? `<button class="btn btn--small" data-action="retract-assessment" data-assessment-id="${aid}">Retract</button>`
        : `<button class="btn btn--small" data-action="submit-assessment" data-assessment-id="${aid}">Submit</button>`
      }
    </td>
  `;
  return row;
}

function loadAdminCategories(realId) {
  const table = document.getElementById('assessmentsTable');
  if (!table) return;

  fetch('/api/assessments/admin/all?courseId=' + realId)
    .then(res => res.json())
    .then(categories => {
      if (!categories || categories.length === 0) return;

      const headerRow = document.createElement('tr');
      headerRow.innerHTML = `
        <td colspan="6" style="background:#f5f5f5; font-weight:bold; color:#800020; padding: 0.6rem 0.7rem;">
          Admin-defined Categories
        </td>
      `;
      table.appendChild(headerRow);

      const submissions = getSubmissions();

      categories.forEach(a => {
        const isSubmitted = submissions[a.assessment_id] === true;
        table.appendChild(renderAdminRow(a, isSubmitted));
      });

      // Attach delegation for dynamic rows
      table.addEventListener('click', (e) => handleTableClick(e, categories));
    })
    .catch(err => console.warn('Could not load admin categories:', err));
}

/****************************************************
 * 6. TABLE INTERACTION HANDLER
 ****************************************************/

function handleTableClick(e, categories) {
  const submitBtn = e.target.closest("[data-action='submit-assessment']");
  const retractBtn = e.target.closest("[data-action='retract-assessment']");

  if (submitBtn) {
    const id = submitBtn.getAttribute('data-assessment-id');
    const subs = getSubmissions();
    subs[id] = true;
    saveSubmissions(subs);

    const stats = getSubmissionStats();
    stats.total = (stats.total || 0) + 1;
    saveSubmissionStats(stats);

    const row = document.getElementById('adminrow-' + id);
    const a = categories.find(c => String(c.assessment_id) === String(id));
    if (row && a) row.replaceWith(renderAdminRow(a, true));
  }

  if (retractBtn) {
    const id = retractBtn.getAttribute('data-assessment-id');
    const subs = getSubmissions();
    subs[id] = false;
    saveSubmissions(subs);

    const stats = getSubmissionStats();
    stats.total = Math.max(0, (stats.total || 0) - 1);
    saveSubmissionStats(stats);

    const row = document.getElementById('adminrow-' + id);
    const a = categories.find(c => String(c.assessment_id) === String(id));
    if (row && a) row.replaceWith(renderAdminRow(a, false));
  }
}

/****************************************************
 * 7. COURSE PAGE INTERACTIONS (Modals/Forms)
 ****************************************************/

function setupCoursePageInteractions(courseCode, realId) {
  const addModal = document.getElementById('addAssessmentModal');
  const openAddBtn = document.getElementById('openAddAssessmentModalBtn');
  const cancelBtns = [
    document.getElementById('cancelAddAssessmentBtn'),
    document.getElementById('cancelAddAssessmentBtn2')
  ];
  const addForm = document.getElementById('addAssessmentForm');
  const table = document.getElementById('assessmentsTable');

  if (openAddBtn && addModal) openAddBtn.addEventListener('click', () => addModal.showModal());
  cancelBtns.forEach(btn => {
    if (btn) btn.addEventListener('click', () => addModal.close());
  });

  if (addForm) {
    addForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const assessments = getStudentAssessments(courseCode);
      assessments.push({
        id: Date.now().toString(),
        title: document.getElementById('aTitle').value.trim(),
        category: document.getElementById('aType').value,
        dueDate: document.getElementById('aDue').value,
        earned: Number(document.getElementById('aEarned').value),
        total: Number(document.getElementById('aTotal').value),
        completed: document.getElementById('aCompleted').checked,
      });

      saveStudentAssessments(courseCode, assessments);
      addModal.close();
      addForm.reset();
      renderStudentAssessments(courseCode);
      loadAdminCategories(realId);
    });
  }

  if (table) {
    table.addEventListener('click', (e) => {
      const delBtn = e.target.closest("[data-action='delete-assessment']");
      if (!delBtn) return;
      const id = delBtn.getAttribute('data-assessment-id');
      const assessments = getStudentAssessments(courseCode).filter(a => a.id !== id);
      saveStudentAssessments(courseCode, assessments);
      renderStudentAssessments(courseCode);
      loadAdminCategories(realId);
    });
  }

  // Edit Course Logic
  const editModal = document.getElementById('editCourseModal');
  const editBtn = document.getElementById('editCourseBtn');
  const editForm = document.getElementById('editCourseForm');

  if (editBtn && editModal) {
    editBtn.addEventListener('click', async () => {
      const res = await fetch('/api/courses');
      const courses = await res.json();
      const course = courses.find(c => c.code === courseCode);
      if (!course) return;

      document.getElementById('eCode').value = course.code;
      document.getElementById('eName').value = course.name;
      document.getElementById('eInstructor').value = course.instructor || '';
      document.getElementById('eTerm').value = course.term || '';
      editModal.showModal();
    });
  }

  if (editForm) {
    editForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      // We need the database ID for the PUT request
      await fetch('/api/courses/' + realId, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: document.getElementById('eCode').value.trim(),
          name: document.getElementById('eName').value.trim(),
          instructor: document.getElementById('eInstructor').value.trim(),
          term: document.getElementById('eTerm').value.trim(),
        })
      });

      editModal.close();
      window.location.href = `./course.html?courseId=${document.getElementById('eCode').value.trim()}`;
    });
  }
}