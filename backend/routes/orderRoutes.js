import express from "express";
import expressAsyncHandler from "express-async-handler";
import mongoose from "mongoose";
import RetailOrder, {
  PAYMENT_METHODS as RETAIL_PAYMENT_METHODS,
} from "../models/RetailOrder.js";
import ReadyMadeProduct from "../models/ReadyMadeProduct.js";
import CustomOrder, {
  FABRIC_SOURCES,
  PAYMENT_METHODS,
} from "../models/CustomOrder.js";
import Design from "../models/Design.js";
import Fabric from "../models/Fabric.js";
import TailorShop from "../models/TailorShop.js";
import { isAuth } from "../middleware/auth.js";
import AddOn from "../models/AddOn.js";
import {
  notifyCustomOrderPlacedAdmin,
  notifyCustomOrderPlacedCustomer,
  notifyRetailOrderPlacedAdmin,
  notifyRetailOrderPlacedCustomer,
  notifyCustomReturnRequested,
  notifyCustomReturnReceivedByCustomer,
  notifyCustomReturnApproved,
  notifyCustomReturnRejected,
  notifyCustomRefundProcessed,
  notifyCustomStatusChange,
} from "../services/notificationService.js";

import AdminNotification from "../models/AdminNotification.js";

import {
  getCustomOrderPricing,
  getMultiItemCustomOrderPricing,
  PricingValidationError,
} from "../services/pricingService.js";
import PlatformSettings from "../models/PlatformSettings.js";
import {
  prepareRetailOrder,
  deductRetailProductStock,
} from "../services/retailOrderService.js";
import {
  isStripeConfigured,
  verifyApplePayPaymentIntent,
} from "../services/stripeService.js";

const orderRoutes = express.Router();

const isApprovedTailorOwner = (owner) =>
  owner?.role === "tailor" && owner?.approvalStatus === "approved";

function parseFabricMeters(fabricMeters) {
  const meters = Number(fabricMeters);
  if (!fabricMeters || Number.isNaN(meters) || meters <= 0) {
    throw new PricingValidationError("fabricMeters must be greater than 0");
  }
  return meters;
}

function validateFabricOrderInput({
  designId,
  fabricSource,
  fabricId,
  fabricMeters,
}) {
  if (!designId || !mongoose.Types.ObjectId.isValid(designId)) {
    throw new PricingValidationError("Valid designId is required");
  }

  if (!fabricSource || !FABRIC_SOURCES.includes(fabricSource)) {
    throw new PricingValidationError(
      `fabricSource must be one of: ${FABRIC_SOURCES.join(", ")}`,
    );
  }

  if (
    fabricSource === "storefront" &&
    (!fabricId || !mongoose.Types.ObjectId.isValid(fabricId))
  ) {
    throw new PricingValidationError(
      "Valid fabricId is required when fabricSource is storefront",
    );
  }

  if (fabricSource === "self" && fabricId) {
    throw new PricingValidationError(
      "fabricId must not be provided when fabricSource is self",
    );
  }

  return {
    designId,
    fabricSource,
    fabricId: fabricSource === "storefront" ? fabricId : null,
    fabricMeters: parseFabricMeters(fabricMeters),
  };
}

function validateMultiItemOrderInput({ fabricSource, items }) {
  if (!fabricSource || !FABRIC_SOURCES.includes(fabricSource)) {
    throw new PricingValidationError(
      `fabricSource must be one of: ${FABRIC_SOURCES.join(", ")}`,
    );
  }

  if (!Array.isArray(items) || items.length === 0) {
    throw new PricingValidationError("At least one item is required");
  }

  return {
    fabricSource,
    items: items.map((item) =>
      validateFabricOrderInput({
        designId: item.designId,
        fabricSource,
        fabricId: item.fabricId,
        fabricMeters: item.fabricMeters,
      }),
    ),
  };
}

function isMultiItemPayload(body) {
  return Array.isArray(body?.items) && body.items.length > 0;
}

async function loadDesignWithApprovedShop(designId) {
  const design = await Design.findById(designId);

  if (!design || !design.isActive) {
    throw new PricingValidationError("design not found");
  }

  const shop = await TailorShop.findById(design.tailorShopId).populate(
    "ownerId",
    "_id role approvalStatus",
  );

  if (!shop?.isActive || !isApprovedTailorOwner(shop.ownerId)) {
    throw new PricingValidationError(
      "design is not available from an approved tailor",
    );
  }

  return { design, shop };
}

function normalizeDeliveryAddress(address) {
  if (!address || typeof address !== "object") {
    throw new PricingValidationError("customerDeliveryAddress is required");
  }

  const { fullName, phone, line1, line2, city, emirate } = address;

  if (
    !fullName?.trim() ||
    !phone?.trim() ||
    !line1?.trim() ||
    !city?.trim() ||
    !emirate?.trim()
  ) {
    throw new PricingValidationError(
      "customerDeliveryAddress requires fullName, phone, line1, city, and emirate",
    );
  }

  return {
    fullName: fullName.trim(),
    phone: phone.trim(),
    line1: line1.trim(),
    line2: line2?.trim() || "",
    city: city.trim(),
    emirate: emirate.trim(),
  };
}

