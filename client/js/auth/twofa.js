import { getTwoFactorSetup, verifyTwoFactor } from "../core/api.js";
import { byId } from "../core/utils.js";

const APP_CONFIG = window.APP_CONFIG;
const mode = sessionStorage.getItem("twofaMode") || "verify";

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

function redirectByRole(role) {
  if (role === APP_CONFIG.roles.admin) {
    window.location.href = APP_CONFIG.redirects.admin;
    return;
  }

  window.location.href = APP_CONFIG.redirects.student;
}

async function loadSetupIfNeeded() {
  const setupPanel = byId("setupPanel");

  if (mode !== "setup") {
    setupPanel.hidden = true;
    return;
  }

  try {
    const data = await getTwoFactorSetup();
    byId("qrCodeImage").src = data.qrCodeDataUrl;
    byId("manualKey").textContent = data.manualEntryKey;
    byId("setupEmail").textContent = data.email;
    setupPanel.hidden = false;
  } catch (error) {
    setError(error.message || "Could not load 2FA setup.");
  }
}

const form = byId("twofaForm");

if (form) {
  loadSetupIfNeeded();

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    clearError();

    const token = byId("token").value.trim();

    if (!/^\d{6}$/.test(token)) {
      setError("Enter the 6-digit code from your authenticator app.");
      return;
    }

    try {
      const result = await verifyTwoFactor(token);
      sessionStorage.removeItem("twofaMode");
      redirectByRole(result.user.role);
    } catch (error) {
      setError(error.message || "2FA verification failed.");
    }
  });
}