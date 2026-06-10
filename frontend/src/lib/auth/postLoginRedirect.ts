import type { User } from "@/context/AuthContext";

function stripLocalePrefix(path: string): string {
    return path.replace(/^\/(en|ar)(?=\/|$)/, "") || "/";
}

function isAllowedRedirectForRole(url: string, role: string): boolean {
    const path = stripLocalePrefix(url);

    if (path.startsWith("/admin")) return role === "admin";
    if (path.startsWith("/tailor")) return role === "tailor";
    return true;
}

export function getPostLoginPath(user: User, redirectUrl?: string | null): string {
    const role = user.role.toLowerCase();
    const normalizedRedirect = redirectUrl ? stripLocalePrefix(redirectUrl) : null;

    if (normalizedRedirect && isAllowedRedirectForRole(normalizedRedirect, role)) {
        return normalizedRedirect;
    }

    if (role === "admin") return "/admin";
    if (role === "tailor") return "/tailor/dashboard";
    return "/";
}
