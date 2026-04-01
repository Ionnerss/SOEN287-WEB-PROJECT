import { guard } from "../core/api.js";

const APP_CONFIG = window.APP_CONFIG;

export async function requireAuth(expectedRole) {
  try {
    const result = await guard();

    if (!result.authenticated) {
      window.location.href = "../auth/login.html";
      return null;
    }

    if (expectedRole && result.user.role !== expectedRole) {
      const target =
        result.user.role === APP_CONFIG.roles.admin
          ? APP_CONFIG.redirects.admin
          : APP_CONFIG.redirects.student;

      window.location.href = target;
      return null;
    }

    return result.user;
  } catch {
    window.location.href = "../auth/login.html";
    return null;
  }
}