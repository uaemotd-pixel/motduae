const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

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
        return `${API_BASE}${normalized}`;
    }

    return normalized;
}
