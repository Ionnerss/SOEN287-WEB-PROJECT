const API_BASE = "http://127.0.0.1:3000/api";
const PERSONAL_KEY = "learnflow_personal_assessments";

/* ================= LOCAL STORAGE HELPERS ================= */

function getPersonalAssessments() {
    try {
        return JSON.parse(localStorage.getItem(PERSONAL_KEY) || "[]");
    } catch { return []; }
}

function savePersonalAssessments(list) {
    localStorage.setItem(PERSONAL_KEY, JSON.stringify(list));
}

/* ================= INIT ================= */

document.addEventListener("DOMContentLoaded", () => {
    initDashboardPage();
    initCoursePage();
});

/* ================= DASHBOARD ================= */

function initDashboardPage() {

    const grid = document.getElementById("coursesGrid");
    if (!grid) return;

    renderDashboard();

    // Add Course modal
    const addCourseModal = document.getElementById("addCourseModal");
    document.getElementById("openAddCourseModalBtn")?.addEventListener("click", async () => {
        addCourseModal.showModal();
        await loadAdminCoursesDropdown();
    });
    document.getElementById("closeAddCourse")?.addEventListener("click", () => addCourseModal.close());
    document.getElementById("cancelAddCourse")?.addEventListener("click", () => addCourseModal.close());
    document.getElementById("addCourseForm")?.addEventListener("submit", enrollStudent);

    // Add Assessment modal
    const addAssessmentModal = document.getElementById("addAssessmentModal");
    document.getElementById("openAddAssessmentModalBtn")?.addEventListener("click", async () => {
        addAssessmentModal.showModal();
        await loadEnrolledCoursesDropdown();
    });
    document.getElementById("cancelAddAssessmentBtn")?.addEventListener("click", () => addAssessmentModal.close());
    document.getElementById("cancelAddAssessmentBtn2")?.addEventListener("click", () => addAssessmentModal.close());
    document.getElementById("addAssessmentForm")?.addEventListener("submit", addPersonalAssessment);

    // Filter
    document.getElementById("upcomingFilter")?.addEventListener("change", () => renderDashboard());

    // Overview mode
    document.getElementById("overviewMode")?.addEventListener("change", () => renderDashboard());
}

/* ================= LOAD DROPDOWNS ================= */

async function loadAdminCoursesDropdown() {
    const select = document.getElementById("courseSelect");
    if (!select) return;
    select.innerHTML = `<option>Loading...</option>`;
    try {
        const res = await fetch(`${API_BASE}/courses/available`, { credentials: "include" });
        const courses = await res.json();
        select.innerHTML = "";
        if (!Array.isArray(courses) || !courses.length) {
            select.innerHTML = `<option value="">No courses available</option>`;
            return;
        }
        courses.forEach(c => {
            const o = document.createElement("option");
            o.value = c.course_id;
            o.textContent = `${c.code} - ${c.name}`;
            select.appendChild(o);
        });
    } catch (err) {
        select.innerHTML = `<option>Error loading courses</option>`;
    }
}

async function loadEnrolledCoursesDropdown() {
    const select = document.getElementById("aCourse");
    if (!select) return;
    select.innerHTML = `<option value="">Loading...</option>`;
    try {
        const res = await fetch(`${API_BASE}/enroll`, { credentials: "include" });
        const courses = await res.json();
        select.innerHTML = `<option value="">Choose…</option>`;

        // Add enrolled courses
        courses.forEach(c => {
            const o = document.createElement("option");
            o.value = c.course_id;
            o.textContent = `${c.code} - ${c.name}`;
            select.appendChild(o);
        });

        // Add a "Personal / No course" option
        const personal = document.createElement("option");
        personal.value = "personal";
        personal.textContent = "— Personal (no course) —";
        select.appendChild(personal);

    } catch (err) {
        select.innerHTML = `<option value="">Error</option>`;
    }
}

/* ================= ENROLL ================= */

async function enrollStudent(e) {
    e.preventDefault();
    const courseId = document.getElementById("courseSelect")?.value;
    if (!courseId) return;
    await fetch(`${API_BASE}/enroll`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ courseId: Number(courseId) })
    });
    document.getElementById("addCourseModal").close();
    renderDashboard();
}

/* ================= ADD PERSONAL ASSESSMENT ================= */

