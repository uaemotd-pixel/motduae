/**
 * Resolves the browser-facing API / Socket.IO origin for Lightsail production.
 * Never returns a localhost URL when NODE_ENV is production (avoids baked-in
 * NEXT_PUBLIC_API_URL=http://localhost:5000 breaking live chat).
 */

function isLocalhostUrl(value: string): boolean {
  try {
    const u = new URL(value.includes("://") ? value : `http://${value}`);
    return (
      u.hostname === "localhost" ||
      u.hostname === "127.0.0.1" ||
      u.hostname === "[::1]"
    );
  } catch {
    return /^(localhost|127\.0\.0\.1)(:\d+)?\/?$/i.test(value);
  }
}

/**
 * @returns Absolute origin (no trailing slash), or "" for same-origin.
 */
export function getPublicApiBase(opts?: { preferSocket?: boolean }): string {
  const raw = opts?.preferSocket
    ? process.env.NEXT_PUBLIC_SOCKET_URL || process.env.NEXT_PUBLIC_API_URL
    : process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_SOCKET_URL;
  const explicit = String(raw || "").trim();

  if (explicit) {
    if (process.env.NODE_ENV === "production" && isLocalhostUrl(explicit)) {
      if (typeof window !== "undefined") {
        console.error(
          "[api] Ignoring localhost NEXT_PUBLIC_API_URL / NEXT_PUBLIC_SOCKET_URL in production; using same origin",
        );
      }
      return "";
    }
    return explicit.replace(/\/$/, "");
  }

  if (process.env.NODE_ENV === "production") {
    return "";
  }

  return "http://localhost:5000";
}

/** Absolute origin for Socket.IO (same-origin → window.location.origin in browser). */
export function getSocketOrigin(): string {
  const base = getPublicApiBase({ preferSocket: true });
  if (base) return base;
  if (typeof window !== "undefined") return window.location.origin;
  return process.env.NODE_ENV === "production" ? "" : "http://localhost:5000";
}
