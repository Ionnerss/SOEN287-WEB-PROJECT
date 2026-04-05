const API_BASE = "http://127.0.0.1:3000/api";

let CURRENT_USER = null;

async function loadCurrentUser() {
  const res = await fetch(`${API_BASE}/auth/guard`, { credentials: "include" });
  const data = await res.json();
  if (data.authenticated) CURRENT_USER = data.user;
}

/****************************************************
 * 1. ENTRY POINT
 ****************************************************/
document.addEventListener("DOMContentLoaded", async () => {
  await loadCurrentUser();
  initDashboardPage();
  initCoursePage();
});

/****************************************************
 * 2. DASHBOARD PAGE (COURSES LIST + ADD COURSE)
 ****************************************************/
function initDashboardPage() {
  const coursesGrid = document.getElementById("coursesGrid");
  if (!coursesGrid) return; // Not on dashboard

  loadCoursesDashboard();

  const openAddCourseBtn = document.getElementById("openAddCourseModalBtn");
  const addCourseModal = document.getElementById("addCourseModal");
  const cancelAddCourseBtn = document.getElementById("cancelAddCourseBtn");
  const cancelAddCourseBtn2 = document.getElementById("cancelAddCourseBtn2");
  const addCourseForm = document.getElementById("addCourseForm");

  if (openAddCourseBtn && addCourseModal)
    openAddCourseBtn.addEventListener("click", () => addCourseModal.showModal());

  if (cancelAddCourseBtn)
    cancelAddCourseBtn.addEventListener("click", () => addCourseModal.close());

  if (cancelAddCourseBtn2)
    cancelAddCourseBtn2.addEventListener("click", () => addCourseModal.close());

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
        user_id: CURRENT_USER?.userId,
      };

      try {
        await fetch(`${API_BASE}/courses`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
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
    const res = await fetch(`${API_BASE}/courses`, { credentials: "include" });
    const courses = await res.json();
    renderOverviewBars(courses);

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

    coursesGrid.addEventListener(
      "click",
      async (e) => {
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
      },
      { once: true }
    );
  } catch (err) {
    console.error("Error loading courses:", err);
  }
}

function renderOverviewBars(courses) {
  const overviewBars = document.getElementById("overviewBars");
  if (!overviewBars) return;

  overviewBars.innerHTML = "";

  if (!courses || courses.length === 0) {
    overviewBars.innerHTML = `<p class="muted small">No courses yet.</p>`;
    return;
  }

  courses.forEach((course) => {
    const bar = document.createElement("div");
    bar.className = "barrow";
    bar.innerHTML = `
      <div class="barrow__label">
        <strong>${course.code}</strong>
        <span class="muted small">${course.name}</span>
      </div>
      <div class="progress">
        <div class="progress__bar" style="width: 0%"></div>
      </div>
    `;
    overviewBars.appendChild(bar);
  });
}

/****************************************************
 * 3. COURSE PAGE INIT (COURSE INFO ONLY)
 ****************************************************/
function initCoursePage() {
  const titleEl = document.getElementById("courseTitle");
  const table = document.getElementById("assessmentsTable");
  if (!titleEl || !table) return; // Not on course page

  const urlParams = new URLSearchParams(window.location.search);
  const courseId = urlParams.get("courseId");
  if (!courseId) return;

  loadCourse(courseId);

  // 🚧 Assessments disabled until backend is ready
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

    /****************************************************
     * 🚧 ASSESSMENTS DISABLED UNTIL BACKEND IS READY
     ****************************************************/
    // await renderAssessments(courseId);
    // await loadAdminCategories(courseId);

  } catch (err) {
    console.error("Error loading course:", err);
  }
}

/****************************************************
 * 6. COURSE PAGE INTERACTIONS (COURSE EDIT ONLY)
 * --------------------------------------------------
 * 🚧 Assessment logic is temporarily disabled until
 *     the assessments backend is completed.
 ****************************************************/
function setupCoursePageInteractions(courseId) {

  /****************************************************
   * A. ADD ASSESSMENT (DISABLED)
   ****************************************************/
  // 🚧 TODO: Enable when assessments backend is ready
  /*
    ... your assessment add logic ...
  */

  /****************************************************
   * B. DELETE ASSESSMENT (DISABLED)
   ****************************************************/
  // 🚧 TODO: Enable when assessments backend is ready
  /*
    ... your assessment delete logic ...
  */

  /****************************************************
   * C. EDIT COURSE (ACTIVE)
   ****************************************************/
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
        user_id: CURRENT_USER?.userId,
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

  /****************************************************
   * D. DELETE COURSE (ACTIVE)
   ****************************************************/
  const deleteCourseBtn = document.getElementById("deleteCourseBtn");

  if (deleteCourseBtn) {
    deleteCourseBtn.addEventListener("click", async () => {
      const confirmDelete = confirm("Are you sure you want to delete this course?");
      if (!confirmDelete) return;

      try {
        await fetch(`${API_BASE}/courses/${courseId}`, {
          method: "DELETE",
        });

        window.location.href = "./dashboard.html";
      } catch (err) {
        console.error("Error deleting course:", err);
      }
    });
  }
}