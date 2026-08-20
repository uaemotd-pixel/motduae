import mongoose from "mongoose";
import CustomOrder, { FABRIC_SOURCES } from "../models/CustomOrder.js";
import Design from "../models/Design.js";
import Fabric from "../models/Fabric.js";
import TailorShop from "../models/TailorShop.js";
import AddOn from "../models/AddOn.js";
import {
  getCustomOrderPricing,
  getMultiItemCustomOrderPricing,
  applyAddonsToCustomOrderPricing,
  PricingValidationError,
} from "./pricingService.js";
import {
  notifyCustomOrderPlacedAdmin,
  notifyCustomOrderPlacedCustomer,
} from "./notificationService.js";
import { verifyStripePaymentIntent } from "./stripeService.js";
import { createConfirmedCustomShipments } from "./shipmentService.js";

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

async function deductFabricStock(fabricId, meters) {
  const fabric = await Fabric.findOne({ _id: fabricId, isActive: true });

  if (!fabric) {
    throw new PricingValidationError("fabric not found or is inactive");
  }

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

async function buildMultiItemOrderData(orderInput, deliveryType = "delivery", addonIds = []) {
  const { pricing, itemPricings } = await getMultiItemCustomOrderPricing({
    ...orderInput,
    deliveryType,
    addonIds,
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

async function getAddonsCost(addonIds = []) {
  if (!Array.isArray(addonIds) || addonIds.length === 0) return 0;
  const dbAddons = await AddOn.find({ _id: { $in: addonIds }, isActive: true });
  return dbAddons.reduce((sum, item) => sum + item.price, 0);
}

export async function getCustomOrderTotalFromBody(body) {
  const { deliveryType = "delivery", addonIds = [] } = body;

  if (deliveryType === "pickup") {
    throw new PricingValidationError(
      "Pickup is not supported; delivery is required",
    );
  }

  const addonsCost = await getAddonsCost(addonIds);

  if (isMultiItemPayload(body)) {
    const orderInput = validateMultiItemOrderInput(body);
    const { pricing } = await getMultiItemCustomOrderPricing({
      ...orderInput,
      deliveryType: "delivery",
      addonIds,
    });
    return applyAddonsToCustomOrderPricing(pricing, addonsCost).total;
  }

  const orderInput = validateFabricOrderInput(body);
  const pricing = await getCustomOrderPricing({
    ...orderInput,
    deliveryType: "delivery",
    addonIds,
  });
  return applyAddonsToCustomOrderPricing(pricing, addonsCost).total;
}

export async function findCustomOrderByPaymentIntent(paymentIntentId) {
  if (!paymentIntentId) return null;
  return CustomOrder.findOne({ stripePaymentIntentId: paymentIntentId });
}

async function attachInboundShipments(order, userId) {
  if (!order?._id) return order;
  const result = await createConfirmedCustomShipments(order, {
    changedBy: userId || null,
  });
  return result?.order || order;
}

export async function createPaidCustomOrder({
  userId,
  userName = "Customer",
  payload,
  paymentIntentId,
  paymentMethod,
}) {
  const existing = await findCustomOrderByPaymentIntent(paymentIntentId);
  if (existing) {
    const withShipments = await attachInboundShipments(existing, userId);
    return { order: withShipments, created: false };
  }

  const {
    designId,
    fabricSource,
    fabricId,
    fabricMeters,
    items,
    measurements,
    customerDeliveryAddress,
    pickupAddress,
    deliveryType = "delivery",
    addPocket = false,
    addBottomWideFold = false,
    addonIds = [],
    contactEmail = "",
  } = payload;

  if (deliveryType === "pickup") {
    throw new PricingValidationError(
      "Pickup is not supported; delivery is required",
    );
  }

  const orderTotal = await getCustomOrderTotalFromBody({
    ...payload,
    deliveryType: "delivery",
  });
  await verifyStripePaymentIntent({
    paymentIntentId,
    userId,
    orderType: "custom",
    expectedAmountAed: orderTotal,
  });

  const paymentDetails = {
    isPaid: true,
    paidAt: new Date(),
    stripePaymentIntentId: paymentIntentId,
  };

  const deliveryAddr = normalizeDeliveryAddress(customerDeliveryAddress);

  const normalizedPickupAddress = pickupAddress
    ? normalizePickupAddress(pickupAddress)
    : null;

  let dbAddons = [];
  let addonsCost = 0;
  if (addonIds && addonIds.length > 0) {
    dbAddons = await AddOn.find({ _id: { $in: addonIds }, isActive: true });
    addonsCost = dbAddons.reduce((sum, item) => sum + item.price, 0);
  }

  const addonDocs = dbAddons.map((a) => ({
    addonId: a._id,
    name: a.name,
    nameAr: a.nameAr,
    price: a.price,
    thumbnailImage: a.thumbnailImage,
  }));

  const confirmedAt = new Date();
  let order;

  try {
    if (isMultiItemPayload(payload)) {
      const orderInput = validateMultiItemOrderInput({ fabricSource, items });
      const { pricing, orderItems, legacyFields } =
        await buildMultiItemOrderData(orderInput, "delivery", addonIds);

      // Self fabric: customer address is the Shipa fabric pickup origin
      const selfPickupAddress =
        orderInput.fabricSource === "self"
          ? normalizedPickupAddress || deliveryAddr
          : null;

      Object.assign(
        pricing,
        applyAddonsToCustomOrderPricing(pricing, addonsCost),
      );

      order = await CustomOrder.create({
        userId,
        fabricSource: orderInput.fabricSource,
        ...legacyFields,
        items: orderItems,
        measurements: measurements || {},
        customerDeliveryAddress: deliveryAddr,
        contactEmail: String(contactEmail || "").toLowerCase().trim(),
        pickupAddress: selfPickupAddress,
        status: "confirmed",
        statusHistory: [
          {
            status: "confirmed",
            note: "Order confirmed",
            changedAt: confirmedAt,
            changedBy: userId,
          },
        ],
        pricing,
        paymentMethod,
        addPocket,
        addBottomWideFold,
        addons: addonDocs,
        ...paymentDetails,
      });
    } else {
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

      if (orderInput.fabricSource === "storefront") {
        fabric = await deductFabricStock(
          orderInput.fabricId,
          orderInput.fabricMeters,
        );
      }

      const pricing = await getCustomOrderPricing({
        ...orderInput,
        deliveryType: "delivery",
        addonIds,
      });

      Object.assign(
        pricing,
        applyAddonsToCustomOrderPricing(pricing, addonsCost),
      );

      const selfPickupAddress =
        orderInput.fabricSource === "self"
          ? normalizedPickupAddress || deliveryAddr
          : null;

      order = await CustomOrder.create({
        userId,
        fabricSource: orderInput.fabricSource,
        fabricId: fabric?._id ?? null,
        fabricStoreId: fabric?.listedByStore ?? null,
        fabricSnapshot: fabric ? buildFabricSnapshot(fabric) : null,
        fabricMeters: orderInput.fabricMeters,
        tailorShopId: shop._id,
        designId: design._id,
        designSnapshot: buildDesignSnapshot(design),
        measurements: measurements || {},
        customerDeliveryAddress: deliveryAddr,
        contactEmail: String(contactEmail || "").toLowerCase().trim(),
        pickupAddress: selfPickupAddress,
        status: "confirmed",
        statusHistory: [
          {
            status: "confirmed",
            note: "Order confirmed",
            changedAt: confirmedAt,
            changedBy: userId,
          },
        ],
        pricing,
        paymentMethod,
        addPocket,
        addBottomWideFold,
        addons: addonDocs,
        ...paymentDetails,
      });
    }
  } catch (error) {
    if (error?.code === 11000) {
      const raced = await findCustomOrderByPaymentIntent(paymentIntentId);
      if (raced) {
        const withShipments = await attachInboundShipments(raced, userId);
        return { order: withShipments, created: false };
      }
    }
    throw error;
  }

  const itemNames = (order.items || [])
    .map((it) => {
      const designName = it?.designSnapshot?.name;
      const fabricName = it?.fabricSnapshot?.name;
      return [designName ? `Design: ${designName}` : null, fabricName ? `Fabric: ${fabricName}` : null]
        .filter(Boolean)
        .join(" • ");
    })
    .filter(Boolean);
  const itemNameText =
    itemNames.length > 0
      ? itemNames.join(", ")
      : order.designSnapshot?.name || "Custom item";
  const message = `${userName} has placed order for ${itemNameText} for AED ${Number(
    order.pricing?.total ?? 0,
  ).toFixed(2)}`;

  await notifyCustomOrderPlacedAdmin(order, userId, message);
  await notifyCustomOrderPlacedCustomer(order, userId);

  const withShipments = await attachInboundShipments(order, userId);
  return { order: withShipments, created: true };
}
