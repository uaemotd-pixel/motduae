import { emitWithAck } from "@/lib/realtime/socket";

/** Minimal message shape needed to re-send into another session. */
export type ForwardableChatMessage = {
  id: string;
  kind?: "text" | "voice" | "image" | "file" | "call" | string;
  text?: string;
  caption?: string;
  audio?: string;
  data?: string;
  durationMs?: number;
  fileName?: string;
  mimeType?: string;
  fileSize?: number;
  attachmentKind?: string;
  deleted?: boolean;
};

type ForwardAck = { ok?: boolean; error?: string };

/**
 * Re-send a message into another live session the agent owns via chat:send.
 * Call badges cannot be forwarded.
 */
export async function forwardChatMessage(
  targetSessionId: string,
  msg: ForwardableChatMessage,
): Promise<{ ok: boolean; error?: string }> {
  const sessionId = String(targetSessionId || "").trim();
  if (!sessionId) return { ok: false, error: "missing_target" };
  if (!msg || msg.deleted) return { ok: false, error: "unavailable" };

  const kind = msg.kind || "text";
  if (kind === "call") return { ok: false, error: "unsupported" };

  try {
    let res: ForwardAck | null = null;

    if (kind === "voice" && msg.audio) {
      res = await emitWithAck<ForwardAck>("chat:send", {
        sessionId,
        kind: "voice",
        audio: msg.audio,
        durationMs: msg.durationMs,
        data: msg.data,
        fileName: msg.fileName,
        mimeType: msg.mimeType,
        fileSize: msg.fileSize,
        attachmentKind: msg.attachmentKind,
      });
    } else if (kind === "image" && msg.data) {
      res = await emitWithAck<ForwardAck>("chat:send", {
        sessionId,
        kind: "image",
        data: msg.data,
        fileName: msg.fileName,
        mimeType: msg.mimeType,
        fileSize: msg.fileSize,
        text: (msg.caption || msg.text || "").trim() || undefined,
      });
    } else if (kind === "file" && msg.data) {
      res = await emitWithAck<ForwardAck>("chat:send", {
        sessionId,
        kind: "file",
        data: msg.data,
        fileName: msg.fileName,
        mimeType: msg.mimeType,
        fileSize: msg.fileSize,
        text: (msg.caption || msg.text || "").trim() || undefined,
      });
    } else {
      const text = (msg.caption || msg.text || "").trim();
      if (!text) return { ok: false, error: "empty" };
      res = await emitWithAck<ForwardAck>("chat:send", {
        sessionId,
        text,
      });
    }

    if (!res?.ok) {
      return { ok: false, error: res?.error || "forward_failed" };
    }
    return { ok: true };
  } catch {
    return { ok: false, error: "network" };
  }
}
