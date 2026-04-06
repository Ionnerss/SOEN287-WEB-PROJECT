const API_BASE = "http://127.0.0.1:3000/api";
let CURRENT_USER = null;

async function loadCurrentUser() {
    try {
        const res = await fetch(`${API_BASE}/auth/guard`, { credentials: "include" });
        const data = await res.json();
        if (data.authenticated) CURRENT_USER = data.user;
    } catch (err) {
        console.error("Auth load failed:", err);
    }
}

/****************************************************
 * 1. INITIALIZATION & ENTRY POINT
 ****************************************************/
document.addEventListener("DOMContentLoaded", async () => {
    await loadCurrentUser();
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

    // Add Course Modal Logic (Fixed floating block)
    const addCourseModal = document.getElementById('addCourseModal');
    const addCourseForm = document.getElementById('addCourseForm');
    const openAddCourseBtn = document.getElementById('openAddCourseBtn');

    if (openAddCourseBtn && addCourseModal) {
        openAddCourseBtn.addEventListener('click', () => addCourseModal.showModal());
    }

    if (addCourseForm) {
        addCourseForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const payload = {
                code: document.getElementById("cCode").value.trim(),
                name: document.getElementById("cName").value.trim(),
                instructor: document.getElementById("cInstructor").value.trim(),
                term: document.getElementById("cTerm").value.trim(),
                user_id: CURRENT_USER?.userId,
            };

            try {
                await fetch(`${API_BASE}/courses`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    credentials: "include",
                    body: JSON.stringify(payload),
                });
                addCourseModal.close();
                addCourseForm.reset();
                renderCoursesDashboard();
            } catch (err) {
                console.error("Error adding course:", err);
            }
        });
    }
}

async function renderCoursesDashboard() {
    const coursesGrid = document.getElementById('coursesGrid');
    const coursesEmpty = document.getElementById('coursesEmpty');
    if (!coursesGrid) return;

    try {
        const res = await fetch(`${API_BASE}/courses`, { credentials: "include" });
        const courses = await res.json();
        renderOverviewBars(courses);

        coursesGrid.innerHTML = '';
        if (!courses || courses.length === 0) {
            if (coursesEmpty) coursesEmpty.hidden = false;
            return;
        }
        if (coursesEmpty) coursesEmpty.hidden = true;

        courses.forEach((course) => {
            const card = document.createElement('article');
            card.className = 'coursecard';
            card.innerHTML = `
                <div class="coursecard__main">
                  <div class="coursecard__title">${course.code}</div>
                  <div class="muted small">${course.name} • ${course.term || ''}</div>
                </div>
                <div class="coursecard__side">
                  <a class="btn btn--small" href="./course.html?courseId=${course.code}">View</a>
                </div>`;
            coursesGrid.appendChild(card);
        });
    } catch (err) {
        console.error('Failed to load courses:', err);
    }
}

function renderOverviewBars(courses) {
    const overviewBars = document.getElementById("overviewBars");
    if (!overviewBars) return;
    overviewBars.innerHTML = "";
    if (!courses || courses.length === 0) return;

    courses.forEach((course) => {
        const bar = document.createElement("div");
        bar.className = "barrow";
        bar.innerHTML = `
            <div class="barrow__label"><strong>${course.code}</strong></div>
            <div class="progress"><div class="progress__bar" style="width: 20%"></div></div>`;
        overviewBars.appendChild(bar);
    });
}

/****************************************************
 * 4. COURSE PAGE LOGIC
 ****************************************************/
function initCoursePage() {
    const table = document.getElementById('assessmentsTable');
    if (!table) return;

    const urlParams = new URLSearchParams(window.location.search);
    const courseCode = urlParams.get('courseId');
    if (courseCode) loadCourseData(courseCode);
}