function normalizePickupAddress(address) {
  if (!address || typeof address !== "object") {
    throw new PricingValidationError("pickupAddress is required");
  }

  const { fullName, phone, line1, line2, city, emirate } = address;

  if (!line1?.trim() || !city?.trim() || !emirate?.trim()) {
    throw new PricingValidationError(
      "pickupAddress requires line1, city, and emirate",
    );
  }

  return {
    fullName: fullName?.trim() || "",
    phone: phone?.trim() || "",
    line1: line1.trim(),
    line2: line2?.trim() || "",
    city: city.trim(),
    emirate: emirate.trim(),
  };
}

function buildPickupAddressFromFabric(fabric) {
  const store = fabric.storePickupAddress;

  if (!store) {
    throw new PricingValidationError("fabric store pickup address is missing");
  }

  const line1 = [store.street, store.building]
    .filter((part) => part?.trim())
    .join(", ");

  if (!line1 || !store.city?.trim() || !store.emirate?.trim()) {
    throw new PricingValidationError(
      "fabric store pickup address is incomplete",
    );
  }

  return {
    fullName: "",
    phone: store.phone?.trim() || "",
    line1,
    line2: "",
    city: store.city.trim(),
    emirate: store.emirate.trim(),
  };
}

function buildFabricSnapshot(fabric) {
  return {
    name: fabric.name,
    nameAr: fabric.nameAr || "",
    slug: fabric.slug || "",
    material: fabric.material || "",
    pricePerMeter: fabric.pricePerMeter,
  };
}

function buildDesignSnapshot(design) {
  return {
    name: design.name,
    nameAr: design.nameAr || "",
    slug: design.slug || "",
    category: design.category || "",
    basePrice: design.basePrice,
    priceType: design.priceType || "fixed",
    tailoringFee: design.tailoringFee,
    estimatedMeters: design.estimatedMeters,
  };
}

function formatTailorShopSummary(tailorShop) {
  if (!tailorShop) return null;

  const id = tailorShop._id ?? tailorShop;
  if (!id) return null;

  return {
    _id: String(id),
    name: tailorShop.name || "",
    nameAr: tailorShop.nameAr || "",
    slug: tailorShop.slug || "",
  };
}

function formatDesignSummary(snapshot, designIdDoc) {
  if (!snapshot) return null;

  return {
    name: snapshot.name,
    nameAr: snapshot.nameAr || "",
    slug: snapshot.slug || "",
    category: snapshot.category || "",
    images: (designIdDoc && designIdDoc.images) || [],
  };
}

function formatFabricSummary(snapshot, fabricIdDoc) {
  if (!snapshot) return null;

  return {
    name: snapshot.name,
    nameAr: snapshot.nameAr || "",
    material: snapshot.material || "",
    images: (fabricIdDoc && fabricIdDoc.images) || [],
  };
}

function formatCustomOrderLineItems(order) {
  if (Array.isArray(order.items) && order.items.length > 0) {
    return order.items.map((item) => ({
      design: formatDesignSummary(item.designSnapshot, item.designId),
      fabric: formatFabricSummary(item.fabricSnapshot, item.fabricId),
      fabricMeters: item.fabricMeters,
      tailorShop: formatTailorShopSummary(item.tailorShopId),
    }));
  }

  if (!order.designSnapshot) return [];

  return [
    {
      design: formatDesignSummary(order.designSnapshot, order.designId),
      fabric: formatFabricSummary(order.fabricSnapshot, order.fabricId),
      fabricMeters: order.fabricMeters,
      tailorShop: formatTailorShopSummary(order.tailorShopId),
    },
  ];
}

async function deductFabricStock(fabricId, meters) {
  const fabric = await Fabric.findOne({ _id: fabricId, isActive: true });

  if (!fabric) {
    throw new PricingValidationError("fabric not found or is inactive");
  }

  // Atomically decrement stock only if it's greater than or equal to requested meters.
  // This prevents the stock from ever going negative (below 0).
  const updatedFabric = await Fabric.findOneAndUpdate(
    { _id: fabricId, stockInMeters: { $gte: meters } },
    { $inc: { stockInMeters: -meters } },
    { new: true },
  );

  if (!updatedFabric) {
    throw new PricingValidationError(
      `Insufficient fabric stock for ${fabric.name}. Available: ${fabric.stockInMeters} meters.`,
    );
  }

  return updatedFabric;
}

