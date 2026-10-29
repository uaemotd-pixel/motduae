import { Server } from "socket.io";
import cookie from "cookie";
import { env } from "../config/env.js";
import { resolveAuthFromToken } from "../middleware/auth.js";
import { AUTH_COOKIE_NAME } from "../utils/authCookie.js";
import {
  assignAgent,
  appendMessage,
  clearCustomerSocketIfMatch,
  clearSessionMessages,
  closeSession,
  createSession,
  deleteOrHideMessages,
  editMessage,
  findOpenSessionForCustomer,
  getSession,
  listLiveSessions,
  restartSession,
  setAgentSocket,
  setCustomerSocket,
  setMessagesStatus,
  setRoleMessagesStatus,
  softEndSession,
  toPublicSession,
} from "./chatSessions.js";
import {
  notifyLiveChatAgentMessageCustomer,
  notifyLiveChatCustomerMessageAdmin,
  notifyLiveChatStartedAdmin,
} from "../services/notificationService.js";

/** @type {import("socket.io").Server | null} */
let io = null;

/** @type {Map<string, string>} socketId -> sessionId for customers */
const customerSocketSession = new Map();

function isStaffSocket(socket) {
  return socket.data?.kind === "staff";
}

function staffOnlineCount() {
  if (!io) return 0;
  const room = io.sockets.adapter.rooms.get("staff:inbox");
  return room ? room.size : 0;
}

function isCustomerConnected(session) {
  if (!session?.customerSocketId || !io) return false;
  return io.sockets.sockets.has(session.customerSocketId);
}

function isAgentConnected(session) {
  if (!session?.agentSocketId || !io) return false;
  return io.sockets.sockets.has(session.agentSocketId);
}

function ownsSession(socket, session) {
  if (!session) return false;
  if (isStaffSocket(socket)) return true;
  return session.customerSocketId === socket.id;
}

async function emitInboxUpdated() {
  if (!io) return;
  const sessions = await listLiveSessions();
  io.to("staff:inbox").emit("inbox:updated", sessions);
}

function emitMessageStatus(sessionId, messages) {
  if (!io || !messages?.length) return;
  io.to(`session:${sessionId}`).emit("chat:status", {
    sessionId,
    messages: messages.map((m) => ({
      id: m.id,
      status: m.status,
    })),
  });
}

function customerKindFromSocket(socket) {
  if (socket.data.kind === "registered") return "registered";
  if (socket.data.kind === "guest") return "guest";
  return "anonymous";
}

