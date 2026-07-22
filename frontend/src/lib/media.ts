function getApiBase(): string {
    if (process.env.NEXT_PUBLIC_API_URL) {
        return process.env.NEXT_PUBLIC_API_URL;
    }
    if (process.env.NODE_ENV === "production") {
        return "";
    }
    return "http://localhost:5000";
}

function resolveMediaBase(): string {
    const apiBase = getApiBase();

    if (typeof window === "undefined") {
        if (process.env.NODE_ENV === "development") {
            return process.env.API_PROXY_TARGET || "http://localhost:5000";
        }
        return apiBase;
    }

    if (!apiBase) return "";

    try {
        const configured = new URL(apiBase);
        if (configured.origin === window.location.origin) {
            return "";
        }
    } catch {
        // fall through
    }

    return apiBase;
}

/** Turn stored upload paths into full URLs served by the API. */
export function resolveMediaUrl(path: string | undefined): string {
    if (!path) return "";

    // Normalize backslashes to forward slashes
    let normalized = path.replace(/\\/g, "/");

    if (
        normalized.startsWith("http://") ||
        normalized.startsWith("https://") ||
        normalized.startsWith("data:")
    ) {
        return normalized;
    }

    // Ensure leading slash if it starts with uploads/
    if (normalized.startsWith("uploads/")) {
        normalized = "/" + normalized;
    }

    if (normalized.startsWith("/uploads/")) {
        const base = resolveMediaBase();
        return base ? `${base}${normalized}` : normalized;
    }

    return normalized;
}
