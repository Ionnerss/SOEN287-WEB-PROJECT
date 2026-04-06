import { logIn } from "../core/api.js";
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

function validate(email, password) {
  let valid = true;

  const emailHint = byId("emailHint");
  const passHint = byId("passHint");

  const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const passwordOk = password.length >= 8;

  emailHint.hidden = emailOk;
  passHint.hidden = passwordOk;

  if (!emailOk || !passwordOk) valid = false;
  return valid;
}

const loginForm = byId("loginForm");

if (loginForm) {
  loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    clearError();

    const email = byId("email").value.trim().toLowerCase();
    const password = byId("password").value;

    if (!validate(email, password)) {
      setError("Fix the highlighted fields.");
      return;
    }

    try {
      const result = await logIn({ email, password });

      if (result.requiresTwoFactor) {
        sessionStorage.setItem("twofaMode", result.mode || "verify");
        window.location.href = APP_CONFIG.redirects.verify2fa;
        return;
      }

      setError("Unexpected login response.");
    } catch (error) {
      setError(error.message || "Login failed.");
    }
  });
}