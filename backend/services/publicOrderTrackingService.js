import mongoose from "mongoose";
import RetailOrder from "../models/RetailOrder.js";
import CustomOrder from "../models/CustomOrder.js";
import {
  formatCustomOrderListItem,
  formatCustomerShipments,
  formatPublicAddress,
  formatRetailOrderListItem,
  formatStatusHistory,
} from "./orderCustomerFormat.js";
import { getCustomerPieceProgress } from "./shipmentService.js";
import {
  normalizePublicOrderId,
  parsePublicOrderId,
} from "./publicOrderId.js";
import { isPublicTrackingToken } from "./publicTrackingToken.js";
import { hydrateRetailOrders } from "./retailOrderHydrate.js";
import { normalizeEmail } from "./emailVerification/emailOccupancy.js";

const CUSTOM_POPULATE = [
  { path: "tailorShopId", select: "name nameAr slug" },
  { path: "items.tailorShopId", select: "name nameAr slug" },
  { path: "designId", select: "images" },
  { path: "fabricId", select: "images" },
  { path: "items.designId", select: "images" },
  { path: "items.fabricId", select: "images" },
];

const CUSTOM_SELECT =
  "publicOrderId createdAt status fabricSource designId fabricId designSnapshot fabricSnapshot fabricMeters leftoverMeters selectedCuts pricing tailorShopId items addons statusHistory shipments returnItems customerDeliveryAddress";

const RETAIL_SELECT =
  "publicOrderId createdAt status totalPrice currency orderItems itemsPrice shippingPrice vatAmount vatRate statusHistory shipments shippingAddress";

const OBJECT_ID_RE = /^[a-f0-9]{24}$/i;

function formatPublicCustomOrder(order) {
  const listItem = formatCustomOrderListItem(order);
  const items = (listItem.items || []).map((item) => {
    const piece = getCustomerPieceProgress(order, item.tailorShop?._id);
    return {
      ...item,
      tailorStatus: piece.tailorStatus,
      awaitingRestOfOrder: piece.awaitingRestOfOrder,
    };
  });

  return {
    ...listItem,
    items,
    statusHistory: formatStatusHistory(order.statusHistory),
    shipments: formatCustomerShipments(order.shipments),
    hasReturnItems:
      Array.isArray(order.returnItems) && order.returnItems.length > 0,
    deliveryAddress: formatPublicAddress(order.customerDeliveryAddress),
  };
}

function formatPublicRetailOrder(order) {
  return {
    ...formatRetailOrderListItem(order),
    deliveryAddress: formatPublicAddress(order.shippingAddress),
  };
}

async function loadCustomByQuery(query) {
  const custom = await CustomOrder.findOne(query)
    .select(CUSTOM_SELECT)
    .populate(CUSTOM_POPULATE);
  if (!custom) return null;
  return {
    orderType: "custom",
    order: formatPublicCustomOrder(custom),
  };
}

async function loadRetailByQuery(query) {
  const retail = await RetailOrder.findOne(query).select(RETAIL_SELECT);
  if (!retail) return null;
  const hydrated = await hydrateRetailOrders(retail);
  return {
    orderType: "retail",
    order: formatPublicRetailOrder(hydrated),
  };
}

export async function getPublicOrderByTrackingToken(token) {
  if (!isPublicTrackingToken(token)) {
    return null;
  }

  const custom = await loadCustomByQuery({ publicTrackingToken: token });
  if (custom) return custom;

  return loadRetailByQuery({ publicTrackingToken: token });
}

async function loadOrderByPublicId(normalized, extraQuery = {}) {
  const parsed = parsePublicOrderId(normalized);
  if (parsed?.orderType === "retail") {
    return loadRetailByQuery({ publicOrderId: normalized, ...extraQuery });
  }
  if (parsed?.orderType === "custom") {
    return loadCustomByQuery({ publicOrderId: normalized, ...extraQuery });
  }

  if (OBJECT_ID_RE.test(normalized) && mongoose.Types.ObjectId.isValid(normalized)) {
    const [custom, retail] = await Promise.all([
      loadCustomByQuery({ _id: normalized, ...extraQuery }),
      loadRetailByQuery({ _id: normalized, ...extraQuery }),
    ]);
    return custom || retail || null;
  }

  return null;
}

/**
 * Chatbot lookup by customer-facing Order ID (RO-/CO-) or legacy ObjectId.
 * Only returns an order owned by userId, so one customer cannot read another's.
 */
export async function getPublicOrderByPublicId(input, userId) {
  if (!userId) return null;

  const normalized = normalizePublicOrderId(input);
  if (!normalized) return null;

  return loadOrderByPublicId(normalized, { userId });
}

/**
 * Guest / anonymous chatbot lookup: Order ID + checkout contact email.
 * Same generic miss for wrong ID or wrong email (no enumeration).
 */
export async function getPublicOrderByPublicIdAndEmail(input, email) {
  const contactEmail = normalizeEmail(email);
  if (!contactEmail) return null;

  const normalized = normalizePublicOrderId(input);
  if (!normalized) return null;

  return loadOrderByPublicId(normalized, { contactEmail });
}
