window.APP_CONFIG = {
    appName: "Smart Course Companion",
    
    api: {
        baseUrl: "http://localhost:3000",
        basePath: "/api"
    },

    auth: {
        login: "/auth/login",
        signup: "/auth/signup",
        logout: "/auth/logout",
        twofa: "/auth/twofa",
        guard: "/auth/guard"
    },

    //Might be useful later on when we'll know exact final paths
    // pages: {
    //     login: "/pages/auth/login.html",
    //     signup: "/pages/auth/signup.html",
    //     verify2fa: "/pages/auth/verify-2fa.html",
    //     studentDashboard: "/pages/student/dashboard.html",
    //     adminDashboard: "/pages/admin/dashboard.html"
    // },

    roles: {
        student: "student",
        admin: "admin"
    },
    
    //Same here for the final paths
    // redirects: {
    //     student: "...", //will build upon as we build
    //     admin: "..."    //server and make frontend manipulate data
    // }
};
