/**
 * adminSide.js - LearnFlow Admin Management
 * Handles Dashboard Stats, Assessments, Course Dropdowns, and Category Creation.
 */

// ── 1. SHARED HELPERS ────────────────────────────────

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

  if (!adminNameEl && !activeCoursesEl) return;

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

  // Open/close Edit Course modal
  const editModal = document.getElementById('editCourseModal');
  const closeEditBtn = document.getElementById('closeEditCourse');
  const cancelEditBtn = document.getElementById('cancelEditCourse');

  if (closeEditBtn && editModal) closeEditBtn.addEventListener('click', () => editModal.close());
  if (cancelEditBtn && editModal) cancelEditBtn.addEventListener('click', () => editModal.close());

  // Edit Course form submit
  const editForm = document.getElementById('editCourseForm');
  if (editForm) {
    editForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const errorEl = document.getElementById('editCourseError');
      const id = document.getElementById('editCourseId').value;

      const payload = {
        code: document.getElementById('editCourseCode').value.trim(),
        name: document.getElementById('editCourseName').value.trim(),
        instructor: document.getElementById('editCourseInstructor').value.trim(),
        term: document.getElementById('editCourseTerm').value.trim(),
      };

      try {
        const res = await fetch('/api/courses/' + id, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        const data = await res.json();

        if (!res.ok) {
          if (errorEl) {
            errorEl.textContent = data.error || 'Failed to update course.';
            errorEl.style.display = 'block';
          }
          return;
        }

        editModal.close();
        editForm.reset();
        if (errorEl) errorEl.style.display = 'none';
        await renderCoursesTable();
      } catch (err) {
        console.error('Edit course error:', err);
      }
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

    if (enabledBody) enabledBody.innerHTML = '';
    if (disabledBody) disabledBody.innerHTML = '';

    courses.forEach((c) => {
      const row = document.createElement('tr');
      const isEnabled = c.enabled !== 0;

      row.innerHTML = `
        <td>${c.code}</td>
        <td>${c.name}</td>
        <td>${c.instructor || '—'}</td>
        <td>${c.term || '—'}</td>
        <td>${isEnabled ? 'Enabled' : 'Disabled'}</td>
        <td>
          <button class="action-button action-button--compact" data-action="edit" data-id="${c.course_id}">Edit</button>
          <button class="action-button action-button--compact" data-action="${isEnabled ? 'disable' : 'enable'}" data-id="${c.course_id}">${isEnabled ? 'Disable' : 'Enable'}</button>
          <button class="action-button action-button--compact" data-action="delete" data-id="${c.course_id}">Delete</button>
        </td>
      `;

      if (isEnabled && enabledBody) enabledBody.appendChild(row);
      else if (!isEnabled && disabledBody) disabledBody.appendChild(row);
    });

    // Handle action button clicks
    document.querySelectorAll('[data-action]').forEach(btn => {
      btn.addEventListener('click', async () => {
        const action = btn.getAttribute('data-action');
        const id = btn.getAttribute('data-id');

        if (action === 'edit') {
          const course = courses.find(c => String(c.course_id) === String(id));
          if (!course) return;
          document.getElementById('editCourseId').value = course.course_id;
          document.getElementById('editCourseCode').value = course.code;
          document.getElementById('editCourseName').value = course.name;
          document.getElementById('editCourseInstructor').value = course.instructor || '';
          document.getElementById('editCourseTerm').value = course.term || '';
          document.getElementById('editCourseModal').showModal();
        }

        if (action === 'disable') {
          if (!confirm('Are you sure you want to disable this course?')) return;
          await fetch('/api/courses/' + id + '/disable', { method: 'PUT' });
          await renderCoursesTable();
        }

        if (action === 'enable') {
          if (!confirm('Are you sure you want to enable this course?')) return;
          await fetch('/api/courses/' + id + '/enable', { method: 'PUT' });
          await renderCoursesTable();
        }

        if (action === 'delete') {
          if (!confirm('Are you sure you want to delete this course?')) return;
          await fetch('/api/courses/' + id, { method: 'DELETE' });
          await renderCoursesTable();
        }
      });
    });

  } catch (err) {
    console.error('renderCoursesTable error:', err);
  }
}

// ── 4. ASSESSMENTS PAGE (assessments.html) ────────────

async function initAssessmentsPage() {
  const tbody = document.getElementById('assessmentsBody');
  if (!tbody) return;

  try {
    const [coursesRes, assessmentsRes] = await Promise.all([
      fetch('/api/courses'),
      fetch('/api/assessments/admin/all')
    ]);

    if (!coursesRes.ok || !assessmentsRes.ok) {
      tbody.innerHTML = '<tr><td colspan="6" style="color:red;">Error loading data.</td></tr>';
      return;
    }

    const courses = await coursesRes.json();
    const assessments = await assessmentsRes.json();

    const courseLookup = {};
    courses.forEach(c => {
      courseLookup[c.course_id || c.id] = c.code;
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
    return;
  }

  try {
    const res = await fetch('/api/assessments/admin/all');
    if (!res.ok) throw new Error("Could not fetch assessment data");

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

  loadCoursesDropdown('courseId');

  const courseSelect = document.getElementById('courseId');
  const typeSelect = document.getElementById('type');

  courseSelect.addEventListener('change', async function() {
    const courseId = courseSelect.value;
    if (!courseId) return;

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
    const errorEl = document.getElementById('createError');

    const payload = {
      courseId: document.getElementById('courseId').value,
      title: document.getElementById('title').value.trim(),
      type: document.getElementById('type').value,
      weight: Number(document.getElementById('weight').value),
      dueDate: document.getElementById('dueDate').value
    };

    try {
      const res = await fetch('/api/assessments/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();

      if (!res.ok) {
        if (errorEl) {
          errorEl.textContent = data.error || 'Failed to create assessment.';
          errorEl.style.display = 'block';
        }
        return;
      }

      window.location.href = 'assessments.html';
    } catch (err) {
      console.error("Create Category error:", err);
    }
  });
}

// ── 7. INITIALIZATION ─────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  initDashboardStats();
  initCoursesPage();
  initAssessmentsPage();
  initManagePage();
  initCreatePage();
});