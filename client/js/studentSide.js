// --- Add Course Modal ---
const openAddCourseBtn = document.getElementById("openAddCourseModalBtn");
const addCourseModal = document.getElementById("addCourseModal");
const cancelAddCourseBtn = document.getElementById("cancelAddCourseBtn");

openAddCourseBtn.addEventListener("click", () => {
    addCourseModal.showModal();
  });

cancelAddCourseBtn.addEventListener("click", () => {
    addCourseModal.close();
  });


// --- Add Assessment Modal ---
const openAddAssessmentBtn = document.getElementById("openAddAssessmentModalBtn");
const addAssessmentModal = document.getElementById("addAssessmentModal");
const cancelAddAssessmentBtn = document.getElementById("cancelAddAssessmentBtn");

openAddAssessmentBtn.addEventListener("click", () => {
    addAssessmentModal.showModal();
  });

cancelAddAssessmentBtn.addEventListener("click", () => {
    addAssessmentModal.close();
  });
