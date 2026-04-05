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
      option.value = c.course_id || c.id;
      option.textContent = `${c.code} - ${c.name}`;
      select.appendChild(option);
    });
  } catch (err) {
    console.error("Failed to load courses dropdown:", err);
  }
}

// ── 2. DASHBOARD STATS (Filling the white rectangle) ──

// ── 2. DASHBOARD STATS (Filling the white rectangle) ──

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
    // ---------------------------

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

// ── 3. ASSESSMENTS PAGE (assessments.html) ────────────

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

    // Create lookup map to show "TEST001" instead of "1"
    const courseLookup = {};
    courses.forEach(c => {
      const id = c.course_id || c.id; 
      courseLookup[id] = c.code;
    });

    tbody.innerHTML = '';

    if (assessments.length === 0) {
      tbody.innerHTML = '<tr><td colspan="6">No assessments yet.</td></tr>';
      return;
    }

    // Group assessments by course code for the UI headers
    const grouped = {};
    assessments.forEach((a) => {
      const code = courseLookup[a.courseId] || "Unknown Course";
      if (!grouped[code]) grouped[code] = [];
      grouped[code].push(a);
    });

    Object.entries(grouped).forEach(([courseCode, items]) => {
      // Gray Header Row for the Course
      const headerRow = document.createElement('tr');
      headerRow.innerHTML = `<td colspan="6" style="background:#f5f5f5; font-weight:bold; color:#800020; padding: 0.6rem 1rem;">${courseCode}</td>`;
      tbody.appendChild(headerRow);

      items.forEach((a) => {
        const studentLink = `/pages/studentSide/course.html?courseId=${courseCode}`;
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

// ── 4. MANAGE ASSESSMENT (manage287.html) ─────────────

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

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
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

      if (updateRes.ok) {
        window.location.href = 'assessments.html';
      }
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

// ── 5. CREATE CATEGORY (create-category.html) ─────────

function initCreatePage() {
  const form = document.getElementById('createCategoryForm');
  if (!form) return;

  loadCoursesDropdown('courseId');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
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

      if (res.ok) {
        window.location.href = 'assessments.html';
      }
    } catch (err) {
      console.error("Create Category error:", err);
    }
  });
}

// ── 6. INITIALIZATION ────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  // Each function checks if its specific page elements exist before running
  initDashboardStats();
  initAssessmentsPage();
  initManagePage();
  initCreatePage();
});