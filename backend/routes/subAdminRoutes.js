// routes/subadmin.js — combined route + controller (ES modules)
import express from "express";
import bcrypt from "bcryptjs";
import SubAdmin from "../models/SubAdmin.js";
import User from "../models/User.js";
import mongoose from "mongoose";

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

    // Check email in both collections
    if (await SubAdmin.findOne({ email })) {
      return res.status(409).json({ error: "SubAdmin email already exists" });
    }

    if (await User.findOne({ email })) {
      return res.status(409).json({ error: "User email already exists" });
    }

    // Create SubAdmin
    const subAdmin = new SubAdmin({
      name,
      email,
      password,
      phone,
      address: {
        name: address?.name || "",
        phone: address?.phone || "",
        emirate: address?.emirate || "",
        city: address?.city || "",
        street: address?.street || "",
        building: address?.building || "",
        postalCode: address?.postalCode || "",
      },
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
    console.log('Saved user:', user.toObject());

    res.status(201).json(excludePassword(subAdmin));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

subAdminRouter.get("/", async (req, res) => {
  try {
    const admins = await SubAdmin.find().select("-password");
    res.json(admins);
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

    // 2. Update SubAdmin
    const updatedSubAdmin = await SubAdmin.findByIdAndUpdate(
      id,
      {
        name,
        email,
        phone,
        address: address || {},
        perms: perms || {},
      },
      { new: true, runValidators: true },
    );

    // 3. Update User (if email changed, find by old email)
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
      // Not critical; maybe user already removed; just log.
      console.warn(`User with email ${email} not found, but SubAdmin deleted.`);
    }

    res.json({ message: "Sub-admin and associated user deleted" });
  } catch (err) {
    console.error("Delete error:", err);
    res.status(500).json({ error: err.message });
  }
});

export default subAdminRouter;
