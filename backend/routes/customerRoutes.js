import express from "express";
import mongoose from "mongoose";
import Customer from "../models/customer.js"; // adjust path/extension as needed
import User from "../models/User.js";
import RetailOrder from "../models/RetailOrder.js";
import CustomOrder from "../models/CustomOrder.js";
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
  normalizeAddress,
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

/** Allow whole and half stars: 1, 1.5, …, 5 */
function isValidHalfStarRating(rating) {
  const n = Number(rating);
  if (!Number.isFinite(n) || n < 1 || n > 5) return false;
  return Math.abs(n * 2 - Math.round(n * 2)) < 1e-9;
}

function buildCustomOrderReviewLabels(order) {
  const firstItem = Array.isArray(order?.items) ? order.items[0] : null;
  const design =
    firstItem?.designSnapshot || order?.designSnapshot || null;
  const fabric =
    firstItem?.fabricSnapshot || order?.fabricSnapshot || null;
  const designEn = String(design?.name || "").trim() || "Custom order";
  const designAr =
    String(design?.nameAr || "").trim() || designEn || "طلب مخصص";
  const fabricEn = String(fabric?.name || "").trim();
  const fabricAr = String(fabric?.nameAr || "").trim() || fabricEn;
  const addonNames = (order?.addons || [])
    .map((a) => String(a?.name || "").trim())
    .filter(Boolean);
  const addonNamesAr = (order?.addons || [])
    .map((a) => String(a?.nameAr || a?.name || "").trim())
    .filter(Boolean);

  let name = `Custom order · ${designEn}`;
  let nameAr = `طلب مخصص · ${designAr}`;
  if (fabricEn) {
    name += ` · ${fabricEn}`;
    nameAr += ` · ${fabricAr || fabricEn}`;
  }
  if (addonNames.length) {
    name += ` · ${addonNames.join(", ")}`;
    nameAr += ` · ${(addonNamesAr.length ? addonNamesAr : addonNames).join(", ")}`;
  }

  return {
    name,
    nameAr,
    designName: designEn,
    designNameAr: designAr,
    image: firstItem?.designId?.images?.[0] || null,
  };
}

function hasReviewedCustomOrder(reviews, orderId) {
  const id = String(orderId);
  return (reviews || []).some(
    (rev) =>
      rev.orderType === "custom" &&
      rev.orderId &&
      String(rev.orderId) === id,
  );
}

function serializePublicReview(customer, rev) {
  return {
    id: rev._id,
    nameEn: customer.name,
    nameAr: customer.name,
    titleEn: rev.titleEn || "Client",
    titleAr: rev.titleAr || "عميل",
    quoteEn: rev.quoteEn,
    quoteAr: rev.quoteAr || rev.quoteEn,
    rating: rev.rating,
    createdAt: rev.createdAt,
    productId: rev.productId || null,
    productKind: rev.productKind || null,
    productName: rev.productName || "",
    productNameAr: rev.productNameAr || "",
    productSlug: rev.productSlug || "",
    orderType: rev.orderType || "",
    orderId: rev.orderId || null,
    status: rev.status || "approved",
  };
}

/** Public surfaces only show approved reviews (legacy docs without status stay visible). */
function isPubliclyVisibleReview(rev) {
  if (!rev) return false;
  if (rev.status === "approved") return true;
  if (rev.status === "pending" || rev.status === "rejected") return false;
  return true;
}

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

