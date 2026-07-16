import express from "express";
import expressAsyncHandler from "express-async-handler";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { OAuth2Client } from "google-auth-library";
import { isAuth, isAdmin, generateToken } from "../middleware/auth.js";
import User from "../models/User.js";
import Customer from "../models/customer.js";
import SubAdmin from "../models/SubAdmin.js";
import { env } from "../config/env.js";
import { validatePassword } from "../utils/passwordValidation.js";
import {
  isEmailConfigured,
  sendPasswordResetEmail,
  sendContactMessageEmail,
} from "../services/emailService.js";
import { createAdminNotificationForNewUser } from "../services/adminNotificationService.js";

const userRouter = express.Router();
const BCRYPT_ROUNDS = 10;
const RESET_TOKEN_TTL_MS = 60 * 60 * 1000;

const googleClient = env.googleClientId
  ? new OAuth2Client(env.googleClientId)
  : null;

const GOOGLE_AUTH_ROLES = new Set(["customer", "tailor", "fabric_store"]);
const PARTNER_ROLES = new Set(["tailor", "fabric_store"]);

const linkGoogleToUser = (user, { googleId, name }) => {
  if (!user.googleId) {
    user.googleId = googleId;
  }

  if (user.authProvider === "local" && user.password) {
    user.authProvider = "local";
  } else {
    user.authProvider = "google";
  }

  if (!user.name && name) {
    user.name = name;
  }
};

const sendUserResponse = (res, user) => {
  res.send({
    _id: user._id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    role: user.role,
    isAdmin: user.isAdmin,
    approvalStatus: user.approvalStatus,
    isActive: user.isActive,
    authProvider: user.authProvider,
    hasPassword: Boolean(user.password),
    token: generateToken(user),
  });
};

const hashResetToken = (token) =>
  crypto.createHash("sha256").update(token).digest("hex");

const assertPasswordValid = (password, res) => {
  const result = validatePassword(password);
  if (!result.valid) {
    res.status(400).send({ message: result.message });
    return false;
  }
  return true;
};

userRouter.get(
  "/",
  isAuth,
  isAdmin,
  expressAsyncHandler(async (_req, res) => {
    const users = await User.find({}).select("-password -resetPasswordToken");
    res.send(users);
  }),
);

userRouter.get(
  "/profile",
  isAuth,
  expressAsyncHandler(async (req, res) => {
    const user = await User.findById(req.user._id).select(
      "-resetPasswordToken",
    );
    if (!user) {
      res.status(404).send({ message: "User not found" });
      return;
    }
    let perms = {};
    if (user.role === "sub-admin") {
      const subAdmin = await SubAdmin.findOne({ email: user.email });
      if (subAdmin) perms = subAdmin.perms || {};
    }

    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      isAdmin: user.isAdmin,
      approvalStatus: user.approvalStatus,
      isActive: user.isActive,
      authProvider: user.authProvider,
      hasPassword: Boolean(user.password),
      perms,
      token: generateToken(user),
    });
  }),
);

userRouter.post(
  "/signin",
  expressAsyncHandler(async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
      res.status(400).send({ message: "Email and password are required" });
      return;
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) {
      res.status(401).send({ message: "Invalid email or password" });
      return;
    }

    if (!user.password) {
      res.status(401).send({
        message:
          "This account uses Google sign-in. Please continue with Google.",
      });
      return;
    }

    if (!bcrypt.compareSync(password, user.password)) {
      res.status(401).send({ message: "Invalid email or password" });
      return;
    }

    if (user.isActive === false) {
      res.status(403).send({ message: "Account is deactivated" });
      return;
    }

    let perms = {};
    if (user.role === "sub-admin") {
      const subAdmin = await SubAdmin.findOne({ email });
      if (subAdmin) perms = subAdmin.perms || {};
    }
    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      isAdmin: user.isAdmin,
      approvalStatus: user.approvalStatus,
      isActive: user.isActive,
      authProvider: user.authProvider,
      hasPassword: Boolean(user.password),
      perms,
      token: generateToken(user),
    });
  }),
);

