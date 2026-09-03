import mongoose from "mongoose";
import CustomOrder, { FABRIC_SOURCES } from "../models/CustomOrder.js";
import Design from "../models/Design.js";
import Fabric from "../models/Fabric.js";
import Cut from "../models/Cut.js";
import TailorShop from "../models/TailorShop.js";
import AddOn from "../models/AddOn.js";
import { cutValueToMeters } from "../utils/fabricUnits.js";
import { deductFabricCutStock } from "../utils/fabricCuts.js";
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
import {
  createPublicTrackingToken,
  isPublicTrackingTokenCollision,
} from "./publicTrackingToken.js";
import { sendPaidOrderPlacedEmail } from "./orderPlacedEmail.js";
import { notifyPaidOrderVendors } from "./vendorOrderNotify.js";

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
  cutId,
  cutIds,
  cutSelections,
  selectedCuts,
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

  /** @type {{ cutId: string, quantity: number }[]} */
  let resolvedSelections = [];

  if (Array.isArray(selectedCuts) && selectedCuts.length > 0) {
    const merged = new Map();
    for (const entry of selectedCuts) {
      const id =
        entry && typeof entry === "object"
          ? String(entry.cutId || entry._id || "")
          : String(entry || "");
      if (!id || !mongoose.Types.ObjectId.isValid(id)) continue;
      merged.set(id, (merged.get(id) || 0) + 1);
    }
    resolvedSelections = Array.from(merged.entries()).map(
      ([id, quantity]) => ({ cutId: id, quantity }),
    );
  } else if (Array.isArray(cutSelections) && cutSelections.length > 0) {
    const merged = new Map();
    for (const entry of cutSelections) {
      const id =
        entry?.cutId && mongoose.Types.ObjectId.isValid(entry.cutId)
          ? String(entry.cutId)
          : "";
      const qty = Math.floor(Number(entry?.quantity));
      if (!id || !Number.isFinite(qty) || qty <= 0) continue;
      merged.set(id, (merged.get(id) || 0) + qty);
    }
    resolvedSelections = Array.from(merged.entries()).map(
      ([id, quantity]) => ({ cutId: id, quantity }),
    );
  } else if (Array.isArray(cutIds) && cutIds.length > 0) {
    const merged = new Map();
    for (const id of cutIds) {
      if (!mongoose.Types.ObjectId.isValid(id)) continue;
      const key = String(id);
      merged.set(key, (merged.get(key) || 0) + 1);
    }
    resolvedSelections = Array.from(merged.entries()).map(
      ([id, quantity]) => ({ cutId: id, quantity }),
    );
  } else if (cutId && mongoose.Types.ObjectId.isValid(cutId)) {
    resolvedSelections = [{ cutId: String(cutId), quantity: 1 }];
  }

  const expandedCutIds = [];
  for (const { cutId: id, quantity } of resolvedSelections) {
    for (let i = 0; i < quantity; i += 1) {
      expandedCutIds.push(id);
    }
  }

  return {
    designId,
    fabricSource,
    fabricId: fabricSource === "storefront" ? fabricId : null,
    fabricMeters: parseFabricMeters(fabricMeters),
    cutId: resolvedSelections[0]?.cutId || null,
    cutIds: expandedCutIds,
    cutSelections: resolvedSelections,
    selectedCuts: Array.isArray(selectedCuts) ? selectedCuts : null,
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
        cutId: item.cutId,
        cutIds: item.cutIds,
        cutSelections: item.cutSelections,
        selectedCuts: item.selectedCuts,
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
    estimatedMeters:
      design.minCutSnapshot?.lengthInMeters ?? design.estimatedMeters,
    minCutId: design.minCutId || null,
    minCutSnapshot: design.minCutSnapshot || null,
  };
}

function buildCutSnapshot(cut, fabric = null) {
  const lengthInMeters = cutValueToMeters(cut.value, cut.unit);
  let price = 0;
  if (fabric && Array.isArray(fabric.cuts)) {
    const fabricCut = fabric.cuts.find(
      (entry) => String(entry.cutId?._id || entry.cutId) === String(cut._id),
    );
    if (fabricCut) {
      price = Number(fabricCut.price) || 0;
    }
  }
  return {
    cutId: cut._id,
    name: cut.name,
    nameAr: cut.nameAr || "",
    value: cut.value,
    unit: cut.unit,
    lengthInMeters,
    price,
  };
}

