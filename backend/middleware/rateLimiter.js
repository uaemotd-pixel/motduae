import rateLimit, { ipKeyGenerator } from "express-rate-limit";
import {
  getRateLimitRedis,
  RedisSlidingWindowStore,
} from "../services/rateLimitRedis.js";

// A direct host ignores X-Forwarded-For. Do not fail the request when a
// client sends that header; the socket address is still the rate-limit key.
const limiterValidation = { xForwardedForHeader: false };

/**
 * Sliding window: each hit expires on its own, windowMs after it arrived.
 * The oldest hit's expiry is resetTime, which is when the next slot opens.
 */
export class SlidingWindowStore {
  constructor() {
    this.hits = new Map();
    this.windowMs = 60 * 1000;
    this.localKeys = true;
    this.interval = undefined;
  }

  init(options) {
    this.windowMs = options.windowMs;
    if (this.interval) clearInterval(this.interval);
    this.interval = setInterval(() => {
      this.pruneExpired();
    }, this.windowMs);
    this.interval.unref?.();
  }

  prune(key, now) {
    const list = this.hits.get(key);
    if (!list) return [];
    const cutoff = now - this.windowMs;
    let start = 0;
    while (start < list.length && list[start] <= cutoff) start += 1;
    if (start === 0) return list;
    if (start >= list.length) {
      this.hits.delete(key);
      return [];
    }
    const fresh = list.slice(start);
    this.hits.set(key, fresh);
    return fresh;
  }

  info(list) {
    if (!list.length) return undefined;
    return {
      totalHits: list.length,
      resetTime: new Date(list[0] + this.windowMs),
    };
  }

  async get(key) {
    return this.info(this.prune(key, Date.now()));
  }

  async increment(key) {
    const now = Date.now();
    const list = this.prune(key, now);
    list.push(now);
    this.hits.set(key, list);
    return this.info(list);
  }

  async decrement(key) {
    const list = this.hits.get(key);
    if (!list?.length) return;
    list.pop();
    if (!list.length) this.hits.delete(key);
  }

  async resetKey(key) {
    this.hits.delete(key);
  }

  async resetAll() {
    this.hits.clear();
  }

  shutdown() {
    if (this.interval) clearInterval(this.interval);
    this.interval = undefined;
    this.hits.clear();
  }

  pruneExpired() {
    const now = Date.now();
    for (const key of this.hits.keys()) this.prune(key, now);
  }
}

const buildKeyGenerator = (prefix) => {
  return (req) => {
    const ip = ipKeyGenerator(req.ip);
    const email = req.body?.email?.toLowerCase().trim() || "";
    const baseKey = email ? `${ip}_${email}` : ip;
    return `${prefix}_${baseKey}`;
  };
};

const buildUserKeyGenerator = (prefix) => {
  return (req) => {
    const ip = ipKeyGenerator(req.ip);
    const userId = req.user?._id ? String(req.user._id) : "";
    const baseKey = userId ? `${ip}_${userId}` : ip;
    return `${prefix}_${baseKey}`;
  };
};

const defaultHandler = (message) => {
  return (req, res, next, options) => {
    res.status(options.statusCode).json({
      success: false,
      message: message || options.message,
    });
  };
};

export function createRateLimitStore(namespace) {
  const redis = getRateLimitRedis();
  if (!redis) return new SlidingWindowStore();
  return new RedisSlidingWindowStore(redis, namespace);
}

export function createLimiter(namespace, options) {
  return rateLimit({
    ...options,
    store: createRateLimitStore(namespace),
    standardHeaders: true,
    legacyHeaders: false,
    validate: options.validate ?? limiterValidation,
    statusCode: options.statusCode ?? 429,
    passOnStoreError: false,
  });
}

export const loginLimiter = createLimiter("login", {
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Limit each IP + email combination to 10 requests per window
  keyGenerator: buildKeyGenerator("login"),
  message: "Too many login attempts, please try again in 15 minutes",
  handler: defaultHandler("Too many login attempts, please try again in 15 minutes"),
});

export const forgotPasswordLimiter = createLimiter("forgot", {
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 3, // Limit each IP + email combination to 3 requests per window
  keyGenerator: buildKeyGenerator("forgot"),
  message: "Too many forgot password requests. Please try again in 15 minutes",
  handler: defaultHandler("Too many forgot password requests. Please try again in 15 minutes"),
});

export const resetPasswordLimiter = createLimiter("reset", {
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 requests per window
  keyGenerator: buildKeyGenerator("reset"),
  message: "Too many reset password attempts. Please try again in 15 minutes",
  handler: defaultHandler("Too many reset password attempts. Please try again in 15 minutes"),
});

export const faqSupportLimiter = createLimiter("faq_support", {
  windowMs: 15 * 60 * 1000,
  max: 5,
  keyGenerator: buildKeyGenerator("faq_support"),
  message: "Too many support requests. Please try again in 15 minutes",
  handler: defaultHandler(
    "Too many support requests. Please try again in 15 minutes",
  ),
});

export const contactLimiter = createLimiter("contact", {
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 3, // Limit each IP + email combination to 3 requests per window
  keyGenerator: buildKeyGenerator("contact"),
  message: "Too many messages sent. Please try again in 15 minutes",
  handler: defaultHandler("Too many messages sent. Please try again in 15 minutes"),
});

export const newsletterLimiter = createLimiter("newsletter", {
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP + email combination to 5 requests per window
  keyGenerator: buildKeyGenerator("newsletter"),
  message: "Too many subscription attempts. Please try again in 15 minutes",
  handler: defaultHandler("Too many subscription attempts. Please try again in 15 minutes"),
});

export const signupLimiter = createLimiter("signup", {
  windowMs: 15 * 60 * 1000,
  max: 10,
  keyGenerator: buildKeyGenerator("signup"),
  message: "Too many signup attempts, please try again in 15 minutes",
  handler: defaultHandler(
    "Too many signup attempts, please try again in 15 minutes",
  ),
});

export const customerUploadLimiter = createLimiter("customer_upload", {
  windowMs: 15 * 60 * 1000,
  max: 60,
  keyGenerator: buildUserKeyGenerator("customer_upload"),
  message: "Too many uploads, please try again in 15 minutes",
  handler: defaultHandler("Too many uploads, please try again in 15 minutes"),
});

export const otpSendLimiter = createLimiter("otp_send", {
  windowMs: 15 * 60 * 1000,
  max: 5,
  keyGenerator: (req) => `otp_send_${ipKeyGenerator(req.ip)}`,
  message: "Too many code requests. Please try again in 15 minutes",
  handler: defaultHandler(
    "Too many code requests. Please try again in 15 minutes",
  ),
});

export const otpVerifyLimiter = createLimiter("otp_verify", {
  windowMs: 15 * 60 * 1000,
  max: 10,
  keyGenerator: (req) => `otp_verify_${ipKeyGenerator(req.ip)}`,
  message: "Too many code attempts. Please try again in 15 minutes",
  handler: defaultHandler(
    "Too many code attempts. Please try again in 15 minutes",
  ),
});

export const publicOrderTrackLimiter = createLimiter("track", {
  windowMs: 15 * 60 * 1000,
  max: 30,
  keyGenerator: (req) => `track_${ipKeyGenerator(req.ip)}`,
  message: "Too many tracking requests. Please try again in 15 minutes",
  handler: defaultHandler(
    "Too many tracking requests. Please try again in 15 minutes",
  ),
});
