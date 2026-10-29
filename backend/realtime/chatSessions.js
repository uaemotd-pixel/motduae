import { randomUUID } from "crypto";
import LiveChatSession from "../models/LiveChatSession.js";
import LiveChatMessage from "../models/LiveChatMessage.js";
import Customer from "../models/customer.js";

export const RESTART_WINDOW_MS = 30_000;
const MAX_MESSAGES_LOAD = 200;

/** Ephemeral socket presence (not persisted). sessionKey -> socket ids */
const presence = new Map();

/** @type {Map<string, ReturnType<typeof setTimeout>>} */
const endPurgeTimers = new Map();

const STATUS_RANK = { sent: 0, delivered: 1, read: 2 };

const MAX_AUDIO_CHARS = 2_500_000;
/** Base64 data-URL ceiling (~5MB binary ≈ 7M chars + prefix). */
const MAX_FILE_CHARS = 8_000_000;
const MAX_VOICE_MS = 60_000;
const MAX_IMAGE_BYTES = 1.5 * 1024 * 1024;
const MAX_FILE_BYTES = 1 * 1024 * 1024;
const MAX_VIDEO_BYTES = 5 * 1024 * 1024;
const MAX_AUDIO_BYTES = 2 * 1024 * 1024;

const IMAGE_MIME = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
]);

const VIDEO_MIME = new Set(["video/mp4"]);

const AUDIO_MIME = new Set(["audio/mpeg", "audio/mp3"]);

const FILE_MIME = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);

const BLOCKED_EXT = new Set([
  "exe",
  "bat",
  "cmd",
  "com",
  "cpl",
  "scr",
  "msi",
  "msp",
  "dll",
  "sys",
  "ps1",
  "psm1",
  "vbs",
  "vbe",
  "js",
  "jse",
  "wsf",
  "wsh",
  "hta",
  "jar",
  "apk",
  "app",
  "dmg",
  "pkg",
  "sh",
  "bash",
  "zsh",
  "php",
  "phtml",
  "asp",
  "aspx",
  "jsp",
  "cgi",
  "pl",
  "py",
  "rb",
  "html",
  "htm",
  "shtml",
  "svg",
  "xml",
  "xhtml",
  "iso",
  "img",
  "bin",
  "reg",
  "lnk",
  "inf",
  "gadget",
  "msc",
  "cab",
]);

const IMAGE_EXT = new Set(["jpg", "jpeg", "png", "webp"]);
const VIDEO_EXT = new Set(["mp4"]);
const AUDIO_EXT = new Set(["mp3"]);
const FILE_EXT = new Set(["pdf", "doc", "docx"]);

function fileExt(name) {
  const parts = String(name || "")
    .toLowerCase()
    .split(".");
  if (parts.length < 2) return "";
  return parts[parts.length - 1].replace(/[^a-z0-9]/g, "");
}

function welcomeText(locale, customerName) {
  const name = String(customerName || "").trim();
  const isAr = String(locale || "")
    .toLowerCase()
    .startsWith("ar");
  if (isAr) {
    return name
      ? `مرحباً ${name}، أهلاً بك في رعاية MOTD. وكيل دعم سينضم إليكِ قريباً — كيف يمكننا مساعدتكِ؟`
      : "مرحباً، أهلاً بك في رعاية MOTD. وكيل دعم سينضم إليكِ قريباً — كيف يمكننا مساعدتكِ؟";
  }
  return name
    ? `Hi ${name}, welcome to MOTD Care. An agent will join you shortly — how can we help?`
    : "Hi, welcome to MOTD Care. An agent will join you shortly — how can we help?";
}

function agentJoinedText(locale, agentName) {
  const name = String(agentName || "").trim() || "MOTD Care";
  const isAr = String(locale || "")
    .toLowerCase()
    .startsWith("ar");
  if (isAr) {
    return `${name} انضم إلى المحادثة الآن. كيف يمكننا مساعدتكِ؟`;
  }
  return `${name} has joined the chat. How can we help?`;
}

function handoffDividerText(locale) {
  const isAr = String(locale || "")
    .toLowerCase()
    .startsWith("ar");
  return isAr
    ? "— تم تحويل المحادثة إلى وكيل مباشر —"
    : "— Chat handed off to a live agent —";
}

const MAX_FAQ_HISTORY = 40;
const MAX_FAQ_TEXT = 2000;

/**
 * Map FAQ chatbot bubbles into live-chat messages (text only).
 * FAQ user → customer, FAQ bot → agent (senderName MOTD Care).
 */
function sanitizeFaqHistory(raw, customerName) {
  if (!Array.isArray(raw)) return [];
  const out = [];
  const slice = raw.slice(-MAX_FAQ_HISTORY);
  for (const item of slice) {
    const text = String(item?.text || "")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, MAX_FAQ_TEXT);
    if (!text) continue;

    const rawRole = String(item?.role || "").toLowerCase();
    const isCustomer =
      rawRole === "user" || rawRole === "customer" || rawRole === "visitor";

    if (isCustomer) {
      out.push({
        role: "customer",
        text,
        senderName: customerName || "Customer",
      });
    } else {
      out.push({
        role: "agent",
        text,
        senderName: "MOTD Care",
      });
    }
  }
  return out;
}