async function buildMultiItemOrderData(orderInput, deliveryType = "delivery") {
  const { pricing, itemPricings } = await getMultiItemCustomOrderPricing({
    ...orderInput,
    deliveryType,
  });
  const fabricDeductions = new Map();

  for (const item of orderInput.items) {
    if (orderInput.fabricSource !== "storefront" || !item.fabricId) continue;

    const key = item.fabricId.toString();
    fabricDeductions.set(
      key,
      (fabricDeductions.get(key) || 0) + item.fabricMeters,
    );
  }

  const fabricDocs = new Map();

  for (const [fabricId, totalMeters] of fabricDeductions.entries()) {
    const fabric = await deductFabricStock(fabricId, totalMeters);
    fabricDocs.set(fabricId, fabric);
  }

  const orderItems = [];

  for (let index = 0; index < orderInput.items.length; index += 1) {
    const itemInput = orderInput.items[index];
    const { design, shop } = await loadDesignWithApprovedShop(
      itemInput.designId,
    );

    let fabric = null;
    if (orderInput.fabricSource === "storefront" && itemInput.fabricId) {
      fabric = fabricDocs.get(itemInput.fabricId.toString()) ?? null;
      if (!fabric) {
        fabric = await Fabric.findById(itemInput.fabricId);
      }
    }

    orderItems.push({
      designId: design._id,
      designSnapshot: buildDesignSnapshot(design),
      tailorShopId: shop._id,
      fabricId: fabric?._id ?? null,
      fabricStoreId: fabric?.listedByStore ?? null,
      fabricSnapshot: fabric ? buildFabricSnapshot(fabric) : null,
      fabricMeters: itemInput.fabricMeters,
      pricing: itemPricings[index],
    });
  }

  const firstItem = orderItems[0];
  const firstFabric =
    orderInput.fabricSource === "storefront" && firstItem.fabricId
      ? (fabricDocs.get(firstItem.fabricId.toString()) ??
        (await Fabric.findById(firstItem.fabricId)))
      : null;

  return {
    pricing,
    orderItems,
    legacyFields: {
      fabricId: firstFabric?._id ?? null,
      fabricStoreId: firstFabric?.listedByStore ?? null,
      fabricSnapshot: firstFabric ? buildFabricSnapshot(firstFabric) : null,
      fabricMeters: orderItems.reduce(
        (sum, item) => sum + item.fabricMeters,
        0,
      ),
      tailorShopId: firstItem.tailorShopId,
      designId: firstItem.designId,
      designSnapshot: firstItem.designSnapshot,
    },
    firstFabric,
  };
}

async function getCustomOrderTotalFromBody(body) {
  const { deliveryType = "delivery", addonIds = [] } = body;

  let addonsCost = 0;
  if (addonIds && addonIds.length > 0) {
    const dbAddons = await AddOn.find({ _id: { $in: addonIds }, isActive: true });
    addonsCost = dbAddons.reduce((sum, item) => sum + item.price, 0);
  }

  if (isMultiItemPayload(body)) {
    const orderInput = validateMultiItemOrderInput(body);
    const { pricing } = await getMultiItemCustomOrderPricing({
      ...orderInput,
      deliveryType,
    });
    const subtotal = Number((pricing.subtotal + addonsCost).toFixed(2));
    const vatAmount = Number((subtotal * pricing.vatRate).toFixed(2));
    const total = Number((subtotal + vatAmount + pricing.deliveryFee).toFixed(2));
    return total;
  }

  const orderInput = validateFabricOrderInput(body);
  const pricing = await getCustomOrderPricing({
    ...orderInput,
    deliveryType,
  });
  const subtotal = Number((pricing.subtotal + addonsCost).toFixed(2));
  const vatAmount = Number((subtotal * pricing.vatRate).toFixed(2));
  const total = Number((subtotal + vatAmount + pricing.deliveryFee).toFixed(2));
  return total;
}

orderRoutes.post("/custom/preview", async (req, res) => {
  try {
    const { deliveryType = "delivery", addonIds = [] } = req.body;

    let dbAddons = [];
    let addonsCost = 0;
    if (addonIds && addonIds.length > 0) {
      dbAddons = await AddOn.find({ _id: { $in: addonIds }, isActive: true });
      addonsCost = dbAddons.reduce((sum, item) => sum + item.price, 0);
    }

    if (isMultiItemPayload(req.body)) {
      const orderInput = validateMultiItemOrderInput(req.body);
      const { pricing } = await getMultiItemCustomOrderPricing({
        ...orderInput,
        deliveryType,
      });

      pricing.subtotal = Number((pricing.subtotal + addonsCost).toFixed(2));
      pricing.vatAmount = Number((pricing.subtotal * pricing.vatRate).toFixed(2));
      pricing.total = Number((pricing.subtotal + pricing.vatAmount + pricing.deliveryFee).toFixed(2));

      return res.json({
        success: true,
        pricing,
        addons: dbAddons.map(a => ({
          addonId: a._id,
          name: a.name,
          nameAr: a.nameAr,
          price: a.price,
          thumbnailImage: a.thumbnailImage
        }))
      });
    }

    const orderInput = validateFabricOrderInput(req.body);
    const pricing = await getCustomOrderPricing({
      ...orderInput,
      deliveryType,
    });

    pricing.subtotal = Number((pricing.subtotal + addonsCost).toFixed(2));
    pricing.vatAmount = Number((pricing.subtotal * pricing.vatRate).toFixed(2));
    pricing.total = Number((pricing.subtotal + pricing.vatAmount + pricing.deliveryFee).toFixed(2));

    res.json({
      success: true,
      pricing,
      addons: dbAddons.map(a => ({
        addonId: a._id,
        name: a.name,
        nameAr: a.nameAr,
        price: a.price,
        thumbnailImage: a.thumbnailImage
      }))
    });
  } catch (error) {
    if (error instanceof PricingValidationError) {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }

    console.error("POST /api/orders/custom/preview error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to calculate price preview",
    });
  }
});

