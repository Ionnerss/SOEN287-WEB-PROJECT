/****************************************************
 * 1. INITIALIZATION & ENTRY POINT
 ****************************************************/

// Ensure a default course exists only if nothing is stored yet
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
  console.log('Default course created:', defaultCourse);
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
  const courses = getCourses();
  return courses.find((c) => c.id === id);
}

/****************************************************
 * 3. DASHBOARD PAGE LOGIC
 ****************************************************/

function initDashboardPage() {
  const coursesGrid = document.getElementById('coursesGrid');
  if (!coursesGrid) return; // not on dashboard

  renderCoursesDashboard();

  // Add Course modal
  const openAddCourseBtn = document.getElementById('openAddCourseModalBtn');
  const addCourseModal = document.getElementById('addCourseModal');
  const cancelAddCourseBtn = document.getElementById('cancelAddCourseBtn');
  const addCourseForm = document.getElementById('addCourseForm');

  if (openAddCourseBtn && addCourseModal) {
    openAddCourseBtn.addEventListener('click', () => addCourseModal.showModal());
  }

  if (cancelAddCourseBtn && addCourseModal) {
    cancelAddCourseBtn.addEventListener('click', () => addCourseModal.close());
  }

  if (addCourseForm && addCourseModal) {
    addCourseForm.addEventListener('submit', (e) => {
      e.preventDefault();

      const code = document.getElementById('cCode').value.trim();
      const name = document.getElementById('cName').value.trim();
      const instructor = document.getElementById('cInstructor').value.trim();
      const term = document.getElementById('cTerm').value.trim();

      if (!code || !name || !term) return;

      const courses = getCourses();

      const newCourse = {
        id: Date.now().toString(),
        code,
        name,
        instructor,
        term,
        assessments: [],
      };

      courses.push(newCourse);
      saveCourses(courses);

      addCourseModal.close();
      addCourseForm.reset();
      renderCoursesDashboard();
    });
  }

  // Dashboard Add Assessment modal (just open/close for now)
  const openAddAssessmentBtn = document.getElementById('openAddAssessmentModalBtn');
  const addAssessmentModal = document.getElementById('addAssessmentModal');
  const cancelAddAssessmentBtn = document.getElementById('cancelAddAssessmentBtn');

  if (openAddAssessmentBtn && addAssessmentModal) {
    openAddAssessmentBtn.addEventListener('click', () => addAssessmentModal.showModal());
  }

  if (cancelAddAssessmentBtn && addAssessmentModal) {
    cancelAddAssessmentBtn.addEventListener('click', () => addAssessmentModal.close());
  }
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
          <button class="btn btn--ghost btn--small" type="button">Edit</button>
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
  if (!titleEl || !table) return; // not on course page

  const urlParams = new URLSearchParams(window.location.search);
  const courseId = urlParams.get('courseId');
  if (!courseId) return;

  loadCourse(courseId);
  setupCoursePageInteractions(courseId);
}

function loadCourse(courseId) {
  const course = getCourseById(courseId);
  if (!course) {
    console.warn('Course not found for id:', courseId);
    return;
  }

  const titleEl = document.getElementById('courseTitle');
  const metaEl = document.getElementById('courseMeta');

  if (titleEl) {
    titleEl.textContent = `${course.code} • ${course.name}`;
  }
  if (metaEl) {
    metaEl.textContent = `${course.term} • Instructor: ${course.instructor}`;
  }

  renderAssessments(courseId);
}

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
      <td>${a.completed ? 'Completed' : 'Pending'}</td>
      <td class="right">
        <button class="btn btn--ghost btn--small"
          data-action="delete-assessment"
          data-assessment-id="${a.id}">🗑</button>
      </td>
    `;

    table.appendChild(row);
  });
}

function setupCoursePageInteractions(courseId) {
  const addAssessmentModal = document.getElementById('addAssessmentModal');
  const openAddAssessmentBtn = document.getElementById('openAddAssessmentModalBtn');
  const cancelAddAssessmentBtn = document.getElementById('cancelAddAssessmentBtn');
  const addAssessmentForm = document.getElementById('addAssessmentForm');
  const table = document.getElementById('assessmentsTable');

  // Modal open/close
  if (openAddAssessmentBtn && addAssessmentModal && cancelAddAssessmentBtn) {
    openAddAssessmentBtn.addEventListener('click', () => addAssessmentModal.showModal());
    cancelAddAssessmentBtn.addEventListener('click', () => addAssessmentModal.close());
  }

  // Add assessment submit
  if (addAssessmentForm && addAssessmentModal) {
    addAssessmentForm.addEventListener('submit', (e) => {
      e.preventDefault();

      const courses = getCourses();
      const course = courses.find((c) => c.id === courseId);
      if (!course) {
        console.warn('Course not found on submit for id:', courseId);
        return;
      }

      const newAssessment = {
        id: Date.now().toString(),
        title: document.getElementById('aTitle').value.trim(),
        category: document.getElementById('aType').value,
        dueDate: document.getElementById('aDue').value,
        earned: Number(document.getElementById('aEarned').value),
        total: Number(document.getElementById('aTotal').value),
        completed: document.getElementById('aCompleted').checked,
      };

      course.assessments.push(newAssessment);
      saveCourses(courses);

      addAssessmentModal.close();
      addAssessmentForm.reset();
      renderAssessments(courseId);
    });
  }

  // Delete assessment via event delegation
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
    });
  }
}
