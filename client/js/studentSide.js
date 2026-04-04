const API_BASE = "http://localhost:3000/api";

/****************************************************
 * 1. ENTRY POINT
 ****************************************************/

document.addEventListener("DOMContentLoaded", () => {
  initDashboardPage();
  initCoursePage();
});

/****************************************************
 * 2. DASHBOARD PAGE (COURSES LIST + ADD COURSE)
 ****************************************************/

function initDashboardPage() {
  const coursesGrid = document.getElementById("coursesGrid");
  if (!coursesGrid) return; // not on dashboard

  loadCoursesDashboard();

  const openAddCourseBtn = document.getElementById("openAddCourseModalBtn");
  const addCourseModal = document.getElementById("addCourseModal");
  const cancelAddCourseBtn = document.getElementById("cancelAddCourseBtn");
  const addCourseForm = document.getElementById("addCourseForm");

  if (openAddCourseBtn && addCourseModal)
    openAddCourseBtn.addEventListener("click", () => addCourseModal.showModal());

  if (cancelAddCourseBtn && addCourseModal)
    cancelAddCourseBtn.addEventListener("click", () => addCourseModal.close());

  if (addCourseForm && addCourseModal) {
    addCourseForm.addEventListener("submit", async (e) => {
      e.preventDefault();

      const code = document.getElementById("cCode").value.trim();
      const name = document.getElementById("cName").value.trim();
      const instructor = document.getElementById("cInstructor").value.trim();
      const term = document.getElementById("cTerm").value.trim();
      if (!code || !name || !term) return;

      const newCourse = {
        code,
        name,
        instructor,
        term,
        user_id: 1, // TODO: replace with real user id from auth
      };

      try {
        await fetch(`${API_BASE}/courses`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(newCourse),
        });

        addCourseModal.close();
        addCourseForm.reset();
        loadCoursesDashboard();
      } catch (err) {
        console.error("Error adding course:", err);
      }
    });
  }
}

async function loadCoursesDashboard() {
  const coursesGrid = document.getElementById("coursesGrid");
  const coursesEmpty = document.getElementById("coursesEmpty");
  if (!coursesGrid) return;

  coursesGrid.innerHTML = "";

  try {
    const res = await fetch(`${API_BASE}/courses`);
    const courses = await res.json();

    if (!courses || courses.length === 0) {
      if (coursesEmpty) coursesEmpty.hidden = false;
      return;
    } else {
      if (coursesEmpty) coursesEmpty.hidden = true;
    }

    courses.forEach((course) => {
      const card = document.createElement("article");
      card.className = "coursecard";
      card.innerHTML = `
        <div class="coursecard__main">
          <div class="coursecard__title">${course.code}</div>
          <div class="muted small">${course.name} • ${course.term || ""}</div>
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
            <a class="btn btn--small" href="./course.html?courseId=${course.course_id}">View</a>
            <button class="btn btn--ghost btn--small" data-action="delete-course" data-course-id="${course.course_id}">🗑</button>
          </div>
        </div>
      `;
      coursesGrid.appendChild(card);
    });

    coursesGrid.addEventListener("click", async (e) => {
      const btn = e.target.closest("[data-action='delete-course']");
      if (!btn) return;
      const id = btn.getAttribute("data-course-id");
      if (!id) return;

      try {
        await fetch(`${API_BASE}/courses/${id}`, { method: "DELETE" });
        loadCoursesDashboard();
      } catch (err) {
        console.error("Error deleting course:", err);
      }
    }, { once: true });

  } catch (err) {
    console.error("Error loading courses:", err);
  }
}

/****************************************************
 * 3. COURSE PAGE INIT
 ****************************************************/

function initCoursePage() {
  const titleEl = document.getElementById("courseTitle");
  const table = document.getElementById("assessmentsTable");
  if (!titleEl || !table) return; // not on course page

  const urlParams = new URLSearchParams(window.location.search);
  const courseId = urlParams.get("courseId");
  if (!courseId) return;

  loadCourse(courseId);
  setupCoursePageInteractions(courseId);
}

