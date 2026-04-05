const API_BASE_URL = "http://127.0.0.1:3000/api";

// -------------------------------
// Fetch authenticated user
// -------------------------------
async function getCurrentUser() {
  const res = await fetch(`${API_BASE_URL}/auth/guard`, {
    credentials: "include",
  });

  if (!res.ok) return null;

  const data = await res.json();
  if (!data.authenticated) return null;

  return data.user;
}

// -------------------------------
// Render Admin UI
// -------------------------------
function renderAdminUI(user) {
  document.body.className = "admin-page";

  document.getElementById("profileTitle").textContent = "My Profile";
  document.getElementById("profileSubtitle").textContent =
    "Manage your account details";

  document.getElementById("profileCard").innerHTML = `
    <div class="admin-card fade-step fade-step-2">
      <form class="admin-form" id="profileForm">

        <div class="admin-field">
          <label>Email</label>
          <input type="email" id="email" value="${user.email}" disabled>
        </div>

        <div class="admin-field">
          <label>Full Name</label>
          <input type="text" id="fullName" value="${user.fullName}">
        </div>

        <div class="admin-field">
          <label>Role</label>
          <input type="text" id="role" value="${user.role}" disabled>
        </div>

        <div class="admin-field">
          <label>New Password</label>
          <input type="password" id="password" placeholder="Leave empty to keep current password">
        </div>

        <button class="action-button action-button--full" type="submit">
          Save Changes
        </button>
      </form>
    </div>
  `;

  document.getElementById("logoutContainer").innerHTML = `
    <button id="logoutBtn" class="action-button action-button--full">
      Log Out
    </button>
  `;
}

// -------------------------------
// Render Student UI
// -------------------------------
function renderStudentUI(user) {
  document.body.className = "student-page";

  document.getElementById("profileTitle").textContent = "My Profile";
  document.getElementById("profileSubtitle").textContent =
    "Manage your account details";

  document.getElementById("profileCard").innerHTML = `
    <div class="student-card fade-step fade-step-2">
      <form class="student-stack" id="profileForm">

        <div class="field">
          <label class="field__label">Email</label>
          <input class="input" type="email" id="email" value="${user.email}" disabled>
        </div>

        <div class="field">
          <label class="field__label">Full Name</label>
          <input class="input" type="text" id="fullName" value="${user.fullName}">
        </div>

        <div class="field">
          <label class="field__label">Role</label>
          <input class="input" type="text" id="role" value="${user.role}" disabled>
        </div>

        <div class="field">
          <label class="field__label">New Password</label>
          <input class="input" type="password" id="password" placeholder="Leave empty to keep current password">
        </div>

        <button class="btn btn--small" type="submit">
          Save Changes
        </button>
      </form>
    </div>
  `;

  document.getElementById("logoutContainer").innerHTML = `
    <button id="logoutBtn" class="btn btn--small">
      Log Out
    </button>
  `;
}

// -------------------------------
// Update Profile
// -------------------------------
async function updateProfile(userId) {
  const fullName = document.getElementById("fullName").value.trim();
  const password = document.getElementById("password").value.trim();

  const payload = { fullName };
  if (password.length > 0) payload.password = password;

  const res = await fetch(`${API_BASE_URL}/users/${userId}`, {
    method: "PUT",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    alert("Failed to update profile");
    return;
  }

  alert("Profile updated successfully");
  window.location.reload();
}

// -------------------------------
// Logout
// -------------------------------
async function logout() {
  await fetch(`${API_BASE_URL}/auth/logout`, {
    method: "POST",
    credentials: "include",
  });

  window.location.href = "../../pages/auth/login.html";
}

// -------------------------------
// Initialize
// -------------------------------
(async function init() {
  const user = await getCurrentUser();
  if (!user) {
    window.location.href = "../../pages/auth/login.html";
    return;
  }

  if (user.role === "admin") {
    renderAdminUI(user);
  } else {
    renderStudentUI(user);
  }

  document.getElementById("profileForm").addEventListener("submit", (e) => {
    e.preventDefault();
    updateProfile(user.userId);
  });

  document.getElementById("logoutContainer").addEventListener("click", (e) => {
    if (e.target.id === "logoutBtn") logout();
  });
})();