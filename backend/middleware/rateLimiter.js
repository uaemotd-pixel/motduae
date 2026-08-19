import rateLimit from "express-rate-limit";

const buildKeyGenerator = (prefix) => {
  return (req) => {
    // Unique key: prefix + IP + lowercase trimmed email address (if present in body)
    const email = req.body?.email?.toLowerCase().trim() || "";
    const baseKey = email ? `${req.ip}_${email}` : req.ip;
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

export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Limit each IP + email combination to 10 requests per window
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: buildKeyGenerator("login"),
  validate: false,
  statusCode: 429,
  message: "Too many login attempts, please try again in 15 minutes",
  handler: defaultHandler("Too many login attempts, please try again in 15 minutes"),
});

export const forgotPasswordLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 3, // Limit each IP + email combination to 3 requests per window
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: buildKeyGenerator("forgot"),
  validate: false,
  statusCode: 429,
  message: "Too many forgot password requests. Please try again in 15 minutes",
  handler: defaultHandler("Too many forgot password requests. Please try again in 15 minutes"),
});

export const resetPasswordLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 requests per window
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: buildKeyGenerator("reset"),
  validate: false,
  statusCode: 429,
  message: "Too many reset password attempts. Please try again in 15 minutes",
  handler: defaultHandler("Too many reset password attempts. Please try again in 15 minutes"),
});

export const contactLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 3, // Limit each IP + email combination to 3 requests per window
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: buildKeyGenerator("contact"),
  validate: false,
  statusCode: 429,
  message: "Too many messages sent. Please try again in 15 minutes",
  handler: defaultHandler("Too many messages sent. Please try again in 15 minutes"),
});

export const newsletterLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP + email combination to 5 requests per window
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: buildKeyGenerator("newsletter"),
  validate: false,
  statusCode: 429,
  message: "Too many subscription attempts. Please try again in 15 minutes",
  handler: defaultHandler("Too many subscription attempts. Please try again in 15 minutes"),
});