userRouter.post(
  "/auth/google",
  expressAsyncHandler(async (req, res) => {
    const { credential, mode = "login", role: requestedRole } = req.body;

    if (!credential) {
      res.status(400).send({ message: "Google credential is required" });
      return;
    }

    if (!googleClient) {
      res.status(503).send({
        message:
          "Google sign-in is not configured. Set GOOGLE_CLIENT_ID in backend/.env",
      });
      return;
    }

    const authMode = mode === "register" ? "register" : "login";
    const registerRole =
      requestedRole === "tailor" || requestedRole === "fabric_store"
        ? requestedRole
        : "customer";
    const loginRoleHint =
      requestedRole === "tailor" || requestedRole === "fabric_store"
        ? requestedRole
        : null;

    let payload;
    try {
      const ticket = await googleClient.verifyIdToken({
        idToken: credential,
        audience: env.googleClientId,
      });
      payload = ticket.getPayload();
    } catch {
      res.status(401).send({ message: "Invalid Google sign-in token" });
      return;
    }

    const googleId = payload.sub;
    const email = payload.email?.toLowerCase().trim();
    const name = payload.name?.trim() || email?.split("@")[0] || "Customer";

    if (!googleId || !email) {
      res.status(400).send({ message: "Google account email is required" });
      return;
    }

    if (payload.email_verified === false) {
      res.status(401).send({ message: "Google email is not verified" });
      return;
    }

    let user = await User.findOne({ googleId });

    if (!user) {
      user = await User.findOne({ email });
    }

    if (authMode === "register") {
      if (user) {
        if (user.role !== registerRole) {
          res.status(400).send({
            message: `An account with this email already exists as a ${user.role.replace("_", " ")}`,
          });
          return;
        }

        if (user.isActive === false) {
          res.status(403).send({ message: "Account is deactivated" });
          return;
        }

        linkGoogleToUser(user, { googleId, name });
        await user.save();
        sendUserResponse(res, user);
        return;
      }

      const userFields = {
        name,
        email,
        googleId,
        authProvider: "google",
        role: registerRole,
      };

      if (PARTNER_ROLES.has(registerRole)) {
        userFields.approvalStatus = "pending";
      }

      user = new User(userFields);
      await user.save();

      if (registerRole === "customer") {
        const customer = new Customer({
          userId: user._id,
          name: user.name,
        });
        await customer.save();
      }

      sendUserResponse(res, user);
      return;
    }

    if (user) {
      if (!GOOGLE_AUTH_ROLES.has(user.role)) {
        res.status(403).send({
          message: "Google sign-in is not available for this account type",
        });
        return;
      }

      if (loginRoleHint && user.role !== loginRoleHint) {
        res.status(403).send({
          message: `This account is not a ${loginRoleHint.replace("_", " ")} account`,
        });
        return;
      }

      if (user.isActive === false) {
        res.status(403).send({ message: "Account is deactivated" });
        return;
      }

      linkGoogleToUser(user, { googleId, name });
      await user.save();
      sendUserResponse(res, user);
      return;
    }

    if (loginRoleHint) {
      res.status(404).send({
        message: "No account found. Please register first.",
      });
      return;
    }

    user = new User({
      name,
      email,
      googleId,
      authProvider: "google",
      role: "customer",
    });
    await user.save();

    const customer = new Customer({
      userId: user._id,
      name: user.name,
    });
    await customer.save();

    sendUserResponse(res, user);
  }),
);

