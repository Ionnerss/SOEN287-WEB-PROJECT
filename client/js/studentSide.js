/****************************************************
 * 1. INITIALIZATION & ENTRY POINT
 ****************************************************/

(function initializeDefaultCourse() {
  const existing = localStorage.getItem('studentCourses');
  if (existing) return;

  const defaultCourse = {
    id: 'SOEN287',
    code: 'SOEN 287',
    name: 'Web Programming',
    instructor: 'TBD',
    term: 'Winter 2026',
    assessments: [],
  };

  localStorage.setItem('studentCourses', JSON.stringify([defaultCourse]));
})();

document.addEventListener('DOMContentLoaded', () => {
  initDashboardPage();
  initCoursePage();
});

/****************************************************
 * 2. LOCALSTORAGE HELPERS
 ****************************************************/

function getCourses() {
  return JSON.parse(localStorage.getItem('studentCourses')) || [];
}

function saveCourses(courses) {
  localStorage.setItem('studentCourses', JSON.stringify(courses));
}

function getCourseById(id) {
  return getCourses().find((c) => c.id === id);
}

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

/****************************************************
 * 3. DASHBOARD PAGE LOGIC
 ****************************************************/

function initDashboardPage() {
  const coursesGrid = document.getElementById('coursesGrid');
  if (!coursesGrid) return;

  renderCoursesDashboard();

  const openAddCourseBtn = document.getElementById('openAddCourseModalBtn');
  const addCourseModal = document.getElementById('addCourseModal');
  const cancelAddCourseBtn = document.getElementById('cancelAddCourseBtn');
  const addCourseForm = document.getElementById('addCourseForm');

  if (openAddCourseBtn && addCourseModal)
    openAddCourseBtn.addEventListener('click', () => addCourseModal.showModal());

  if (cancelAddCourseBtn && addCourseModal)
    cancelAddCourseBtn.addEventListener('click', () => addCourseModal.close());

  if (addCourseForm && addCourseModal) {
    addCourseForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const code = document.getElementById('cCode').value.trim();
      const name = document.getElementById('cName').value.trim();
      const instructor = document.getElementById('cInstructor').value.trim();
      const term = document.getElementById('cTerm').value.trim();
      if (!code || !name || !term) return;

      const courses = getCourses();
      courses.push({ id: Date.now().toString(), code, name, instructor, term, assessments: [] });
      saveCourses(courses);
      addCourseModal.close();
      addCourseForm.reset();
      renderCoursesDashboard();
    });
  }

  const openAddAssessmentBtn = document.getElementById('openAddAssessmentModalBtn');
  const addAssessmentModal = document.getElementById('addAssessmentModal');
  const cancelAddAssessmentBtn = document.getElementById('cancelAddAssessmentBtn');

  if (openAddAssessmentBtn && addAssessmentModal)
    openAddAssessmentBtn.addEventListener('click', () => addAssessmentModal.showModal());

  if (cancelAddAssessmentBtn && addAssessmentModal)
    cancelAddAssessmentBtn.addEventListener('click', () => addAssessmentModal.close());
}

