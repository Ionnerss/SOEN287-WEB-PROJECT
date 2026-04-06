/**
 * adminSide.js - LearnFlow Admin Management
 * Handles Dashboard Stats, Assessments, Course Dropdowns, and Category Creation.
 */

let CURRENT_ADMIN = null;

// ── 0. AUTHENTICATION ────────────────────────────────
async function loadCurrentAdmin() {
    try {
        const res = await fetch('/api/auth/guard', { credentials: "include" });
        if (!res.ok) return;
        const data = await res.json();
        if (data.authenticated) {
            CURRENT_ADMIN = data.user;
        }
    } catch (err) {
        console.error("Auth guard error:", err);
    }
}

// ── 1. SHARED HELPERS ────────────────────────────────
async function loadCoursesDropdown(selectId) {
    const select = document.getElementById(selectId);
    if (!select) return;

    try {
        const res = await fetch('/api/courses');
        const courses = await res.json();
        select.innerHTML = '<option value="">Select a course</option>';

        courses.forEach((c) => {
            const option = document.createElement('option');
            option.value = c.course_id;
            option.textContent = `${c.code} - ${c.name} (${c.term || 'N/A'})`;
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
            const activeOnes = courses.filter(c => c.enabled !== 0);
            const codes = activeOnes.map(c => c.code).join(', ');
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
    if (!enabledBody) return;

    await renderCoursesTable();

    const addModal = document.getElementById('addCourseModal');
    const addForm = document.getElementById('addCourseForm');

    document.getElementById('openAddCourse')?.addEventListener('click', () => addModal.showModal());
    document.getElementById('closeAddCourse')?.addEventListener('click', () => addModal.close());

    if (addForm) {
        addForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const payload = {
                user_id: CURRENT_ADMIN?.userId || 2,
                code: document.getElementById('courseCode').value.trim(),
                name: document.getElementById('courseName').value.trim(),
                instructor: document.getElementById('courseInstructor').value.trim(),
                term: document.getElementById('courseTerm').value.trim(),
            };

            const res = await fetch('/api/courses', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                addModal.close();
                addForm.reset();
                await renderCoursesTable();
            }
        });
    }
}

async function renderCoursesTable() {
    const enabledBody = document.getElementById('enabled-courses-body');
    const disabledBody = document.getElementById('disabled-courses-body');
    if (!enabledBody) return;

    try {
        const res = await fetch('/api/courses');
        const courses = await res.json();

        enabledBody.innerHTML = '';
        if (disabledBody) disabledBody.innerHTML = '';

        courses.forEach((c) => {
            const isEnabled = c.enabled !== 0;
            const row = document.createElement('tr');

            row.innerHTML = `
                <td>${c.code}</td>
                <td>${c.name}</td>
                <td>${c.instructor || '—'}</td>
                <td>${c.term || '—'}</td>
                <td><span class="status-badge ${isEnabled ? 'status-enabled' : 'status-disabled'}">${isEnabled ? 'Enabled' : 'Disabled'}</span></td>
                <td>
                    <button class="action-button action-button--compact" onclick="handleCourseAction('delete', ${c.course_id})">Delete</button>
                    <button class="action-button action-button--compact" onclick="handleCourseAction('${isEnabled ? 'disable' : 'enable'}', ${c.course_id})">
                        ${isEnabled ? 'Disable' : 'Enable'}
                    </button>
                </td>
            `;

            if (isEnabled) enabledBody.appendChild(row);
            else if (disabledBody) disabledBody.appendChild(row);
        });
    } catch (err) {
        console.error('renderCoursesTable error:', err);
    }
}

// Global action handler for the table buttons
window.handleCourseAction = async function(action, id) {
    if (action === 'delete' && !confirm('Are you sure?')) return;
    
    const url = action === 'delete' ? `/api/courses/${id}` : `/api/courses/${id}/${action}`;
    const method = action === 'delete' ? 'DELETE' : 'PUT';

    try {
        const res = await fetch(url, { method });
        if (res.ok) await renderCoursesTable();
    } catch (err) {
        console.error(`Action ${action} failed:`, err);
    }
};

// ── 4. ASSESSMENTS PAGE (assessments.html) ────────────
// ── 4. ASSESSMENTS PAGE (assessments.html) ────────────
async function initAssessmentsPage() {
    const tbody = document.getElementById('assessmentsBody');
    if (!tbody) return;

    try {
        // Fetch both courses and assessments in parallel
        const [coursesRes, assessmentsRes] = await Promise.all([
            fetch('/api/courses'),
            fetch('/api/assessments/admin/all')
        ]);

        if (!coursesRes.ok || !assessmentsRes.ok) {
            tbody.innerHTML = '<tr><td colspan="6" style="color:red; text-align:center;">Error loading data from server.</td></tr>';
            return;
        }

        const courses = await coursesRes.json();
        const assessments = await assessmentsRes.json();

        // Create a robust lookup table using both ID and Code
        const courseLookup = {};
        courses.forEach(c => {
            // Ensure we handle different potential ID naming conventions from the DB
            const id = c.course_id || c.id;
            if (id) {
                courseLookup[String(id)] = c.code;
            }
        });

        tbody.innerHTML = '';
        
        if (assessments.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;">No assessments found.</td></tr>';
            return;
        }

        // Grouping logic
        const grouped = {};
        assessments.forEach((a) => {
            // Check every possible field where the course identifier might live
            const rawId = a.courseId || a.course_id || a.id;
            const code = a.courseCode || courseLookup[String(rawId)] || 'Unknown Course';
            
            if (!grouped[code]) grouped[code] = [];
            grouped[code].push(a);
        });

        // Render the grouped table
        Object.entries(grouped).forEach(([courseCode, items]) => {
            // Course Header Row
            const headerRow = document.createElement('tr');
            headerRow.innerHTML = `
                <td colspan="6" style="background:#f5f5f5; font-weight:bold; color:#800020; padding: 0.6rem 1rem;">
                    ${courseCode}
                </td>`;
            tbody.appendChild(headerRow);

            // Assessment Rows
            items.forEach((a) => {
                const tr = document.createElement('tr');
                // Ensure we have a valid ID for the "Manage" link
                const assessmentId = a.assessment_id || a.id;
                
                tr.innerHTML = `
                    <td style="text-align:center; font-weight:bold; vertical-align:middle;">
                        <span style="color:#800020;">${a.title}</span>
                    </td>
                    <td style="text-align:center; vertical-align:middle;">${a.type || a.category || '—'}</td>
                    <td style="text-align:center; vertical-align:middle;">${a.weight || 0}%</td>
                    <td style="text-align:center; vertical-align:middle;">${a.due_date ? a.due_date.slice(0, 10) : '—'}</td>
                    <td style="text-align:center; vertical-align:middle;">${courseCode}</td>
                    <td style="text-align:center; vertical-align:middle;">
                        <a href="manage287.html?id=${assessmentId}" class="action-button action-button--compact">Manage</a>
                    </td>`;
                tbody.appendChild(tr);
            });
        });
    } catch (err) {
        console.error("initAssessmentsPage error:", err);
        tbody.innerHTML = '<tr><td colspan="6" style="color:red; text-align:center;">A critical error occurred while rendering the table.</td></tr>';
    }
}

// ── 5. MANAGE ASSESSMENT (manage287.html) ─────────────
async function initManagePage() {
    const form = document.getElementById('weightsForm');
    if (!form) return;

    const id = new URLSearchParams(window.location.search).get('id');
    if (!id) return;

    try {
        const res = await fetch('/api/assessments/admin/all');
        const all = await res.json();
        const assessment = all.find(a => String(a.assessment_id) === String(id));

        if (!assessment) return;

        document.getElementById('titleInput').value = assessment.title;
        document.getElementById('weightInput').value = assessment.weight;
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

            if (updateRes.ok) window.location.href = 'assessments.html';
        });

        document.getElementById('deleteBtn')?.addEventListener('click', async () => {
            if (confirm('Delete this assessment?')) {
                await fetch(`/api/assessments/admin/${id}`, { method: 'DELETE' });
                window.location.href = 'assessments.html';
            }
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

    // Dynamic Final validation
    courseSelect?.addEventListener('change', async function() {
        const courseId = courseSelect.value;
        if (!courseId) return;

        const res = await fetch('/api/assessments/admin/all?courseId=' + courseId);
        const assessments = await res.json();
        const hasFinal = assessments.some(a => (a.type || a.category) === 'Final');

        const finalOption = typeSelect.querySelector('option[value="Final"]');
        if (hasFinal && finalOption) finalOption.remove();
        else if (!hasFinal && !finalOption) {
            const opt = document.createElement('option');
            opt.value = 'Final'; opt.textContent = 'Final';
            typeSelect.appendChild(opt);
        }
    });

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const payload = {
            courseId: document.getElementById('courseId').value,
            title: document.getElementById('title').value.trim(),
            type: document.getElementById('type').value,
            weight: Number(document.getElementById('weight').value),
            dueDate: document.getElementById('dueDate').value
        };

        const res = await fetch('/api/assessments/admin', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (res.ok) window.location.href = 'assessments.html';
    });
}

// ── 7. INITIALIZATION ─────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
    await loadCurrentAdmin();
    initDashboardStats();
    initCoursesPage();
    initAssessmentsPage();
    initManagePage();
    initCreatePage();
});