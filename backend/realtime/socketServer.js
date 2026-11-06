import { Server } from "socket.io";
import { parseCookie } from "cookie";
import { env } from "../config/env.js";
import { resolveAuthFromToken } from "../middleware/auth.js";
import { AUTH_COOKIE_NAME } from "../utils/authCookie.js";
import {
  assignAgent,
  appendCallHistoryMessage,
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
  notifyLiveChatCustomerMessageFabricStore,
  notifyLiveChatStartedAdmin,
  notifyLiveChatStartedFabricStore,
} from "../services/notificationService.js";
import {
  customerCanChatWithFabricStore,
  listDealtWithFabricStores,
} from "../services/customerFabricStoreDeals.js";
import {
  acceptCall,
  attachCustomerToRingingCall,
  cancelPendingDisconnectEnd,
  createRingingCall,
  endCall,
  endCallForSocket,
  getCallBySession,
  isAudioCallsEnabled,
  markCallActive,
  reattachCallSocket,
  toPublicCall,
} from "./audioCalls.js";
import FabricShop from "../models/FabricShop.js";

/** Deliver a pending outbound ring to a customer who just (re)joined. */
function deliverPendingCallRing(sessionId, customerSocket) {
  if (!io || !customerSocket) return;
  const pending = attachCustomerToRingingCall(sessionId, customerSocket.id);
  if (!pending) return;
  const publicCall = toPublicCall(pending);
  customerSocket.emit("call:ring", {
    ...publicCall,
    from: "agent",
  });
  // Tell the agent the customer's device is now ringing (WhatsApp-style).
  io.to(`session:${sessionId}`).emit("call:peer-ringing", {
    sessionId,
    callId: pending.callId,
  });
  console.info("[audioCall] deferred ring delivered", {
    callId: pending.callId,
    sessionId,
  });
}

/**
 * Chat placement for call history:
 * 1) Successful talk → centered (system)
 * 2) Customer cancelled / declined → customer side
 * 3) Agent cancelled / missed (no answer) → agent side
 * @param {{ outcome?: string }} history
 * @param {string} reason
 * @param {{ by?: string }} [extra]
 * @returns {"agent"|"customer"|"system"}
 */
function resolveCallHistoryRole(history = {}, reason = "", extra = {}) {
  if (history.outcome === "answered") return "system";

  const why = String(reason || "");
  if (extra.by === "customer" || why === "rejected") return "customer";
  if (extra.by === "agent") return "agent";
  // Ring timeout / unknown cancel while ringing → attribute to agent (caller).
  if (why === "missed" || why === "cancelled") return "agent";
  return "agent";
}

/**
 * Emit call:ended and persist a WhatsApp-style call history bubble.
 * @param {object | null} endedCall — snapshot from endCall()
 * @param {string} reason
 * @param {{ by?: string }} [extra]
 */
async function emitCallEnded(endedCall, reason, extra = {}) {
  if (!io || !endedCall?.sessionId) return;
  const sessionId = endedCall.sessionId;
  const history = endedCall.history || {
    outcome: "failed",
    durationMs: 0,
  };
  const role = resolveCallHistoryRole(history, reason, extra);

  io.to(`session:${sessionId}`).emit("call:ended", {
    sessionId,
    callId: endedCall.callId,
    reason,
    outcome: history.outcome,
    durationMs: history.durationMs,
    role,
    ...(extra.by ? { by: extra.by } : {}),
  });

  try {
    const message = await appendCallHistoryMessage(sessionId, {
      outcome: history.outcome,
      durationMs: history.durationMs,
      role,
    });
    if (message) {
      io.to(`session:${sessionId}`).emit("chat:message", {
        sessionId,
        message,
      });
      const session = await getSession(sessionId);
      void emitInboxUpdated(session);
    }
  } catch (err) {
    console.error("[audioCall] call history message failed:", err);
  }
}

/** @type {import("socket.io").Server | null} */
let io = null;

/** @type {Map<string, string>} socketId -> sessionId for customers */
const customerSocketSession = new Map();

function isStaffSocket(socket) {
  return socket.data?.kind === "staff";
}

function isFabricStaffSocket(socket) {
  return socket.data?.kind === "fabric_staff";
}

