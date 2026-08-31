// routes/subadmin.js — UPDATE with uaeAddress imports
import express from "express";
import bcrypt from "bcryptjs";
import SubAdmin from "../models/SubAdmin.js";
import User from "../models/User.js";
import mongoose from "mongoose";
import { findEmailOccupant } from "../services/emailVerification/emailOccupancy.js";
import {
  normalizeEmirate,
  isValidEmirate,
  UAE_EMIRATES,
} from "../utils/uaeAddress.js";

const subAdminRouter = express.Router();
const BCRYPT_ROUNDS = 10;

// ── HELPERS ──
const excludePassword = (doc) => {
  const obj = doc.toObject ? doc.toObject() : doc;
  delete obj.password;
  return obj;
};

// ── CONTROLLERS (inline) ──
subAdminRouter.post("/", async (req, res) => {
  try {
    const { name, email, password, phone, dob, address, perms } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: "Password min 6 chars" });
    }

    // Validate and normalize emirate
    let normalizedAddress = {};
    if (address?.emirate) {
      const normalizedEmirate = normalizeEmirate(address.emirate);
      if (!isValidEmirate(normalizedEmirate)) {
        return res.status(400).json({ error: "Invalid UAE emirate" });
      }
      normalizedAddress = {
        name: address?.name || "",
        phone: address?.phone || "",
        emirate: normalizedEmirate,
        city: address?.city || "",
        street: address?.street || "",
        building: address?.building || "",
        postalCode: address?.postalCode || "",
      };
    } else {
      normalizedAddress = {
        name: address?.name || "",
        phone: address?.phone || "",
        emirate: "",
        city: address?.city || "",
        street: address?.street || "",
        building: address?.building || "",
        postalCode: address?.postalCode || "",
      };
    }

    // Check email in both collections
    if (await SubAdmin.findOne({ email })) {
      return res.status(409).json({ error: "SubAdmin email already exists" });
    }

    if (await findEmailOccupant(User, email)) {
      return res.status(409).json({ error: "User email already exists" });
    }

    // Create SubAdmin
    const subAdmin = new SubAdmin({
      name,
      email,
      password,
      phone,
      address: normalizedAddress,
      perms: perms || {},
    });

    await subAdmin.save();

    // Create login user
    const user = new User({
      name,
      email,
      password: bcrypt.hashSync(password, BCRYPT_ROUNDS),
      phone,
      role: "sub-admin",
      isAdmin: true,
    });
    await user.save();

    res.status(201).json(excludePassword(subAdmin));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

subAdminRouter.get("/", async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    const search = req.query.search || "";

    // Build search filter
    const filter = {};
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
      ];
    }

    // Get paginated results
    const [admins, total] = await Promise.all([
      SubAdmin.find(filter)
        .select("-password")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      SubAdmin.countDocuments(filter),
    ]);

    res.json({
      items: admins,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

subAdminRouter.get("/:id", async (req, res) => {
  try {
    const admin = await SubAdmin.findById(req.params.id);
    if (!admin) return res.status(404).json({ error: "Not found" });
    res.json(admin);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// UPDATE sub-admin + associated User
subAdminRouter.put("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    const { name, email, password, phone, dob, address, perms } = updates;

    // 1. Find existing SubAdmin
    const subAdmin = await SubAdmin.findById(id);
    if (!subAdmin)
      return res.status(404).json({ error: "Sub-admin not found" });

    const oldEmail = subAdmin.email;

    // 2. Validate and normalize emirate for update
    let normalizedAddress = {};
    if (address?.emirate) {
      const normalizedEmirate = normalizeEmirate(address.emirate);
      if (!isValidEmirate(normalizedEmirate)) {
        return res.status(400).json({ error: "Invalid UAE emirate" });
      }
      normalizedAddress = {
        name: address?.name || "",
        phone: address?.phone || "",
        emirate: normalizedEmirate,
        city: address?.city || "",
        street: address?.street || "",
        building: address?.building || "",
        postalCode: address?.postalCode || "",
      };
    } else if (address) {
      normalizedAddress = {
        name: address?.name || "",
        phone: address?.phone || "",
        emirate: "",
        city: address?.city || "",
        street: address?.street || "",
        building: address?.building || "",
        postalCode: address?.postalCode || "",
      };
    }

    // 3. Update SubAdmin
    const updateData = {
      name,
      email,
      phone,
      perms: perms || {},
    };

    if (address) {
      updateData.address = normalizedAddress;
    }

    const updatedSubAdmin = await SubAdmin.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
    });

    // 4. Update User (if email changed, find by old email)
    const userUpdate = { name, email };
    if (password && password.length >= 6) {
      userUpdate.password = await bcrypt.hash(password, 10);
    }

    await User.findOneAndUpdate({ email: oldEmail }, userUpdate, { new: true });

    res.json(updatedSubAdmin);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// routes/subadmin.js
subAdminRouter.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    // 1. Find the sub-admin to get email
    const subAdmin = await SubAdmin.findById(id);
    if (!subAdmin) {
      return res.status(404).json({ error: "Sub-admin not found" });
    }

    const email = subAdmin.email;

    // 2. Delete SubAdmin
    await SubAdmin.findByIdAndDelete(id);

    // 3. Delete associated User (if exists)
    const userDeleted = await User.findOneAndDelete({ email });
    if (!userDeleted) {
      console.warn(`User with email ${email} not found, but SubAdmin deleted.`);
    }

    res.json({ message: "Sub-admin and associated user deleted" });
  } catch (err) {
    console.error("Delete error:", err);
    res.status(500).json({ error: err.message });
  }
});

export default subAdminRouter;
