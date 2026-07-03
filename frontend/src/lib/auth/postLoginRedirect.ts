import type { User } from "@/context/AuthContext";

function stripLocalePrefix(path: string): string {
  return path.replace(/^\/(en|ar)(?=\/|$)/, "") || "/";
}

function isAllowedRedirectForRole(url: string, role: string): boolean {
  const path = stripLocalePrefix(url);

  if (path.startsWith("/admin")) return role === "admin";
  if (path.startsWith("/sub-admin-dashboard")) return role === "sub-admin";
  if (path.startsWith("/tailor")) return role === "tailor";
  if (path.startsWith("/fabric")) return role === "fabric_store";
  return true;
}

export function getPostLoginPath(
  user: User,
  redirectUrl?: string | null,
): string {
  const role = user.role.toLowerCase();
  const normalizedRedirect = redirectUrl
    ? stripLocalePrefix(redirectUrl)
    : null;

  if (
    normalizedRedirect &&
    isAllowedRedirectForRole(normalizedRedirect, role)
  ) {
    return normalizedRedirect;
  }

  if (role === "admin") return "/admin";
  if (role === "sub-admin") return "/sub-admin-dashboard";
  if (role === "tailor") return "/tailor";
  if (role === "fabric_store") return "/fabric";
  return "/";
}

/** Full-page navigation after login — avoids Next.js client router getting stuck on auth pages. */
export function navigateAfterLogin(
  user: User,
  redirectUrl?: string | null,
  locale = "en",
): void {
  if (typeof window === "undefined") return;

  const path = getPostLoginPath(user, redirectUrl);
  const target = path === "/" ? `/${locale}` : `/${locale}${path}`;
  window.location.replace(target);
}