async function loadCourseData(courseCode) {
    try {
        const res = await fetch(`${API_BASE}/courses`);
        const courses = await res.json();
        const course = courses.find(c => c.code === courseCode);

        if (course) {
            const realId = course.course_id || course.id;
            document.getElementById('courseTitle').textContent = `${course.code} • ${course.name}`;
            renderStudentAssessments(courseCode);
            loadAdminCategories(realId);
            setupCoursePageInteractions(courseCode, realId);
        }
    } catch (err) {
        console.error('Failed to load course data:', err);
    }
}

/****************************************************
 * 5. RENDERING ASSESSMENTS
 ****************************************************/
function renderStudentAssessments(courseCode) {
    const assessments = getStudentAssessments(courseCode);
    const table = document.getElementById('assessmentsTable');
    if (!table) return;

    table.innerHTML = ''; 
    assessments.forEach((a) => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${a.title}</td>
            <td>${a.category}</td>
            <td>${a.dueDate}</td>
            <td>${a.earned}/${a.total}</td>
            <td>${a.completed ? 'Submitted' : 'Not Submitted'}</td>
            <td class="right"><button class="btn btn--ghost btn--small" data-action="delete-assessment" data-assessment-id="${a.id}">🗑</button></td>`;
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
        <td>${a.weight}%</td>
        <td>${isSubmitted ? 'Submitted' : 'Not Submitted'}</td>
        <td class="right">
            <button class="btn btn--small" data-action="${isSubmitted ? 'retract' : 'submit'}-assessment" data-assessment-id="${aid}">
                ${isSubmitted ? 'Retract' : 'Submit'}
            </button>
        </td>`;
    return row;
}

async function loadAdminCategories(realId) {
    const table = document.getElementById('assessmentsTable');
    try {
        const res = await fetch(`/api/assessments/admin/all?courseId=${realId}`);
        const categories = await res.json();
        
        const header = document.createElement('tr');
        header.innerHTML = `<td colspan="6" style="background:#f5f5f5; font-weight:bold;">Admin Categories</td>`;
        table.appendChild(header);

        const subs = getSubmissions();
        categories.forEach(a => {
            table.appendChild(renderAdminRow(a, !!subs[a.assessment_id]));
        });

        table.addEventListener('click', (e) => handleTableClick(e, categories));
    } catch (e) { console.warn(e); }
}

/****************************************************
 * 6. TABLE INTERACTION HANDLER
 ****************************************************/
function handleTableClick(e, categories) {
    const btn = e.target.closest("[data-action$='-assessment']");
    if (!btn) return;

    const action = btn.getAttribute('data-action');
    const id = btn.getAttribute('data-assessment-id');
    const subs = getSubmissions();
    const stats = getSubmissionStats();

    if (action === 'submit-assessment') {
        subs[id] = true;
        stats.total++;
    } else if (action === 'retract-assessment') {
        subs[id] = false;
        stats.total = Math.max(0, stats.total - 1);
    }

    saveSubmissions(subs);
    saveSubmissionStats(stats);
    
    const a = categories.find(c => String(c.assessment_id) === String(id));
    const row = document.getElementById('adminrow-' + id);
    if (row && a) row.replaceWith(renderAdminRow(a, subs[id]));
}

/****************************************************
 * 7. COURSE PAGE INTERACTIONS
 ****************************************************/
function setupCoursePageInteractions(courseCode, realId) {
    const addForm = document.getElementById('addAssessmentForm');
    const editForm = document.getElementById('editCourseForm');

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
            renderStudentAssessments(courseCode);
            document.getElementById('addAssessmentModal').close();
        });
    }

    if (editForm) {
        editForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            await fetch(`${API_BASE}/courses/${realId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    code: document.getElementById('eCode').value.trim(),
                    name: document.getElementById('eName').value.trim(),
                    instructor: document.getElementById('eInstructor').value.trim(),
                    term: document.getElementById('eTerm').value.trim(),
                })
            });
            window.location.reload();
        });
    }
}