userRouter.post(
  "/forgot-password",
  expressAsyncHandler(async (req, res) => {
    const { email } = req.body;
    const genericMessage =
      "If an account exists with that email, a reset link has been sent.";

    if (!email?.trim()) {
      res.status(400).send({ message: "Email is required" });
      return;
    }

    if (!isEmailConfigured()) {
      res.status(503).send({
        message:
          "Password reset email is not configured. Set SMTP_USER and SMTP_PASS in backend/.env",
      });
      return;
    }

    const normalizedEmail = email.toLowerCase().trim();
    const user = await User.findOne({ email: normalizedEmail });

    if (user && GOOGLE_AUTH_ROLES.has(user.role) && user.isActive !== false) {
      const rawToken = crypto.randomBytes(32).toString("hex");
      user.resetPasswordToken = hashResetToken(rawToken);
      user.resetPasswordExpires = new Date(Date.now() + RESET_TOKEN_TTL_MS);
      await user.save({ validateBeforeSave: false });

      const resetUrl = `${env.frontendUrl}/en/auth/reset-password?token=${rawToken}`;

      try {
        await sendPasswordResetEmail({ to: normalizedEmail, resetUrl });
      } catch (error) {
        user.resetPasswordToken = undefined;
        user.resetPasswordExpires = undefined;
        await user.save({ validateBeforeSave: false });
        console.error("Failed to send password reset email:", error);
        res
          .status(500)
          .send({ message: "Failed to send reset email. Try again later." });
        return;
      }
    }

    res.send({ message: genericMessage });
  }),
);

userRouter.post(
  "/reset-password",
  expressAsyncHandler(async (req, res) => {
    const { token, password } = req.body;

    if (!token || !password) {
      res.status(400).send({ message: "Token and new password are required" });
      return;
    }

    if (!assertPasswordValid(password, res)) {
      return;
    }

    const hashedToken = hashResetToken(token);
    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpires: { $gt: new Date() },
    });

    if (!user) {
      res.status(400).send({ message: "Reset link is invalid or has expired" });
      return;
    }

    user.password = bcrypt.hashSync(password, BCRYPT_ROUNDS);
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;

    await user.save();
    sendUserResponse(res, user);
  }),
);

userRouter.post(
  "/signup/tailor",
  expressAsyncHandler(async (req, res) => {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
      res
        .status(400)
        .send({ message: "Name, email, and password are required" });
      return;
    }

    if (!assertPasswordValid(password, res)) {
      return;
    }

    const normalizedEmail = email.toLowerCase().trim();
    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      res.status(400).send({ message: "User already exists" });
      return;
    }

    const user = new User({
      name: name.trim(),
      email: normalizedEmail,
      password: bcrypt.hashSync(password, BCRYPT_ROUNDS),
      role: "tailor",
      approvalStatus: "pending",
      authProvider: "local",
    });

    const createdUser = await user.save();

    // Create admin dashboard notification for new tailor signup
    // Admin UI expects: tailor/cust/fabric-store specific display message.
    await createAdminNotificationForNewUser({
      type: `user_${createdUser.role}_registered`,
      title: "User registration",
      message: `${createdUser.name} is registered as ${createdUser.role.replace(
        "_",
        " ",
      )}.`,
      createdBy: createdUser._id,
      tailorUserId: createdUser._id,
    });


    sendUserResponse(res, createdUser);
  }),
);


userRouter.post(
  "/signup/fabricStore",
  expressAsyncHandler(async (req, res) => {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
      res
        .status(400)
        .send({ message: "Name, email, and password are required" });
      return;
    }

    if (!assertPasswordValid(password, res)) {
      return;
    }

    const normalizedEmail = email.toLowerCase().trim();
    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      res.status(400).send({ message: "User already exists" });
      return;
    }

    const user = new User({
      name: name.trim(),
      email: normalizedEmail,
      password: bcrypt.hashSync(password, BCRYPT_ROUNDS),
      role: "fabric_store",
      approvalStatus: "pending",
      authProvider: "local",
    });

    const createdUser = await user.save();

    // Create admin dashboard notification for new fabric_store signup
    await createAdminNotificationForNewUser({
      type: `user_${createdUser.role}_registered`,
      title: "User registration",
      message: `${createdUser.name} is registered as ${createdUser.role.replace(
        "_",
        " ",
      )}.`,
      createdBy: createdUser._id,
      tailorUserId: null,
    });

    sendUserResponse(res, createdUser);

  }),
);