function normalizeStatus(status) {
  if (status === "delivered" || status === "read" || status === "sent") {
    return status;
  }
  return "sent";
}

function sanitizeAudioDataUrl(audio) {
  const raw = String(audio || "");
  if (!raw.startsWith("data:audio/") || !raw.includes(";base64,")) return "";
  if (raw.length > MAX_AUDIO_CHARS) return "";
  return raw;
}

function parseDataUrl(raw) {
  const value = String(raw || "");
  const match = /^data:([^;,]+);base64,([\s\S]+)$/i.exec(value);
  if (!match) return null;
  if (value.length > MAX_FILE_CHARS) return null;
  return { mime: match[1].toLowerCase(), dataUrl: value };
}

function sanitizeAttachment(kind, message) {
  const isImage = kind === "image";
  const parsed = parseDataUrl(message.data || message.fileData);
  if (!parsed) return null;

  const fileName = String(message.fileName || message.name || "file")
    .replace(/[\\/:*?"<>|]/g, "_")
    .slice(0, 120);
  const ext = fileExt(fileName);
  if (!ext || BLOCKED_EXT.has(ext)) return null;

  const mime = String(message.mimeType || parsed.mime || "")
    .toLowerCase()
    .split(";")[0]
    .trim();

  const isVideo =
    !isImage &&
    (mime.startsWith("video/") || VIDEO_EXT.has(ext) || VIDEO_MIME.has(mime));
  const isAudio =
    !isImage &&
    !isVideo &&
    (mime.startsWith("audio/") || AUDIO_EXT.has(ext) || AUDIO_MIME.has(mime));

  if (isImage) {
    if (!IMAGE_MIME.has(mime) || !IMAGE_EXT.has(ext)) return null;
    if (!parsed.dataUrl.startsWith("data:image/")) return null;
  } else if (isVideo) {
    // MP4 only
    if (!VIDEO_EXT.has(ext) || !VIDEO_MIME.has(mime)) return null;
    if (!parsed.dataUrl.startsWith("data:video/mp4") && !parsed.dataUrl.startsWith("data:video/")) {
      return null;
    }
  } else if (isAudio) {
    // MP3 only
    if (!AUDIO_EXT.has(ext) || !AUDIO_MIME.has(mime)) return null;
    if (!parsed.dataUrl.startsWith("data:audio/")) return null;
  } else {
    // PDF and Word only
    if (!FILE_MIME.has(mime) || !FILE_EXT.has(ext)) return null;
  }

  const size = Math.max(0, Math.round(Number(message.fileSize) || 0));
  const maxBytes = isImage
    ? MAX_IMAGE_BYTES
    : isVideo
      ? MAX_VIDEO_BYTES
      : isAudio
        ? MAX_AUDIO_BYTES
        : MAX_FILE_BYTES;
  const approxBytes = Math.floor(
    ((parsed.dataUrl.split(",")[1] || "").length * 3) / 4,
  );
  if (approxBytes > maxBytes || (size > 0 && size > maxBytes)) return null;

  return {
    kind: isImage ? "image" : "file",
    text: isImage ? "Photo" : fileName,
    fileName,
    mimeType: mime,
    fileSize: size || approxBytes,
    data: parsed.dataUrl,
  };
}

function clearEndPurgeTimer(sessionId) {
  const t = endPurgeTimers.get(sessionId);
  if (t) {
    clearTimeout(t);
    endPurgeTimers.delete(sessionId);
  }
}

function getPresence(sessionKey) {
  let p = presence.get(sessionKey);
  if (!p) {
    p = { customerSocketId: null, agentSocketId: null };
    presence.set(sessionKey, p);
  }
  return p;
}

export function setCustomerSocket(sessionKey, socketId) {
  const p = getPresence(sessionKey);
  p.customerSocketId = socketId || null;
}

export function setAgentSocket(sessionKey, socketId) {
  const p = getPresence(sessionKey);
  p.agentSocketId = socketId || null;
}

export function clearCustomerSocketIfMatch(sessionKey, socketId) {
  const p = presence.get(sessionKey);
  if (p && p.customerSocketId === socketId) {
    p.customerSocketId = null;
  }
}

function messageToPublic(doc) {
  if (!doc) return null;
  const at =
    doc.at instanceof Date
      ? doc.at.toISOString()
      : doc.at || new Date().toISOString();
  const deleted = Boolean(doc.deletedAt);
  const replyTo =
    doc.replyTo?.id
      ? {
          id: doc.replyTo.id,
          role: doc.replyTo.role || "customer",
          kind: doc.replyTo.kind || "text",
          text: doc.replyTo.text || "",
          senderName: doc.replyTo.senderName || undefined,
        }
      : null;
  const editedAt =
    doc.editedAt instanceof Date
      ? doc.editedAt.toISOString()
      : doc.editedAt || null;

  if (deleted) {
    return {
      id: doc.messageId || doc.id,
      role: doc.role,
      kind: "text",
      text: "",
      senderName: doc.senderName || undefined,
      status: normalizeStatus(doc.status),
      deleted: true,
      deletedBy: doc.deletedBy === "customer" ? "customer" : "agent",
      replyTo,
      editedAt: null,
      at,
    };
  }
  return {
    id: doc.messageId || doc.id,
    role: doc.role,
    kind: doc.kind || "text",
    text: doc.text || "",
    caption: doc.caption || undefined,
    audio: doc.audio || undefined,
    data: doc.data || undefined,
    fileName: doc.fileName || undefined,
    mimeType: doc.mimeType || undefined,
    fileSize: doc.fileSize || undefined,
    durationMs: doc.durationMs || undefined,
    attachmentKind: doc.attachmentKind || undefined,
    senderName: doc.senderName || undefined,
    status: normalizeStatus(doc.status),
    deleted: false,
    deletedBy: null,
    replyTo,
    editedAt,
    at,
  };
}

function replyPreviewFromMessage(msg) {
  if (!msg || msg.deleted) return "Deleted message";
  if (msg.kind === "voice") return "Voice message";
  if (msg.kind === "image") return "Photo";
  if (msg.kind === "file") return msg.fileName || "Document";
  return String(msg.caption || msg.text || "").trim().slice(0, 240);
}

async function resolveReplyTo(sessionKey, replyToId) {
  const id = String(replyToId || "").trim();
  if (!id) return null;
  const target = await LiveChatMessage.findOne({
    sessionKey: String(sessionKey),
    messageId: id,
  }).lean();
  if (!target) return null;
  const pub = messageToPublic(target);
  return {
    id: pub.id,
    role: pub.role,
    kind: pub.kind || "text",
    text: replyPreviewFromMessage(pub),
    senderName: pub.senderName || undefined,
  };
}

function previewFromMessage(msg) {
  if (!msg) return null;
  if (msg.deleted) {
    return {
      id: msg.id,
      role: msg.role,
      kind: "text",
      text:
        msg.deletedBy === "customer"
          ? "Customer deleted this message"
          : "This message was deleted",
      status: msg.status || "sent",
      at: msg.at,
    };
  }
  return {
    id: msg.id,
    role: msg.role,
    kind: msg.kind || "text",
    text: msg.text || "",
    status: msg.status || "sent",
    at: msg.at,
    fileName: msg.fileName || undefined,
    attachmentKind: msg.attachmentKind || undefined,
  };
}

async function resolveCustomerProfilePic(userId) {
  if (!userId) return "";
  try {
    const row = await Customer.findOne({ userId })
      .select("profilePic")
      .lean();
    return String(row?.profilePic || "").trim();
  } catch (err) {
    console.error("resolveCustomerProfilePic failed:", err);
    return "";
  }
}

/**
 * Older threads were saved without profilePic. Backfill from Customer and persist.
 */
async function ensureCustomerProfilePic(doc) {
  if (!doc?.customer) return doc;
  const existing = String(doc.customer.profilePic || "").trim();
  if (existing) {
    doc.customer.profilePic = existing;
    return doc;
  }
  const userId = doc.customer.userId ? String(doc.customer.userId) : "";
  if (!userId) return doc;
  const pic = await resolveCustomerProfilePic(userId);
  if (!pic) return doc;
  doc.customer.profilePic = pic;
  void LiveChatSession.updateOne(
    { sessionKey: doc.sessionKey },
    { $set: { "customer.profilePic": pic } },
  ).catch((err) => {
    console.error("backfill customer.profilePic failed:", err);
  });
  return doc;
}

function sessionDocToRuntime(doc, messages = []) {
  if (!doc) return null;
  const key = doc.sessionKey;
  const p = getPresence(key);
  return {
    id: key,
    customer: {
      userId: doc.customer?.userId || undefined,
      name: doc.customer?.name || "Guest",
      email: doc.customer?.email || undefined,
      kind: doc.customer?.kind || "anonymous",
      profilePic: doc.customer?.profilePic || "",
    },
    agent: doc.agent?.userId
      ? {
          userId: doc.agent.userId,
          name: doc.agent.name || "Agent",
          profilePic: doc.agent.profilePic || "",
        }
      : null,
    status: doc.status,
    locale: doc.locale || "en",
    messages,
    lastActivityAt:
      doc.lastActivityAt instanceof Date
        ? doc.lastActivityAt.getTime()
        : Number(doc.lastActivityAt) || Date.now(),
    customerSocketId: p.customerSocketId,
    agentSocketId: p.agentSocketId,
    endedBy: doc.endedBy || null,
    endedAt:
      doc.endedAt instanceof Date
        ? doc.endedAt.getTime()
        : doc.endedAt
          ? Number(doc.endedAt)
          : null,
    restartEndsAt:
      doc.restartEndsAt instanceof Date
        ? doc.restartEndsAt.getTime()
        : doc.restartEndsAt
          ? Number(doc.restartEndsAt)
          : null,
  };
}

/**
 * @param {string} sessionKey
 * @param {{ limit?: number, viewer?: "customer"|"agent"|null }} [opts]
 */
async function loadMessages(
  sessionKey,
  { limit = MAX_MESSAGES_LOAD, viewer = null } = {},
) {
  const filter = { sessionKey };
  if (viewer === "customer") {
    filter.hiddenForCustomer = { $ne: true };
  } else if (viewer === "agent") {
    filter.hiddenForAgent = { $ne: true };
  }
  const rows = await LiveChatMessage.find(filter)
    .sort({ at: 1 })
    .limit(limit)
    .lean();
  return rows.map(messageToPublic);
}

async function touchSession(sessionKey, extra = {}) {
  await LiveChatSession.updateOne(
    { sessionKey },
    { $set: { lastActivityAt: new Date(), ...extra } },
  );
}

async function updateSessionPreview(sessionKey, publicMsg, messageCountDelta = 0) {
  const update = {
    lastActivityAt: new Date(),
    lastMessage: previewFromMessage(publicMsg),
  };
  const ops = { $set: update };
  if (messageCountDelta) {
    ops.$inc = { messageCount: messageCountDelta };
  }
  await LiveChatSession.updateOne({ sessionKey }, ops);
}

export async function getSession(
  sessionId,
  { withMessages = false, viewer = null } = {},
) {
  if (!sessionId) return null;
  let doc = await LiveChatSession.findOne({
    sessionKey: String(sessionId),
  }).lean();
  if (!doc) return null;
  doc = await ensureCustomerProfilePic(doc);
  const messages = withMessages
    ? await loadMessages(doc.sessionKey, { viewer })
    : [];
  return sessionDocToRuntime(doc, messages);
}

/** Open or soft-ended thread for a customer, if any. */
export async function findOpenSessionForCustomer(userId) {
  const id = userId ? String(userId) : "";
  if (!id) return null;

  const doc = await LiveChatSession.findOne({
    "customer.userId": id,
    status: { $in: ["waiting", "active", "ended"] },
  })
    .sort({ lastActivityAt: -1 })
    .select("sessionKey status agent.name locale lastActivityAt")
    .lean();

  if (!doc) return null;
  return {
    id: doc.sessionKey,
    status: doc.status,
    agentName: doc.agent?.name || null,
    locale: doc.locale || "en",
    lastActivityAt:
      doc.lastActivityAt instanceof Date
        ? doc.lastActivityAt.getTime()
        : Number(doc.lastActivityAt) || Date.now(),
  };
}

export async function createSession({
  customer,
  locale,
  customerSocketId,
  faqHistory,
}) {
  const resolvedLocale = locale || "en";
  const userId = customer?.userId ? String(customer.userId) : null;
  const customerName = customer?.name || "Guest";
  const profilePic =
    String(customer?.profilePic || "").trim() ||
    (await resolveCustomerProfilePic(userId));

  // Resume open or soft-ended thread for logged-in customers.
  // Do not re-import FAQ history — that thread already has its transcript.
  if (userId) {
    const existing = await LiveChatSession.findOne({
      "customer.userId": userId,
      status: { $in: ["waiting", "active", "ended"] },
    })
      .sort({ lastActivityAt: -1 })
      .lean();

    if (existing) {
      const resumeSet = {
        customer: {
          userId,
          name: customerName || existing.customer?.name || "Guest",
          email: customer?.email || existing.customer?.email || "",
          kind: customer?.kind || existing.customer?.kind || "registered",
          profilePic: profilePic || existing.customer?.profilePic || "",
        },
        locale: resolvedLocale || existing.locale,
        lastActivityAt: new Date(),
      };
      /** @type {Record<string, unknown>} */
      const update = { $set: resumeSet };
      // Reopening the widget continues an ended thread (history kept).
      if (existing.status === "ended") {
        clearEndPurgeTimer(existing.sessionKey);
        resumeSet.status = existing.agent?.userId ? "active" : "waiting";
        resumeSet.endedAt = null;
        resumeSet.restartEndsAt = null;
        update.$unset = { endedBy: "" };
      }
      await LiveChatSession.updateOne(
        { sessionKey: existing.sessionKey },
        update,
      );
      if (customerSocketId) setCustomerSocket(existing.sessionKey, customerSocketId);
      return getSession(existing.sessionKey, { withMessages: true });
    }
  }

  const sessionKey = randomUUID();
  const prior = sanitizeFaqHistory(faqHistory, customerName);
  const now = Date.now();
  // Stagger timestamps so FAQ → divider → welcome sort correctly.
  const seedStart = now - (prior.length + 2) * 1000;

  /** @type {object[]} */
  const seedDocs = [];

  prior.forEach((m, i) => {
    seedDocs.push({
      messageId: randomUUID(),
      sessionKey,
      role: m.role,
      kind: "text",
      text: m.text,
      senderName: m.senderName,
      status: "read",
      at: new Date(seedStart + i * 1000),
    });
  });

  if (prior.length > 0) {
    seedDocs.push({
      messageId: randomUUID(),
      sessionKey,
      role: "system",
      kind: "text",
      text: handoffDividerText(resolvedLocale),
      senderName: "MOTD Care",
      status: "read",
      at: new Date(seedStart + prior.length * 1000),
    });
  }

  const welcome = {
    messageId: randomUUID(),
    sessionKey,
    role: "agent",
    kind: "text",
    text: welcomeText(resolvedLocale, customerName),
    senderName: "MOTD Care",
    status: "sent",
    at: new Date(now),
  };
  seedDocs.push(welcome);

  await LiveChatMessage.insertMany(seedDocs);
  const welcomePublic = messageToPublic(welcome);

  await LiveChatSession.create({
    sessionKey,
    customer: {
      userId,
      name: customerName,
      email: customer?.email || "",
      kind: customer?.kind || "anonymous",
      profilePic,
    },
    agent: { userId: null, name: null, profilePic: "" },
    status: "waiting",
    locale: resolvedLocale,
    lastActivityAt: new Date(now),
    messageCount: seedDocs.length,
    lastMessage: previewFromMessage(welcomePublic),
  });

  if (customerSocketId) setCustomerSocket(sessionKey, customerSocketId);
  return getSession(sessionKey, { withMessages: true });
}

export async function appendMessage(sessionId, message) {
  const session = await getSession(sessionId);
  if (!session || session.status === "ended" || session.status === "closed") {
    return null;
  }

  const kind = String(message.kind || "text");
  const isVoice = kind === "voice";
  const isImage = kind === "image";
  const isFile = kind === "file";
  const at = message.at ? new Date(message.at) : new Date();
  const replyTo = await resolveReplyTo(session.id, message.replyToId);
  const base = {
    messageId: message.id || randomUUID(),
    sessionKey: session.id,
    role: message.role,
    senderName: message.senderName || undefined,
    status: normalizeStatus(message.status),
    at,
    ...(replyTo ? { replyTo } : {}),
  };

  let docPayload = null;

  if (isVoice) {
    const audio = sanitizeAudioDataUrl(message.audio);
    if (!audio) return null;
    const durationMs = Math.min(
      MAX_VOICE_MS,
      Math.max(0, Math.round(Number(message.durationMs) || 0)),
    );
    let attachment = null;
    if (message.data || message.fileData) {
      const attachKind =
        message.attachmentKind === "file" || message.attachKind === "file"
          ? "file"
          : "image";
      attachment = sanitizeAttachment(attachKind, message);
      if (!attachment) return null;
    }
    docPayload = {
      ...base,
      kind: "voice",
      text: "Voice message",
      audio,
      durationMs,
      ...(attachment
        ? {
            attachmentKind: attachment.kind,
            fileName: attachment.fileName,
            mimeType: attachment.mimeType,
            fileSize: attachment.fileSize,
            data: attachment.data,
          }
        : {}),
    };
  } else if (isImage || isFile) {
    const attachment = sanitizeAttachment(kind, message);
    if (!attachment) return null;
    const caption = String(message.text || "")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 2000);
    docPayload = {
      ...base,
      kind: attachment.kind,
      text: caption || attachment.text,
      caption: caption || "",
      fileName: attachment.fileName,
      mimeType: attachment.mimeType,
      fileSize: attachment.fileSize,
      data: attachment.data,
    };
  } else {
    docPayload = {
      ...base,
      kind: "text",
      text: String(message.text || "").slice(0, 4000),
    };
  }

  const created = await LiveChatMessage.create(docPayload);
  const publicMsg = messageToPublic(created.toObject ? created.toObject() : created);
  await updateSessionPreview(session.id, publicMsg, 1);
  return publicMsg;
}

/** Edit own text/caption message (WhatsApp-style). */
export async function editMessage(sessionId, messageId, byRole, nextText) {
  const key = String(sessionId);
  const id = String(messageId || "").trim();
  const who = byRole === "customer" ? "customer" : "agent";
  const text = String(nextText || "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 4000);
  if (!id || !text) return null;

  const doc = await LiveChatMessage.findOne({
    sessionKey: key,
    messageId: id,
    role: who,
    deletedAt: null,
  });
  if (!doc) return null;
  if (doc.kind === "voice") return null;

  if (doc.kind === "image" || doc.kind === "file") {
    doc.caption = text.slice(0, 2000);
    doc.text = text.slice(0, 2000);
  } else {
    doc.kind = "text";
    doc.text = text;
  }
  doc.editedAt = new Date();
  await doc.save();

  const publicMsg = messageToPublic(doc.toObject ? doc.toObject() : doc);
  const session = await LiveChatSession.findOne({ sessionKey: key }).lean();
  if (session?.lastMessage?.id === id) {
    await updateSessionPreview(key, publicMsg, 0);
  }
  return publicMsg;
}

export async function setMessagesStatus(sessionId, messageIds, status) {
  const session = await getSession(sessionId);
  if (!session) return [];

  const next = normalizeStatus(status);
  const nextRank = STATUS_RANK[next];
  const ids = (Array.isArray(messageIds) ? messageIds : [messageIds])
    .map((id) => String(id || "").trim())
    .filter(Boolean);
  if (!ids.length) return [];

  const docs = await LiveChatMessage.find({
    sessionKey: String(sessionId),
    messageId: { $in: ids },
  });

  const updated = [];
  for (const doc of docs) {
    const cur = normalizeStatus(doc.status);
    if (STATUS_RANK[cur] >= nextRank) continue;
    doc.status = next;
    await doc.save();
    updated.push(messageToPublic(doc.toObject()));
  }

  if (updated.length) {
    await touchSession(sessionId);
    // Refresh denormalized preview status if it was one of the updated msgs.
    const last = await LiveChatMessage.findOne({ sessionKey: String(sessionId) })
      .sort({ at: -1 })
      .lean();
    if (last) {
      await LiveChatSession.updateOne(
        { sessionKey: String(sessionId) },
        { $set: { lastMessage: previewFromMessage(messageToPublic(last)) } },
      );
    }
  }

  return updated;
}

export async function setRoleMessagesStatus(sessionId, fromRole, status) {
  const docs = await LiveChatMessage.find({
    sessionKey: String(sessionId),
    role: fromRole,
  })
    .select("messageId")
    .lean();
  const ids = docs.map((d) => d.messageId);
  return setMessagesStatus(sessionId, ids, status);
}

export async function assignAgent(sessionId, agent, agentSocketId) {
  const doc = await LiveChatSession.findOne({ sessionKey: String(sessionId) });
  if (!doc || doc.status !== "waiting") return null;

  const agentName = agent?.name || "Agent";
  doc.agent = {
    userId: agent?.userId || null,
    name: agentName,
    profilePic: String(agent?.profilePic || "").trim(),
  };
  doc.status = "active";
  doc.lastActivityAt = new Date();
  await doc.save();

  if (agentSocketId) setAgentSocket(doc.sessionKey, agentSocketId);

  // Notify customer that an agent is now in the thread (pairs with welcome "join shortly").
  const joined = {
    messageId: randomUUID(),
    sessionKey: doc.sessionKey,
    role: "agent",
    kind: "text",
    text: agentJoinedText(doc.locale, agentName),
    senderName: agentName,
    status: "sent",
    at: new Date(),
  };
  await LiveChatMessage.create(joined);
  const joinMessage = messageToPublic(joined);
  await updateSessionPreview(doc.sessionKey, joinMessage, 1);

  const session = await getSession(doc.sessionKey, { withMessages: true });
  if (session) session.joinMessage = joinMessage;
  return session;
}

export async function softEndSession(sessionId, endedBy) {
  const who = endedBy === "agent" ? "agent" : "customer";
  const now = new Date();

  clearEndPurgeTimer(String(sessionId));

  const doc = await LiveChatSession.findOneAndUpdate(
    {
      sessionKey: String(sessionId),
      status: { $in: ["waiting", "active"] },
    },
    {
      $set: {
        status: "ended",
        endedBy: who,
        endedAt: now,
        restartEndsAt: null,
        lastActivityAt: now,
      },
    },
    { new: true },
  ).lean();

  if (!doc) return null;

  // Keep history in Mongo — end only pauses the live thread.
  return sessionDocToRuntime(doc, []);
}

/** Either party can continue an ended chat; history is preserved. */
export async function restartSession(sessionId, _byRole) {
  const doc = await LiveChatSession.findOne({ sessionKey: String(sessionId) });
  if (!doc || doc.status !== "ended") return null;

  clearEndPurgeTimer(doc.sessionKey);
  doc.status = doc.agent?.userId ? "active" : "waiting";
  doc.set("endedBy", undefined);
  doc.set("endedAt", null);
  doc.set("restartEndsAt", null);
  doc.lastActivityAt = new Date();
  await doc.save();
  return getSession(doc.sessionKey, { withMessages: true });
}

/** After restart window: keep history, remove from live inbox. */
export async function closeSession(sessionId) {
  const doc = await LiveChatSession.findOne({ sessionKey: String(sessionId) });
  if (!doc) return null;
  clearEndPurgeTimer(doc.sessionKey);
  doc.status = "closed";
  doc.restartEndsAt = null;
  doc.lastActivityAt = new Date();
  await doc.save();
  presence.delete(doc.sessionKey);
  return sessionDocToRuntime(doc.toObject ? doc.toObject() : doc, []);
}

/** Wipe all messages; keep the live session open. */
export async function clearSessionMessages(sessionId) {
  const key = String(sessionId);
  const doc = await LiveChatSession.findOne({ sessionKey: key });
  if (!doc) return null;
  await LiveChatMessage.deleteMany({ sessionKey: key });
  doc.messageCount = 0;
  doc.set("lastMessage", undefined);
  doc.lastActivityAt = new Date();
  await doc.save();
  return getSession(key, { withMessages: false });
}

/**
 * Soft-delete own messages for everyone (tombstone).
 * Only messages whose `role` matches `deletedBy` are affected.
 * @param {"agent"|"customer"} deletedBy
 */
export async function deleteSessionMessages(
  sessionId,
  messageIds = [],
  deletedBy = "agent",
) {
  const key = String(sessionId);
  const ids = [...new Set((messageIds || []).map((id) => String(id)).filter(Boolean))];
  if (!ids.length) return getSession(key, { withMessages: true, viewer: deletedBy });

  const doc = await LiveChatSession.findOne({ sessionKey: key });
  if (!doc) return null;

  const who = deletedBy === "customer" ? "customer" : "agent";
  const now = new Date();
  const result = await LiveChatMessage.updateMany(
    {
      sessionKey: key,
      messageId: { $in: ids },
      role: who,
      deletedAt: null,
    },
    {
      $set: {
        deletedAt: now,
        deletedBy: who,
        kind: "text",
        text: "",
        caption: "",
      },
      $unset: {
        audio: "",
        data: "",
        fileName: "",
        mimeType: "",
        fileSize: "",
        durationMs: "",
        attachmentKind: "",
      },
    },
  );
  const removed = result?.modifiedCount || 0;
  if (removed) {
    const last = await LiveChatMessage.findOne({
      sessionKey: key,
      hiddenForAgent: { $ne: true },
    })
      .sort({ at: -1 })
      .lean();
    if (last) {
      doc.lastMessage = previewFromMessage(messageToPublic(last));
    } else {
      doc.set("lastMessage", undefined);
    }
    doc.lastActivityAt = now;
    await doc.save();
  }
  return getSession(key, { withMessages: true, viewer: who });
}

/**
 * WhatsApp-style “delete for me” — hide messages for one side only.
 * @param {"agent"|"customer"} viewer
 */
export async function hideSessionMessagesForViewer(
  sessionId,
  messageIds = [],
  viewer = "customer",
) {
  const key = String(sessionId);
  const ids = [...new Set((messageIds || []).map((id) => String(id)).filter(Boolean))];
  const who = viewer === "agent" ? "agent" : "customer";
  if (!ids.length) return getSession(key, { withMessages: true, viewer: who });

  const doc = await LiveChatSession.findOne({ sessionKey: key });
  if (!doc) return null;

  const hideField =
    who === "agent" ? "hiddenForAgent" : "hiddenForCustomer";
  // Hide live messages and tombstones ("X deleted this message") for this viewer.
  await LiveChatMessage.updateMany(
    {
      sessionKey: key,
      messageId: { $in: ids },
      [hideField]: { $ne: true },
    },
    { $set: { [hideField]: true } },
  );

  return getSession(key, { withMessages: true, viewer: who });
}

/**
 * WhatsApp-style delete: own messages → everyone (tombstone);
 * others' messages → hide for this viewer only.
 * Tombstones can also be removed from this view (delete for me).
 * @param {"agent"|"customer"} viewer
 */
export async function deleteOrHideMessages(
  sessionId,
  messageIds = [],
  viewer = "customer",
) {
  const key = String(sessionId);
  const who = viewer === "agent" ? "agent" : "customer";
  const ids = [...new Set((messageIds || []).map((id) => String(id)).filter(Boolean))];
  if (!ids.length) {
    return {
      mineIds: [],
      otherIds: [],
      session: await getSession(key, { withMessages: true, viewer: who }),
    };
  }

  const exists = await LiveChatSession.exists({ sessionKey: key });
  if (!exists) return null;

  const docs = await LiveChatMessage.find({
    sessionKey: key,
    messageId: { $in: ids },
  })
    .select("messageId role deletedAt")
    .lean();

  const mineIds = docs
    .filter((d) => d.role === who && !d.deletedAt)
    .map((d) => String(d.messageId));
  const otherIds = docs
    .filter((d) => d.role !== who && !d.deletedAt)
    .map((d) => String(d.messageId));
  // Already soft-deleted placeholders — remove from this view only.
  const tombstoneIds = docs
    .filter((d) => Boolean(d.deletedAt))
    .map((d) => String(d.messageId));

  if (mineIds.length) {
    await deleteSessionMessages(key, mineIds, who);
  }
  const hideIds = [...otherIds, ...tombstoneIds];
  if (hideIds.length) {
    await hideSessionMessagesForViewer(key, hideIds, who);
  }

  return {
    mineIds,
    otherIds: hideIds,
    session: await getSession(key, { withMessages: true, viewer: who }),
  };
}

/** In-memory block list for live chat (userId or email).
 * Block UI is deferred ("coming soon") — checks are disabled so prior
 * blocks do not keep customers from starting chat.
 */
const blockedCustomerKeys = new Set();
const BLOCKING_ENABLED = false;

function normalizeBlockKey(userId, email) {
  const id = userId ? String(userId).trim() : "";
  if (id) return `id:${id}`;
  const em = email ? String(email).trim().toLowerCase() : "";
  if (em) return `email:${em}`;
  return "";
}

export function clearBlockedCustomers() {
  blockedCustomerKeys.clear();
}

export function blockCustomer({ userId, email } = {}) {
  if (!BLOCKING_ENABLED) return false;
  const key = normalizeBlockKey(userId, email);
  if (!key) return false;
  blockedCustomerKeys.add(key);
  return true;
}

export function unblockCustomer({ userId, email } = {}) {
  const key = normalizeBlockKey(userId, email);
  if (!key) return false;
  return blockedCustomerKeys.delete(key);
}

export function isCustomerBlocked({ userId, email } = {}) {
  if (!BLOCKING_ENABLED) return false;
  const idKey = normalizeBlockKey(userId, null);
  const emailKey = normalizeBlockKey(null, email);
  if (idKey && blockedCustomerKeys.has(idKey)) return true;
  if (emailKey && blockedCustomerKeys.has(emailKey)) return true;
  return false;
}

// Drop any blocks from earlier testing when this module loads.
clearBlockedCustomers();

/** @deprecated use closeSession — kept name for socket purge callback */
export async function endSession(sessionId) {
  return closeSession(sessionId);
}

export function scheduleEndPurge(sessionId, onPurge) {
  clearEndPurgeTimer(sessionId);
  const timer = setTimeout(() => {
    endPurgeTimers.delete(sessionId);
    void (async () => {
      const session = await getSession(sessionId);
      if (!session || session.status !== "ended") return;
      const closed = await closeSession(sessionId);
      if (typeof onPurge === "function" && closed) onPurge(closed);
    })();
  }, RESTART_WINDOW_MS);
  endPurgeTimers.set(sessionId, timer);
}

export async function listLiveSessions() {
  const docs = await LiveChatSession.find({
    status: { $in: ["waiting", "active", "ended"] },
  })
    .sort({ lastActivityAt: -1 })
    .lean();

  const enriched = await Promise.all(
    docs.map((doc) => ensureCustomerProfilePic(doc)),
  );

  const sessionKeys = enriched.map((doc) => doc.sessionKey);
  /** Unread for agent = customer bubbles not yet marked read (WhatsApp-style). */
  const unreadBySession = new Map();
  if (sessionKeys.length) {
    const rows = await LiveChatMessage.aggregate([
      {
        $match: {
          sessionKey: { $in: sessionKeys },
          role: "customer",
          status: { $ne: "read" },
          deletedAt: null,
          hiddenForAgent: { $ne: true },
        },
      },
      { $group: { _id: "$sessionKey", count: { $sum: 1 } } },
    ]);
    for (const row of rows) {
      unreadBySession.set(String(row._id), Number(row.count) || 0);
    }
  }

  return enriched.map((doc) => {
    const preview = doc.lastMessage
      ? {
          id: doc.lastMessage.id,
          role: doc.lastMessage.role,
          kind: doc.lastMessage.kind,
          text: doc.lastMessage.text || "",
          status: doc.lastMessage.status || "sent",
          at: doc.lastMessage.at,
          fileName: doc.lastMessage.fileName,
          attachmentKind: doc.lastMessage.attachmentKind,
        }
      : null;

    return {
      id: doc.sessionKey,
      customer: {
        userId: doc.customer?.userId || undefined,
        name: doc.customer?.name || "Guest",
        email: doc.customer?.email || undefined,
        kind: doc.customer?.kind || "anonymous",
        profilePic: doc.customer?.profilePic || "",
      },
      agent: doc.agent?.userId
        ? {
            userId: doc.agent.userId,
            name: doc.agent.name,
            profilePic: doc.agent.profilePic || "",
          }
        : null,
      status: doc.status,
      locale: doc.locale,
      messageCount: doc.messageCount || 0,
      unreadCount: unreadBySession.get(doc.sessionKey) || 0,
      lastActivityAt:
        doc.lastActivityAt instanceof Date
          ? doc.lastActivityAt.getTime()
          : Number(doc.lastActivityAt) || Date.now(),
      endedBy: doc.endedBy || null,
      preview,
    };
  });
}

/**
 * @param {string|object} sessionOrId
 * @param {{ viewer?: "customer"|"agent"|null }} [opts]
 */
export async function toPublicSession(sessionOrId, { viewer = null } = {}) {
  const session =
    typeof sessionOrId === "string"
      ? await getSession(sessionOrId, { withMessages: true, viewer })
      : sessionOrId?.messages && !viewer
        ? sessionOrId
        : await getSession(sessionOrId?.id || sessionOrId, {
            withMessages: true,
            viewer,
          });

  if (!session) return null;
  return {
    id: session.id,
    customer: session.customer,
    agent: session.agent,
    status: session.status,
    locale: session.locale,
    messages: session.messages || [],
    lastActivityAt: session.lastActivityAt,
    endedBy: session.endedBy || null,
    endedAt: session.endedAt || null,
  };
}

export function getMessageFromSession(session, messageId) {
  if (!session?.messages) return null;
  return session.messages.find((m) => m.id === messageId) || null;
}
