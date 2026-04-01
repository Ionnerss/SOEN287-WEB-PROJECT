const APP_CONFIG = window.APP_CONFIG;
const baseAPIUrl = `${APP_CONFIG.api.baseUrl}/${APP_CONFIG.api.basePath}`;

async function apiRequest(endpoint, options = {}) {
  const response = await fetch(`${baseAPIUrl}${endpoint}`, {
    credentials: "include",
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });

  const contentType = response.headers.get("content-type") || "";

  if (!response.ok) {
    let errorMessage = `Request failed: ${response.status}`;

    try {
      if (contentType.includes("application/json")) {
        const errorData = await response.json();
        errorMessage = errorData.error || errorData.message || errorMessage;
      } else {
        const errorText = await response.text();
        if (errorText) errorMessage = errorText;
      }
    } catch {
      // keep fallback message
    }

    throw new Error(errorMessage);
  }

  if (contentType.includes("application/json")) {
    return response.json();
  }

  return null;
}

export function testDb() {
  return apiRequest("/test-db");
}

export function signUp(payload) {
  return apiRequest(APP_CONFIG.auth.signup, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function logIn(payload) {
  return apiRequest(APP_CONFIG.auth.login, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function verifyTwoFactor(token) {
  return apiRequest(APP_CONFIG.auth.twofaVerify, {
    method: "POST",
    body: JSON.stringify({ token }),
  });
}

export function getTwoFactorSetup() {
  return apiRequest(APP_CONFIG.auth.twofaSetup, {
    method: "GET",
  });
}

export function guard() {
  return apiRequest(APP_CONFIG.auth.guard, {
    method: "GET",
  });
}

export function logOut() {
  return apiRequest(APP_CONFIG.auth.logout, {
    method: "POST",
  });
}