let ADMIN_COURSES_CACHE = [];

let CURRENT_ADMIN = null;

async function loadCurrentAdmin() {
  const API = window.APP_CONFIG.api;
  const res = await fetch(`${API.baseUrl}/${API.basePath}/auth/guard`, { credentials: "include" });
  const data = await res.json();
  if (data.authenticated) CURRENT_ADMIN = data.user;
}
// ── assessments.html ──────────────────────────────
async function initAssessmentsPage() {
  var tbody = document.getElementById('assessmentsBody');
  if (!tbody) return;

  const res = await fetch('/api/assessments', { credentials: "include" });
  const assessments = await res.json();

async function loadCoursesDropdown(selectId) {
  const select = document.getElementById(selectId);
  if (!select) return;

  try {
    const res = await fetch('/api/courses');

    if (!res.ok || !res.headers.get('content-type')?.includes('application/json')) {
      console.error(`Fetch error for /api/courses: Status ${res.status}`);
      return;
    }

    const courses = await res.json();
    select.innerHTML = '<option value="">Select a course</option>';

    courses.forEach((c) => {
      const option = document.createElement('option');

      // IMPORTANT FIX (was c.code before)
      option.value = c.course_id;

      option.textContent = `${c.code} - ${c.name}`;
      select.appendChild(option);
    });
  } catch (err) {
    console.error("Failed to load courses dropdown:", err);
  }
}

// ── 2. DASHBOARD STATS ────────────────────────────────

async function initDashboardStats() {
  const adminNameEl = document.getElementById('admin-name');
  const activeCoursesEl = document.getElementById('active-courses');
  const totalCoursesEl = document.getElementById('total-courses');

  const res = await fetch('/api/assessments', { credentials: "include" });
  const all = await res.json();
  const assessment = all.find(a => a.id === id);

  try {
    const res = await fetch('/api/courses');
    const courses = await res.json();

    const actualName = localStorage.getItem('userName') || "System Administrator";

    if (adminNameEl) {
      adminNameEl.innerHTML = `<strong>Admin:</strong> ${actualName}`;
    }

    if (activeCoursesEl) {
      const codes = courses.map(c => c.code).join(', ');
      activeCoursesEl.textContent = `Active Courses: ${codes || 'None'}`;
    }

    if (totalCoursesEl) {
      totalCoursesEl.textContent = `Total Courses: ${courses.length}`;
    }

  } catch (err) {
    console.warn("Dashboard stats error:", err);
  }
}

// ── 3. MANAGE COURSES PAGE (courses.html) ─────────────

async function initCoursesPage() {
  const enabledBody = document.getElementById('enabled-courses-body');
  const disabledBody = document.getElementById('disabled-courses-body');
  if (!enabledBody && !disabledBody) return;

  await renderCoursesTable();

  // Open/close Add Course modal
  const openBtn = document.getElementById('openAddCourse');
  const modal = document.getElementById('addCourseModal');
  const closeBtn = document.getElementById('closeAddCourse');
  const cancelBtn = document.getElementById('cancelAddCourse');

  if (openBtn && modal) openBtn.addEventListener('click', () => modal.showModal());
  if (closeBtn && modal) closeBtn.addEventListener('click', () => modal.close());
  if (cancelBtn && modal) cancelBtn.addEventListener('click', () => modal.close());

  // Add Course form submit
  const addForm = document.getElementById('addCourseForm');
  if (addForm) {
    addForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const errorEl = document.getElementById('addCourseError');

      const payload = {
        user_id: 2, // admin user_id
        code: document.getElementById('courseCode').value.trim(),
        name: document.getElementById('courseName').value.trim(),
        instructor: document.getElementById('courseInstructor').value.trim(),
        term: document.getElementById('courseTerm').value.trim(),
      };

      try {
        const res = await fetch('/api/courses', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        const data = await res.json();

        if (!res.ok) {
          if (errorEl) {
            errorEl.textContent = data.error || 'Failed to add course.';
            errorEl.style.display = 'block';
          }
          return;
        }

        modal.close();
        addForm.reset();
        if (errorEl) errorEl.style.display = 'none';
        await renderCoursesTable();
      } catch (err) {
        console.error('Add course error:', err);
      }
    });
  }

  form.addEventListener('submit', async function(e) {
    e.preventDefault();
    const formError = document.getElementById('formError');
    const title = document.getElementById('titleInput').value.trim();
    const type = document.getElementById('typeInput').value;
    const weight = Number(document.getElementById('weightInput').value);
    const dueDate = document.getElementById('dueDateInput').value;

    const updateRes = await fetch('/api/assessments/' + id, {
      credentials: "include",
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, type, weight, dueDate })
    });
  }
}