async function resolveCutForOrderItem(itemInput, fabric = null) {
  const resolvedSelections =
    Array.isArray(itemInput.selectedCuts) && itemInput.selectedCuts.length > 0
      ? (() => {
          const merged = new Map();
          for (const entry of itemInput.selectedCuts) {
            const id =
              entry && typeof entry === "object"
                ? String(entry.cutId || entry._id || "")
                : String(entry || "");
            if (!id || !mongoose.Types.ObjectId.isValid(id)) continue;
            merged.set(id, (merged.get(id) || 0) + 1);
          }
          return Array.from(merged.entries()).map(([cutId, quantity]) => ({
            cutId,
            quantity,
          }));
        })()
      : Array.isArray(itemInput.cutSelections) && itemInput.cutSelections.length > 0
        ? itemInput.cutSelections
        : Array.isArray(itemInput.cutIds) && itemInput.cutIds.length > 0
          ? (() => {
              const merged = new Map();
              for (const id of itemInput.cutIds) {
                const key = String(id);
                merged.set(key, (merged.get(key) || 0) + 1);
              }
              return Array.from(merged.entries()).map(([cutId, quantity]) => ({
                cutId,
                quantity,
              }));
            })()
          : itemInput.cutId
            ? [{ cutId: String(itemInput.cutId), quantity: 1 }]
            : [];

  if (resolvedSelections.length === 0) {
    return {
      cutId: null,
      cutIds: [],
      cutSelections: [],
      cutSnapshot: null,
      cutSnapshots: [],
      selectedCuts: [],
    };
  }

  const snapshots = [];
  const expandedCutIds = [];
  let totalMeters = 0;

  for (const { cutId: id, quantity } of resolvedSelections) {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new PricingValidationError("Valid cutId is required when provided");
    }

    const cut = await Cut.findById(id);
    if (!cut || !cut.isActive) {
      throw new PricingValidationError("cut not found or is inactive");
    }

    const qty = Math.max(1, Math.floor(Number(quantity) || 1));
    totalMeters += cutValueToMeters(cut.value, cut.unit) * qty;
    const snapshot = buildCutSnapshot(cut, fabric);
    for (let i = 0; i < qty; i += 1) {
      expandedCutIds.push(String(cut._id));
      snapshots.push(snapshot);
    }
  }

  if (Math.abs(Number(totalMeters.toFixed(2)) - itemInput.fabricMeters) > 0.02) {
    throw new PricingValidationError(
      "fabricMeters does not match the selected cut(s)",
    );
  }

  return {
    cutId: expandedCutIds[0],
    cutIds: expandedCutIds,
    cutSelections: resolvedSelections,
    cutSnapshot: snapshots[0] || null,
    cutSnapshots: snapshots,
    selectedCuts: snapshots,
  };
}

