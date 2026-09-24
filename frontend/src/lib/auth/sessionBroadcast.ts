export const AUTH_SESSION_KEY = "motdAuthSession";
export const AUTH_SESSION_EXPIRED_EVENT = "motd:session-expired";

export function broadcastSignedOut() {
  if (typeof window === "undefined") return;
  localStorage.setItem(AUTH_SESSION_KEY, "");
  window.dispatchEvent(new Event(AUTH_SESSION_EXPIRED_EVENT));
}

export function broadcastSignedIn(userId: string) {
  if (typeof window === "undefined") return;
  localStorage.setItem(AUTH_SESSION_KEY, userId);
}