async function addPersonalAssessment(e) {
    e.preventDefault();

    // We no longer look for document.getElementById("aCourse")
    const title    = document.getElementById("aTitle").value.trim();
    const type     = document.getElementById("aType").value;
    const due      = document.getElementById("aDue").value;
    const done     = document.getElementById("aCompleted").checked;

    if (!title || !type) return;

    const entry = {
        assessment_id: "p_" + Date.now(),
        courseId: "personal", // Always mark as personal
        title,
        type,
        due_date: due || "—",
        completed: done,
        personal: true
    };

    const list = getPersonalAssessments();
    list.push(entry);
    savePersonalAssessments(list);

    document.getElementById("addAssessmentForm").reset();
    document.getElementById("addAssessmentModal").close();

    renderDashboard();
}
/* ================= DROP COURSE ================= */

async function dropCourse(courseId, courseCode) {

    if (!confirm(`Drop ${courseCode}? You can re-enroll at any time.`)) return;

    const res = await fetch(`${API_BASE}/enroll/${courseId}`, {
        method: "DELETE",
        credentials: "include"
    });

    if (res.ok) {
        renderDashboard();
    } else {
        console.error("Drop failed:", await res.text());
    }
}



async function renderDashboard() {

    const [enrollRes, adminAssessRes] = await Promise.all([
        fetch(`${API_BASE}/enroll`, { credentials: "include" }),
        fetch(`${API_BASE}/assessments`)
    ]);

    const courses        = await enrollRes.json();
    const adminAssessments = await adminAssessRes.json();
    const personalAssessments = getPersonalAssessments();

    // Merge: admin assessments for enrolled courses + all personal ones
    const enrolledIds = new Set(courses.map(c => String(c.course_id)));
    const relevantAdmin = adminAssessments.filter(a => enrolledIds.has(String(a.courseId)));
    const allMine = [...relevantAdmin, ...personalAssessments];

    renderCourseCards(courses);
    renderUpcomingAssessments(courses, allMine);
    renderStats(courses, allMine);
    renderProgressOverview(courses, allMine);
}

/* ================= STATS ================= */

function renderStats(courses, allMine) {

    const now = new Date();
    now.setHours(0, 0, 0, 0);

    const upcomingCount = allMine.filter(a => {
        if (a.completed) return false;
        if (!a.due_date || a.due_date === "—") return false;
        const due = new Date(a.due_date);
        due.setHours(0, 0, 0, 0);
        const diff = (due - now) / (1000 * 60 * 60 * 24);
        return diff >= 0 && diff <= 7;
    }).length;

    const completed = allMine.filter(a => a.completed).length;
    const total = allMine.length;

    const upcomingEl  = document.getElementById("upcomingCount");
    const completedEl = document.getElementById("completedSummary");
    const avgEl       = document.getElementById("overallAverage");

    if (upcomingEl)  upcomingEl.textContent  = upcomingCount;
    if (completedEl) completedEl.textContent = `${completed} / ${total}`;
    if (avgEl)       avgEl.textContent       = "--%";
}

/* ================= COURSE CARDS ================= */

function renderCourseCards(courses) {
    const grid     = document.getElementById("coursesGrid");
    const emptyMsg = document.getElementById("coursesEmpty");
    grid.innerHTML = "";

    if (!Array.isArray(courses) || courses.length === 0) {
        if (emptyMsg) emptyMsg.hidden = false;
        return;
    }
    if (emptyMsg) emptyMsg.hidden = true;

    courses.forEach(course => {
        const card = document.createElement("article");
        card.className = "coursecard";
        card.innerHTML = `
            <div class="coursecard__main">
                <div class="coursecard__title">${course.code}</div>
                <div class="muted small">${course.name}</div>
            </div>
            <div class="coursecard__side">
                <a class="action-button action-button--compact"
                   href="course.html?courseId=${course.course_id}">View</a>
                <button class="action-button action-button--compact"
                   style="background:#7a0020;color:#fff;border-color:#7a0020;"
                   onclick="dropCourse(${course.course_id}, '${course.code}')">Drop</button>
            </div>
        `;
        grid.appendChild(card);
    });
}

/* ================= UPCOMING ASSESSMENTS ================= */

