import ActivityLog, { ACTOR_ROLES } from "../models/ActivityLog.js";
import { resolveAdminApiPerm } from "../middleware/auth.js";

const CATEGORY_LABELS = {
  customers: "Customers",
  readyMade: "Ready-Made",
  fabrics: "Fabrics",
  designs: "Designs",
  tailors: "Tailors",
  orders: "Orders",
  partners: "Fabric Stores",
  settings: "Settings",
  payments: "Payments",
  addons: "Add-Ons",
  notifications: "Notifications",
  reviews: "Reviews",
  subAdmins: "Sub Admins",
  auth: "Sign-in & accounts",
  dashboard: "Dashboard",
  profile: "Profile",
  family: "Family",
  favourites: "Favourites",
  account: "Account",
  shop: "Shop",
  other: "Other",
};

const METHOD_VERBS = {
  POST: "created",
  PUT: "updated",
  PATCH: "updated",
  DELETE: "deleted",
};

const SENSITIVE_KEYS = new Set([
  "password",
  "token",
  "secret",
  "authorization",
  "cookie",
  "creditcard",
  "cardnumber",
  "cvv",
  "cvc",
  "ssn",
]);

const ACTOR_ROLE_SET = new Set(ACTOR_ROLES);

const SENSITIVE_PATH_HINTS = [
  "/otp",
  "/email/",
  "/password",
  "/forgot",
  "/reset",
  "/preview",
  "/activity-log",
  "/webhook",
  // Image uploads happen before create/update; logging them doubles every
  // product/design create as a second "*.created" entry (same action on
  // portals where uploads fall under shop/designs).
  "/uploads",
  // Stripe PaymentIntent create is a checkout prelude — the order POST (or a
  // real payment succeeded/failed event) is the business-level signal.
  "/intent",
  // Inbox read/mark/delete — not useful for staff monitoring
  "/notifications",
  // Customer saved shops — low-value noise
  "/favourites",
  "/favorites",
];

function isSensitiveKey(key) {
  const k = String(key || "").toLowerCase().replace(/[^a-z0-9]/g, "");
  if (SENSITIVE_KEYS.has(k)) return true;
  return (
    k.includes("password") ||
    k.includes("secret") ||
    k.includes("token") ||
    k.includes("authorization")
  );
}

/** Shallow sanitize — never store credentials or huge payloads. */
export function sanitizeMeta(value, depth = 0) {
  if (value == null) return null;
  if (depth > 3) return "[truncated]";
  if (Array.isArray(value)) {
    return value.slice(0, 20).map((item) => sanitizeMeta(item, depth + 1));
  }
  if (typeof value !== "object") {
    if (typeof value === "string" && value.length > 500) {
      return `${value.slice(0, 500)}…`;
    }
    return value;
  }
  const out = {};
  let count = 0;
  for (const [key, val] of Object.entries(value)) {
    if (count >= 40) {
      out._truncated = true;
      break;
    }
    if (isSensitiveKey(key)) {
      out[key] = "[redacted]";
      count += 1;
      continue;
    }
    out[key] = sanitizeMeta(val, depth + 1);
    count += 1;
  }
  return out;
}

function clientIp(req) {
  return String(req.ip || req.socket?.remoteAddress || "").trim();
}

export function normalizeActorRole(role) {
  const r = String(role || "").trim();
  if (ACTOR_ROLE_SET.has(r)) return r;
  return "customer";
}

function detectNamespace(rawUrl) {
  const url = String(rawUrl || "");
  if (url.startsWith("/api/admin") || url.startsWith("/api/subadmins")) {
    return "admin";
  }
  if (url.startsWith("/api/tailor")) return "tailor";
  if (url.startsWith("/api/fabric")) return "fabric";
  if (url.startsWith("/api/customer")) return "customer";
  if (url.startsWith("/api/orders")) return "orders";
  if (url.startsWith("/api/payments")) return "payments";
  return "other";
}

function stripApiPrefix(rawUrl) {
  const url = String(rawUrl || "").split("?")[0];
  if (url.startsWith("/api/subadmins")) {
    return (
      url.replace(/^\/api\/subadmins/, "/sub-admins") || "/sub-admins"
    );
  }
  if (url.startsWith("/api/admin")) {
    return url.replace(/^\/api\/admin/, "") || "/";
  }
  if (url.startsWith("/api/tailor")) {
    return url.replace(/^\/api\/tailor/, "") || "/";
  }
  if (url.startsWith("/api/fabric")) {
    return url.replace(/^\/api\/fabric/, "") || "/";
  }
  if (url.startsWith("/api/customer")) {
    return url.replace(/^\/api\/customer/, "") || "/";
  }
  if (url.startsWith("/api/orders")) {
    return url.replace(/^\/api\/orders/, "") || "/";
  }
  if (url.startsWith("/api/payments")) {
    return url.replace(/^\/api\/payments/, "") || "/";
  }
  return url.replace(/^\/api/, "") || "/";
}

