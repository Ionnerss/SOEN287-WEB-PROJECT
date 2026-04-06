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

  const res = await fetch('/api/assessments', { credentials: "include" });
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
      credentials: "include",
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
      await fetch('/api/assessments/' + id, { method: 'DELETE', credentials: "include" });
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

    const res = await fetch('/api/assessments?courseId=' + courseId, { credentials: "include" });
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
      credentials: "include",
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

    // ⭐ PLACE IT RIGHT HERE
    ADMIN_COURSES_CACHE = courses;

    enabledBody.innerHTML = "";
    disabledBody.innerHTML = "";

    if (!Array.isArray(courses) || courses.length === 0) {
      enabledBody.innerHTML = `<tr><td colspan="6">No courses found.</td></tr>`;
      disabledBody.innerHTML = `<tr><td colspan="6">No courses found.</td></tr>`;
      return;
    }

    courses.forEach(course => {
      const row = document.createElement("tr");

      row.innerHTML = `
        <td>${course.code}</td>
        <td>${course.name}</td>
        <td>${course.instructor || "—"}</td>
        <td>${course.term || "—"}</td>
        <td>${course.enabled ? "Enabled" : "Disabled"}</td>
        <td>
          <div class="admin-inline-actions">
            <button class="action-button action-button--compact" data-action="edit" data-id="${course.course_id}">Edit</button>
            ${
              course.enabled
                ? `<button class="action-button action-button--compact" data-action="disable" data-id="${course.course_id}">Disable</button>`
                : `<button class="action-button action-button--compact" data-action="enable" data-id="${course.course_id}">Enable</button>`
            }
            <button class="action-button action-button--compact" data-action="delete" data-id="${course.course_id}">Delete</button>
          </div>
        </td>
      `;

      if (course.enabled) {
        enabledBody.appendChild(row);
      } else {
        disabledBody.appendChild(row);
      }
    });

    attachCourseActionHandlers();
  } catch (err) {
    console.error("Failed to load courses:", err);
  }
}

// Attach enable/disable/delete handlers
function attachCourseActionHandlers() {
  const API = window.APP_CONFIG.api;

  document.querySelectorAll("[data-action]").forEach(btn => {
    btn.addEventListener("click", async () => {
      const id = btn.dataset.id;
      const action = btn.dataset.action;

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

      if (action === "edit") {
        window.location.href = `edit-course.html?id=${id}`;
        return;
      }

      initAdminCoursesPage();
    });
  });
}

// ── Add Course Modal Logic ───────────────────────────────
function initAddCourseModal() {
  const modal = document.getElementById("addCourseModal");
  if (!modal) return;

  const openBtn = document.getElementById("openAddCourse");
  const closeBtn = document.getElementById("closeAddCourse");
  const cancelBtn = document.getElementById("cancelAddCourse");
  const form = document.getElementById("addCourseForm");
  const errorEl = document.getElementById("addCourseError");

  const API = window.APP_CONFIG.api;

  openBtn.addEventListener("click", () => modal.showModal());
  closeBtn.addEventListener("click", () => modal.close());
  cancelBtn.addEventListener("click", () => modal.close());

  form.addEventListener("submit", async (e) => {
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

    if (data.error) {
      errorEl.textContent = data.error;
      errorEl.style.display = "block";
      return;
    }

    modal.close();
    form.reset();
    initAdminCoursesPage();
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
  initAdminCoursesPage();
  initAddCourseModal();
});