async function renderCoursesTable() {
  const enabledBody = document.getElementById('enabled-courses-body');
  const disabledBody = document.getElementById('disabled-courses-body');
  if (!enabledBody && !disabledBody) return;

  try {
    const res = await fetch('/api/courses');
    const courses = await res.json();

  var deleteBtn = document.getElementById('deleteBtn');
  if (deleteBtn) {
    deleteBtn.addEventListener('click', async function() {
      if (!confirm('Are you sure you want to delete "' + assessment.title + '"?')) return;
      await fetch('/api/assessments/' + id, { method: 'DELETE', credentials: "include" });
      window.location.href = 'assessments.html';
    });

  } catch (err) {
    console.error('renderCoursesTable error:', err);
  }
}

// ── 4. ASSESSMENTS PAGE (assessments.html) ────────────

async function initAssessmentsPage() {
  const tbody = document.getElementById('assessmentsBody');
  if (!tbody) return;

    const res = await fetch('/api/assessments?courseId=' + courseId, { credentials: "include" });
    const assessments = await res.json();
    const hasFinal = assessments.some(a => a.type === 'Final');

    if (!coursesRes.ok || !assessmentsRes.ok) {
      tbody.innerHTML = '<tr><td colspan="6" style="color:red;">Error loading data.</td></tr>';
      return;
    }

    const courses = await coursesRes.json();
    const assessments = await assessmentsRes.json();

    var courseId = document.getElementById('courseId').value;
    var title = document.getElementById('title').value.trim();
    var type = document.getElementById('type').value;
    var weight = Number(document.getElementById('weight').value);
    var dueDate = document.getElementById('dueDate').value;
    var errorEl = document.getElementById('createError');

    const res = await fetch('/api/assessments', {
      credentials: "include",
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ courseId, title, type, weight, dueDate })
    });

    tbody.innerHTML = '';

    if (assessments.length === 0) {
      tbody.innerHTML = '<tr><td colspan="6">No assessments yet. Click "New Assessment" to add one.</td></tr>';
      return;
    }

    const grouped = {};
    assessments.forEach((a) => {
      const code = a.courseCode || courseLookup[a.courseId] || courseLookup[a.course_id] || 'Unknown';
      if (!grouped[code]) grouped[code] = [];
      grouped[code].push(a);
    });

    Object.entries(grouped).forEach(([courseCode, items]) => {
      const headerRow = document.createElement('tr');
      headerRow.innerHTML = `<td colspan="6" style="background:#f5f5f5; font-weight:bold; color:#800020; padding: 0.6rem 1rem;">${courseCode}</td>`;
      tbody.appendChild(headerRow);

      items.forEach((a) => {
        const studentLink = `/pages/studentSide/course.html?courseId=${a.course_id}`;
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td style="text-align:center; font-weight:bold; vertical-align:middle;">
            <a href="${studentLink}" style="color:#800020;">${a.title}</a>
          </td>
          <td style="text-align:center; font-weight:bold; vertical-align:middle;">${a.type || a.category}</td>
          <td style="text-align:center; font-weight:bold; vertical-align:middle;">${a.weight || '—'}%</td>
          <td style="text-align:center; font-weight:bold; vertical-align:middle;">${a.due_date ? a.due_date.slice(0, 10) : '—'}</td>
          <td style="text-align:center; font-weight:bold; vertical-align:middle;">${courseCode}</td>
          <td style="text-align:center; vertical-align:middle;">
            <a href="manage287.html?id=${a.assessment_id}" class="action-button action-button--compact">Manage</a>
          </td>`;
        tbody.appendChild(tr);
      });
    });
  } catch (err) {
    console.error("initAssessmentsPage error:", err);
  }
}

// ── 5. MANAGE ASSESSMENT (manage287.html) ─────────────

async function initManagePage() {
  const form = document.getElementById('weightsForm');
  if (!form) return;

  const params = new URLSearchParams(window.location.search);
  const id = params.get('id');
  if (!id) {
    window.location.href = 'assessments.html';
  });
}
// END OF ASSESSMENTS

async function loadDashboardStats() {
  const API = window.APP_CONFIG.api;
  const url = `${API.baseUrl}/${API.basePath}/courses`;

  try {
    const res = await fetch(url, { credentials: "include" });
    const courses = await res.json();

    const total = courses.length;
    const enabled = courses.filter(c => c.enabled).length;

    const totalEl = document.getElementById("total-courses");
    const activeEl = document.getElementById("active-courses");

    if (totalEl) totalEl.textContent = `Total courses: ${total}`;
    if (activeEl) activeEl.textContent = `Enabled courses: ${enabled}`;
  } catch (err) {
    console.error("Failed to load dashboard stats:", err);
  }
}

// ── courses.html ─────────────────────────────────────────────
async function initAdminCoursesPage() {
  const enabledBody = document.getElementById("enabled-courses-body");
  const disabledBody = document.getElementById("disabled-courses-body");

  if (!enabledBody || !disabledBody) return;

  const API = window.APP_CONFIG.api;
  const url = `${API.baseUrl}/${API.basePath}/courses`;

  try {
    const res = await fetch(url, { credentials: "include" });
    const courses = await res.json();

    const all = await res.json();
    const assessment = all.find(a => String(a.assessment_id) === String(id));

    if (!assessment) {
      window.location.href = 'assessments.html';
      return;
    }

    const subtext = document.getElementById('manageSubtext');
    if (subtext) subtext.textContent = `Editing: ${assessment.title}`;

    document.getElementById('titleInput').value = assessment.title;
    document.getElementById('typeInput').value = assessment.type || assessment.category;
    document.getElementById('weightInput').value = assessment.weight || '';
    if (assessment.due_date) {
      document.getElementById('dueDateInput').value = assessment.due_date.slice(0, 10);
    }

    // Remove Final option if another Final already exists for this course
    const allForCourse = all.filter(a => a.course_id === assessment.course_id && String(a.assessment_id) !== String(id));
    const hasFinal = allForCourse.some(a => (a.type || a.category) === 'Final');
    if (hasFinal) {
      const finalOption = document.getElementById('typeInput').querySelector('option[value="Final"]');
      if (finalOption) finalOption.remove();
    }

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const formError = document.getElementById('formError');

      const payload = {
        title: document.getElementById('titleInput').value.trim(),
        type: document.getElementById('typeInput').value,
        weight: Number(document.getElementById('weightInput').value),
        dueDate: document.getElementById('dueDateInput').value
      };

      const updateRes = await fetch(`/api/assessments/admin/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await updateRes.json();

      if (!updateRes.ok) {
        if (formError) {
          formError.textContent = data.error || 'Failed to update.';
          formError.style.display = 'block';
        }
        return;
      }

      window.location.href = 'assessments.html';
    });

    document.getElementById('deleteBtn')?.addEventListener('click', async () => {
      if (!confirm(`Are you sure you want to delete "${assessment.title}"?`)) return;
      await fetch(`/api/assessments/admin/${id}`, { method: 'DELETE' });
      window.location.href = 'assessments.html';
    });

  } catch (err) {
    console.error("initManagePage error:", err);
  }
}