async function loadCourse(courseId) {
  try {
    const res = await fetch(`${API_BASE}/courses/${courseId}`);
    if (!res.ok) return;
    const course = await res.json();

    const titleEl = document.getElementById("courseTitle");
    const metaEl = document.getElementById("courseMeta");
    if (titleEl) titleEl.textContent = `${course.code} • ${course.name}`;
    if (metaEl) metaEl.textContent = `${course.term} • Instructor: ${course.instructor || "TBD"}`;

    await renderAssessments(courseId);
    await loadAdminCategories(courseId);
  } catch (err) {
    console.error("Error loading course:", err);
  }
}

/****************************************************
 * 4. RENDER STUDENT ASSESSMENTS (BACKEND)
 ****************************************************/

async function renderAssessments(courseId) {
  const table = document.getElementById("assessmentsTable");
  if (!table) return;

  // Clear existing rows
  table.innerHTML = "";

  try {
    const res = await fetch(`${API_BASE}/assessments?courseId=${courseId}`);
    const assessments = await res.json();

    assessments.forEach((a) => {
      const row = document.createElement("tr");
      row.innerHTML = `
        <td>${a.title}</td>
        <td>${a.category}</td>
        <td>${a.due_date || a.dueDate || ""}</td>
        <td>${a.earned}/${a.total}</td>
        <td>${a.completed ? "Submitted" : "Not Submitted"}</td>
        <td class="right">
          <button class="btn btn--ghost btn--small"
            data-action="delete-assessment"
            data-assessment-id="${a.assessment_id}">
            🗑
          </button>
        </td>
      `;
      table.appendChild(row);
    });
  } catch (err) {
    console.error("Error loading assessments:", err);
  }
}

/****************************************************
 * 5. ADMIN CATEGORIES (BACKEND, NO LOCALSTORAGE)
 ****************************************************/

function renderAdminRow(a, isSubmitted) {
  const row = document.createElement("tr");
  row.id = "adminrow-" + a.id;
  row.innerHTML = `
    <td>${a.category}</td>
    <td>—</td>
    <td>${a.due_date || a.dueDate || "—"}</td>
    <td>${a.weight}%</td>
    <td id="status-${a.id}">${isSubmitted ? "Submitted" : "Not Submitted"}</td>
    <td class="right">
      ${
        isSubmitted
          ? `<button class="btn btn--small" data-action="retract-assessment" data-assessment-id="${a.id}">Retract</button>`
          : `<button class="btn btn--small" data-action="submit-assessment" data-assessment-id="${a.id}">Submit</button>`
      }
    </td>
  `;
  return row;
}

async function loadAdminCategories(courseId) {
  const table = document.getElementById("assessmentsTable");
  if (!table) return;

  try {
    const res = await fetch(`${API_BASE}/assessments/admin?courseId=${courseId}`);
    const categories = await res.json();
    if (!categories || categories.length === 0) return;

    const headerRow = document.createElement("tr");
    headerRow.innerHTML = `
      <td colspan="6" style="background:#f5f5f5; font-weight:bold; color:#800020; padding: 0.6rem 0.7rem;">
        Admin-defined Categories
      </td>
    `;
    table.appendChild(headerRow);

    // TODO: replace with real submission status from backend
    const submittedIds = new Set(); // placeholder

    categories.forEach((a) => {
      const isSubmitted = submittedIds.has(a.id);
      table.appendChild(renderAdminRow(a, isSubmitted));
    });

    table.addEventListener(
      "click",
      async (e) => {
        const submitBtn = e.target.closest("[data-action='submit-assessment']");
        const retractBtn = e.target.closest("[data-action='retract-assessment']");

        if (submitBtn) {
          const id = submitBtn.getAttribute("data-assessment-id");
          // TODO: call backend to mark submitted
          const row = document.getElementById("adminrow-" + id);
          const a = categories.find((c) => String(c.id) === String(id));
          if (row && a) row.replaceWith(renderAdminRow(a, true));
        }

        if (retractBtn) {
          const id = retractBtn.getAttribute("data-assessment-id");
          // TODO: call backend to retract submission
          const row = document.getElementById("adminrow-" + id);
          const a = categories.find((c) => String(c.id) === String(id));
          if (row && a) row.replaceWith(renderAdminRow(a, false));
        }
      },
      { once: true }
    );
  } catch (err) {
    console.warn("Could not load admin categories:", err);
  }
}