orderRoutes.post("/custom", isAuth, async (req, res) => {
  try {
    const {
      designId,
      fabricSource,
      fabricId,
      fabricMeters,
      items,
      measurements,
      customerDeliveryAddress,
      pickupAddress,
      paymentMethod = "cod",
      deliveryType = "delivery",
      addPocket = false,
      addBottomWideFold = false,
      paymentIntentId,
      addonIds = [],
    } = req.body;

    if (!PAYMENT_METHODS.includes(paymentMethod)) {
      return res.status(400).json({
        success: false,
        message: `paymentMethod must be one of: ${PAYMENT_METHODS.join(", ")}`,
      });
    }

    let paymentDetails = {
      isPaid: false,
      paidAt: null,
      stripePaymentIntentId: null,
    };

    if (paymentMethod === "apple_pay") {
      if (!isStripeConfigured()) {
        return res.status(503).json({
          success: false,
          message: "Apple Pay is not configured",
        });
      }

      if (!paymentIntentId) {
        return res.status(400).json({
          success: false,
          message: "paymentIntentId is required for Apple Pay",
        });
      }

      const orderTotal = await getCustomOrderTotalFromBody(req.body);
      await verifyApplePayPaymentIntent({
        paymentIntentId,
        userId: req.user._id,
        orderType: "custom",
        expectedAmountAed: orderTotal,
      });

      paymentDetails = {
        isPaid: true,
        paidAt: new Date(),
        stripePaymentIntentId: paymentIntentId,
      };
    }

    // Build conditional address based on deliveryType
    const deliveryAddr =
      deliveryType === "delivery"
        ? normalizeDeliveryAddress(customerDeliveryAddress)
        : null;

    // Normalize pickup address if provided
    const normalizedPickupAddress = pickupAddress
      ? normalizePickupAddress(pickupAddress)
      : null;

    let dbAddons = [];
    let addonsCost = 0;
    if (addonIds && addonIds.length > 0) {
      dbAddons = await AddOn.find({ _id: { $in: addonIds }, isActive: true });
      addonsCost = dbAddons.reduce((sum, item) => sum + item.price, 0);
    }

    if (isMultiItemPayload(req.body)) {
      const orderInput = validateMultiItemOrderInput({ fabricSource, items });
      const { pricing, orderItems, legacyFields, firstFabric } =
        await buildMultiItemOrderData(orderInput, deliveryType);

      let resolvedPickupAddress = normalizedPickupAddress;
      if (
        orderInput.fabricSource === "storefront" &&
        firstFabric &&
        !resolvedPickupAddress
      ) {
        resolvedPickupAddress = buildPickupAddressFromFabric(firstFabric);
      }

      const confirmedAt = new Date();

      pricing.subtotal = Number((pricing.subtotal + addonsCost).toFixed(2));
      pricing.vatAmount = Number((pricing.subtotal * pricing.vatRate).toFixed(2));
      pricing.total = Number((pricing.subtotal + pricing.vatAmount + pricing.deliveryFee).toFixed(2));

      const order = await CustomOrder.create({
        userId: req.user._id,
        fabricSource: orderInput.fabricSource,
        ...legacyFields,
        items: orderItems,
        measurements: measurements || {},
        deliveryType,
        customerDeliveryAddress:
          deliveryType === "delivery" ? deliveryAddr : null,
        pickupAddress: deliveryType === "pickup" ? resolvedPickupAddress : null,
        status: "confirmed",
        statusHistory: [
          {
            status: "confirmed",
            note: "Order confirmed",
            changedAt: confirmedAt,
            changedBy: req.user._id,
          },
        ],
        pricing,
        paymentMethod,
        addPocket,
        addBottomWideFold,
        addons: dbAddons.map(a => ({
          addonId: a._id,
          name: a.name,
          nameAr: a.nameAr,
          price: a.price,
          thumbnailImage: a.thumbnailImage
        })),
        ...paymentDetails,
      });

      // Notify admins about custom order placement
      const customerName = req.user?.name || "Customer";
      const itemNames = (order.items || []).map((it) => {
        const designName = it?.designSnapshot?.name;
        const fabricName = it?.fabricSnapshot?.name;
        const designPart = designName ? `Design: ${designName}` : null;
        const fabricPart = fabricName ? `Fabric: ${fabricName}` : null;
        return [designPart, fabricPart].filter(Boolean).join(" • ");
      }).filter(Boolean);
      const itemNameText = itemNames.length ? itemNames.join(", ") : "Custom item";

      const message = `${customerName} has placed order for ${itemNameText} for AED ${Number(order.pricing?.total ?? 0).toFixed(2)}`;

      await notifyCustomOrderPlacedAdmin(order, req.user._id, message);
      await notifyCustomOrderPlacedCustomer(order, req.user._id);

      return res.status(201).json({
        success: true,
        message: "Custom order created successfully",
        orderId: order._id,
        order,
      });
    }

    console.log("POST /api/orders/custom payload (sanitized):", {
      designId,
      fabricSource,
      fabricId,
      fabricMeters,
      paymentMethod,
      deliveryType,
      customerDeliveryAddressKeys: customerDeliveryAddress
        ? Object.keys(customerDeliveryAddress)
        : null,
      pickupAddressProvided: Boolean(pickupAddress),
    });

    const orderInput = validateFabricOrderInput({
      designId,
      fabricSource,
      fabricId,
      fabricMeters,
    });

    const { design, shop } = await loadDesignWithApprovedShop(
      orderInput.designId,
    );

    let fabric = null;
    let resolvedPickupAddress = normalizedPickupAddress;

    if (orderInput.fabricSource === "storefront") {
      fabric = await deductFabricStock(
        orderInput.fabricId,
        orderInput.fabricMeters,
      );

      if (!resolvedPickupAddress) {
        resolvedPickupAddress = buildPickupAddressFromFabric(fabric);
      }
    }

    const pricing = await getCustomOrderPricing({
      ...orderInput,
      deliveryType,
    });

    pricing.subtotal = Number((pricing.subtotal + addonsCost).toFixed(2));
    pricing.vatAmount = Number((pricing.subtotal * pricing.vatRate).toFixed(2));
    pricing.total = Number((pricing.subtotal + pricing.vatAmount + pricing.deliveryFee).toFixed(2));

    const confirmedAt = new Date();

    const order = await CustomOrder.create({
      userId: req.user._id,
      fabricSource: orderInput.fabricSource,
      fabricId: fabric?._id ?? null,
      fabricStoreId: fabric?.listedByStore ?? null,
      fabricSnapshot: fabric ? buildFabricSnapshot(fabric) : null,
      fabricMeters: orderInput.fabricMeters,
      tailorShopId: shop._id,
      designId: design._id,
      designSnapshot: buildDesignSnapshot(design),
      measurements: measurements || {},
      deliveryType,
      customerDeliveryAddress:
        deliveryType === "delivery" ? deliveryAddr : null,
      pickupAddress: deliveryType === "pickup" ? resolvedPickupAddress : null,
      status: "confirmed",
      statusHistory: [
        {
          status: "confirmed",
          note: "Order confirmed",
          changedAt: confirmedAt,
          changedBy: req.user._id,
        },
      ],
      pricing,
      paymentMethod,
      addPocket,
      addBottomWideFold,
      addons: dbAddons.map(a => ({
        addonId: a._id,
        name: a.name,
        nameAr: a.nameAr,
        price: a.price,
        thumbnailImage: a.thumbnailImage
      })),
      ...paymentDetails,
    });

    const customerName = req.user?.name || "Customer";
    const designName = order.designSnapshot?.name || "Custom item";
    const message = `${customerName} has placed order for ${designName} for AED ${Number(order.pricing?.total ?? 0).toFixed(2)}`;

    await notifyCustomOrderPlacedAdmin(order, req.user._id, message);
    await notifyCustomOrderPlacedCustomer(order, req.user._id);

    res.status(201).json({
      success: true,
      message: "Custom order created successfully",
      orderId: order._id,
      order,
    });
  } catch (error) {
    if (error instanceof PricingValidationError) {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }

    console.error("POST /api/orders/custom error:", error);
    res.status(error.message?.includes("Payment") ? 400 : 500).json({
      success: false,
      message: error.message || "Failed to create custom order",
    });
  }
});

