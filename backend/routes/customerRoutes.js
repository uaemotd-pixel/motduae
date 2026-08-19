import express from "express";
import mongoose from "mongoose";
import Customer from "../models/customer.js"; // adjust path/extension as needed
import User from "../models/User.js";
import { isAuth } from "../middleware/auth.js";
import {
  uploadCustomerImageMiddleware,
  processCustomerImage,
} from "../middleware/uploadCustomerImage.js";
import expressAsyncHandler from "express-async-handler";
import CustomerSettings from "../models/CustomerSettings.js";
import {
  isValidEmirate,
  normalizeEmirate,
  validateAddress,
  normalizeAddress
} from "../utils/uaeAddress.js";

const calculateAge = (dob) => {
  if (!dob || Number.isNaN(new Date(dob).getTime())) return null;
  const birthDate = new Date(dob);
  const today = new Date();
  let years = today.getFullYear() - birthDate.getFullYear();
  const m = today.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
    years -= 1;
  }
  return years < 0 ? 0 : years;
};

const hasAddressData = (address) => {
  if (!address || typeof address !== "object") return false;
  const normalized = normalizeAddress(address);
  return !!(normalized.phone || normalized.emirate || normalized.city);
};

// const normalizeAddress = (address, defaultName, defaultPhone) => {
//   if (!address || typeof address !== "object") return undefined;

//   const rawPhone = address.phone?.trim() || "";
//   return {
//     fullName: address.fullName?.trim() || defaultName,
//     phone: rawPhone === "+971" ? "" : rawPhone,
//     emirate: address.emirate?.trim() || undefined,
//     city: address.city?.trim() || undefined,
//     street: address.street?.trim() || undefined,
//     building: address.building?.trim() || undefined,
//     postalCode: address.postalCode?.trim() || undefined,
//   };
// };

// const isAddressEmptyOrInvalid = (address) => {
//   if (!address || typeof address !== "object") return true;

//   const phone = typeof address.phone === "string" ? address.phone.trim() : "";
//   const hasAnyField = [
//     address.emirate,
//     address.city,
//     address.street,
//     address.building,
//     address.postalCode,
//   ].some((value) => typeof value === "string" && value.trim() !== "");

//   const hasPhone = phone !== "" && phone !== "+971";
//   const hasEmirate =
//     typeof address.emirate === "string" && address.emirate.trim() !== "";

//   if (!hasPhone && !hasAnyField) {
//     return true;
//   }

//   return !hasEmirate;
// };