function renderCoursesDashboard() {
  const coursesGrid = document.getElementById('coursesGrid');
  const coursesEmpty = document.getElementById('coursesEmpty');
  if (!coursesGrid) return;

  const courses = getCourses();
  coursesGrid.innerHTML = '';

  if (courses.length === 0) {
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
          <a class="btn btn--small" href="./course.html?courseId=${course.id}">View</a>
        </div>
      </div>
    `;
    coursesGrid.appendChild(card);
  });
}

/****************************************************
 * 4. COURSE PAGE LOGIC
 ****************************************************/

function initCoursePage() {
  const titleEl = document.getElementById('courseTitle');
  const table = document.getElementById('assessmentsTable');
  if (!titleEl || !table) return;

  const urlParams = new URLSearchParams(window.location.search);
  const courseId = urlParams.get('courseId');
  if (!courseId) return;

  loadCourse(courseId);
  setupCoursePageInteractions(courseId);
}

function loadCourse(courseId) {
  const course = getCourseById(courseId);
  if (!course) return;

  const titleEl = document.getElementById('courseTitle');
  const metaEl = document.getElementById('courseMeta');
  if (titleEl) titleEl.textContent = `${course.code} • ${course.name}`;
  if (metaEl) metaEl.textContent = `${course.term} • Instructor: ${course.instructor}`;

  renderAssessments(courseId);
  loadAdminCategories(courseId);
}

/****************************************************
 * 5. RENDER STUDENT ASSESSMENTS
 ****************************************************/

function renderAssessments(courseId) {
  const course = getCourseById(courseId);
  const table = document.getElementById('assessmentsTable');
  if (!course || !table) return;

  table.innerHTML = '';

  course.assessments.forEach((a) => {
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

/****************************************************
 * 6. ADMIN CATEGORIES (fetched from backend)
 ****************************************************/

function renderAdminRow(a, isSubmitted) {
  const row = document.createElement('tr');
  row.id = 'adminrow-' + a.id;
  row.innerHTML = `
    <td>${a.category}</td>
    <td>—</td>
    <td>${a.dueDate || '—'}</td>
    <td>${a.weight}%</td>
    <td id="status-${a.id}">${isSubmitted ? 'Submitted' : 'Not Submitted'}</td>
    <td class="right">
      ${isSubmitted
        ? `<button class="btn btn--small" data-action="retract-assessment" data-assessment-id="${a.id}">Retract</button>`
        : `<button class="btn btn--small" data-action="submit-assessment" data-assessment-id="${a.id}">Submit</button>`
      }
    </td>
  `;
  return row;
}

function loadAdminCategories(courseId) {
  const table = document.getElementById('assessmentsTable');
  if (!table) return;

  fetch('/api/assessments?courseId=' + courseId)
    .then(function(res) { return res.json(); })
    .then(function(categories) {
      if (!categories || categories.length === 0) return;

      const headerRow = document.createElement('tr');
      headerRow.innerHTML = `
        <td colspan="6" style="background:#f5f5f5; font-weight:bold; color:#800020; padding: 0.6rem 0.7rem;">
          Admin-defined Categories
        </td>
      `;
      table.appendChild(headerRow);

      const submissions = getSubmissions();

      categories.forEach(function(a) {
        const isSubmitted = submissions[a.id] === true;
        table.appendChild(renderAdminRow(a, isSubmitted));
      });

      // Handle submit and retract clicks
      table.addEventListener('click', function(e) {
        const submitBtn = e.target.closest("[data-action='submit-assessment']");
        const retractBtn = e.target.closest("[data-action='retract-assessment']");

        if (submitBtn) {
          const id = submitBtn.getAttribute('data-assessment-id');
          const submissions = getSubmissions();
          submissions[id] = true;
          saveSubmissions(submissions);

          // Increment stats
          const stats = getSubmissionStats();
          stats.total = (stats.total || 0) + 1;
          saveSubmissionStats(stats);

          // Update row in place
          const row = document.getElementById('adminrow-' + id);
          const a = categories.find(c => c.id === id);
          if (row && a) row.replaceWith(renderAdminRow(a, true));
        }

        if (retractBtn) {
          const id = retractBtn.getAttribute('data-assessment-id');
          const submissions = getSubmissions();
          submissions[id] = false;
          saveSubmissions(submissions);

          // Decrement stats
          const stats = getSubmissionStats();
          stats.total = Math.max(0, (stats.total || 0) - 1);
          saveSubmissionStats(stats);

          // Update row in place
          const row = document.getElementById('adminrow-' + id);
          const a = categories.find(c => c.id === id);
          if (row && a) row.replaceWith(renderAdminRow(a, false));
        }
      });
    })
    .catch(function(err) {
      console.warn('Could not load admin categories:', err);
    });
}

/****************************************************
 * 7. COURSE PAGE INTERACTIONS
 ****************************************************/

function setupCoursePageInteractions(courseId) {
  const addAssessmentModal = document.getElementById('addAssessmentModal');
  const openAddAssessmentBtn = document.getElementById('openAddAssessmentModalBtn');
  const cancelAddAssessmentBtn = document.getElementById('cancelAddAssessmentBtn');
  const cancelAddAssessmentBtn2 = document.getElementById('cancelAddAssessmentBtn2');
  const addAssessmentForm = document.getElementById('addAssessmentForm');
  const table = document.getElementById('assessmentsTable');

  if (openAddAssessmentBtn && addAssessmentModal)
    openAddAssessmentBtn.addEventListener('click', () => addAssessmentModal.showModal());

  if (cancelAddAssessmentBtn)
    cancelAddAssessmentBtn.addEventListener('click', () => addAssessmentModal.close());

  if (cancelAddAssessmentBtn2)
    cancelAddAssessmentBtn2.addEventListener('click', () => addAssessmentModal.close());

  if (addAssessmentForm) {
    addAssessmentForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const courses = getCourses();
      const course = courses.find((c) => c.id === courseId);
      if (!course) return;

      course.assessments.push({
        id: Date.now().toString(),
        title: document.getElementById('aTitle').value.trim(),
        category: document.getElementById('aType').value,
        dueDate: document.getElementById('aDue').value,
        earned: Number(document.getElementById('aEarned').value),
        total: Number(document.getElementById('aTotal').value),
        completed: document.getElementById('aCompleted').checked,
      });

      saveCourses(courses);
      addAssessmentModal.close();
      addAssessmentForm.reset();
      renderAssessments(courseId);
      loadAdminCategories(courseId);
    });
  }

  if (table) {
    table.addEventListener('click', (e) => {
      const btn = e.target.closest("[data-action='delete-assessment']");
      if (!btn) return;
      const assessmentId = btn.getAttribute('data-assessment-id');
      if (!assessmentId) return;

      const courses = getCourses();
      const course = courses.find((c) => c.id === courseId);
      if (!course) return;

      course.assessments = course.assessments.filter((a) => a.id !== assessmentId);
      saveCourses(courses);
      renderAssessments(courseId);
      loadAdminCategories(courseId);
    });
  }

  const editCourseModal = document.getElementById('editCourseModal');
  const editCourseBtn = document.getElementById('editCourseBtn');
  const cancelEditCourseBtn = document.getElementById('cancelEditCourseBtn');
  const cancelEditCourseBtn2 = document.getElementById('cancelEditCourseBtn2');
  const editCourseForm = document.getElementById('editCourseForm');

  if (editCourseBtn && editCourseModal) {
    editCourseBtn.addEventListener('click', () => {
      const course = getCourseById(courseId);
      if (!course) return;
      document.getElementById('eCode').value = course.code;
      document.getElementById('eName').value = course.name;
      document.getElementById('eInstructor').value = course.instructor;
      document.getElementById('eTerm').value = course.term;
      editCourseModal.showModal();
    });
  }

  if (cancelEditCourseBtn) cancelEditCourseBtn.addEventListener('click', () => editCourseModal.close());
  if (cancelEditCourseBtn2) cancelEditCourseBtn2.addEventListener('click', () => editCourseModal.close());

  if (editCourseForm) {
    editCourseForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const courses = getCourses();
      const course = courses.find((c) => c.id === courseId);
      if (!course) return;

      course.code = document.getElementById('eCode').value.trim();
      course.name = document.getElementById('eName').value.trim();
      course.instructor = document.getElementById('eInstructor').value.trim();
      course.term = document.getElementById('eTerm').value.trim();

      saveCourses(courses);
      editCourseModal.close();
      loadCourse(courseId);
    });
  }
}