orderRoutes.get("/custom/mine", isAuth, async (req, res) => {
  try {
    const orders = await CustomOrder.find({
      userId: req.user._id,
    })
      .sort({ createdAt: -1 })
      .populate("tailorShopId", "name nameAr slug")
      .populate("items.tailorShopId", "name nameAr slug")
      .populate("designId", "images")
      .populate("fabricId", "images")
      .populate("items.designId", "images")
      .populate("items.fabricId", "images")
      .select(
        "_id createdAt status fabricSource designId fabricId designSnapshot fabricSnapshot fabricMeters pricing tailorShopId userId items addons",
      );

    const formatted = orders.map((order) => {
      const items = formatCustomOrderLineItems(order);
      const primaryItem = items[0] ?? null;

      return {
        id: order._id,
        date: order.createdAt,
        status: order.status,
        fabricSource: order.fabricSource,
        total: order.pricing?.total,
        currency: order.pricing?.currency,
        userId: order.userId,
        itemCount: items.length,
        items,
        design: primaryItem?.design ?? null,
        tailorShop:
          primaryItem?.tailorShop ??
          formatTailorShopSummary(order.tailorShopId),
        addons: order.addons || [],
      };
    });

    res.json({
      success: true,
      orders: formatted,
    });
  } catch (error) {
    console.error("GET /api/orders/custom/mine error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch custom orders",
    });
  }
});