function segmentResource(path) {
  const parts = String(path || "")
    .split("/")
    .filter(Boolean);
  if (!parts.length) {
    return { resourceType: "", resourceId: "" };
  }
  const resourceType = parts[0] || "";
  let resourceId = "";
  for (let i = 1; i < parts.length; i += 1) {
    const part = parts[i];
    if (/^[a-f\d]{24}$/i.test(part) || /^\d+$/.test(part)) {
      resourceId = part;
      break;
    }
  }
  return { resourceType, resourceId };
}

function resolveAdminCategory(path) {
  if (
    String(path).startsWith("/sub-admins") ||
    String(path).startsWith("/subadmins")
  ) {
    return "subAdmins";
  }
  const perm = resolveAdminApiPerm(path);
  if (!perm) return "dashboard";
  if (perm === "__full_admin__") {
    if (
      String(path).startsWith("/sub-admin") ||
      String(path).includes("subadmin")
    ) {
      return "subAdmins";
    }
    return "other";
  }
  return perm;
}

function resolvePortalCategory(namespace, path, resourceType) {
  if (namespace === "orders") return "orders";
  if (namespace === "payments") return "payments";

  if (namespace === "customer") {
    if (resourceType.includes("family")) return "family";
    if (resourceType.includes("favourite") || resourceType.includes("favorite")) {
      return "favourites";
    }
    if (resourceType.includes("review")) return "reviews";
    if (resourceType.includes("notification")) return "notifications";
    if (resourceType.includes("setting")) return "settings";
    if (resourceType.includes("profile") || resourceType.includes("upload")) {
      return "profile";
    }
    return "account";
  }

  if (namespace === "tailor") {
    if (resourceType.includes("design")) return "designs";
    if (resourceType.includes("order")) return "orders";
    if (resourceType.includes("payout") || resourceType.includes("payment")) {
      return "payments";
    }
    if (resourceType.includes("shop") || resourceType.includes("profile")) {
      return "shop";
    }
    if (resourceType.includes("notification")) return "notifications";
    return "shop";
  }

  if (namespace === "fabric") {
    if (resourceType.includes("ready-made") || path.includes("/ready-made")) {
      return "readyMade";
    }
    if (resourceType.includes("fabric")) return "fabrics";
    if (resourceType.includes("addon") || resourceType.includes("add-on")) {
      return "addons";
    }
    if (resourceType.includes("order")) return "orders";
    if (resourceType.includes("payout") || resourceType.includes("payment")) {
      return "payments";
    }
    if (resourceType.includes("shop") || resourceType.includes("profile")) {
      return "shop";
    }
    if (resourceType.includes("notification")) return "notifications";
    return "shop";
  }

  return resolveAdminCategory(path);
}

function humanResource(resourceType) {
  const map = {
    customers: "customer",
    "ready-made": "ready-made product",
    fabrics: "fabric",
    fabric: "fabric",
    designs: "design",
    design: "design",
    tailors: "tailor",
    orders: "order",
    custom: "custom order",
    retail: "retail order",
    partners: "fabric store",
    addons: "add-on",
    addon: "add-on",
    notifications: "notification",
    reviews: "review",
    review: "review",
    favourites: "favourite",
    favorites: "favourite",
    "family-members": "family member",
    profile: "profile",
    categories: "category",
    materials: "material",
    patterns: "pattern",
    seasons: "season",
    tags: "tag",
    cuts: "cut",
    settings: "setting",
    "customerSettings": "settings",
    "partner-payouts": "payout",
    "payout-requests": "payout request",
    "partner-settlement": "settlement",
    "sub-admins": "sub-admin",
    subadmins: "sub-admin",
    shop: "shop",
    session: "session",
    "payment-intent": "payment",
    checkout: "checkout",
  };
  return map[resourceType] || resourceType.replace(/-/g, " ") || "item";
}

