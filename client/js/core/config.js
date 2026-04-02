window.APP_CONFIG = {
  appName: "Smart Course Companion",
  api: {
    baseUrl: "http://127.0.0.1:3000",
    basePath: "api",
  },
  auth: {
    signup: "/auth/signup",
    login: "/auth/login",
    logout: "/auth/logout",
    guard: "/auth/guard",
    twofaSetup: "/auth/2fa/setup",
    twofaVerify: "/auth/2fa/verify",
  },
  roles: {
    student: "student",
    admin: "admin",
  },
  redirects: {
    verify2fa: "./verify-2fa.html",
    student: "../student/dashboard.html",
    admin: "../admin/dashboard.html",
    login: "./login.html",
  },
};