function renderUpcomingAssessments(courses, allMine) {

    const list     = document.getElementById("upcomingList");
    const emptyMsg = document.getElementById("upcomingEmpty");
    if (!list) return;

    const courseMap = {};
    courses.forEach(c => { courseMap[String(c.course_id)] = c; });

    const filterVal = document.getElementById("upcomingFilter")?.value || "7";
    const now = new Date();
    now.setHours(0, 0, 0, 0);

    const filtered = allMine.filter(a => {
        if (a.completed) return false;
        if (!a.due_date || a.due_date === "—") return false;
        if (filterVal === "all") return true;
        const due = new Date(a.due_date);
        due.setHours(0, 0, 0, 0);
        if (due < now) return true; // always show late
        const diffDays = (due - now) / (1000 * 60 * 60 * 24);
        return diffDays <= Number(filterVal);
    });

    filtered.sort((a, b) => new Date(a.due_date) - new Date(b.due_date));

    list.innerHTML = "";

    if (filtered.length === 0) {
        if (emptyMsg) emptyMsg.hidden = false;
        return;
    }
    if (emptyMsg) emptyMsg.hidden = true;

    filtered.forEach(a => {
        const course = courseMap[String(a.courseId)];
        const courseLabel = a.courseId === "personal"
            ? "Personal"
            : (course ? course.code : "Unknown");

        const due = new Date(a.due_date);
        due.setHours(0, 0, 0, 0);
        const isLate = due < now;

        const li = document.createElement("li");
        li.className = "list__item";
        li.innerHTML = `
            <div>
                <div class="list__title">${a.title}</div>
                <div class="muted small">${courseLabel} • Due ${a.due_date}</div>
            </div>
            <div class="row gap">
                <span class="tag" style="${isLate ? "background:#7a0020;color:#fff;" : ""}">
                    ${isLate ? "Late" : "Pending"}
                </span>
                ${a.courseId !== "personal"
                    ? `<a class="action-button action-button--compact"
                          href="course.html?courseId=${a.courseId}">Open</a>`
                    : `<button class="action-button action-button--compact"
                              style="background:#7a0020;color:#fff;border-color:#7a0020;"
                              onclick="removePersonalAssessment('${a.assessment_id}')">Remove</button>`
                }
            </div>
        `;
        list.appendChild(li);
    });
}

/* ================= REMOVE PERSONAL ASSESSMENT ================= */

function removePersonalAssessment(id) {
    if (!confirm("Remove this assessment?")) return;
    const list = getPersonalAssessments().filter(a => a.assessment_id !== id);
    savePersonalAssessments(list);
    renderDashboard();
}

/* ================= PROGRESS OVERVIEW ================= */

function renderProgressOverview(courses, allMine) {

    const container = document.getElementById("overviewBars");
    if (!container) return;

    container.innerHTML = "";

    // Group by course (enrolled) + personal bucket
    const groups = [];

    courses.forEach(c => {
        const mine = allMine.filter(a => String(a.courseId) === String(c.course_id));
        if (mine.length > 0) {
            groups.push({ label: c.code, assessments: mine });
        }
    });

    const personal = allMine.filter(a => a.courseId === "personal");
    if (personal.length > 0) {
        groups.push({ label: "Personal", assessments: personal });
    }

    if (groups.length === 0) {
        container.innerHTML = `<p class="muted small">No assessments yet.</p>`;
        return;
    }

    groups.forEach(group => {
        const total     = group.assessments.length;
        const completed = group.assessments.filter(a => a.completed).length;
        const pct       = total === 0 ? 0 : Math.round((completed / total) * 100);

        const row = document.createElement("div");
        row.style.cssText = "margin-bottom:1.2rem;";
        row.innerHTML = `
            <div style="display:flex;justify-content:space-between;margin-bottom:0.3rem;">
                <span class="muted small" style="font-weight:600;">${group.label}</span>
                <span class="muted small">${completed} / ${total} submitted (${pct}%)</span>
            </div>
            <div style="background:#e5e7eb;border-radius:999px;height:10px;overflow:hidden;">
                <div style="
                    width:${pct}%;
                    height:100%;
                    background:#7a0020;
                    border-radius:999px;
                    transition:width 0.4s ease;
                "></div>
            </div>
        `;
        container.appendChild(row);
    });
}

/* ================= COURSE PAGE ================= */