function specialSummary(method, path, resourceType, resourceId) {
  const p = String(path || "").toLowerCase();
  const idPart = resourceId ? ` #${String(resourceId).slice(-6)}` : "";

  if (method === "GET") return `Viewed ${humanResource(resourceType)}${idPart}`;
  if (p.includes("return-request")) return `Requested return${idPart}`;
  if (p.includes("return-approve") || p.includes("return-accept")) {
    return `Approved return${idPart}`;
  }
  if (p.includes("return-reject")) return `Rejected return${idPart}`;
  if (p.includes("mark-received")) return `Marked order received${idPart}`;
  if (p.includes("refund")) return `Processed refund${idPart}`;
  if (p.includes("/payout") && p.includes("/approve")) {
    return `Approved payout request${idPart}`;
  }
  if (p.includes("/payout") && p.includes("/reject")) {
    return `Rejected payout request${idPart}`;
  }
  if (
    p.includes("/payout-requests") &&
    method === "POST" &&
    !p.includes("/approve") &&
    !p.includes("/reject")
  ) {
    return `Submitted payout request${idPart}`;
  }
  if (p.includes("/partner-payouts") && p.includes("/complete")) {
    return `Completed partner payout${idPart}`;
  }
  if (p.includes("/partner-payouts") && p.includes("/cancel")) {
    return `Cancelled partner payout${idPart}`;
  }
  if (
    (p.endsWith("/partner-payouts") || p.match(/\/partner-payouts\/?$/)) &&
    method === "POST"
  ) {
    return `Started partner payout (In Progress)${idPart}`;
  }
  if (p.includes("/payout")) {
    return method === "POST" ? `Requested payout${idPart}` : `Updated payout${idPart}`;
  }
  if (resourceType === "custom" && method === "POST" && !p.includes("preview")) {
    return `Placed custom order${idPart}`;
  }
  if (resourceType === "retail" && method === "POST") {
    return `Placed retail order${idPart}`;
  }
  if (p.includes("/shop/visibility") && (method === "PUT" || method === "PATCH")) {
    return `Updated shop visibility${idPart}`;
  }
  if (p.includes("/family-members") && p.includes("/measurements")) {
    if (method === "PUT" || method === "PATCH") {
      return `Updated family member measurements${idPart}`;
    }
  }
  if (
    (p.includes("/family-members/") || p.match(/\/family-members\/[^/]+$/)) &&
    (method === "PUT" || method === "PATCH") &&
    !p.includes("/measurements")
  ) {
    return `Updated family member details${idPart}`;
  }
  return null;
}

/** Compact request snapshot for audit detail (never stores secrets). */
export function buildRequestMeta(req) {
  const method = String(req?.method || "").toUpperCase();
  const meta = {};
  const body = req?.body;
  if (body && typeof body === "object" && !Array.isArray(body) && Object.keys(body).length) {
    meta.body = body;
  } else if (Array.isArray(body) && body.length) {
    meta.body = body.slice(0, 20);
  }
  if (req?.params && typeof req.params === "object" && Object.keys(req.params).length) {
    meta.params = req.params;
  }
  if (
    method === "GET" &&
    req?.query &&
    typeof req.query === "object" &&
    Object.keys(req.query).length
  ) {
    meta.query = req.query;
  }
  return Object.keys(meta).length ? sanitizeMeta(meta) : null;
}

export function buildActionDescriptor(req) {
  const method = String(req.method || "GET").toUpperCase();
  const rawUrl = String(req.originalUrl || req.url || req.path || "").split(
    "?",
  )[0];
  const namespace = detectNamespace(rawUrl);
  const path = stripApiPrefix(rawUrl);
  const { resourceType, resourceId } = segmentResource(path);
  const category = resolvePortalCategory(namespace, path, resourceType);
  const verb =
    method === "GET" ? "view" : METHOD_VERBS[method] || method.toLowerCase();
  const label = humanResource(resourceType);
  const action = `${category}.${verb}`;
  const special = specialSummary(method, path, resourceType, resourceId);
  const idPart = resourceId ? ` #${resourceId.slice(-6)}` : "";
  const summary =
    special ||
    `${String(verb).charAt(0).toUpperCase()}${verb.slice(1)} ${label}${idPart}`;

  return {
    action,
    category,
    method,
    path: rawUrl || path,
    resourceType,
    resourceId,
    summary,
    namespace,
  };
}

/** @deprecated use buildActionDescriptor */
export function buildAdminActionDescriptor(req) {
  return buildActionDescriptor(req);
}

/**
 * Persist an activity log entry. Never throws to callers.
 */
export async function logActivity(entry = {}) {
  try {
    const doc = {
      actorId: entry.actorId || null,
      actorEmail: entry.actorEmail || "",
      actorName: entry.actorName || "",
      actorRole: normalizeActorRole(entry.actorRole),
      action: entry.action || "unknown",
      category: entry.category || "other",
      method: entry.method || "",
      path: entry.path || "",
      resourceType: entry.resourceType || "",
      resourceId: entry.resourceId ? String(entry.resourceId) : "",
      summary: entry.summary || entry.action || "Activity",
      meta: entry.meta != null ? sanitizeMeta(entry.meta) : null,
      ip: entry.ip || "",
      userAgent: entry.userAgent || "",
      statusCode:
        typeof entry.statusCode === "number" ? entry.statusCode : null,
      success: entry.success !== false,
    };
    await ActivityLog.create(doc);
  } catch (err) {
    console.error("[activity-log] write failed:", err?.message || err);
  }
}