orderRoutes.get("/custom/:id", isAuth, async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(404).json({
        success: false,
        message: "Invalid order ID",
      });
    }

    const order = await CustomOrder.findById(id).populate(
      "tailorShopId",
      "name nameAr slug logo city",
    );

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    if (order.userId.toString() !== req.user._id && !req.user.isAdmin) {
      return res.status(403).json({
        success: false,
        message: "You are not allowed to view this order",
      });
    }

    res.json({
      success: true,
      order,
    });
  } catch (error) {
    console.error("GET /api/orders/custom/:id error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch custom order",
    });
  }
});

orderRoutes.post("/retail", isAuth, async (req, res) => {
  try {
    const {
      orderItems,
      shippingAddress,
      paymentMethod = "cod",
      paymentIntentId,
    } = req.body;

    if (!orderItems || orderItems.length === 0) {
      return res.status(400).json({
        success: false,
        message: "No order items provided",
      });
    }

    if (!shippingAddress) {
      return res.status(400).json({
        success: false,
        message: "Shipping address is required",
      });
    }

    if (!RETAIL_PAYMENT_METHODS.includes(paymentMethod)) {
      return res.status(400).json({
        success: false,
        message: `paymentMethod must be one of: ${RETAIL_PAYMENT_METHODS.join(", ")}`,
      });
    }

    const prepared = await prepareRetailOrder(orderItems);

    let paymentDetails = {
      isPaid: false,
      paidAt: null,
      stripePaymentIntentId: null,
    };
    let orderStatus = "pending";

    if (paymentMethod === "apple_pay") {
      if (!isStripeConfigured()) {
        return res.status(503).json({
          success: false,
          message: "Apple Pay is not configured",
        });
      }

      if (!paymentIntentId) {
        return res.status(400).json({
          success: false,
          message: "paymentIntentId is required for Apple Pay",
        });
      }

      await verifyApplePayPaymentIntent({
        paymentIntentId,
        userId: req.user._id,
        orderType: "retail",
        expectedAmountAed: prepared.totalPrice,
      });

      paymentDetails = {
        isPaid: true,
        paidAt: new Date(),
        stripePaymentIntentId: paymentIntentId,
      };
      orderStatus = "confirmed";
    }

    await deductRetailProductStock(orderItems);

    const order = await RetailOrder.create({
      userId: req.user._id,
      orderItems: prepared.finalOrderItems,
      shippingAddress,
      paymentMethod,
      itemsPrice: prepared.itemsPrice,
      shippingPrice: prepared.shippingPrice,
      vatRate: prepared.vatRate,
      vatAmount: prepared.vatAmount,
      totalPrice: prepared.totalPrice,
      status: orderStatus,
      ...paymentDetails,
    });

    // Notify admins about ready-made order placement
    const customerName = req.user?.name || "Customer";
    const itemNames = (prepared.finalOrderItems || [])
      .map((i) => i?.name)
      .filter(Boolean);

    // Friendly message format required by UI:
    // "{name} has placed order for {item name} for AED {price}"
    const message = `${customerName} has placed order for ${itemNames.join(", ")} for AED ${Number(
      prepared.totalPrice,
    ).toFixed(2)}`;

    await notifyRetailOrderPlacedAdmin(order, req.user._id, message);
    await notifyRetailOrderPlacedCustomer(order, req.user._id);

    res.status(201).json({
      success: true,
      message: "Order created successfully",
      orderId: order._id,
      order,
    });
  } catch (error) {
    console.error("POST /api/orders/retail error:", error);

    res.status(error.message?.includes("Payment") ? 400 : 500).json({
      success: false,
      message: error.message || "Failed to create order",
    });
  }
});