function initCoursePage() {
    const table = document.getElementById("assessmentsTable");
    if (!table) return;

    const courseId = new URLSearchParams(window.location.search).get("courseId");

    loadCourse(courseId);

    // Add Assessment modal
    const modal = document.getElementById("addAssessmentModal");
    document.getElementById("openAddAssessmentModalBtn")?.addEventListener("click", () => modal.showModal());
    document.getElementById("cancelAddAssessmentBtn")?.addEventListener("click", () => modal.close());
    document.getElementById("cancelAddAssessmentBtn2")?.addEventListener("click", () => modal.close());

    document.getElementById("addAssessmentForm")?.addEventListener("submit", async (e) => {
        e.preventDefault();

        const title  = document.getElementById("aTitle").value.trim();
        const type   = document.getElementById("aType").value;
        const due    = document.getElementById("aDue").value;
        const weight = document.getElementById("aWeight")?.value || 0;

        if (!title || !type) return;

        const res = await fetch(`${API_BASE}/assessments/admin`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ courseId, title, type, dueDate: due, weight: Number(weight) })
        });

        if (res.ok) {
            document.getElementById("addAssessmentForm").reset();
            modal.close();
            loadCourse(courseId);
        } else {
            console.error("Add assessment failed:", await res.text());
        }
    });
}

async function loadCourse(courseId) {
    const res = await fetch(`${API_BASE}/assessments/admin/all?courseId=${courseId}`);
    const assessments = await res.json();

    // Update header stats
    const completed = assessments.filter(a => a.completed).length;
    const total = assessments.length;
    const pct = total === 0 ? 0 : Math.round((completed / total) * 100);

    const completedEl = document.getElementById("completedCount");
    const progressBar = document.getElementById("progressBar");
    const progressText = document.getElementById("progressText");
    const emptyState = document.getElementById("emptyState");

    if (completedEl) completedEl.textContent = `${completed} / ${total}`;
    if (progressBar) progressBar.style.width = `${pct}%`;
    if (progressText) progressText.textContent = `${pct}% assessments completed`;

    // Next due
    const now = new Date();
    const upcoming = assessments
        .filter(a => !a.completed && a.due_date && a.due_date !== "—")
        .sort((a, b) => new Date(a.due_date) - new Date(b.due_date));
    const nextDueEl = document.getElementById("nextDue");
    if (nextDueEl) nextDueEl.textContent = upcoming.length > 0 ? upcoming[0].due_date.slice(0, 10) : "—";

    if (emptyState) emptyState.hidden = assessments.length > 0;

    renderCourseAssessments(assessments);
}

function renderCourseAssessments(list) {
    const table = document.getElementById("assessmentsTable");
    table.innerHTML = "";
    let totalWeight = 0;

    list.forEach(a => {
        totalWeight += a.weight;
        const isCompleted = a.completed === true;
        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td>${a.title}</td>
            <td>${a.type}</td>
            <td>${a.due_date?.slice(0, 10) || "-"}</td>
            <td>${a.weight}%</td>
            <td>
                <span class="tag" style="${isCompleted ? "background:#7a0020;color:#fff;" : ""}">
                    ${isCompleted ? "Submitted" : "Not Submitted"}
                </span>
            </td>
            <td style="display:flex;gap:0.4rem;">
                <button class="action-button action-button--compact submitBtn"
                    data-id="${a.assessment_id}"
                    ${isCompleted ? "disabled style='opacity:0.4;cursor:default;'" : ""}>
                    ${isCompleted ? "Done" : "Submit"}
                </button>
                <button class="action-button action-button--compact cancelBtn"
                    data-id="${a.assessment_id}"
                    ${!isCompleted ? "disabled style='opacity:0.4;cursor:default;'" : ""}>
                    Cancel
                </button>
            </td>
        `;
        table.appendChild(tr);
    });

    renderTotalWeight(totalWeight);

    table.querySelectorAll(".submitBtn:not([disabled])").forEach(btn => {
        btn.addEventListener("click", () => submitAssessment(btn.dataset.id));
    });
    table.querySelectorAll(".cancelBtn:not([disabled])").forEach(btn => {
        btn.addEventListener("click", () => cancelAssessment(btn.dataset.id));
    });
}

async function submitAssessment(id) {
    const res = await fetch(`${API_BASE}/assessments/admin/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ completed: true })
    });
    if (res.ok) loadCourse(new URLSearchParams(window.location.search).get("courseId"));
}

async function cancelAssessment(id) {
    const res = await fetch(`${API_BASE}/assessments/admin/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ completed: false })
    });
    if (res.ok) loadCourse(new URLSearchParams(window.location.search).get("courseId"));
}

function renderTotalWeight(weight) {
    const el = document.getElementById("totalWeight");
    if (!el) return;
    el.textContent = `Total Weight: ${weight}% / 100%`;
    el.style.color = weight > 100 ? "red" : "";
}