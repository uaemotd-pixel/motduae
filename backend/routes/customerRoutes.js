import express from "express";
import mongoose from "mongoose";
import Customer from "../models/customer.js"; // adjust path/extension as needed
import User from "../models/User.js";
import { isAuth } from "../middleware/auth.js";
import { uploadCustomerImageMiddleware, processCustomerImage } from "../middleware/uploadCustomerImage.js";
import expressAsyncHandler from "express-async-handler";

const customerRouter = express.Router();

customerRouter.post(
  "/uploads/customer",
  uploadCustomerImageMiddleware,
  expressAsyncHandler(async (req, res) => {
    if (!req.file) {
      res.status(400).send({ message: "No image file provided" });
      return;
    }

    const url = await processCustomerImage(req.file);
    res.status(201).send({ success: true, url });
  }),
);

// POST /profile route
customerRouter.post("/profile", isAuth, async (req, res) => {
  const userId = req.user?._id;
  const {
    name,
    phone,
    gender,
    dob,
    profilePic,
    addresses,
    address,
    defaultAddressId,
  } = req.body;

  if (!name?.trim()) {
    return res.status(400).json({ error: "Name required" });
  }

  try {
    const existing = await Customer.findOne({ userId });
    if (existing) {
      return res.status(409).json({ error: "Profile already exists" });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    let addrArray = [];
    if (addresses && Array.isArray(addresses)) {
      addrArray = addresses;
    } else if (address) {
      addrArray = [{ ...address, isDefault: true }];
    }

    if (addrArray.length > 0 && !addrArray.some((a) => a.isDefault)) {
      addrArray[0].isDefault = true;
    }

    const customerData = {
      userId: new mongoose.Types.ObjectId(userId),
      name: name.trim(),
      phone: phone?.trim() || undefined,
      gender: gender || "prefer-not",
      dob: dob ? new Date(dob) : undefined,
      profilePic: profilePic?.trim() || undefined,
      addresses: addrArray,
    };

    const customer = new Customer(customerData);
    await customer.save();

    if (customer.addresses.length > 0 && !customer.defaultAddressId) {
      customer.defaultAddressId = customer.addresses[0]._id;
      await customer.save();
    } else if (defaultAddressId && customer.addresses.id(defaultAddressId)) {
      customer.defaultAddressId = defaultAddressId;
      await customer.save();
    }

    return res.status(201).json(customer);
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ error: "Phone already in use" });
    }
    console.error(err);
    return res.status(500).json({ error: err.message || "Server error" });
  }
});

// GET /profile – fetch current authenticated user's customer profile
// routes/customer.js
customerRouter.get("/profile", isAuth, async (req, res) => {
  try {
    const userId = new mongoose.Types.ObjectId(req.user._id);
    console.log("🔍 Searching for customer with userId:", userId);
    const customer = await Customer.findOne({ userId });
    if (customer) {
      return res.json(customer);
    }

    const user = await User.findById(userId).select("-password");
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    return res.json({
      userId: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      isAdmin: user.isAdmin,
      approvalStatus: user.approvalStatus,
      phone: undefined,
      dob: undefined,
      profilePic: undefined,
      gender: undefined,
      addresses: [],
      defaultAddressId: undefined,
    });
  } catch (err) {
    console.error("❌ Error fetching profile:", err);
    res.status(500).json({ error: err.message });
  }
});

