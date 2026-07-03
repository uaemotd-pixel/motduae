import express from "express";
import expressAsyncHandler from "express-async-handler";
import mongoose from "mongoose";
import RetailOrder from "../models/RetailOrder.js";
import ReadyMadeProduct from "../models/ReadyMadeProduct.js";
import CustomOrder, {
  FABRIC_SOURCES,
  PAYMENT_METHODS,
} from "../models/CustomOrder.js";
import Design from "../models/Design.js";
import Fabric from "../models/Fabric.js";
import TailorShop from "../models/TailorShop.js";
import { isAuth } from "../middleware/auth.js";
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

function formatDesignSummary(snapshot) {
  if (!snapshot) return null;

  return {
    name: snapshot.name,
    nameAr: snapshot.nameAr || "",
    slug: snapshot.slug || "",
    category: snapshot.category || "",
  };
}

function formatFabricSummary(snapshot) {
  if (!snapshot) return null;

  return {
    name: snapshot.name,
    nameAr: snapshot.nameAr || "",
    material: snapshot.material || "",
  };
}

function formatCustomOrderLineItems(order) {
  if (Array.isArray(order.items) && order.items.length > 0) {
    return order.items.map((item) => ({
      design: formatDesignSummary(item.designSnapshot),
      fabric: formatFabricSummary(item.fabricSnapshot),
      fabricMeters: item.fabricMeters,
      tailorShop: formatTailorShopSummary(item.tailorShopId),
    }));
  }

  if (!order.designSnapshot) return [];

  return [
    {
      design: formatDesignSummary(order.designSnapshot),
      fabric: formatFabricSummary(order.fabricSnapshot),
      fabricMeters: order.fabricMeters,
      tailorShop: formatTailorShopSummary(order.tailorShopId),
    },
  ];
}

async function deductFabricStock(fabricId, meters) {
  const fabric = await Fabric.findById(fabricId);

  if (!fabric || !fabric.isActive) {
    throw new PricingValidationError("fabric not found");
  }

  if (fabric.stockInMeters < meters) {
    throw new PricingValidationError(
      `Insufficient fabric stock for ${fabric.name}. Available: ${fabric.stockInMeters} meters.`,
    );
  }

  fabric.stockInMeters -= meters;
  if (fabric.stockInMeters === 0) {
    fabric.isActive = false;
  }
  await fabric.save();

  return fabric;
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
  const { deliveryType = "delivery" } = body;

  if (isMultiItemPayload(body)) {
    const orderInput = validateMultiItemOrderInput(body);
    const { pricing } = await getMultiItemCustomOrderPricing({
      ...orderInput,
      deliveryType,
    });
    return pricing.total;
  }

  const orderInput = validateFabricOrderInput(body);
  const pricing = await getCustomOrderPricing({
    ...orderInput,
    deliveryType,
  });
  return pricing.total;
}

orderRoutes.post("/custom/preview", async (req, res) => {
  try {
    const { deliveryType = "delivery" } = req.body;

    if (isMultiItemPayload(req.body)) {
      const orderInput = validateMultiItemOrderInput(req.body);
      const { pricing } = await getMultiItemCustomOrderPricing({
        ...orderInput,
        deliveryType,
      });

      return res.json({
        success: true,
        pricing,
      });
    }

    const orderInput = validateFabricOrderInput(req.body);
    const pricing = await getCustomOrderPricing({
      ...orderInput,
      deliveryType,
    });

    res.json({
      success: true,
      pricing,
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
      paymentMethod = "apple_pay",
      deliveryType = "delivery",
      addPocket = false,
      addBottomWideFold = false,
      paymentIntentId,
    } = req.body;

    if (!PAYMENT_METHODS.includes(paymentMethod)) {
      return res.status(400).json({
        success: false,
        message: `paymentMethod must be one of: ${PAYMENT_METHODS.join(", ")}`,
      });
    }

    if (paymentMethod !== "apple_pay") {
      return res.status(400).json({
        success: false,
        message: "Only Apple Pay is accepted",
      });
    }

    if (!isStripeConfigured()) {
      return res.status(503).json({
        success: false,
        message: "Apple Pay is not configured",
      });
    }

    if (!paymentIntentId) {
      return res.status(400).json({
        success: false,
        message: "paymentIntentId is required",
      });
    }

    const orderTotal = await getCustomOrderTotalFromBody(req.body);
    await verifyApplePayPaymentIntent({
      paymentIntentId,
      userId: req.user._id,
      orderType: "custom",
      expectedAmountAed: orderTotal,
    });

    // Build conditional address based on deliveryType
    const deliveryAddr =
      deliveryType === "delivery"
        ? normalizeDeliveryAddress(customerDeliveryAddress)
        : null;

    // Normalize pickup address if provided
    const normalizedPickupAddress = pickupAddress
      ? normalizePickupAddress(pickupAddress)
      : null;

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
        status: "pending",
        statusHistory: [
          {
            status: "pending",
            note: "Order placed",
            changedAt: new Date(),
            changedBy: req.user._id,
          },
        ],
        pricing,
        paymentMethod,
        addPocket,
        addBottomWideFold,
        isPaid: true,
        paidAt: new Date(),
        stripePaymentIntentId: paymentIntentId,
      });

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
      status: "pending",
      statusHistory: [
        {
          status: "pending",
          note: "Order placed",
          changedAt: new Date(),
          changedBy: req.user._id,
        },
      ],
      pricing,
      paymentMethod,
      addPocket,
      addBottomWideFold,
      isPaid: true,
      paidAt: new Date(),
      stripePaymentIntentId: paymentIntentId,
    });

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
      .select(
        "_id createdAt status fabricSource designSnapshot fabricSnapshot fabricMeters pricing tailorShopId userId items",
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
    const { orderItems, shippingAddress, paymentIntentId } = req.body;

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

    if (!isStripeConfigured()) {
      return res.status(503).json({
        success: false,
        message: "Apple Pay is not configured",
      });
    }

    if (!paymentIntentId) {
      return res.status(400).json({
        success: false,
        message: "paymentIntentId is required",
      });
    }

    const prepared = await prepareRetailOrder(orderItems);

    await verifyApplePayPaymentIntent({
      paymentIntentId,
      userId: req.user._id,
      orderType: "retail",
      expectedAmountAed: prepared.totalPrice,
    });

    const order = await RetailOrder.create({
      userId: req.user._id,
      orderItems: prepared.finalOrderItems,
      shippingAddress,
      paymentMethod: "apple_pay",
      itemsPrice: prepared.itemsPrice,
      shippingPrice: prepared.shippingPrice,
      vatRate: prepared.vatRate,
      vatAmount: prepared.vatAmount,
      totalPrice: prepared.totalPrice,
      status: "confirmed",
      isPaid: true,
      paidAt: new Date(),
      stripePaymentIntentId: paymentIntentId,
    });

    await deductRetailProductStock(orderItems);

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

export default orderRoutes;