// ── 6. CREATE CATEGORY (create-category.html) ─────────

function initCreatePage() {
  const form = document.getElementById('createCategoryForm');
  if (!form) return;

      if (action === "delete") {
        if (!confirm("Are you sure you want to delete this course?")) return;
        await fetch(`${API.baseUrl}/${API.basePath}/courses/${id}`, {
          method: "DELETE",
          credentials: "include"
        });
      }

      if (action === "enable") {
        await fetch(`${API.baseUrl}/${API.basePath}/courses/${id}/enable`, {
          method: "PUT",
          credentials: "include"
        });
      }

      if (action === "disable") {
        await fetch(`${API.baseUrl}/${API.basePath}/courses/${id}/disable`, {
          method: "PUT",
          credentials: "include"
        });
      }

    const res = await fetch('/api/assessments/admin/all?courseId=' + courseId);
    const assessments = await res.json();
    const hasFinal = assessments.some(a => (a.type || a.category) === 'Final');

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

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    errorEl.style.display = "none";

    const code = document.getElementById("courseCode").value.trim();
    const name = document.getElementById("courseName").value.trim();
    const instructor = document.getElementById("courseInstructor").value.trim();
    const term = document.getElementById("courseTerm").value.trim();

    const res = await fetch(`${API.baseUrl}/${API.basePath}/courses`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
        user_id: CURRENT_ADMIN?.userId,
        code,
        name,
        instructor,
        term
      })
    });

    const data = await res.json();

      window.location.href = 'assessments.html';
    } catch (err) {
      console.error("Create Category error:", err);
    }
  });
}

document.addEventListener("DOMContentLoaded", async function () {
  await loadCurrentAdmin();

  const adminNameEl = document.getElementById("admin-name");
  if (adminNameEl && CURRENT_ADMIN) {
    adminNameEl.innerHTML = `<strong>Welcome, ${CURRENT_ADMIN.fullName}</strong>`;
  }

  // Detect dashboard page
  if (document.getElementById("admin-dashboard")) {
    loadDashboardStats();
  }

  initAssessmentsPage();
  initManagePage();
  initCreatePage();
});