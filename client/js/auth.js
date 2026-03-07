// Temporary login for frontend

document.addEventListener("DOMContentLoaded", () => {
  const loginForm = document.getElementById("loginForm");
  if (!loginForm) return;

  loginForm.addEventListener("submit", (e) => {
    e.preventDefault();

    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value.trim();
    const errorBox = document.getElementById("errorBox");

    // Fake credentials
    const studentEmail = "student@domain.com";
    const adminEmail = "admin@domain.com";
    const correctPassword = "1234";

    // Student login
    if (email === studentEmail && password === correctPassword) {
      localStorage.setItem("userRole", "student");
      window.location.href = "../studentSide/dashboard.html";
      return;
    }

    // Admin login
    if (email === adminEmail && password === correctPassword) {
      localStorage.setItem("userRole", "admin");
      window.location.href = "../adminSide/dashboard.html";
      return;
    }

    // Invalid login
    errorBox.hidden = false;
    errorBox.textContent = "Invalid email or password.";
  });
});