async function deductStorefrontFabricPiece(fabricId, cutId, qty = 1) {
  if (!cutId) {
    throw new PricingValidationError(
      "cutId is required for storefront fabric purchase",
    );
  }

  const result = await deductFabricCutStock(fabricId, cutId, qty);
  if (!result.ok) {
    throw new PricingValidationError(result.message);
  }

  return result.fabric;
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

    const selections =
      Array.isArray(item.selectedCuts) && item.selectedCuts.length > 0
        ? (() => {
            const merged = new Map();
            for (const entry of item.selectedCuts) {
              const id =
                entry && typeof entry === "object"
                  ? String(entry.cutId || entry._id || "")
                  : String(entry || "");
              if (!id) continue;
              merged.set(id, (merged.get(id) || 0) + 1);
            }
            return Array.from(merged.entries()).map(([cutId, quantity]) => ({
              cutId,
              quantity,
            }));
          })()
        : Array.isArray(item.cutSelections) && item.cutSelections.length > 0
          ? item.cutSelections
          : Array.isArray(item.cutIds) && item.cutIds.length > 0
            ? (() => {
                const merged = new Map();
                for (const id of item.cutIds) {
                  const key = String(id);
                  merged.set(key, (merged.get(key) || 0) + 1);
                }
                return Array.from(merged.entries()).map(([cutId, quantity]) => ({
                  cutId,
                  quantity,
                }));
              })()
            : item.cutId
              ? [{ cutId: String(item.cutId), quantity: 1 }]
              : [];

    for (const { cutId, quantity } of selections) {
      const key = `${item.fabricId}::${cutId}`;
      const existing = fabricDeductions.get(key);
      const pieces = Math.max(1, Math.floor(Number(quantity) || 1));
      if (existing) {
        existing.pieces += pieces;
      } else {
        fabricDeductions.set(key, {
          fabricId: item.fabricId,
          cutId,
          pieces,
        });
      }
    }
  }

  const fabricDocs = new Map();

  for (const { fabricId, cutId, pieces } of fabricDeductions.values()) {
    if (!cutId) {
      throw new PricingValidationError(
        "cutId is required for storefront fabric purchase",
      );
    }

    const result = await deductFabricCutStock(fabricId, cutId, pieces);
    if (!result.ok) {
      throw new PricingValidationError(result.message);
    }
    fabricDocs.set(String(fabricId), result.fabric);
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

    const cutData = await resolveCutForOrderItem(itemInput, fabric);
    const designMinLength = design.minCutSnapshot?.lengthInMeters || design.estimatedMeters || 0;
    const leftoverMeters =
      orderInput.fabricSource === "storefront" && itemInput.fabricMeters > designMinLength && designMinLength > 0
        ? Number((itemInput.fabricMeters - designMinLength).toFixed(2))
        : 0;

    orderItems.push({
      designId: design._id,
      designSnapshot: buildDesignSnapshot(design),
      tailorShopId: shop._id,
      fabricId: fabric?._id ?? null,
      fabricStoreId: fabric?.listedByStore ?? null,
      fabricSnapshot: fabric ? buildFabricSnapshot(fabric) : null,
      fabricMeters: itemInput.fabricMeters,
      ...cutData,
      leftoverMeters,
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
      selectedCuts: firstItem?.selectedCuts || [],
      leftoverMeters: orderItems.reduce(
        (sum, item) => sum + (item.leftoverMeters || 0),
        0,
      ),
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

async function createCustomOrderWithTrackingToken(fields) {
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      return await CustomOrder.create({
        ...fields,
        publicTrackingToken: createPublicTrackingToken(),
      });
    } catch (error) {
      if (isPublicTrackingTokenCollision(error) && attempt === 0) continue;
      throw error;
    }
  }
  throw new Error("Failed to persist custom order tracking token");
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
    await notifyPaidOrderVendors(withShipments, "custom");
    return { order: withShipments, created: false };
  }

  const {
    designId,
    fabricSource,
    fabricId,
    fabricMeters,
    cutId,
    items,
    measurements,
    customerDeliveryAddress,
    pickupAddress,
    deliveryType = "delivery",
    addPocket = false,
    addBottomWideFold = false,
    addonIds = [],
    contactEmail = "",
    selectedCuts,
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

      order = await createCustomOrderWithTrackingToken({
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
        cutId,
        cutIds: payload.cutIds,
        cutSelections: payload.cutSelections,
        selectedCuts,
      });

      const { design, shop } = await loadDesignWithApprovedShop(
        orderInput.designId,
      );

      let fabric = null;
      let cutFields = {
        cutId: null,
        cutIds: [],
        cutSelections: [],
        cutSnapshot: null,
        cutSnapshots: [],
        selectedCuts: [],
      };

      if (orderInput.fabricSource === "storefront") {
        for (const { cutId: id, quantity } of orderInput.cutSelections) {
          const result = await deductFabricCutStock(
            orderInput.fabricId,
            id,
            quantity,
          );
          if (!result.ok) {
            throw new PricingValidationError(result.message);
          }
          fabric = result.fabric;
        }
        if (!fabric) {
          fabric = await Fabric.findById(orderInput.fabricId);
        }
        cutFields = await resolveCutForOrderItem(orderInput, fabric);
      }

      const designMinLength =
        design.minCutSnapshot?.lengthInMeters || design.estimatedMeters || 0;
      const leftoverMeters =
        orderInput.fabricSource === "storefront" &&
        orderInput.fabricMeters > designMinLength &&
        designMinLength > 0
          ? Number((orderInput.fabricMeters - designMinLength).toFixed(2))
          : 0;

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

      order = await createCustomOrderWithTrackingToken({
        userId,
        fabricSource: orderInput.fabricSource,
        fabricId: fabric?._id ?? null,
        fabricStoreId: fabric?.listedByStore ?? null,
        fabricSnapshot: fabric ? buildFabricSnapshot(fabric) : null,
        fabricMeters: orderInput.fabricMeters,
        ...cutFields,
        leftoverMeters,
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
        await notifyPaidOrderVendors(withShipments, "custom");
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
  await sendPaidOrderPlacedEmail({
    order,
    userId,
    orderType: "custom",
  });
  await notifyPaidOrderVendors(order, "custom");

  const withShipments = await attachInboundShipments(order, userId);
  return { order: withShipments, created: true };
}
