import { signUp } from "../core/api.js";
import { byId } from "../core/utils.js";

const APP_CONFIG = window.APP_CONFIG;

function setError(message) {
  const errorBox = byId("errorBox");
  errorBox.hidden = false;
  errorBox.textContent = message;
}

function clearError() {
  const errorBox = byId("errorBox");
  errorBox.hidden = true;
  errorBox.textContent = "";
}

function validate(fullName, email, password, confirmPassword) {
  const nameOk = fullName.length >= 2;
  const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const passwordOk = password.length >= 8;
  const confirmOk = password === confirmPassword;

  byId("nameHint").hidden = nameOk;
  byId("emailHint").hidden = emailOk;
  byId("passHint").hidden = passwordOk;
  byId("confirmHint").hidden = confirmOk;

  return nameOk && emailOk && passwordOk && confirmOk;
}

const signupForm = byId("signupForm");

if (signupForm) {


  document.querySelectorAll('input[name="role"]').forEach((radio) => {
    radio.addEventListener("change", () => {
      byId("adminKeyField").hidden = radio.value !== "admin" || !radio.checked;
    });
  });

  signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    clearError();

    const fullName = byId("fullName").value.trim();
    const email = byId("email").value.trim().toLowerCase();
    const password = byId("password").value;
    const confirmPassword = byId("confirmPassword").value;

    const role = document.querySelector('input[name="role"]:checked').value;
    const adminKey = role === "admin" ? byId("adminKey").value : undefined;

    if (!validate(fullName, email, password, confirmPassword)) {
      setError("Fix the highlighted fields.");
      return;
    }

    try {
      const result = await signUp({
        fullName,
        email,
        password,
        role, ...(adminKey !== undefined && { adminKey }),       
      });

      if (result.requiresTwoFactor) {
        sessionStorage.setItem("twofaMode", result.mode || "setup");
        window.location.href = APP_CONFIG.redirects.verify2fa;
        return;
      }

      setError("Unexpected signup response.");
    } catch (error) {
      setError(error.message || "Sign up failed.");
    }
  });
}