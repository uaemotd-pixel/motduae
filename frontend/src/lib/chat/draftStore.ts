/** Persist composer drafts per live-chat session across refresh / tab switches. */

const PREFIX = "motd-chat-draft:";

function keyFor(sessionId: string) {
  return `${PREFIX}${String(sessionId || "").trim()}`;
}

export function readChatDraft(sessionId: string): string {
  if (typeof window === "undefined") return "";
  const id = String(sessionId || "").trim();
  if (!id) return "";
  try {
    return window.localStorage.getItem(keyFor(id)) || "";
  } catch {
    return "";
  }
}

export function writeChatDraft(sessionId: string, draft: string) {
  if (typeof window === "undefined") return;
  const id = String(sessionId || "").trim();
  if (!id) return;
  try {
    const value = String(draft || "");
    if (!value.trim()) {
      window.localStorage.removeItem(keyFor(id));
      return;
    }
    window.localStorage.setItem(keyFor(id), value);
  } catch {
    /* ignore quota / private mode */
  }
}

export function clearChatDraft(sessionId: string) {
  if (typeof window === "undefined") return;
  const id = String(sessionId || "").trim();
  if (!id) return;
  try {
    window.localStorage.removeItem(keyFor(id));
  } catch {
    /* ignore */
  }
}