// This route is for getting only my orders means the logged-in user orders
orderRoutes.get("/retail/mine", isAuth, async (req, res) => {
  try {
    const orders = await RetailOrder.find({ userId: req.user._id })
      .sort({ createdAt: -1 })
      .select("_id createdAt status totalPrice currency orderItems");

    const formatted = orders.map((order) => ({
      id: order._id,
      date: order.createdAt,
      status: order.status,
      totalPrice: order.totalPrice,
      currency: order.currency,
      items:
        order.orderItems?.map((item) => ({
          name: item.name,
          image: item.image,
          size: item.size,
          price: item.price,
          quantity: item.quantity,
        })) || [],
    }));

    res.json({ success: true, orders: formatted });
  } catch (error) {
    console.error("GET /retail/mine error:", error);
    res
      .status(500)
      .json({ success: false, message: "Failed to fetch user orders" });
  }
});

// This Endpoint will be used to get the single order detail based on id
orderRoutes.get("/retail/:id", isAuth, async (req, res) => {
  try {
    const { id } = req.params;

    // validate id
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(404).json({
        success: false,
        message: "Invalid Order ID",
      });
    }

    const order = await RetailOrder.findById(id);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    // check the order ownership
    if (order.userId.toString() !== req.user._id && !req.user.isAdmin) {
      return res.status(403).json({
        success: false,
        message: "You are not allowed to view this order",
      });
    }

    res.json({
      success: true,
      order,
    });
  } catch (error) {
    console.error("GET /retail/:id error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch order",
    });
  }
});

// This route will fetch shipping fee from DB
orderRoutes.get(
  "/settings",
  expressAsyncHandler(async (req, res) => {
    // If the model has a custom static method like getSettings(), we use it, otherwise fallback to findOne
    let settings = await PlatformSettings.findOne({});

    // Safety check: If for some reason seed wasn't run, initialize a default configuration block
    if (!settings) {
      settings = await PlatformSettings.create({
        defaultDeliveryFee: 45,
        defaultTailoringFee: 150,
        platformFee: 0,
        vatRate: 0.05,
        currency: "AED",
      });
    }

    res.send(settings);
  }),
);

function requireCustomOrderStatus(order, allowed) {
  if (!allowed.includes(order.status)) {
    throw new PricingValidationError(
      `Order status must be one of: ${allowed.join(", ")}`,
    );
  }
}

orderRoutes.post("/custom/:id/return-request", isAuth, async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res
        .status(404)
        .json({ success: false, message: "Invalid order ID" });
    }

    const order = await CustomOrder.findById(id);
    if (!order) {
      return res
        .status(404)
        .json({ success: false, message: "Order not found" });
    }

    if (order.userId.toString() !== req.user._id && !req.user.isAdmin) {
      return res.status(403).json({
        success: false,
        message: "You are not allowed to modify this order",
      });
    }

    requireCustomOrderStatus(order, ["delivered"]);

    const {
      returnCondition,
      returnReason,
      returnComment,
      returnPickupAddress,
    } = req.body;

    if (!returnCondition || typeof returnCondition !== "string") {
      return res
        .status(400)
        .json({ success: false, message: "returnCondition is required" });
    }
    if (
      !returnReason ||
      typeof returnReason !== "string" ||
      !returnReason.trim()
    ) {
      return res
        .status(400)
        .json({ success: false, message: "returnReason is required" });
    }
    if (!returnPickupAddress || typeof returnPickupAddress !== "object") {
      return res
        .status(400)
        .json({ success: false, message: "returnPickupAddress is required" });
    }

    const normalizedReturnPickupAddress =
      normalizePickupAddress(returnPickupAddress);

    order.returnCondition = returnCondition;
    order.returnReason = returnReason;
    order.returnComment =
      typeof returnComment === "string" ? returnComment : "";
    order.returnPickupAddress = normalizedReturnPickupAddress;

    order.status = "return_requested";
    order.statusHistory = [
      ...(order.statusHistory || []),
      {
        status: "return_requested",
        note: "Return requested",
        changedAt: new Date(),
        changedBy: req.user._id,
      },
    ];

    await order.save();

    await Promise.all([
      notifyCustomReturnRequested(order, req.user._id),
      notifyCustomReturnReceivedByCustomer(order, req.user._id),
    ]);

    return res.json({ success: true, order });
  } catch (error) {
    if (error instanceof PricingValidationError) {
      return res.status(400).json({ success: false, message: error.message });
    }

    console.error("POST /api/orders/custom/:id/return-request error:", error);
    return res
      .status(500)
      .json({ success: false, message: "Failed to submit return request" });
  }
});

