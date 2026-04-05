document.addEventListener("DOMContentLoaded", async () => {
  const API = window.APP_CONFIG.api;

  // 1. Read course ID from URL
  const params = new URLSearchParams(window.location.search);
  const courseId = params.get("id");

  if (!courseId) {
    console.error("Missing course ID");
    return;
  }

  // 2. Fetch course data
  try {
    const res = await fetch(`${API.baseUrl}/${API.basePath}/courses/${courseId}`);
    if (!res.ok) throw new Error("Failed to load course");

    const course = await res.json();

    // 3. Update page title
    const titleEl = document.querySelector(".admin-page-title");
    if (titleEl) {
      titleEl.textContent = `Edit Course — ${course.code}`;
    }

    // 4. Pre-fill form fields
    document.getElementById("code").value = course.code || "";
    document.getElementById("name").value = course.name || "";
    document.getElementById("instructor").value = course.instructor || "";
    document.getElementById("term").value = course.term || "";
    document.getElementById("status").value = course.enabled ? "enabled" : "disabled";

    // 5. Handle form submission
    const form = document.querySelector(".admin-form");
    form.addEventListener("submit", async (e) => {
      e.preventDefault();

      const payload = {
        code: document.getElementById("code").value.trim(),
        name: document.getElementById("name").value.trim(),
        instructor: document.getElementById("instructor").value.trim(),
        term: document.getElementById("term").value.trim(),
        enabled: document.getElementById("status").value === "enabled" ? 1 : 0
      };

      const updateRes = await fetch(`${API.baseUrl}/${API.basePath}/courses/${courseId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (!updateRes.ok) {
        console.error("Failed to update course");
        return;
      }

      window.location.href = "courses.html";
    });

  } catch (err) {
    console.error("Error loading course:", err);
  }
});