// routes/customer.js – add PUT /profile route
customerRouter.put("/profile", isAuth, async (req, res) => {
  const userId = req.user._id;
  const { name, phone, gender, dob, profilePic, address } = req.body;

  try {
    let customer = await Customer.findOne({ userId });

    if (!customer) {
      const addrArray = address ? [{ ...address, isDefault: true }] : [];
      if (addrArray.length > 0 && !addrArray.some((a) => a.isDefault)) {
        addrArray[0].isDefault = true;
      }

      customer = new Customer({
        userId: new mongoose.Types.ObjectId(userId),
        name: name?.trim() || req.user.name,
        phone: phone?.trim() || undefined,
        gender: gender || "prefer-not",
        dob: dob ? new Date(dob) : undefined,
        profilePic: profilePic?.trim() || undefined,
        addresses: addrArray,
      });

      if (customer.addresses.length > 0) {
        customer.defaultAddressId = customer.addresses[0]._id;
      }
      await customer.save();
      return res.status(201).json(customer);
    }

    // Update top-level fields
    if (name !== undefined) customer.name = name.trim();
    if (phone !== undefined) customer.phone = phone?.trim() || undefined;
    if (gender !== undefined) customer.gender = gender;
    if (dob !== undefined) customer.dob = dob ? new Date(dob) : undefined;
    if (profilePic !== undefined)
      customer.profilePic = profilePic?.trim() || undefined;

    // Update default address (find or push)
    if (address) {
      const defaultAddr =
        customer.addresses.find((a) => a.isDefault) || customer.addresses[0];
      if (defaultAddr) {
        // update existing
        if (address.label) defaultAddr.label = address.label;
        if (address.fullName) defaultAddr.fullName = address.fullName;
        if (address.phone) defaultAddr.phone = address.phone;
        if (address.country) defaultAddr.country = address.country;
        if (address.state) defaultAddr.state = address.state;
        if (address.city) defaultAddr.city = address.city;
        if (address.area) defaultAddr.area = address.area;
        if (address.street) defaultAddr.street = address.street;
        if (address.building) defaultAddr.building = address.building;
        if (address.unit) defaultAddr.unit = address.unit;
        if (address.postalCode) defaultAddr.postalCode = address.postalCode;
      } else {
        // no address exists – create new
        customer.addresses.push({
          ...address,
          isDefault: true,
          fullName: address.fullName || customer.name,
          phone: address.phone || customer.phone,
        });
        if (!customer.defaultAddressId) {
          customer.defaultAddressId = customer.addresses[0]._id;
        }
      }
    }

    await customer.save();
    res.json(customer);
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ error: "Phone already in use" });
    }
    console.error(err);
    res.status(500).json({ error: err.message || "Server error" });
  }
});


// ─── GET /family-members ──────────────────────────────────────────────
customerRouter.get("/family-members", isAuth, async (req, res) => {
  try {
    const userId = new mongoose.Types.ObjectId(req.user._id);
    const customer = await Customer.findOne({ userId });
    if (!customer) {
      return res.status(404).json({ error: "Customer profile not found" });
    }
    res.json({ items: customer.savedUsers || [] });
  } catch (err) {
    console.error("❌ Error fetching family members:", err);
    res.status(500).json({ error: err.message });
  }
});

// ─── POST /family-members ─────────────────────────────────────────────
customerRouter.post("/family-members", isAuth, async (req, res) => {
  const userId = req.user._id;
  const { name, phone, email, relationship, profilePic, address } = req.body;

  if (!name?.trim() || !phone?.trim()) {
    return res.status(400).json({ error: "Name and phone are required" });
  }

  try {
    const customer = await Customer.findOne({ userId });
    if (!customer) {
      return res.status(404).json({ error: "Customer profile not found" });
    }

    const newMember = {
      name: name.trim(),
      phone: phone.trim(),
      email: email?.trim() || undefined,
      relationship: relationship || "other",
      profilePic: profilePic?.trim() || undefined,
      address: address
        ? {
            fullName: address.fullName?.trim() || name.trim(),
            phone: address.phone?.trim() || phone.trim(),
            emirate: address.emirate?.trim() || "",
            city: address.city?.trim() || "",
            street: address.street?.trim() || "",
            building: address.building?.trim() || "",
            postalCode: address.postalCode?.trim() || "",
          }
        : undefined,
    };

    customer.savedUsers.push(newMember);
    await customer.save();

    const created = customer.savedUsers[customer.savedUsers.length - 1];
    res.status(201).json(created);
  } catch (err) {
    console.error("❌ Error adding family member:", err);
    res.status(500).json({ error: err.message });
  }
});

