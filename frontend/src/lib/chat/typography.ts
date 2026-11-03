/**
 * Shared chat typography class names (customer / admin / fabric).
 * Sizes live in globals.css as --chat-fs-* + .chat-text-* utilities.
 */
export const chatType = {
  body: "chat-text-body",
  meta: "chat-text-meta",
  time: "chat-text-time",
  system: "chat-text-system",
  title: "chat-text-title",
  subtitle: "chat-text-subtitle",
  listName: "chat-text-list-name",
  listPreview: "chat-text-list-preview",
  listTime: "chat-text-list-time",
  call: "chat-text-call",
  callMeta: "chat-text-call-meta",
} as const;
