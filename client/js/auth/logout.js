import { logOut } from "../core/api.js";

export async function performLogout() {
  try {
    await logOut();
  } finally {
    window.location.href = "../auth/login.html";
  }
}