/****************************************************
 * 6. COURSE PAGE INTERACTIONS (ADD/DELETE ASSESSMENT, EDIT COURSE)
 ****************************************************/

function setupCoursePageInteractions(courseId) {
  const addAssessmentModal = document.getElementById("addAssessmentModal");
  const openAddAssessmentBtn = document.getElementById("openAddAssessmentModalBtn");
  const cancelAddAssessmentBtn = document.getElementById("cancelAddAssessmentBtn");
  const cancelAddAssessmentBtn2 = document.getElementById("cancelAddAssessmentBtn2");
  const addAssessmentForm = document.getElementById("addAssessmentForm");
  const table = document.getElementById("assessmentsTable");

  if (openAddAssessmentBtn && addAssessmentModal)
    openAddAssessmentBtn.addEventListener("click", () => addAssessmentModal.showModal());

  if (cancelAddAssessmentBtn)
    cancelAddAssessmentBtn.addEventListener("click", () => addAssessmentModal.close());

  if (cancelAddAssessmentBtn2)
    cancelAddAssessmentBtn2.addEventListener("click", () => addAssessmentModal.close());

  if (addAssessmentForm) {
    addAssessmentForm.addEventListener("submit", async (e) => {
      e.preventDefault();

      const payload = {
        course_id: courseId,
        title: document.getElementById("aTitle").value.trim(),
        category: document.getElementById("aType").value,
        due_date: document.getElementById("aDue").value,
        earned: Number(document.getElementById("aEarned")?.value || 0),
        total: Number(document.getElementById("aTotal")?.value || 0),
        completed: document.getElementById("aCompleted").checked,
      };

      try {
        await fetch(`${API_BASE}/assessments`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        addAssessmentModal.close();
        addAssessmentForm.reset();
        await renderAssessments(courseId);
        await loadAdminCategories(courseId);
      } catch (err) {
        console.error("Error adding assessment:", err);
      }
    });
  }

  if (table) {
    table.addEventListener("click", async (e) => {
      const btn = e.target.closest("[data-action='delete-assessment']");
      if (!btn) return;
      const assessmentId = btn.getAttribute("data-assessment-id");
      if (!assessmentId) return;

      try {
        await fetch(`${API_BASE}/assessments/${assessmentId}`, {
          method: "DELETE",
        });
        await renderAssessments(courseId);
        await loadAdminCategories(courseId);
      } catch (err) {
        console.error("Error deleting assessment:", err);
      }
    });
  }

  const editCourseModal = document.getElementById("editCourseModal");
  const editCourseBtn = document.getElementById("editCourseBtn");
  const cancelEditCourseBtn = document.getElementById("cancelEditCourseBtn");
  const cancelEditCourseBtn2 = document.getElementById("cancelEditCourseBtn2");
  const editCourseForm = document.getElementById("editCourseForm");

  if (editCourseBtn && editCourseModal) {
    editCourseBtn.addEventListener("click", async () => {
      try {
        const res = await fetch(`${API_BASE}/courses/${courseId}`);
        if (!res.ok) return;
        const course = await res.json();

        document.getElementById("eCode").value = course.code || "";
        document.getElementById("eName").value = course.name || "";
        document.getElementById("eInstructor").value = course.instructor || "";
        document.getElementById("eTerm").value = course.term || "";

        editCourseModal.showModal();
      } catch (err) {
        console.error("Error loading course for edit:", err);
      }
    });
  }

  if (cancelEditCourseBtn)
    cancelEditCourseBtn.addEventListener("click", () => editCourseModal.close());
  if (cancelEditCourseBtn2)
    cancelEditCourseBtn2.addEventListener("click", () => editCourseModal.close());

  if (editCourseForm) {
    editCourseForm.addEventListener("submit", async (e) => {
      e.preventDefault();

      const payload = {
        code: document.getElementById("eCode").value.trim(),
        name: document.getElementById("eName").value.trim(),
        instructor: document.getElementById("eInstructor").value.trim(),
        term: document.getElementById("eTerm").value.trim(),
      };

      try {
        await fetch(`${API_BASE}/courses/${courseId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        editCourseModal.close();
        await loadCourse(courseId);
      } catch (err) {
        console.error("Error updating course:", err);
      }
    });
  }
}