function isAgentSideSocket(socket) {
  return isStaffSocket(socket) || isFabricStaffSocket(socket);
}

function staffOnlineCount() {
  if (!io) return 0;
  const room = io.sockets.adapter.rooms.get("staff:inbox");
  return room ? room.size : 0;
}

function fabricInboxRoom(ownerId) {
  return `fabric:inbox:${String(ownerId || "").trim()}`;
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
  const kind = session.sessionKind === "fabric" ? "fabric" : "support";
  if (isStaffSocket(socket)) {
    return kind === "support";
  }
  if (isFabricStaffSocket(socket)) {
    const ownerId = String(socket.data.user?._id || "");
    return (
      kind === "fabric" &&
      ownerId &&
      String(session.fabricStoreOwnerId || "") === ownerId
    );
  }
  return session.customerSocketId === socket.id;
}

async function emitSupportInboxUpdated() {
  if (!io) return;
  const sessions = await listLiveSessions({ sessionKind: "support" });
  io.to("staff:inbox").emit("inbox:updated", sessions);
}

async function emitFabricInboxUpdated(ownerId) {
  if (!io) return;
  const id = String(ownerId || "").trim();
  if (!id) return;
  const sessions = await listLiveSessions({
    sessionKind: "fabric",
    fabricStoreOwnerId: id,
  });
  io.to(fabricInboxRoom(id)).emit("inbox:updated", sessions);
}