// ─── PUT /family-members/:id ──────────────────────────────────────────
customerRouter.put("/family-members/:id", isAuth, async (req, res) => {
  const userId = req.user._id;
  const memberId = req.params.id;
  const { name, phone, email, relationship, profilePic, address } = req.body;

  if (!name?.trim() || !phone?.trim()) {
    return res.status(400).json({ error: "Name and phone are required" });
  }

  try {
    const customer = await Customer.findOne({ userId });
    if (!customer) {
      return res.status(404).json({ error: "Customer profile not found" });
    }

    const member = customer.savedUsers.id(memberId);
    if (!member) {
      return res.status(404).json({ error: "Family member not found" });
    }

    // Update fields
    member.name = name.trim();
    member.phone = phone.trim();
    member.email = email?.trim() || undefined;
    member.relationship = relationship || "other";
    member.profilePic = profilePic?.trim() || undefined;

    if (address) {
      member.address = {
        fullName: address.fullName?.trim() || name.trim(),
        phone: address.phone?.trim() || phone.trim(),
        emirate: address.emirate?.trim() || "",
        city: address.city?.trim() || "",
        street: address.street?.trim() || "",
        building: address.building?.trim() || "",
        postalCode: address.postalCode?.trim() || "",
      };
    }

    await customer.save();
    res.json(member);
  } catch (err) {
    console.error("❌ Error updating family member:", err);
    res.status(500).json({ error: err.message });
  }
});

// ─── DELETE /family-members/:id ───────────────────────────────────────
customerRouter.delete("/family-members/:id", isAuth, async (req, res) => {
  const userId = req.user._id;
  const memberId = req.params.id;

  try {
    const result = await Customer.updateOne(
      { userId },
      { $pull: { savedUsers: { _id: memberId } } },
    );

    if (result.modifiedCount === 0) {
      return res.status(404).json({ error: "Family member not found" });
    }

    res.json({ success: true });
  } catch (err) {
    console.error("❌ Error deleting family member:", err);
    res.status(500).json({ error: err.message });
  }
});

// POST /reviews — Add a review for current authenticated customer
customerRouter.post("/reviews", isAuth, async (req, res) => {
  const userId = req.user._id;
  const { rating, quoteEn, quoteAr, titleEn, titleAr } = req.body;

  if (!rating || rating < 1 || rating > 5) {
    return res.status(400).json({ error: "Rating must be between 1 and 5" });
  }
  if (!quoteEn?.trim()) {
    return res.status(400).json({ error: "Review comment is required" });
  }

  try {
    const customer = await Customer.findOne({ userId });
    if (!customer) {
      return res.status(404).json({ error: "Customer profile not found" });
    }

    const newReview = {
      rating: Number(rating),
      quoteEn: quoteEn.trim(),
      quoteAr: quoteAr?.trim() || quoteEn.trim(),
      titleEn: titleEn?.trim() || "Client",
      titleAr: titleAr?.trim() || "عميل",
    };

    customer.reviews.push(newReview);
    await customer.save();

    return res.status(201).json({
      success: true,
      review: customer.reviews[customer.reviews.length - 1],
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err.message || "Server error" });
  }
});

// GET /reviews — Public endpoint to fetch all customer reviews
customerRouter.get("/reviews", async (req, res) => {
  try {
    const customers = await Customer.find({ "reviews.0": { $exists: true } });

    const allReviews = [];
    for (const customer of customers) {
      for (const rev of customer.reviews) {
        allReviews.push({
          id: rev._id,
          nameEn: customer.name,
          nameAr: customer.name,
          titleEn: rev.titleEn || "Client",
          titleAr: rev.titleAr || "عميل",
          quoteEn: rev.quoteEn,
          quoteAr: rev.quoteAr || rev.quoteEn,
          rating: rev.rating,
          createdAt: rev.createdAt,
        });
      }
    }

    allReviews.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    return res.json(allReviews);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err.message || "Server error" });
  }
});

export default customerRouter;