function sanitizeText(text) {
  return String(text || "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 2000);
}

/**
 * @param {import("http").Server} httpServer
 */
export function initSocketServer(httpServer) {
  io = new Server(httpServer, {
    path: "/socket.io",
    // Voice notes / attachments (base64 data URLs) need more than default 1MB.
    maxHttpBufferSize: 8e6,
    cors: {
      origin: env.corsOrigin,
      credentials: true,
    },
  });

  io.use(async (socket, next) => {
    try {
      const raw = socket.handshake.headers.cookie || "";
      const parsed = cookie.parse(raw);
      const token = parsed[AUTH_COOKIE_NAME];
      const result = token
        ? await resolveAuthFromToken(token)
        : { ok: false };

      if (result.ok) {
        const user = result.user;
        socket.data.user = user;
        const canStaff =
          Boolean(user.isAdmin) &&
          (user.role === "admin" || user.perms?.queries === true);
        if (canStaff) {
          socket.data.kind = "staff";
        } else if (user.isGuest) {
          socket.data.kind = "guest";
        } else {
          socket.data.kind = "registered";
        }
      } else {
        socket.data.user = null;
        socket.data.kind = "anonymous";
      }
      next();
    } catch (err) {
      next(err);
    }
  });

  io.on("connection", (socket) => {
    if (isStaffSocket(socket)) {
      socket.join("staff:inbox");
      void listLiveSessions().then((sessions) => {
        socket.emit("inbox:updated", sessions);
      });
      io.to("staff:inbox").emit("staff:online", {
        agentsOnline: staffOnlineCount(),
      });
    }

    socket.on("inbox:list", (payload, ack) => {
      // Client may emit with or without a payload; resolve the real ack fn.
      const reply =
        typeof ack === "function"
          ? ack
          : typeof payload === "function"
            ? payload
            : null;
      if (!isStaffSocket(socket)) {
        if (reply) reply({ ok: false, error: "forbidden" });
        return;
      }
      void listLiveSessions().then((sessions) => {
        if (reply) reply({ ok: true, sessions });
      });
    });

    socket.on("chat:start", async (payload = {}, ack) => {
      const reply = (body) => {
        if (typeof ack === "function") ack(body);
      };

      try {
        if (isStaffSocket(socket)) {
          reply({ ok: false, error: "forbidden" });
          return;
        }

        const name = String(payload.name || "").trim().slice(0, 80);
        if (!name || name.length < 2) {
          reply({ ok: false, error: "name_required" });
          return;
        }

        const email = String(payload.email || "")
          .trim()
          .toLowerCase()
          .slice(0, 160);
        const locale = String(payload.locale || "en").trim() || "en";
        const faqHistory = Array.isArray(payload.faqHistory)
          ? payload.faqHistory
          : Array.isArray(payload.priorMessages)
            ? payload.priorMessages
            : [];

        const user = socket.data.user;
        const kind = customerKindFromSocket(socket);
        const customer = {
          userId: user?._id ? String(user._id) : undefined,
          name,
          email: email || user?.email || undefined,
          kind,
        };

        // Block list is disabled until the Block feature ships.
        // Always allow start/resume — customer waits in queue like WhatsApp even if
        // no agent is currently on the Live Chat tab (they get notified / join later).
        const openExisting = customer.userId
          ? await findOpenSessionForCustomer(customer.userId)
          : null;

        const prevSessionId = customerSocketSession.get(socket.id);
        if (prevSessionId) {
          socket.leave(`session:${prevSessionId}`);
        }

        // Resume open Mongo thread for logged-in users; guests get a new thread.
        // New threads seed FAQ chatbot history so the agent sees prior context.
        const wasResume = Boolean(openExisting);
        const resumedFromEnded = openExisting?.status === "ended";
        const session = await createSession({
          customer,
          locale,
          customerSocketId: socket.id,
          faqHistory,
        });

        await setRoleMessagesStatus(session.id, "agent", "delivered");
        const publicSession = await toPublicSession(session.id, {
          viewer: "customer",
        });

        customerSocketSession.set(socket.id, session.id);
        socket.join(`session:${session.id}`);

        if (!wasResume) {
          void notifyLiveChatStartedAdmin({
            sessionId: session.id,
            customerName: session.customer?.name,
            createdBy: customer.userId || null,
          })
            .then(() => {
              io?.to("staff:inbox").emit("notifications:updated", {
                audience: "admin",
              });
            })
            .catch((err) =>
              console.error("live chat started notification failed:", err),
            );
        }

        if (resumedFromEnded) {
          const agentSession = await toPublicSession(session.id, {
            viewer: "agent",
          });
          socket.to(`session:${session.id}`).emit("chat:restarted", {
            session: agentSession,
          });
        }

        await emitInboxUpdated();
        reply({ ok: true, session: publicSession });
      } catch (err) {
        console.error("chat:start failed:", err);
        reply({ ok: false, error: "server_error" });
      }
    });

    socket.on("chat:accept", async (payload = {}, ack) => {
      const reply = (body) => {
        if (typeof ack === "function") ack(body);
      };

      try {
        if (!isStaffSocket(socket)) {
          reply({ ok: false, error: "forbidden" });
          return;
        }

        const sessionId = String(payload.sessionId || "").trim();
        const session = await getSession(sessionId, { withMessages: true });
        if (!session) {
          reply({ ok: false, error: "not_found" });
          return;
        }

        if (session.status === "active" && session.agent) {
          if (session.agentSocketId === socket.id) {
            socket.join(`session:${session.id}`);
            reply({
              ok: true,
              session: await toPublicSession(session.id, { viewer: "agent" }),
            });
            return;
          }
          reply({ ok: false, error: "already_accepted" });
          return;
        }

        const user = socket.data.user;
        const agent = {
          userId: String(user._id),
          name: user.name || "Agent",
        };

        const assigned = await assignAgent(sessionId, agent, socket.id);
        if (!assigned) {
          reply({ ok: false, error: "already_accepted" });
          return;
        }

        socket.join(`session:${assigned.id}`);

        // Push the "agent joined" bubble in realtime (also included in session below).
        if (assigned.joinMessage) {
          let message = assigned.joinMessage;
          if (isCustomerConnected(assigned)) {
            const upgraded = await setMessagesStatus(
              assigned.id,
              [message.id],
              "delivered",
            );
            if (upgraded[0]) message = upgraded[0];
          }
          io.to(`session:${assigned.id}`).emit("chat:message", {
            sessionId: assigned.id,
            message,
          });
        }

        const agentSession = await toPublicSession(assigned.id, {
          viewer: "agent",
        });
        const customerSession = await toPublicSession(assigned.id, {
          viewer: "customer",
        });
        const customerSid = assigned.customerSocketId;
        if (customerSid) {
          io.to(customerSid).emit("chat:accepted", { session: customerSession });
        } else {
          socket.to(`session:${assigned.id}`).emit("chat:accepted", {
            session: customerSession,
          });
        }
        await emitInboxUpdated();
        reply({ ok: true, session: agentSession });
      } catch (err) {
        console.error("chat:accept failed:", err);
        reply({ ok: false, error: "server_error" });
      }
    });

    socket.on("chat:join", async (payload = {}, ack) => {
      const reply = (body) => {
        if (typeof ack === "function") ack(body);
      };

      try {
        if (!isStaffSocket(socket)) {
          reply({ ok: false, error: "forbidden" });
          return;
        }

        const sessionId = String(payload.sessionId || "").trim();
        const session = await getSession(sessionId, {
          withMessages: true,
          viewer: "agent",
        });
        if (!session) {
          reply({ ok: false, error: "not_found" });
          return;
        }

        setAgentSocket(session.id, socket.id);
        socket.join(`session:${session.id}`);
        reply({
          ok: true,
          session: await toPublicSession(sessionId, { viewer: "agent" }),
        });
      } catch (err) {
        console.error("chat:join failed:", err);
        reply({ ok: false, error: "server_error" });
      }
    });

    socket.on("chat:typing", async (payload = {}) => {
      try {
        const sessionId = String(payload.sessionId || "").trim();
        const session = await getSession(sessionId);
        if (!session || !ownsSession(socket, session)) return;
        if (session.status === "ended" || session.status === "closed") return;

        socket.to(`session:${session.id}`).emit("chat:typing", {
          sessionId: session.id,
          typing: Boolean(payload.typing),
          from: isStaffSocket(socket) ? "agent" : "customer",
        });
      } catch {
        /* ignore typing errors */
      }
    });

    socket.on("chat:send", async (payload = {}, ack) => {
      const reply = (body) => {
        if (typeof ack === "function") ack(body);
      };

      try {
        const sessionId = String(payload.sessionId || "").trim();
        const kind = String(payload.kind || "text");
        const isVoice = kind === "voice";
        const isImage = kind === "image";
        const isFile = kind === "file";
        const text = isVoice ? "" : sanitizeText(payload.text);
        const session = await getSession(sessionId);

        if (!session || !ownsSession(socket, session)) {
          reply({ ok: false, error: "forbidden" });
          return;
        }

        if (!isVoice && !isImage && !isFile && !text) {
          reply({ ok: false, error: "empty" });
          return;
        }
        if (isVoice && !payload.audio) {
          reply({ ok: false, error: "empty" });
          return;
        }
        if ((isImage || isFile) && !(payload.data || payload.fileData)) {
          reply({ ok: false, error: "empty" });
          return;
        }

        const isStaff = isStaffSocket(socket);
        if (session.status === "ended" || session.status === "closed") {
          reply({ ok: false, error: "chat_ended" });
          return;
        }
        if (isStaff && session.status !== "active") {
          reply({ ok: false, error: "not_active" });
          return;
        }

        const role = isStaff ? "agent" : "customer";
        const peerOnline = isStaff
          ? isCustomerConnected(session)
          : isAgentConnected(session);

        const hasInlineAttachment =
          isVoice && Boolean(payload.data || payload.fileData);

        let message = await appendMessage(session.id, {
          role,
          kind: isVoice ? "voice" : isImage ? "image" : isFile ? "file" : "text",
          text,
          audio: isVoice ? payload.audio : undefined,
          durationMs: isVoice ? payload.durationMs : undefined,
          data:
            isImage || isFile || hasInlineAttachment
              ? payload.data || payload.fileData
              : undefined,
          fileName:
            isImage || isFile || hasInlineAttachment
              ? payload.fileName
              : undefined,
          mimeType:
            isImage || isFile || hasInlineAttachment
              ? payload.mimeType
              : undefined,
          fileSize:
            isImage || isFile || hasInlineAttachment
              ? payload.fileSize
              : undefined,
          attachmentKind: hasInlineAttachment
            ? payload.attachmentKind || payload.attachKind
            : undefined,
          replyToId: payload.replyToId || payload.replyTo?.id,
          senderName: isStaff
            ? session.agent?.name || socket.data.user?.name || "Agent"
            : session.customer?.name || "Customer",
          status: "sent",
        });

        if (!message) {
          reply({
            ok: false,
            error: isVoice
              ? "invalid_voice"
              : isImage || isFile
                ? "invalid_attachment"
                : "empty",
          });
          return;
        }

        if (peerOnline && message) {
          const upgraded = await setMessagesStatus(
            session.id,
            [message.id],
            "delivered",
          );
          if (upgraded[0]) message = upgraded[0];
        }

        io.to(`session:${session.id}`).emit("chat:message", {
          sessionId: session.id,
          message,
        });

        // In-app notifications when the peer is not currently in the thread.
        if (!isStaff && (!peerOnline || session.status === "waiting")) {
          void notifyLiveChatCustomerMessageAdmin({
            sessionId: session.id,
            messageId: message.id,
            customerName: session.customer?.name,
            message,
            createdBy: session.customer?.userId || null,
          })
            .then(() => {
              io?.to("staff:inbox").emit("notifications:updated", {
                audience: "admin",
              });
            })
            .catch((err) =>
              console.error("live chat admin notification failed:", err),
            );
        }

        if (
          isStaff &&
          !peerOnline &&
          session.customer?.userId
        ) {
          void notifyLiveChatAgentMessageCustomer({
            sessionId: session.id,
            messageId: message.id,
            recipientUserId: session.customer.userId,
            agentName: session.agent?.name || message.senderName,
            message,
            createdBy: session.agent?.userId || null,
          })
            .then(() => {
              io?.to(`session:${session.id}`).emit("notifications:updated", {
                audience: "customer",
              });
            })
            .catch((err) =>
              console.error("live chat customer notification failed:", err),
            );
        }

        await emitInboxUpdated();
        reply({ ok: true, message });
      } catch (err) {
        console.error("chat:send failed:", err);
        reply({ ok: false, error: "server_error" });
      }
    });

    socket.on("chat:delivered", async (payload = {}) => {
      try {
        const sessionId = String(payload.sessionId || "").trim();
        const messageId = String(payload.messageId || "").trim();
        const session = await getSession(sessionId, { withMessages: true });
        if (!session || !ownsSession(socket, session) || !messageId) return;

        const msg = (session.messages || []).find((m) => m.id === messageId);
        if (!msg) return;

        const isStaff = isStaffSocket(socket);
        if (isStaff && msg.role !== "customer") return;
        if (!isStaff && msg.role !== "agent") return;

        const updated = await setMessagesStatus(
          sessionId,
          [messageId],
          "delivered",
        );
        emitMessageStatus(sessionId, updated);
        if (updated.length) await emitInboxUpdated();
      } catch (err) {
        console.error("chat:delivered failed:", err);
      }
    });

    socket.on("chat:read", async (payload = {}) => {
      try {
        const sessionId = String(payload.sessionId || "").trim();
        const session = await getSession(sessionId);
        if (!session || !ownsSession(socket, session)) return;

        const fromRole = isStaffSocket(socket) ? "customer" : "agent";
        const updated = await setRoleMessagesStatus(
          sessionId,
          fromRole,
          "read",
        );
        emitMessageStatus(sessionId, updated);
        if (updated.length) await emitInboxUpdated();
      } catch (err) {
        console.error("chat:read failed:", err);
      }
    });

    socket.on("chat:end", async (payload = {}, ack) => {
      const reply =
        typeof ack === "function"
          ? ack
          : typeof payload === "function"
            ? payload
            : () => {};
      const body = typeof payload === "function" ? {} : payload || {};

      try {
        const sessionId = String(body.sessionId || "").trim();
        if (!sessionId) {
          reply({ ok: false, error: "bad_request" });
          return;
        }

        const session = await getSession(sessionId, { withMessages: false });

        if (!session || !ownsSession(socket, session)) {
          reply({ ok: false, error: "forbidden" });
          return;
        }
        if (session.status === "ended") {
          reply({
            ok: true,
            endedBy: session.endedBy,
            endedAt: session.endedAt,
          });
          return;
        }
        if (session.status === "closed") {
          reply({ ok: false, error: "already_closed" });
          return;
        }

        const endedBy = isStaffSocket(socket) ? "agent" : "customer";
        const ended = await softEndSession(sessionId, endedBy);
        if (!ended) {
          // Race: another tab ended it — treat as success if now ended.
          const again = await getSession(sessionId, { withMessages: false });
          if (again?.status === "ended") {
            reply({
              ok: true,
              endedBy: again.endedBy,
              endedAt: again.endedAt,
            });
            return;
          }
          reply({ ok: false, error: "not_found" });
          return;
        }

        reply({
          ok: true,
          endedBy,
          endedAt: ended.endedAt,
        });

        io.to(`session:${ended.id}`).emit("chat:ended", {
          sessionId: ended.id,
          endedBy,
          endedAt: ended.endedAt,
        });

        void emitInboxUpdated();
      } catch (err) {
        console.error("chat:end failed:", err);
        reply({ ok: false, error: "server_error" });
      }
    });

    socket.on("chat:restart", async (payload = {}, ack) => {
      const reply = (body) => {
        if (typeof ack === "function") ack(body);
      };

      try {
        const sessionId = String(payload.sessionId || "").trim();
        const session = await getSession(sessionId);
        if (!session || !ownsSession(socket, session)) {
          reply({ ok: false, error: "forbidden" });
          return;
        }

        const byRole = isStaffSocket(socket) ? "agent" : "customer";
        const restarted = await restartSession(sessionId, byRole);
        if (!restarted) {
          reply({ ok: false, error: "restart_denied" });
          return;
        }

        if (byRole === "customer") {
          setCustomerSocket(restarted.id, socket.id);
          customerSocketSession.set(socket.id, restarted.id);
        } else {
          setAgentSocket(restarted.id, socket.id);
        }
        socket.join(`session:${restarted.id}`);

        const agentSession = await toPublicSession(restarted.id, {
          viewer: "agent",
        });
        const customerSession = await toPublicSession(restarted.id, {
          viewer: "customer",
        });
        const peerSession =
          byRole === "customer" ? agentSession : customerSession;
        socket.to(`session:${restarted.id}`).emit("chat:restarted", {
          session: peerSession,
        });
        await emitInboxUpdated();
        reply({
          ok: true,
          session: byRole === "customer" ? customerSession : agentSession,
        });
      } catch (err) {
        console.error("chat:restart failed:", err);
        reply({ ok: false, error: "server_error" });
      }
    });

    socket.on("chat:edit", async (payload = {}, ack) => {
      const reply = (body) => {
        if (typeof ack === "function") ack(body);
      };
      try {
        const sessionId = String(payload.sessionId || "").trim();
        const messageId = String(payload.messageId || "").trim();
        const text = sanitizeText(payload.text);
        const session = await getSession(sessionId);
        if (!session || !ownsSession(socket, session)) {
          reply({ ok: false, error: "forbidden" });
          return;
        }
        if (session.status === "ended" || session.status === "closed") {
          reply({ ok: false, error: "chat_ended" });
          return;
        }
        if (!text) {
          reply({ ok: false, error: "empty" });
          return;
        }
        const byRole = isStaffSocket(socket) ? "agent" : "customer";
        const message = await editMessage(sessionId, messageId, byRole, text);
        if (!message) {
          reply({ ok: false, error: "edit_denied" });
          return;
        }
        io.to(`session:${sessionId}`).emit("chat:message-edited", {
          sessionId,
          message,
        });
        await emitInboxUpdated();
        reply({ ok: true, message });
      } catch (err) {
        console.error("chat:edit failed:", err);
        reply({ ok: false, error: "server_error" });
      }
    });

    socket.on("chat:clear", async (payload = {}, ack) => {
      const reply = (body) => {
        if (typeof ack === "function") ack(body);
      };
      try {
        const sessionId = String(payload.sessionId || "").trim();
        const session = await getSession(sessionId);
        if (!session) {
          reply({ ok: false, error: "not_found" });
          return;
        }
        if (!ownsSession(socket, session)) {
          reply({ ok: false, error: "forbidden" });
          return;
        }
        const cleared = await clearSessionMessages(sessionId);
        if (!cleared) {
          reply({ ok: false, error: "not_found" });
          return;
        }
        io.to(`session:${sessionId}`).emit("chat:cleared", { sessionId });
        await emitInboxUpdated();
        reply({ ok: true });
      } catch (err) {
        console.error("chat:clear failed:", err);
        reply({ ok: false, error: "server_error" });
      }
    });

    socket.on("chat:delete-messages", async (payload = {}, ack) => {
      const reply = (body) => {
        if (typeof ack === "function") ack(body);
      };
      try {
        const sessionId = String(payload.sessionId || "").trim();
        const messageIds = Array.isArray(payload.messageIds)
          ? payload.messageIds
          : [];
        const session = await getSession(sessionId);
        if (!session) {
          reply({ ok: false, error: "not_found" });
          return;
        }
        if (!ownsSession(socket, session)) {
          reply({ ok: false, error: "forbidden" });
          return;
        }
        const viewer = isStaffSocket(socket) ? "agent" : "customer";
        const result = await deleteOrHideMessages(
          sessionId,
          messageIds,
          viewer,
        );
        if (!result) {
          reply({ ok: false, error: "not_found" });
          return;
        }
        const publicSession = await toPublicSession(sessionId, { viewer });

        // Delete-for-everyone: broadcast tombstones (no shared session payload —
        // each client applies locally so the other side keeps its own hides).
        if (result.mineIds.length) {
          io.to(`session:${sessionId}`).emit("chat:messages-deleted", {
            sessionId,
            messageIds: result.mineIds,
            deletedBy: viewer,
          });
        }
        // Delete-for-me: only this socket removes others' messages from its view.
        if (result.otherIds.length) {
          socket.emit("chat:messages-hidden", {
            sessionId,
            messageIds: result.otherIds,
          });
        }

        if (result.mineIds.length) {
          await emitInboxUpdated();
        }
        reply({
          ok: true,
          session: publicSession,
          mineIds: result.mineIds,
          otherIds: result.otherIds,
        });
      } catch (err) {
        console.error("chat:delete-messages failed:", err);
        reply({ ok: false, error: "server_error" });
      }
    });

    socket.on("chat:close-now", async (payload = {}, ack) => {
      const reply = (body) => {
        if (typeof ack === "function") ack(body);
      };
      try {
        if (!isStaffSocket(socket)) {
          reply({ ok: false, error: "forbidden" });
          return;
        }
        const sessionId = String(payload.sessionId || "").trim();
        const session = await getSession(sessionId);
        if (!session) {
          reply({ ok: false, error: "not_found" });
          return;
        }
        const closed = await closeSession(sessionId);
        if (!closed) {
          reply({ ok: false, error: "not_found" });
          return;
        }
        io.to(`session:${sessionId}`).emit("chat:closed", { sessionId });
        const room = io.sockets.adapter.rooms.get(`session:${sessionId}`);
        if (room) {
          for (const sid of [...room]) {
            const s = io.sockets.sockets.get(sid);
            s?.leave(`session:${sessionId}`);
            if (customerSocketSession.get(sid) === sessionId) {
              customerSocketSession.delete(sid);
            }
          }
        }
        await emitInboxUpdated();
        reply({ ok: true });
      } catch (err) {
        console.error("chat:close-now failed:", err);
        reply({ ok: false, error: "server_error" });
      }
    });

    socket.on("chat:block", async (payload = {}, ack) => {
      const reply = (body) => {
        if (typeof ack === "function") ack(body);
      };
      // Block is deferred — do not close sessions or add to the block list.
      reply({ ok: false, error: "coming_soon" });
    });

    socket.on("disconnect", () => {
      const sessionId = customerSocketSession.get(socket.id);
      if (sessionId) {
        customerSocketSession.delete(socket.id);
        clearCustomerSocketIfMatch(sessionId, socket.id);
        void emitInboxUpdated();
      }

      if (isStaffSocket(socket)) {
        io.to("staff:inbox").emit("staff:online", {
          agentsOnline: staffOnlineCount(),
        });
      }
    });
  });

  return io;
}

export { staffOnlineCount };

export function getIo() {
  return io;
}