// const cleanupSavedUserAddresses = (savedUsers) => {
//   if (!Array.isArray(savedUsers)) return;
//   savedUsers.forEach((member) => {
//     if (!member.address) return;
//     if (isAddressEmptyOrInvalid(member.address)) {
//       member.address = undefined;
//     }
//   });
// };

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
    if (req.user?.isGuest === true) {
      return res.json({
        userId: req.user._id,
        name: req.user.name,
        email: req.user.email,
        role: req.user.role,
        isAdmin: req.user.isAdmin,
        approvalStatus: req.user.approvalStatus,
        phone: undefined,
        dob: undefined,
        profilePic: undefined,
        gender: undefined,
        addresses: [],
        defaultAddressId: undefined,
      });
    }

    const userId = new mongoose.Types.ObjectId(req.user._id);
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
    if (req.user?.isGuest === true) {
      return res.json({
        userId: req.user._id,
        name: req.user.name,
        email: req.user.email,
        role: req.user.role,
        phone: undefined,
        addresses: address
          ? [{ ...address, _id: new mongoose.Types.ObjectId() }]
          : [],
      });
    }

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

      // Update User if customer created
      if (name || phone) {
        await User.findByIdAndUpdate(userId, {
          name: name?.trim() || req.user.name,
          phone: phone?.trim() || undefined,
        });
      }

      return res.status(201).json(customer);
    }

    // Update customer fields
    if (name !== undefined) customer.name = name.trim();
    if (phone !== undefined) customer.phone = phone?.trim() || undefined;
    if (gender !== undefined) customer.gender = gender;
    if (dob !== undefined) customer.dob = dob ? new Date(dob) : undefined;
    if (profilePic !== undefined)
      customer.profilePic = profilePic?.trim() || undefined;

    // Update address
    if (address) {
      const defaultAddr =
        customer.addresses.find((a) => a.isDefault) || customer.addresses[0];
      if (defaultAddr) {
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

    // ✅ Update User collection - FIXED
    if (name !== undefined || phone !== undefined) {
      const updateData = {};
      if (name !== undefined) updateData.name = name.trim();
      if (phone !== undefined) updateData.phone = phone?.trim() || undefined;

      await User.findByIdAndUpdate(userId, updateData);
    }

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
      return res.json({ items: [] });
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
  const { name, phone, email, relationship, dob, address } = req.body;

  if (!name?.trim() || !phone?.trim()) {
    return res.status(400).json({ error: "Name and phone are required" });
  }

  try {
    const customer = await Customer.findOne({ userId });
    if (!customer) {
      return res.status(404).json({ error: "Customer profile not found" });
    }

    const addressIsProvided = hasAddressData(address);
    const normalizedAddress = addressIsProvided
      ? normalizeAddress(address)
      : undefined;

    if (addressIsProvided && !normalizedAddress?.emirate) {
      return res.status(400).json({
        error: "Emirate is required when address details are provided",
      });
    }

    const newMember = {
      name: name.trim(),
      phone: phone.trim(),
      email: email?.trim() || undefined,
      relationship: relationship || "other",
      dob: dob ? new Date(dob) : undefined,
      age: dob ? calculateAge(new Date(dob)) : null,
      address: addressIsProvided ? normalizedAddress : undefined,
    };

    customer.savedUsers.push(newMember);
    // cleanupSavedUserAddresses(customer.savedUsers);
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
  const { name, phone, email, relationship, dob, address } = req.body;

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
    if (dob !== undefined) {
      member.dob = dob ? new Date(dob) : undefined;
      member.age = dob ? calculateAge(new Date(dob)) : null;
    }

    if (address) {
      const addressIsProvided = hasAddressData(address);
      const normalizedAddress = addressIsProvided
        ? normalizeAddress(address)
        : undefined;

      if (addressIsProvided && !isValidEmirate(normalizedAddress.emirate)) {
        return res.status(400).json({
          error: "Emirate is required when address details are provided",
        });
      }

      member.address = addressIsProvided ? normalizedAddress : undefined;
    }

    // cleanupSavedUserAddresses(customer.savedUsers);
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

// Route for customer to add her own measurements
customerRouter.post(
  "/customer_measurements",
  isAuth,
  expressAsyncHandler(async (req, res) => {
    const userId = req.user._id;
    const {
      totalLength,
      shoulderWidth,
      armLength,
      chestWidth,
      waist,
      hips,
      neckWidth,
      neckDepth,
      armholeHeight,
      sleeveOpeningWidth,
      cuffWidth,
      cuffLength,
      notes,
    } = req.body;

    const customer = await Customer.findOne({ userId });
    if (!customer) {
      return res.status(404).json({ error: "Customer profile not found" });
    }

    // Build measurement object
    const measurementData = {};
    const fields = [
      "totalLength",
      "shoulderWidth",
      "armLength",
      "chestWidth",
      "waist",
      "hips",
      "neckWidth",
      "neckDepth",
      "armholeHeight",
      "sleeveOpeningWidth",
      "cuffWidth",
      "cuffLength",
      "notes",
    ];

    fields.forEach((field) => {
      if (req.body[field] !== undefined && req.body[field] !== null) {
        measurementData[field] = req.body[field];
      }
    });

    // Handle measurements
    if (Array.isArray(customer.measurements)) {
      customer.measurements.push(measurementData);
    } else {
      if (customer.measurements) {
        Object.assign(customer.measurements, measurementData);
      } else {
        customer.measurements = measurementData;
      }
    }

    await customer.save();

    res.status(200).json({
      success: true,
      message: "Measurements saved successfully",
      measurements: customer.measurements,
    });
  }),
);

// Route to GET customer owns measurements
customerRouter.get(
  "/customer_measurements",
  isAuth,
  expressAsyncHandler(async (req, res) => {
    const userId = req.user._id;
    const customer = await Customer.findOne({ userId }, { measurements: 1 });

    if (!customer) {
      return res.json({
        success: true,
        measurements: null,
      });
    }

    res.json({
      success: true,
      measurements: customer.measurements || null,
    });
  }),
);

// Route to PUT (update) customer measurements
customerRouter.put(
  "/customer_measurements",
  isAuth,
  expressAsyncHandler(async (req, res) => {
    const userId = req.user._id;
    const {
      measurementId,
      totalLength,
      shoulderWidth,
      armLength,
      chestWidth,
      waist,
      hips,
      neckWidth,
      neckDepth,
      armholeHeight,
      sleeveOpeningWidth,
      cuffWidth,
      cuffLength,
      notes,
    } = req.body;

    const customer = await Customer.findOne({ userId });
    if (!customer) {
      return res.status(404).json({ error: "Customer profile not found" });
    }

    const updateData = {};
    const fields = [
      "totalLength",
      "shoulderWidth",
      "armLength",
      "chestWidth",
      "waist",
      "hips",
      "neckWidth",
      "neckDepth",
      "armholeHeight",
      "sleeveOpeningWidth",
      "cuffWidth",
      "cuffLength",
      "notes",
    ];

    fields.forEach((field) => {
      if (req.body[field] !== undefined && req.body[field] !== null) {
        updateData[field] = req.body[field];
      }
    });

    if (Array.isArray(customer.measurements) && measurementId) {
      const measurement = customer.measurements.id(measurementId);
      if (!measurement) {
        return res.status(404).json({ error: "Measurement not found" });
      }
      Object.assign(measurement, updateData);
    } else if (!Array.isArray(customer.measurements)) {
      if (customer.measurements) {
        Object.assign(customer.measurements, updateData);
      } else {
        customer.measurements = updateData;
      }
    } else {
      return res.status(400).json({ error: "Measurement ID required" });
    }

    await customer.save();

    res.json({
      success: true,
      message: "Measurements updated",
      measurements: customer.measurements,
    });
  }),
);

// DELETE - remove measurement of customer
customerRouter.delete(
  "/customer_measurements",
  isAuth,
  expressAsyncHandler(async (req, res) => {
    const userId = req.user._id;
    const { measurementId } = req.query;

    const customer = await Customer.findOne({ userId });
    if (!customer) {
      return res.status(404).json({ error: "Customer profile not found" });
    }

    if (Array.isArray(customer.measurements) && measurementId) {
      const removed = customer.measurements.id(measurementId);
      if (!removed) {
        return res.status(404).json({ error: "Measurement not found" });
      }
      customer.measurements.pull(measurementId);
    } else if (!Array.isArray(customer.measurements)) {
      customer.measurements = null;
    } else {
      return res.status(400).json({ error: "Measurement ID required" });
    }

    await customer.save();

    res.json({
      success: true,
      message: "Measurement deleted",
    });
  }),
);

// ─── GET member measurements ──────────────────────────────────────────
customerRouter.get(
  "/family-members/:id/measurements",
  isAuth,
  expressAsyncHandler(async (req, res) => {
    const userId = req.user._id;
    const memberId = req.params.id;

    const customer = await Customer.findOne({ userId });
    if (!customer) {
      return res.status(404).json({ error: "Customer profile not found" });
    }

    const member = customer.savedUsers.id(memberId);
    if (!member) {
      return res.status(404).json({ error: "Family member not found" });
    }

    res.json({
      success: true,
      measurements: member.measurements || null,
    });
  }),
);

// ─── PUT member measurements ──────────────────────────────────────────
customerRouter.put(
  "/family-members/:id/measurements",
  isAuth,
  expressAsyncHandler(async (req, res) => {
    const userId = req.user._id;
    const memberId = req.params.id;
    const {
      totalLength,
      shoulderWidth,
      armLength,
      chestWidth,
      waist,
      hips,
      neckWidth,
      neckDepth,
      armholeHeight,
      sleeveOpeningWidth,
      cuffWidth,
      cuffLength,
      notes,
    } = req.body;

    const customer = await Customer.findOne({ userId });
    if (!customer) {
      return res.status(404).json({ error: "Customer profile not found" });
    }

    const member = customer.savedUsers.id(memberId);
    if (!member) {
      return res.status(404).json({ error: "Family member not found" });
    }

    // Build measurement object
    const measurementData = {};
    const fields = [
      "totalLength",
      "shoulderWidth",
      "armLength",
      "chestWidth",
      "waist",
      "hips",
      "neckWidth",
      "neckDepth",
      "armholeHeight",
      "sleeveOpeningWidth",
      "cuffWidth",
      "cuffLength",
      "notes",
    ];

    fields.forEach((field) => {
      if (req.body[field] !== undefined && req.body[field] !== null) {
        measurementData[field] = req.body[field];
      }
    });

    // Set measurements on member
    member.measurements = measurementData;

    await customer.save();

    res.json({
      success: true,
      message: "Member measurements saved",
      measurements: member.measurements,
    });
  }),
);

// GET user measurement unit
customerRouter.get("/customerSettings", isAuth, async (req, res) => {
  try {
    const userId = new mongoose.Types.ObjectId(req.user._id);
    const settings = await CustomerSettings.findOne({ userId });

    res.json({
      measurementUnit: settings?.measurementUnit || "meters",
    });
  } catch (error) {
    console.error("❌ Error fetching settings:", error);
    res.status(500).json({ error: "Failed to fetch settings" });
  }
});

customerRouter.put("/customerSettings", isAuth, async (req, res) => {
  try {
    const { measurementUnit } = req.body;

    if (!["meters", "wara"].includes(measurementUnit)) {
      return res.status(400).json({ error: "Invalid measurement unit" });
    }

    const userId = new mongoose.Types.ObjectId(req.user._id);

    const settings = await CustomerSettings.findOneAndUpdate(
      { userId },
      { userId, measurementUnit },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );

    res.json({
      success: true,
      measurementUnit: settings.measurementUnit,
    });
  } catch (error) {
    console.error("❌ Error updating settings:", error);
    res.status(500).json({ error: "Failed to update settings" });
  }
});

export default customerRouter;