export function shouldSkipActivityPath(url = "") {
  const u = String(url || "").toLowerCase();
  if (SENSITIVE_PATH_HINTS.some((hint) => u.includes(hint))) return true;
  // Match upload endpoints even if a proxy/mount strips the leading slash
  // (e.g. "uploads/ready-made" or "fabric/uploads/addons").
  if (/(?:^|\/)uploads(?:\/|$|\?)/.test(u)) return true;
  // Portal image upload filenames without an "uploads" folder segment.
  if (
    /(?:^|\/)(?:design-image|fabric-image|shop-image)(?:\/|$|\?)/.test(u)
  ) {
    return true;
  }
  return false;
}

function shouldSkipActivityEntry({ path = "", category = "", resourceType = "", action = "" } = {}) {
  if (shouldSkipActivityPath(path)) return true;
  const cat = String(category || "").toLowerCase();
  const resource = String(resourceType || "").toLowerCase();
  const act = String(action || "").toLowerCase();
  // Image/file uploads are supporting steps for create/update — never log them
  // as their own "added a new uploads" activity rows.
  if (resource === "upload" || resource === "uploads" || resource.includes("upload")) {
    return true;
  }
  if (
    resource === "design-image" ||
    resource === "fabric-image" ||
    resource === "shop-image"
  ) {
    return true;
  }
  if (act.includes("uploads.") || act.endsWith(".uploads") || act.includes(".upload")) {
    return true;
  }
  // PaymentIntent create (/api/payments/intent/…) — noisy checkout prelude.
  if (resource === "intent" || resource === "payment-intent" || resource === "paymentintent") {
    return true;
  }
  if (act.includes("intent.") || act.includes(".intent")) {
    return true;
  }
  if (cat === "notifications" || cat === "favourites" || cat === "favorites") {
    return true;
  }
  if (resource.includes("notification") || resource.includes("favourit") || resource.includes("favorit")) {
    return true;
  }
  if (act.startsWith("notifications.") || act.startsWith("favourites.") || act.startsWith("favorites.")) {
    return true;
  }
  return false;
}

export function logActivityFromRequest(req, overrides = {}) {
  const user = req.user || {};
  const descriptor = buildActionDescriptor(req);
  const fromReq =
    req.activityLogOverride && typeof req.activityLogOverride === "object"
      ? req.activityLogOverride
      : {};
  const mergedOverrides = { ...fromReq, ...overrides };
  const path =
    mergedOverrides.path ||
    descriptor.path ||
    String(req.originalUrl || req.url || "");
  const category = mergedOverrides.category || descriptor.category;
  const resourceType = mergedOverrides.resourceType || descriptor.resourceType;
  const action = mergedOverrides.action || descriptor.action;

  if (
    shouldSkipActivityEntry({ path, category, resourceType, action }) ||
    String(req.get?.("x-motd-activity-skip") || "").trim()
  ) {
    return Promise.resolve();
  }

  const statusCode =
    typeof mergedOverrides.statusCode === "number"
      ? mergedOverrides.statusCode
      : typeof req.res?.statusCode === "number"
        ? req.res.statusCode
        : null;
  const success =
    mergedOverrides.success != null
      ? mergedOverrides.success
      : statusCode == null
        ? true
        : statusCode < 400;

  const meta =
    mergedOverrides.meta !== undefined
      ? mergedOverrides.meta != null
        ? sanitizeMeta(mergedOverrides.meta)
        : null
      : buildRequestMeta(req);

  return logActivity({
    actorId: user._id || null,
    actorEmail: user.email || "",
    actorName: user.name || "",
    actorRole: normalizeActorRole(user.role),
    ...descriptor,
    ...mergedOverrides,
    action,
    category,
    summary: mergedOverrides.summary || descriptor.summary,
    meta,
    ip: mergedOverrides.ip || clientIp(req),
    userAgent:
      mergedOverrides.userAgent || String(req.get?.("user-agent") || ""),
    statusCode,
    success,
  });
}

/** True when URL path contains a Mongo ObjectId or numeric id segment. */
export function pathHasResourceId(url = "") {
  const pathOnly = String(url || "").split("?")[0];
  return /\/([a-f\d]{24}|\d+)(?:\/|$)/i.test(pathOnly);
}

export function categoryLabel(category) {
  return CATEGORY_LABELS[category] || category || "Other";
}

export function listCategoryOptions() {
  return Object.entries(CATEGORY_LABELS).map(([value, label]) => ({
    value,
    label,
  }));
}

export { CATEGORY_LABELS, clientIp, ACTOR_ROLES };