// routes/customer.js - PUT /profile route only
customerRouter.put("/profile", isAuth, async (req, res) => {
  const userId = req.user._id;
  const { name, phone, gender, dob, profilePic, addresses } = req.body;

  try {
    if (req.user?.isGuest === true) {
      return res.json({
        userId: req.user._id,
        name: req.user.name,
        email: req.user.email,
        role: req.user.role,
        phone: undefined,
        addresses: addresses || [],
      });
    }

    let customer = await Customer.findOne({ userId });

    if (!customer) {
      const addrArray = addresses && Array.isArray(addresses) ? addresses : [];

      if (addrArray.length === 0) {
        addrArray.push({
          fullName: name?.trim() || req.user.name,
          phone: phone?.trim() || undefined,
          emirate: "",
          city: "",
          street: "",
          building: "",
          postalCode: "",
          isDefault: true,
        });
      }

      if (!addrArray[0].isDefault) addrArray[0].isDefault = true;

      customer = new Customer({
        userId: new mongoose.Types.ObjectId(userId),
        name: name?.trim() || req.user.name,
        phone: phone?.trim() || undefined,
        gender: gender || "prefer-not",
        dob: dob ? new Date(dob) : undefined,
        profilePic: profilePic?.trim() || undefined,
        addresses: addrArray,
      });

      const defaultAddr =
        customer.addresses.find((a) => a.isDefault) || customer.addresses[0];
      if (defaultAddr) customer.defaultAddressId = defaultAddr._id;

      await customer.save();

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

    // Update addresses - preserve first address as default
    if (addresses && Array.isArray(addresses) && addresses.length > 0) {
      const newAddresses = [];

      for (let index = 0; index < addresses.length; index++) {
        const addr = addresses[index];
        const emirate = normalizeEmirate(addr.emirate);
        if (!emirate) {
          return res.status(400).json({
            error: "Valid UAE emirate is required for each address",
          });
        }

        const isDefault = index === 0;
        const mapped = {
          fullName: addr.fullName || customer.name,
          phone: addr.phone || customer.phone,
          emirate,
          city: addr.city,
          street: addr.street || "",
          building: addr.building || "",
          postalCode: addr.postalCode || "",
          isDefault,
        };

        if (addr._id) {
          const existingAddr = customer.addresses.id(addr._id);
          if (existingAddr) {
            Object.assign(existingAddr, mapped);
            newAddresses.push(existingAddr);
            continue;
          }
        }
        newAddresses.push(mapped);
      }

      customer.addresses = newAddresses;

      // Ensure first address is always default
      if (customer.addresses.length > 0) {
        customer.addresses[0].isDefault = true;
        customer.defaultAddressId = customer.addresses[0]._id;
      }
    }

    await customer.save();

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

// POST /reviews — Add a review for current authenticated registered customer
customerRouter.post("/reviews", isAuth, async (req, res) => {
  const userId = req.user._id;
  const {
    rating,
    quoteEn,
    quoteAr,
    titleEn,
    titleAr,
    productId,
    customOrderId,
  } = req.body;

  if (req.user?.isGuest === true) {
    return res.status(403).json({
      error: "Only registered customers can submit reviews",
    });
  }

  const role = String(req.user?.role || "").toLowerCase();
  if (role && role !== "customer") {
    return res.status(403).json({
      error: "Only registered customers can submit reviews",
    });
  }

  if (!isValidHalfStarRating(rating)) {
    return res.status(400).json({
      error: "Rating must be between 1 and 5 in half-star steps (e.g. 3.5)",
    });
  }

  const trimmedQuoteEn = typeof quoteEn === "string" ? quoteEn.trim() : "";
  const trimmedQuoteAr = typeof quoteAr === "string" ? quoteAr.trim() : "";

  if (!trimmedQuoteEn && !trimmedQuoteAr) {
    return res.status(400).json({ error: "Review comment is required" });
  }

  if (productId && customOrderId) {
    return res.status(400).json({
      error: "Provide either a product or a custom order, not both",
    });
  }

  try {
    const customer = await Customer.findOne({ userId });
    if (!customer) {
      return res.status(404).json({ error: "Customer profile not found" });
    }

    // Keep both locales populated so homepage testimonials stay bilingual.
    const resolvedQuoteEn = trimmedQuoteEn || trimmedQuoteAr;
    const resolvedQuoteAr = trimmedQuoteAr || trimmedQuoteEn;
    const resolvedTitleEn =
      (typeof titleEn === "string" && titleEn.trim()) ||
      (typeof titleAr === "string" && titleAr.trim()) ||
      "Client";
    const resolvedTitleAr =
      (typeof titleAr === "string" && titleAr.trim()) ||
      (typeof titleEn === "string" && titleEn.trim()) ||
      "عميل";

    const newReview = {
      rating: Number(rating),
      quoteEn: resolvedQuoteEn,
      quoteAr: resolvedQuoteAr,
      titleEn: resolvedTitleEn,
      titleAr: resolvedTitleAr,
      status: "pending",
      productId: null,
      productKind: "",
      productName: "",
      productNameAr: "",
      productSlug: "",
      orderType: "",
      orderId: null,
    };

    if (customOrderId) {
      if (!mongoose.Types.ObjectId.isValid(customOrderId)) {
        return res.status(400).json({ error: "Invalid custom order" });
      }

      if (hasReviewedCustomOrder(customer.reviews, customOrderId)) {
        return res.status(400).json({
          error: "You have already reviewed this custom order",
        });
      }

      const customOrder = await CustomOrder.findOne({
        _id: customOrderId,
        userId,
        status: "delivered",
      })
        .select(
          "items designSnapshot fabricSnapshot addons fabricSource status createdAt",
        )
        .lean();

      if (!customOrder) {
        return res.status(400).json({
          error:
            "You can only review your own delivered custom orders",
        });
      }

      const labels = buildCustomOrderReviewLabels(customOrder);
      newReview.productKind = "custom";
      newReview.productName = labels.name;
      newReview.productNameAr = labels.nameAr;
      newReview.productSlug = "";
      newReview.orderType = "custom";
      newReview.orderId = customOrder._id;
    } else if (productId) {
      if (!mongoose.Types.ObjectId.isValid(productId)) {
        return res.status(400).json({ error: "Invalid product" });
      }

      const alreadyReviewed = (customer.reviews || []).some(
        (rev) =>
          rev.productId && String(rev.productId) === String(productId),
      );
      if (alreadyReviewed) {
        return res.status(400).json({
          error: "You have already reviewed this product",
        });
      }

      const deliveredOrders = await RetailOrder.find({
        userId,
        status: "delivered",
        "orderItems.productId": new mongoose.Types.ObjectId(productId),
      })
        .sort({ createdAt: -1 })
        .select("orderItems _id")
        .lean();

      let matchedItem = null;
      let matchedOrderId = null;
      for (const order of deliveredOrders) {
        const item = (order.orderItems || []).find((entry) => {
          const kind = entry.kind || "readyMade";
          return (
            (kind === "readyMade" || kind === "fabric" || kind === "addon") &&
            String(entry.productId) === String(productId)
          );
        });
        if (item) {
          matchedItem = item;
          matchedOrderId = order._id;
          break;
        }
      }

      if (!matchedItem) {
        return res.status(400).json({
          error:
            "You can only review ready-made, fabric, or add-on items from your delivered orders",
        });
      }

      const matchedKind = matchedItem.kind || "readyMade";
      newReview.productId = matchedItem.productId;
      newReview.productKind =
        matchedKind === "fabric"
          ? "fabric"
          : matchedKind === "addon"
            ? "addon"
            : "readyMade";
      newReview.productName = matchedItem.name || "";
      newReview.productNameAr = matchedItem.nameAr || matchedItem.name || "";
      newReview.productSlug = matchedItem.slug || "";
      newReview.orderType = "retail";
      newReview.orderId = matchedOrderId;
    }

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

// PUT /reviews/:id — Customer updates their own review (rating / text only)
customerRouter.put("/reviews/:id", isAuth, async (req, res) => {
  const userId = req.user._id;
  const reviewId = req.params.id;
  const { rating, quoteEn, quoteAr, titleEn, titleAr } = req.body;

  if (req.user?.isGuest === true) {
    return res.status(403).json({
      error: "Only registered customers can edit reviews",
    });
  }

  const role = String(req.user?.role || "").toLowerCase();
  if (role && role !== "customer") {
    return res.status(403).json({
      error: "Only registered customers can edit reviews",
    });
  }

  if (!mongoose.Types.ObjectId.isValid(reviewId)) {
    return res.status(400).json({ error: "Invalid review id" });
  }

  if (!isValidHalfStarRating(rating)) {
    return res.status(400).json({
      error: "Rating must be between 1 and 5 in half-star steps (e.g. 3.5)",
    });
  }

  const trimmedQuoteEn = typeof quoteEn === "string" ? quoteEn.trim() : "";
  const trimmedQuoteAr = typeof quoteAr === "string" ? quoteAr.trim() : "";

  if (!trimmedQuoteEn && !trimmedQuoteAr) {
    return res.status(400).json({ error: "Review comment is required" });
  }

  try {
    const customer = await Customer.findOne({ userId });
    if (!customer) {
      return res.status(404).json({ error: "Customer profile not found" });
    }

    const review = customer.reviews.id(reviewId);
    if (!review) {
      return res.status(404).json({ error: "Review not found" });
    }

    const resolvedQuoteEn = trimmedQuoteEn || trimmedQuoteAr;
    const resolvedQuoteAr = trimmedQuoteAr || trimmedQuoteEn;
    const resolvedTitleEn =
      (typeof titleEn === "string" && titleEn.trim()) ||
      (typeof titleAr === "string" && titleAr.trim()) ||
      review.titleEn ||
      "Client";
    const resolvedTitleAr =
      (typeof titleAr === "string" && titleAr.trim()) ||
      (typeof titleEn === "string" && titleEn.trim()) ||
      review.titleAr ||
      "عميل";

    review.rating = Number(rating);
    review.quoteEn = resolvedQuoteEn;
    review.quoteAr = resolvedQuoteAr;
    review.titleEn = resolvedTitleEn;
    review.titleAr = resolvedTitleAr;
    // Customer edits go back to moderation
    review.status = "pending";

    await customer.save();

    return res.json({ success: true, review });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err.message || "Server error" });
  }
});

// DELETE /reviews/:id — Customer deletes their own review
customerRouter.delete("/reviews/:id", isAuth, async (req, res) => {
  const userId = req.user._id;
  const reviewId = req.params.id;

  if (req.user?.isGuest === true) {
    return res.status(403).json({
      error: "Only registered customers can delete reviews",
    });
  }

  const role = String(req.user?.role || "").toLowerCase();
  if (role && role !== "customer") {
    return res.status(403).json({
      error: "Only registered customers can delete reviews",
    });
  }

  if (!mongoose.Types.ObjectId.isValid(reviewId)) {
    return res.status(400).json({ error: "Invalid review id" });
  }

  try {
    const customer = await Customer.findOne({ userId });
    if (!customer) {
      return res.status(404).json({ error: "Customer profile not found" });
    }

    const before = customer.reviews.length;
    customer.reviews = customer.reviews.filter(
      (rev) => String(rev._id) !== String(reviewId),
    );

    if (customer.reviews.length === before) {
      return res.status(404).json({ error: "Review not found" });
    }

    await customer.save();

    return res.json({ success: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err.message || "Server error" });
  }
});

// GET /reviews/eligible-products — delivered retail items + custom orders the customer can review
customerRouter.get("/reviews/eligible-products", isAuth, async (req, res) => {
  try {
    if (req.user?.isGuest === true) {
      return res.status(403).json({
        error: "Only registered customers can submit reviews",
      });
    }

    const customer = await Customer.findOne({ userId: req.user._id }).select(
      "reviews",
    );
    const reviewedProductIds = new Set(
      (customer?.reviews || [])
        .filter((rev) => rev.productId)
        .map((rev) => String(rev.productId)),
    );

    const { orderId, orderType } = req.query;
    const requestedType = String(orderType || "")
      .trim()
      .toLowerCase();
    const hasOrderFilter =
      Boolean(orderId) && mongoose.Types.ObjectId.isValid(String(orderId));

    if (orderId && !hasOrderFilter) {
      return res.status(400).json({ error: "Invalid orderId" });
    }

    const products = [];
    const customOrders = [];
    const seenProducts = new Set();

    const wantRetail =
      !hasOrderFilter || requestedType === "retail" || requestedType === "";
    const wantCustom =
      !hasOrderFilter || requestedType === "custom" || requestedType === "";

    // Notification deep-links pass orderType; without it and with orderId, try both.
    const retailOnly =
      hasOrderFilter && requestedType === "retail";
    const customOnly =
      hasOrderFilter && requestedType === "custom";

    if ((wantRetail || retailOnly) && !customOnly) {
      const orderFilter = {
        userId: req.user._id,
        status: "delivered",
      };
      if (hasOrderFilter && (retailOnly || requestedType === "")) {
        orderFilter._id = new mongoose.Types.ObjectId(String(orderId));
      }

      // When browsing (no order filter), list all delivered retail products.
      // When filtering by orderId for retail, scope to that order.
      const retailQuery =
        hasOrderFilter && retailOnly
          ? orderFilter
          : hasOrderFilter && requestedType === ""
            ? orderFilter
            : !hasOrderFilter
              ? { userId: req.user._id, status: "delivered" }
              : null;

      if (retailQuery) {
        const orders = await RetailOrder.find(retailQuery)
          .sort({ createdAt: -1 })
          .select("orderItems _id createdAt")
          .lean();

        for (const order of orders) {
          for (const item of order.orderItems || []) {
            const kind = item.kind || "readyMade";
            if (
              kind !== "readyMade" &&
              kind !== "fabric" &&
              kind !== "addon"
            ) {
              continue;
            }

            const pid = String(item.productId);
            if (
              !pid ||
              seenProducts.has(pid) ||
              reviewedProductIds.has(pid)
            ) {
              continue;
            }
            seenProducts.add(pid);

            products.push({
              productId: pid,
              orderId: String(order._id),
              kind,
              name: item.name || "",
              nameAr: item.nameAr || item.name || "",
              slug: item.slug || "",
              image: item.image || "",
              deliveredAt: order.createdAt,
            });
          }
        }
      }
    }

    if ((wantCustom || customOnly) && !retailOnly) {
      const customFilter = {
        userId: req.user._id,
        status: "delivered",
      };
      if (hasOrderFilter && (customOnly || requestedType === "")) {
        customFilter._id = new mongoose.Types.ObjectId(String(orderId));
      }

      const customQuery =
        hasOrderFilter && customOnly
          ? customFilter
          : hasOrderFilter && requestedType === ""
            ? customFilter
            : !hasOrderFilter
              ? { userId: req.user._id, status: "delivered" }
              : null;

      if (customQuery) {
        const orders = await CustomOrder.find(customQuery)
          .sort({ createdAt: -1 })
          .select(
            "items designSnapshot fabricSnapshot addons fabricSource createdAt",
          )
          .lean();

        for (const order of orders) {
          if (hasReviewedCustomOrder(customer?.reviews, order._id)) continue;
          const labels = buildCustomOrderReviewLabels(order);
          customOrders.push({
            orderId: String(order._id),
            kind: "custom",
            name: labels.name,
            nameAr: labels.nameAr,
            image: "",
            deliveredAt: order.createdAt,
          });
        }
      }
    }

    return res.json({ success: true, products, customOrders });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err.message || "Server error" });
  }
});

// GET /reviews — Public endpoint to fetch customer reviews (optional ?productId=)
customerRouter.get("/reviews", async (req, res) => {
  try {
    const { productId } = req.query;
    const filter = { "reviews.0": { $exists: true } };

    if (productId) {
      if (!mongoose.Types.ObjectId.isValid(String(productId))) {
        return res.status(400).json({ error: "Invalid productId" });
      }
      filter["reviews.productId"] = new mongoose.Types.ObjectId(
        String(productId),
      );
    }

    const customers = await Customer.find(filter);

    const allReviews = [];
    for (const customer of customers) {
      for (const rev of customer.reviews) {
        if (
          productId &&
          (!rev.productId || String(rev.productId) !== String(productId))
        ) {
          continue;
        }
        if (!isPubliclyVisibleReview(rev)) continue;
        allReviews.push(serializePublicReview(customer, rev));
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