// Admin: Accept custom return request (creates customer dashboard notification)
// POST /api/admin/orders/custom/:id/return-accept
// 1. Approve return (return_requested → return_approved)
orderRoutes.post("/custom/:id/return-approve", isAuth, async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res
        .status(404)
        .json({ success: false, message: "Invalid order ID" });
    }

    if (!req.user?.isAdmin) {
      return res.status(403).json({ success: false, message: "Forbidden" });
    }

    const order = await CustomOrder.findById(id);
    if (!order) {
      return res
        .status(404)
        .json({ success: false, message: "Order not found" });
    }

    if (order.status !== "return_requested") {
      return res.status(400).json({
        success: false,
        message: `Return cannot be approved while order status is ${order.status}`,
      });
    }

    order.status = "return_approved";
    order.statusHistory = [
      ...(order.statusHistory || []),
      {
        status: "return_approved",
        note: "Return request approved by admin",
        changedAt: new Date(),
        changedBy: req.user._id,
      },
    ];
    await order.save();

    await notifyCustomReturnApproved(order, req.user._id);

    res.json({ success: true, order });
  } catch (error) {
    console.error(
      "POST /api/admin/orders/custom/:id/return-approve error:",
      error,
    );
    res.status(500).json({
      success: false,
      message: "Failed to approve return",
    });
  }
});

// 2. Process refund (return_approved → refund_processed)
orderRoutes.post("/custom/:id/refund-process", isAuth, async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res
        .status(404)
        .json({ success: false, message: "Invalid order ID" });
    }

    if (!req.user?.isAdmin) {
      return res.status(403).json({ success: false, message: "Forbidden" });
    }

    const order = await CustomOrder.findById(id);
    if (!order) {
      return res
        .status(404)
        .json({ success: false, message: "Order not found" });
    }

    if (order.status !== "return_approved") {
      return res.status(400).json({
        success: false,
        message: `Refund can only be processed when order status is return_approved, current: ${order.status}`,
      });
    }

    // Process actual refund logic here (payment gateway integration)
    // ...

    order.status = "refund_processed";
    order.statusHistory = [
      ...(order.statusHistory || []),
      {
        status: "refund_processed",
        note: "Refund processed successfully",
        changedAt: new Date(),
        changedBy: req.user._id,
      },
    ];
    await order.save();

    await notifyCustomRefundProcessed(order, req.user._id);

    res.json({ success: true, order });
  } catch (error) {
    console.error(
      "POST /api/admin/orders/custom/:id/refund-process error:",
      error,
    );
    res.status(500).json({
      success: false,
      message: "Failed to process refund",
    });
  }
});

// Customer: Mark order as received (out_for_delivery -> delivered)
// POST /api/orders/custom/:id/mark-received
orderRoutes.post("/custom/:id/mark-received", isAuth, async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res
        .status(404)
        .json({ success: false, message: "Invalid order ID" });
    }

    const order = await CustomOrder.findById(id);
    if (!order) {
      return res
        .status(404)
        .json({ success: false, message: "Order not found" });
    }

    if (order.userId.toString() !== req.user._id && !req.user.isAdmin) {
      return res.status(403).json({
        success: false,
        message: "You are not allowed to modify this order",
      });
    }

    // Customer can only move the order forward when it's currently out for delivery
    if (order.status !== "out_for_delivery") {
      return res.status(400).json({
        success: false,
        message: `Order cannot be marked received while status is ${order.status}`,
      });
    }

    order.status = "delivered";
    order.statusHistory = [
      ...(order.statusHistory || []),
      {
        status: "delivered",
        note: "Customer received",
        changedAt: new Date(),
        changedBy: req.user._id,
      },
    ];

    await order.save();

    // Notify customer about delivery completion
    await notifyCustomStatusChange(order, "delivered", req.user._id);

    return res.json({ success: true, order });
  } catch (error) {
    console.error("POST /api/orders/custom/:id/mark-received error:", error);
    return res
      .status(500)
      .json({ success: false, message: "Failed to mark order received" });
  }
});

// Admin: Reject custom return request (creates customer notification)
// POST /api/admin/orders/custom/:id/return-reject
orderRoutes.post("/custom/:id/return-reject", isAuth, async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res
        .status(404)
        .json({ success: false, message: "Invalid order ID" });
    }

    if (!req.user?.isAdmin) {
      return res.status(403).json({ success: false, message: "Forbidden" });
    }

    const order = await CustomOrder.findById(id);
    if (!order) {
      return res
        .status(404)
        .json({ success: false, message: "Order not found" });
    }

    // Only reject when a return was requested
    if (order.status !== "return_requested") {
      return res.status(400).json({
        success: false,
        message: `Return cannot be rejected while order status is ${order.status}`,
      });
    }

    order.status = "return_rejected";
    order.statusHistory = [
      ...(order.statusHistory || []),
      {
        status: "return_rejected",
        note: "Return request rejected by admin",
        changedAt: new Date(),
        changedBy: req.user._id,
      },
    ];
    await order.save();

    await notifyCustomReturnRejected(order, req.user._id);

    res.json({ success: true, order });
  } catch (error) {
    console.error(
      "POST /api/admin/orders/custom/:id/return-reject error:",
      error,
    );
    res
      .status(500)
      .json({ success: false, message: "Failed to reject return" });
  }
});

// NOTE: exports must remain at end
export default orderRoutes;