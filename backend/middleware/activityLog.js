import {
  logActivityFromRequest,
  pathHasResourceId,
  shouldSkipActivityPath,
} from "../services/activityLogService.js";

const MUTATING = new Set(["POST", "PUT", "PATCH", "DELETE"]);
const LOGGED_FLAG = Symbol.for("motd.activityLogged");

/**
 * Records authenticated mutating requests without blocking the response.
 * Optionally logs sensitive GET detail views (paths with a resource id).
 * Use after auth middleware when possible; skips if no user when requireUser.
 *
 * Safe to mount more than once on the same path — only logs once per request.
 */
export function captureActivity(options = {}) {
  const {
    requireUser = true,
    skipPathIncludes = [],
    /** Path substrings that also log GET detail views (e.g. "/customers"). */
    alsoLogGetPathIncludes = [],
    /** When true, GET logging only fires if the URL contains an id segment. */
    getDetailOnly = true,
  } = options;

  return function captureActivityMiddleware(req, res, next) {
    // Callers can opt out of activity logging (e.g. notification expand previews).
    if (String(req.get?.("x-motd-activity-skip") || "").trim()) {
      next();
      return;
    }

    const method = String(req.method || "").toUpperCase();
    const originalPath = String(req.originalUrl || "").split("?")[0];
    const mountedPath = `${String(req.baseUrl || "")}${String(req.url || "")}`.split(
      "?",
    )[0];
    const path = originalPath || mountedPath || String(req.url || "");

    const isMutating = MUTATING.has(method);
    const getHintMatch =
      method === "GET" &&
      Array.isArray(alsoLogGetPathIncludes) &&
      alsoLogGetPathIncludes.some(
        (hint) => path.includes(hint) || mountedPath.includes(hint),
      );
    const isSensitiveGet =
      getHintMatch && (!getDetailOnly || pathHasResourceId(path));

    if (!isMutating && !isSensitiveGet) {
      next();
      return;
    }

    // Multipart image uploads (design/fabric/add-on/ready-made) happen before the
    // real create/update POST — logging them doubles Busiest People counts.
    const contentType = String(req.headers?.["content-type"] || "").toLowerCase();
    if (contentType.includes("multipart/form-data")) {
      next();
      return;
    }

    if (shouldSkipActivityPath(path) || shouldSkipActivityPath(mountedPath)) {
      next();
      return;
    }
    if (
      Array.isArray(skipPathIncludes) &&
      skipPathIncludes.some(
        (hint) => path.includes(hint) || mountedPath.includes(hint),
      )
    ) {
      next();
      return;
    }

    // Avoid double logs when the same prefix is mounted twice
    // (e.g. /api/customer + customerRouter and customerNotificationRouter).
    if (!req[LOGGED_FLAG]) {
      req[LOGGED_FLAG] = true;
      res.on("finish", () => {
        if (requireUser && !req.user?._id) {
          return;
        }
        if (!req.user?._id) {
          return;
        }
        void logActivityFromRequest(req, {
          statusCode: res.statusCode,
          success: res.statusCode < 400,
        });
      });
    }

    next();
  };
}

const ADMIN_SENSITIVE_GETS = [
  "/customers",
  "/orders",
  "/partner-payout",
  "/partner-settlement",
  "/tailors",
  "/partners",
];

/** Back-compat alias for admin mounts — also logs sensitive detail GETs.
 * Sub-admin opens (GET /api/subadmins/:id) are intentionally not logged —
 * only mutating actions on that resource are.
 */
export const captureAdminActivity = captureActivity({
  alsoLogGetPathIncludes: ADMIN_SENSITIVE_GETS,
  getDetailOnly: true,
  skipPathIncludes: ["/uploads"],
});