async function emitInboxUpdated(sessionHint = null) {
  if (!io) return;
  if (sessionHint?.sessionKind === "fabric") {
    await emitFabricInboxUpdated(sessionHint.fabricStoreOwnerId);
    return;
  }
  if (sessionHint && sessionHint.sessionKind !== "fabric") {
    await emitSupportInboxUpdated();
    return;
  }
  await emitSupportInboxUpdated();
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
      const parsed = parseCookie(raw);
      const token = parsed[AUTH_COOKIE_NAME];
      const result = token
        ? await resolveAuthFromToken(token)
        : { ok: false };

      if (result.ok) {
        const user = result.user;
        socket.data.user = user;
        const canStaff =
          Boolean(user.isAdmin) &&
          (user.role === "admin" || user.perms?.customerSupport === true);
        const canFabricStaff =
          user.role === "fabric_store" &&
          user.isActive !== false &&
          (!user.approvalStatus || user.approvalStatus === "approved");
        if (canStaff) {
          socket.data.kind = "staff";
        } else if (canFabricStaff) {
          socket.data.kind = "fabric_staff";
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
      void listLiveSessions({ sessionKind: "support" }).then((sessions) => {
        socket.emit("inbox:updated", sessions);
      });
      io.to("staff:inbox").emit("staff:online", {
        agentsOnline: staffOnlineCount(),
      });
    }

    if (isFabricStaffSocket(socket)) {
      const ownerId = String(socket.data.user?._id || "");
      if (ownerId) {
        socket.join(fabricInboxRoom(ownerId));
        void listLiveSessions({
          sessionKind: "fabric",
          fabricStoreOwnerId: ownerId,
        }).then((sessions) => {
          socket.emit("inbox:updated", sessions);
        });
      }
    }

    socket.on("inbox:list", (payload, ack) => {
      // Client may emit with or without a payload; resolve the real ack fn.
      const reply =
        typeof ack === "function"
          ? ack
          : typeof payload === "function"
            ? payload
            : null;
      if (isStaffSocket(socket)) {
        void listLiveSessions({ sessionKind: "support" }).then((sessions) => {
          if (reply) reply({ ok: true, sessions });
        });
        return;
      }
      if (isFabricStaffSocket(socket)) {
        const ownerId = String(socket.data.user?._id || "");
        void listLiveSessions({
          sessionKind: "fabric",
          fabricStoreOwnerId: ownerId,
        }).then((sessions) => {
          if (reply) reply({ ok: true, sessions });
        });
        return;
      }
      if (reply) reply({ ok: false, error: "forbidden" });
    });

    socket.on("chat:start", async (payload = {}, ack) => {
      const reply = (body) => {
        if (typeof ack === "function") ack(body);
      };

      try {
        if (isAgentSideSocket(socket)) {
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
        const sessionKind =
          String(payload.sessionKind || payload.kind || "support").trim() ===
          "fabric"
            ? "fabric"
            : "support";
        const fabricStoreOwnerId = String(
          payload.fabricStoreOwnerId || payload.storeOwnerId || "",
        ).trim();
        const fabricShopId = String(
          payload.fabricShopId || payload.shopId || "",
        ).trim();
        let fabricStoreName = String(
          payload.fabricStoreName || payload.storeName || "",
        ).trim();

        const user = socket.data.user;
        const kind = customerKindFromSocket(socket);
        const customer = {
          userId: user?._id ? String(user._id) : undefined,
          name,
          email: email || user?.email || undefined,
          kind,
        };

        if (sessionKind === "fabric") {
          if (!customer.userId || kind === "guest" || kind === "anonymous") {
            reply({ ok: false, error: "login_required" });
            return;
          }
          if (!fabricStoreOwnerId) {
            reply({ ok: false, error: "store_required" });
            return;
          }
          const allowed = await customerCanChatWithFabricStore(
            customer.userId,
            fabricStoreOwnerId,
          );
          if (!allowed) {
            reply({ ok: false, error: "store_not_eligible" });
            return;
          }
          if (!fabricStoreName) {
            const stores = await listDealtWithFabricStores(customer.userId);
            const match = stores.find((s) => s.ownerId === fabricStoreOwnerId);
            fabricStoreName = match?.name || "Fabric store";
          }
        }

        const openExisting = customer.userId
          ? await findOpenSessionForCustomer(customer.userId, {
              sessionKind,
              fabricStoreOwnerId:
                sessionKind === "fabric" ? fabricStoreOwnerId : null,
            })
          : null;

        const prevSessionId = customerSocketSession.get(socket.id);
        if (prevSessionId) {
          socket.leave(`session:${prevSessionId}`);
        }

        const wasResume = Boolean(openExisting);
        const resumedFromEnded = openExisting?.status === "ended";
        const session = await createSession({
          customer,
          locale,
          customerSocketId: socket.id,
          faqHistory: sessionKind === "support" ? faqHistory : [],
          sessionKind,
          fabricStoreOwnerId:
            sessionKind === "fabric" ? fabricStoreOwnerId : null,
          fabricShopId: sessionKind === "fabric" ? fabricShopId || null : null,
          fabricStoreName:
            sessionKind === "fabric" ? fabricStoreName || null : null,
        });

        await setRoleMessagesStatus(session.id, "agent", "delivered");
        const publicSession = await toPublicSession(session.id, {
          viewer: "customer",
        });

        customerSocketSession.set(socket.id, session.id);
        socket.join(`session:${session.id}`);
        deliverPendingCallRing(session.id, socket);

        if (!wasResume) {
          if (sessionKind === "fabric") {
            void notifyLiveChatStartedFabricStore({
              sessionId: session.id,
              customerName: session.customer?.name,
              recipientUserId: fabricStoreOwnerId,
              createdBy: customer.userId || null,
            })
              .then(() => {
                io?.to(fabricInboxRoom(fabricStoreOwnerId)).emit(
                  "notifications:updated",
                  { audience: "customer" },
                );
              })
              .catch((err) =>
                console.error("fabric live chat started notification failed:", err),
              );
          } else {
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
        }

        if (resumedFromEnded) {
          const agentSession = await toPublicSession(session.id, {
            viewer: "agent",
          });
          socket.to(`session:${session.id}`).emit("chat:restarted", {
            session: agentSession,
          });
        }

        await emitInboxUpdated(session);
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
        if (!isAgentSideSocket(socket)) {
          reply({ ok: false, error: "forbidden" });
          return;
        }

        const sessionId = String(payload.sessionId || "").trim();
        const session = await getSession(sessionId, { withMessages: true });
        if (!session) {
          reply({ ok: false, error: "not_found" });
          return;
        }
        if (!ownsSession(socket, session)) {
          reply({ ok: false, error: "forbidden" });
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
          name:
            (session.sessionKind === "fabric" && session.fabricStoreName) ||
            user.name ||
            (session.sessionKind === "fabric" ? "Fabric store" : "Agent"),
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
        await emitInboxUpdated(assigned);
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
        if (!isAgentSideSocket(socket)) {
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
        if (!ownsSession(socket, session)) {
          reply({ ok: false, error: "forbidden" });
          return;
        }

        setAgentSocket(session.id, socket.id);
        socket.join(`session:${session.id}`);
        cancelPendingDisconnectEnd(socket.id);
        // Keep any live call for this session bound to the reconnected agent socket.
        reattachCallSocket(session.id, "agent", socket.id);
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
          from: isAgentSideSocket(socket) ? "agent" : "customer",
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

        const isAgentSide = isAgentSideSocket(socket);
        if (session.status === "ended" || session.status === "closed") {
          reply({ ok: false, error: "chat_ended" });
          return;
        }
        if (isAgentSide && session.status !== "active") {
          reply({ ok: false, error: "not_active" });
          return;
        }

        const role = isAgentSide ? "agent" : "customer";
        const peerOnline = isAgentSide
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
          senderName: isAgentSide
            ? session.agent?.name ||
              session.fabricStoreName ||
              socket.data.user?.name ||
              "Agent"
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
        if (!isAgentSide && (!peerOnline || session.status === "waiting")) {
          if (session.sessionKind === "fabric" && session.fabricStoreOwnerId) {
            void notifyLiveChatCustomerMessageFabricStore({
              sessionId: session.id,
              messageId: message.id,
              customerName: session.customer?.name,
              message,
              recipientUserId: session.fabricStoreOwnerId,
              createdBy: session.customer?.userId || null,
            })
              .then(() => {
                io?.to(fabricInboxRoom(session.fabricStoreOwnerId)).emit(
                  "notifications:updated",
                  { audience: "customer" },
                );
              })
              .catch((err) =>
                console.error("fabric live chat notification failed:", err),
              );
          } else {
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
        }

        if (isAgentSide && !peerOnline && session.customer?.userId) {
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

        await emitInboxUpdated(session);
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

        const isStaff = isAgentSideSocket(socket);
        if (isStaff && msg.role !== "customer") return;
        if (!isStaff && msg.role !== "agent") return;

        const updated = await setMessagesStatus(
          sessionId,
          [messageId],
          "delivered",
        );
        emitMessageStatus(sessionId, updated);
        if (updated.length) await emitInboxUpdated(session);
      } catch (err) {
        console.error("chat:delivered failed:", err);
      }
    });

    socket.on("chat:read", async (payload = {}) => {
      try {
        const sessionId = String(payload.sessionId || "").trim();
        const session = await getSession(sessionId);
        if (!session || !ownsSession(socket, session)) return;

        const fromRole = isAgentSideSocket(socket) ? "customer" : "agent";
        const updated = await setRoleMessagesStatus(
          sessionId,
          fromRole,
          "read",
        );
        emitMessageStatus(sessionId, updated);
        if (updated.length) await emitInboxUpdated(session);
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

        const endedBy = isAgentSideSocket(socket) ? "agent" : "customer";
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

        const endedCall = endCall(sessionId, "chat_ended");
        if (endedCall) {
          await emitCallEnded(endedCall, "chat_ended", { by: endedBy });
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

        void emitInboxUpdated(ended);
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

        const byRole = isAgentSideSocket(socket) ? "agent" : "customer";
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
        const byRole = isAgentSideSocket(socket) ? "agent" : "customer";
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
        const viewer = isAgentSideSocket(socket) ? "agent" : "customer";
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
        if (!isAgentSideSocket(socket)) {
          reply({ ok: false, error: "forbidden" });
          return;
        }
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
        const closed = await closeSession(sessionId);
        if (!closed) {
          reply({ ok: false, error: "not_found" });
          return;
        }
        const endedCall = endCall(sessionId, "chat_closed");
        if (endedCall) {
          await emitCallEnded(endedCall, "chat_closed", { by: "agent" });
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
        await emitInboxUpdated(session);
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

    // ── Audio call (staff / fabric store → customer, 1:1 WebRTC) ────────────

    socket.on("call:invite", async (payload = {}, ack) => {
      const reply = (body) => {
        if (typeof ack === "function") ack(body);
      };
      try {
        if (!isAudioCallsEnabled()) {
          reply({ ok: false, error: "disabled" });
          return;
        }
        if (!isAgentSideSocket(socket)) {
          console.info("[audioCall] invite rejected", {
            reason: "forbidden_role",
            kind: socket.data?.kind,
          });
          reply({ ok: false, error: "forbidden" });
          return;
        }
        const sessionId = String(payload.sessionId || "").trim();
        const session = await getSession(sessionId);
        if (!session) {
          reply({ ok: false, error: "not_found" });
          return;
        }
        const isFabricSession = session.sessionKind === "fabric";
        if (isFabricSession) {
          if (!isFabricStaffSocket(socket) || !ownsSession(socket, session)) {
            reply({ ok: false, error: "forbidden" });
            return;
          }
          const shop = session.fabricShopId
            ? await FabricShop.findById(session.fabricShopId)
                .select("allowLiveChatAudioCalls")
                .lean()
            : await FabricShop.findOne({
                ownerId: session.fabricStoreOwnerId,
              })
                .select("allowLiveChatAudioCalls")
                .lean();
          if (!shop || shop.allowLiveChatAudioCalls === false) {
            reply({ ok: false, error: "disabled" });
            return;
          }
        } else if (!isStaffSocket(socket) || !ownsSession(socket, session)) {
          reply({ ok: false, error: "forbidden" });
          return;
        }
        if (session.status !== "active") {
          reply({ ok: false, error: "session_not_active" });
          return;
        }
        if (getCallBySession(sessionId)) {
          reply({ ok: false, error: "busy" });
          return;
        }

        // Staff should be in the session room to relay signals.
        socket.join(`session:${sessionId}`);
        cancelPendingDisconnectEnd(socket.id);
        if (session.agentSocketId !== socket.id) {
          setAgentSocket(sessionId, socket.id);
        }

        const peerReachable = isCustomerConnected(session);
        const call = createRingingCall(sessionId, {
          adminSocketId: socket.id,
          customerSocketId: peerReachable ? session.customerSocketId : "",
          onRingTimeout: (timedOut) => {
            void emitCallEnded(timedOut, "missed");
          },
        });

        const publicCall = toPublicCall(call);
        // Only ring the customer when they are online; otherwise stay in
        // "Calling…" until they reconnect (deliverPendingCallRing).
        if (peerReachable) {
          io.to(`session:${sessionId}`).emit("call:ring", {
            ...publicCall,
            from: "agent",
          });
        }
        reply({
          ok: true,
          call: publicCall,
          peerReachable,
        });
      } catch (err) {
        if (err?.code === "busy" || err?.message === "busy") {
          reply({ ok: false, error: "busy" });
          return;
        }
        console.error("call:invite failed:", err);
        reply({ ok: false, error: "server_error" });
      }
    });

    socket.on("call:accept", async (payload = {}, ack) => {
      const reply = (body) => {
        if (typeof ack === "function") ack(body);
      };
      try {
        if (!isAudioCallsEnabled()) {
          reply({ ok: false, error: "disabled" });
          return;
        }
        if (isAgentSideSocket(socket)) {
          reply({ ok: false, error: "forbidden" });
          return;
        }
        const sessionId = String(payload.sessionId || "").trim();
        const session = await getSession(sessionId);
        if (!session || !ownsSession(socket, session)) {
          reply({ ok: false, error: "forbidden" });
          return;
        }
        const call = acceptCall(sessionId, socket.id);
        setCustomerSocket(sessionId, socket.id);
        customerSocketSession.set(socket.id, sessionId);
        socket.join(`session:${sessionId}`);

        const publicCall = toPublicCall(call);
        io.to(`session:${sessionId}`).emit("call:accepted", {
          ...publicCall,
          // Admin creates the WebRTC offer.
          callerSocketHint: "agent",
        });
        reply({ ok: true, call: publicCall, role: "callee" });
      } catch (err) {
        const code = err?.code || err?.message;
        if (code === "not_found" || code === "invalid_state") {
          reply({ ok: false, error: code });
          return;
        }
        console.error("call:accept failed:", err);
        reply({ ok: false, error: "server_error" });
      }
    });

    socket.on("call:reject", async (payload = {}, ack) => {
      const reply = (body) => {
        if (typeof ack === "function") ack(body);
      };
      try {
        if (isAgentSideSocket(socket)) {
          reply({ ok: false, error: "forbidden" });
          return;
        }
        const sessionId = String(payload.sessionId || "").trim();
        const session = await getSession(sessionId);
        if (!session || !ownsSession(socket, session)) {
          reply({ ok: false, error: "forbidden" });
          return;
        }
        const call = getCallBySession(sessionId);
        if (!call || call.status !== "ringing") {
          reply({ ok: false, error: "not_found" });
          return;
        }
        const ended = endCall(sessionId, "rejected");
        if (ended) await emitCallEnded(ended, "rejected");
        reply({ ok: true });
      } catch (err) {
        console.error("call:reject failed:", err);
        reply({ ok: false, error: "server_error" });
      }
    });

    socket.on("call:signal", async (payload = {}, ack) => {
      const reply = (body) => {
        if (typeof ack === "function") ack(body);
      };
      try {
        const sessionId = String(payload.sessionId || "").trim();
        const callId = String(payload.callId || "").trim();
        const session = await getSession(sessionId);
        if (!session || !ownsSession(socket, session)) {
          reply({ ok: false, error: "forbidden" });
          return;
        }
        const call = getCallBySession(sessionId);
        if (!call || (callId && call.callId !== callId)) {
          reply({ ok: false, error: "not_found" });
          return;
        }
        if (call.status !== "connecting" && call.status !== "active") {
          reply({ ok: false, error: "invalid_state" });
          return;
        }

        const signal = payload.signal;
        if (!signal || typeof signal !== "object") {
          reply({ ok: false, error: "bad_request" });
          return;
        }

        // First media signal after accept → mark active.
        if (call.status === "connecting" && signal.type === "offer") {
          markCallActive(sessionId);
        }

        socket.to(`session:${sessionId}`).emit("call:signal", {
          sessionId,
          callId: call.callId,
          signal,
          from: isAgentSideSocket(socket) ? "agent" : "customer",
        });
        reply({ ok: true });
      } catch (err) {
        console.error("call:signal failed:", err);
        reply({ ok: false, error: "server_error" });
      }
    });

    socket.on("call:end", async (payload = {}, ack) => {
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
        const ended = endCall(sessionId, "hangup");
        if (!ended) {
          reply({ ok: true, alreadyEnded: true });
          return;
        }
        await emitCallEnded(ended, "hangup", {
          by: isAgentSideSocket(socket) ? "agent" : "customer",
        });
        reply({ ok: true });
      } catch (err) {
        console.error("call:end failed:", err);
        reply({ ok: false, error: "server_error" });
      }
    });

    socket.on("call:state", async (payload = {}, ack) => {
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
        cancelPendingDisconnectEnd(socket.id);
        let call = getCallBySession(sessionId);
        if (call) {
          const asAgent = isAgentSideSocket(socket);
          reattachCallSocket(
            sessionId,
            asAgent ? "agent" : "customer",
            socket.id,
          );
          if (asAgent) {
            setAgentSocket(sessionId, socket.id);
            socket.join(`session:${sessionId}`);
          } else {
            setCustomerSocket(sessionId, socket.id);
            customerSocketSession.set(socket.id, sessionId);
            socket.join(`session:${sessionId}`);
          }
          call = getCallBySession(sessionId);
        }
        reply({
          ok: true,
          enabled: isAudioCallsEnabled(),
          call: call ? toPublicCall(call) : null,
          customerOnline: isCustomerConnected(session),
        });
      } catch (err) {
        console.error("call:state failed:", err);
        reply({ ok: false, error: "server_error" });
      }
    });

    socket.on("disconnect", () => {
      // Defer end so switching browser/inbox tabs (brief socket drop + reconnect)
      // does not cancel an in-progress ring/call.
      const roleHint = isAgentSideSocket(socket) ? "agent" : "customer";
      endCallForSocket(socket.id, {
        graceMs: 15_000,
        onEnd: (ended) => {
          if (!ended) return;
          void emitCallEnded(ended, "peer_disconnect", { by: roleHint });
        },
      });

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

/** True only after initSocketServer (long-lived Lightsail Node). */
export function isSocketServerReady() {
  return io != null;
}

export function getIo() {
  return io;
}
