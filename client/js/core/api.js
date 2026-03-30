//File is the client-side API layer and should contain network calls only
const APP_CONFIG = window.APP_CONFIG;
const baseAPIUrl = `${APP_CONFIG.api.baseUrl}${APP_CONFIG.api.basePath}`;

async function apiRequest(endpoint, options = {}) {
    const url = `${baseAPIUrl}${endpoint}`;

    const response = await fetch(url, {
        ...options,
        headers: {
            "Content-Type": "application/json",
            ...(options.headers || {})
        }
    });

    const contentType = response.headers.get("content-type") || "";

    if (!response.ok) {
        let errorMessage = `Request failed: ${response.status}`;

        try {
            if (contentType.includes("application/json")) {
                const errorData = await response.json();
                errorMessage =
                    errorData.error ||
                    errorData.message ||
                    errorMessage;
            } else {
                const errorText = await response.text();
                if (errorText) errorMessage = errorText;
            }
        } catch {
            // keep fallback errorMessage
        }
        throw new Error(errorMessage);
    }

    if (contentType.includes("application/json")) {
        return await response.json();
    }

    return null;
}

export async function testDb() {
    return apiRequest("/test-db");
}