userRouter.post(
  "/signup",
  expressAsyncHandler(async (req, res) => {
    const { name, email, password, phone } = req.body;
    if (!name || !email || !password || !phone) {
      res.status(400).send({
        message: "Name, email, password, and contact number are required",
      });
      return;
    }

    if (!assertPasswordValid(password, res)) {
      return;
    }

    // Remove spaces and validate
    const phoneTrimmed = phone.trim();

    // Check if it already has +971
    let fullPhone;
    if (phoneTrimmed.startsWith("+971")) {
      // Already has +971, validate it
      if (!/^\+971\d{9}$/.test(phoneTrimmed)) {
        res.status(400).send({
          message:
            "Invalid UAE phone number format. Must be +971 followed by 9 digits",
        });
        return;
      }
      fullPhone = phoneTrimmed;
    } else {
      // Add +971 if missing
      const digits = phoneTrimmed.replace(/\D/g, "");
      if (!/^\d{9}$/.test(digits)) {
        res.status(400).send({
          message: "Contact number must be exactly 9 digits",
        });
        return;
      }
      fullPhone = `+971${digits}`;
    }

    const normalizedEmail = email.toLowerCase().trim();
    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      res.status(400).send({ message: "User already exists" });
      return;
    }

    const user = new User({
      name: name.trim(),
      email: normalizedEmail,
      password: bcrypt.hashSync(password, BCRYPT_ROUNDS),
      role: "customer",
      phone: fullPhone, // Store as +971501234567
      authProvider: "local",
    });

    const createdUser = await user.save();

    // Create admin dashboard notification for new user signup
    // Supports all partner/user roles (customer, tailor, fabric_store).
    await createAdminNotificationForNewUser({
      type: `${createdUser.role}_registered`,
      title: "New user registered",
      message: `${createdUser.name} (${createdUser.email}) has registered as ${createdUser.role.replace(
        "_",
        " ",
      )}.`,
      createdBy: createdUser._id,
      tailorUserId: createdUser.role === "tailor" ? createdUser._id : null,
    });

    const customer = new Customer({
      userId: createdUser._id,
      name: createdUser.name,
      phone: fullPhone,
    });
    await customer.save();

    sendUserResponse(res, createdUser);
  }),
);

userRouter.put(
  "/profile",
  isAuth,
  expressAsyncHandler(async (req, res) => {
    const user = await User.findById(req.user._id);
    if (!user) {
      res.status(404).send({ message: "User not found" });
      return;
    }

    if (req.body.name) {
      user.name = req.body.name.trim();
    }
    if (req.body.email) {
      user.email = req.body.email.toLowerCase().trim();
    }

    const updatedUser = await user.save();
    sendUserResponse(res, updatedUser);
  }),
);

userRouter.put(
  "/change-password",
  isAuth,
  expressAsyncHandler(async (req, res) => {
    const { currentPassword, password } = req.body;

    if (!password) {
      res.status(400).send({ message: "New password is required" });
      return;
    }

    if (!assertPasswordValid(password, res)) {
      return;
    }

    const user = await User.findById(req.user._id);
    if (!user) {
      res.status(404).send({ message: "User not found" });
      return;
    }

    if (user.password) {
      if (!currentPassword) {
        res.status(400).send({ message: "Current password is required" });
        return;
      }
      if (!bcrypt.compareSync(currentPassword, user.password)) {
        res.status(401).send({ message: "Current password is incorrect" });
        return;
      }
    }

    user.password = bcrypt.hashSync(password, BCRYPT_ROUNDS);
    user.authProvider = user.googleId ? user.authProvider : "local";
    if (!user.googleId) {
      user.authProvider = "local";
    }

    const updatedUser = await user.save();
    sendUserResponse(res, updatedUser);
  }),
);

userRouter.post(
  "/contact",
  expressAsyncHandler(async (req, res) => {
    const { name, email, subject, message } = req.body;
    if (
      !name?.trim() ||
      !email?.trim() ||
      !subject?.trim() ||
      !message?.trim()
    ) {
      return res.status(400).send({ message: "All fields are required" });
    }

    await sendContactMessageEmail({ name, email, subject, message });
    res.send({ success: true, message: "Message sent successfully" });
  }),
);

export default userRouter;
