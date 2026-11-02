/** Helpers for WhatsApp-style in-thread message search. */

export type ThreadSearchableMessage = {
  id: string;
  text?: string;
  caption?: string;
  fileName?: string;
  senderName?: string;
  deleted?: boolean;
  role?: string;
};

export function messageSearchHaystack(msg: ThreadSearchableMessage) {
  if (msg.deleted) return "";
  return [msg.text, msg.caption, msg.fileName, msg.senderName]
    .filter(Boolean)
    .join(" ");
}

export function messageMatchesQuery(
  msg: ThreadSearchableMessage,
  query: string,
) {
  const q = query.trim().toLowerCase();
  if (!q) return false;
  if (msg.role === "system") {
    return String(msg.text || "")
      .toLowerCase()
      .includes(q);
  }
  return messageSearchHaystack(msg).toLowerCase().includes(q);
}

/** Chronological match ids (oldest → newest). */
export function findThreadMatchIds(
  messages: ThreadSearchableMessage[],
  query: string,
) {
  const q = query.trim();
  if (!q) return [] as string[];
  return messages.filter((m) => messageMatchesQuery(m, q)).map((m) => m.id);
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Split text into plain / match segments for highlighting. */
export function splitHighlightSegments(text: string, query: string) {
  const q = query.trim();
  if (!q || !text) return [{ text, match: false as const }];
  try {
    const re = new RegExp(`(${escapeRegExp(q)})`, "gi");
    const parts = text.split(re);
    return parts
      .filter((part) => part.length > 0)
      .map((part) => ({
        text: part,
        match: part.toLowerCase() === q.toLowerCase(),
      }));
  } catch {
    return [{ text, match: false as const }];
  }
}
