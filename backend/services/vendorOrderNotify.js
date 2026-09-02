import mongoose from "mongoose";
import { env } from "../config/env.js";
import TailorShop from "../models/TailorShop.js";
import FabricShop from "../models/FabricShop.js";
import User from "../models/User.js";
import { EMAIL_EVENTS } from "./email/emailEvents.js";
import { sendVendorOrderPlacedEmail } from "./emailService.js";
import { notifyVendorOrderPlaced } from "./notificationService.js";

const OBJECT_ID_RE = /^[a-f0-9]{24}$/i;

function idStr(value) {
  if (value == null || value === "") return "";
  if (typeof value === "object") {
    if (value._id != null) return String(value._id);
  }
  return String(value);
}

function isValidId(value) {
  const id = idStr(value);
  return OBJECT_ID_RE.test(id) && mongoose.Types.ObjectId.isValid(id);
}

export function shortOrderId(id) {
  return String(id || "").slice(-8).toUpperCase();
}

function formatAmount(value) {
  const num = Number(value);
  if (!Number.isFinite(num) || num <= 0) return "";
  if (Number.isInteger(num)) return String(num);
  return String(Math.round(num * 100) / 100);
}

export function formatVendorLineLabel({ name, meters, quantity } = {}) {
  const label = String(name || "").trim();
  if (!label) return "";
  const metersLabel = formatAmount(meters);
  if (metersLabel) return `${label} · ${metersLabel} m`;
  const qtyLabel = formatAmount(quantity);
  if (qtyLabel) return `${label} · qty ${qtyLabel}`;
  return label;
}

function uniqueLabels(lines) {
  const seen = new Set();
  const out = [];
  for (const line of lines) {
    const label = typeof line === "string" ? line : line?.label;
    if (!label || seen.has(label)) continue;
    seen.add(label);
    out.push({ label });
  }
  return out;
}

function frontendOrigin() {
  return String(env.frontendUrl || "").replace(/\/+$/, "");
}

export function vendorOrdersPortalUrl(portalKind) {
  const origin = frontendOrigin();
  if (!origin) return "";
  const base = portalKind === "fabric" ? "/en/fabric" : "/en/tailor";
  return `${origin}${base}/orders`;
}

function isEligibleOwner(user, expectedRole) {
  if (!user) return false;
  if (user.role !== expectedRole) return false;
  if (user.approvalStatus !== "approved") return false;
  if (user.isActive === false) return false;
  return true;
}

function isActiveShop(shop) {
  return Boolean(shop) && shop.isActive !== false;
}

function customLineItems(order) {
  if (Array.isArray(order?.items) && order.items.length > 0) {
    return order.items;
  }
  return [
    {
      tailorShopId: order?.tailorShopId,
      fabricStoreId: order?.fabricStoreId,
      designSnapshot: order?.designSnapshot,
      fabricSnapshot: order?.fabricSnapshot,
      fabricMeters: order?.fabricMeters,
    },
  ];
}

function groupByKey(entries, keyFn) {
  const groups = new Map();
  for (const entry of entries) {
    const key = keyFn(entry);
    if (!key) continue;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(entry);
  }
  return groups;
}

async function loadUsersById(ids) {
  const unique = [...new Set(ids.filter(isValidId).map(idStr))];
  if (!unique.length) return new Map();
  const users = await User.find({ _id: { $in: unique } })
    .select("_id name email role approvalStatus isActive")
    .lean();
  return new Map(users.map((user) => [idStr(user._id), user]));
}

async function resolveCustomTailorRecipients(order) {
  const items = customLineItems(order);
  const grouped = groupByKey(items, (item) =>
    isValidId(item?.tailorShopId) ? idStr(item.tailorShopId) : "",
  );
  if (!grouped.size) return [];

  const shops = await TailorShop.find({ _id: { $in: [...grouped.keys()] } })
    .select("_id ownerId isActive")
    .lean();
  const shopById = new Map(shops.map((shop) => [idStr(shop._id), shop]));
  const users = await loadUsersById(shops.map((shop) => shop.ownerId));

  const recipients = [];
  for (const [shopId, shopItems] of grouped) {
    const shop = shopById.get(shopId);
    if (!isActiveShop(shop) || !isValidId(shop.ownerId)) continue;
    const user = users.get(idStr(shop.ownerId));
    if (!isEligibleOwner(user, "tailor")) continue;

    const lines = uniqueLabels(
      shopItems.map((item) =>
        formatVendorLineLabel({
          name: item?.designSnapshot?.name,
          meters: item?.fabricMeters,
        }),
      ),
    );
    if (!lines.length) continue;

    recipients.push({
      event: EMAIL_EVENTS.ORDER_CUSTOM_PLACED_TAILOR,
      portalKind: "tailor",
      notifyType: "tailor_order_placed",
      notifyTitle: "New custom order",
      notifyDedupePrefix: "tailor:order_placed",
      user,
      lines,
    });
  }
  return recipients;
}

async function resolveCustomFabricRecipients(order) {
  if (order?.fabricSource !== "storefront") return [];

  const items = customLineItems(order);
  const grouped = groupByKey(items, (item) =>
    isValidId(item?.fabricStoreId) ? idStr(item.fabricStoreId) : "",
  );
  if (!grouped.size) return [];

  const ownerIds = [...grouped.keys()];
  const shops = await FabricShop.find({ ownerId: { $in: ownerIds } })
    .select("_id ownerId isActive")
    .lean();
  const shopByOwner = new Map(shops.map((shop) => [idStr(shop.ownerId), shop]));
  const users = await loadUsersById(ownerIds);

  const recipients = [];
  for (const [ownerId, shopItems] of grouped) {
    const shop = shopByOwner.get(ownerId);
    if (!isActiveShop(shop)) continue;
    const user = users.get(ownerId);
    if (!isEligibleOwner(user, "fabric_store")) continue;

    const lines = uniqueLabels(
      shopItems.map((item) =>
        formatVendorLineLabel({
          name: item?.fabricSnapshot?.name,
          meters: item?.fabricMeters,
        }),
      ),
    );
    if (!lines.length) continue;

    recipients.push({
      event: EMAIL_EVENTS.ORDER_CUSTOM_PLACED_FABRIC,
      portalKind: "fabric",
      notifyType: "fabric_order_placed",
      notifyTitle: "New custom order",
      notifyDedupePrefix: "fabric:order_placed",
      user,
      lines,
    });
  }
  return recipients;
}

async function resolveRetailFabricRecipients(order) {
  const items = Array.isArray(order?.orderItems) ? order.orderItems : [];
  const grouped = groupByKey(items, (item) =>
    isValidId(item?.fabricShopId) ? idStr(item.fabricShopId) : "",
  );
  if (!grouped.size) return [];

  const shops = await FabricShop.find({ _id: { $in: [...grouped.keys()] } })
    .select("_id ownerId isActive")
    .lean();
  const shopById = new Map(shops.map((shop) => [idStr(shop._id), shop]));
  const users = await loadUsersById(shops.map((shop) => shop.ownerId));

  const recipients = [];
  for (const [shopId, shopItems] of grouped) {
    const shop = shopById.get(shopId);
    if (!isActiveShop(shop) || !isValidId(shop.ownerId)) continue;
    const user = users.get(idStr(shop.ownerId));
    if (!isEligibleOwner(user, "fabric_store")) continue;

    const lines = uniqueLabels(
      shopItems.map((item) =>
        formatVendorLineLabel({
          name: item?.name,
          meters: item?.quantityInMeters,
          quantity: item?.quantityInMeters ? undefined : item?.quantity,
        }),
      ),
    );
    if (!lines.length) continue;

    recipients.push({
      event: EMAIL_EVENTS.ORDER_RETAIL_PLACED_FABRIC,
      portalKind: "fabric",
      notifyType: "fabric_retail_order_placed",
      notifyTitle: "New store order",
      notifyDedupePrefix: "fabric:retail_order_placed",
      user,
      lines,
    });
  }
  return recipients;
}

export async function resolveVendorRecipients(order, orderType) {
  if (!order?._id) return [];
  if (orderType === "custom") {
    const [tailors, fabrics] = await Promise.all([
      resolveCustomTailorRecipients(order),
      resolveCustomFabricRecipients(order),
    ]);
    return [...tailors, ...fabrics];
  }
  if (orderType === "retail") {
    return resolveRetailFabricRecipients(order);
  }
  return [];
}

function bellMessage(shortId, lines) {
  const idLabel = shortId ? `#${shortId}` : "";
  const headers = idLabel
    ? `Paid order ${idLabel}. Please prepare:`
    : "Paid order. Please prepare:";
  const body = (lines || [])
    .map((line) => line?.label)
    .filter(Boolean)
    .map((label) => `• ${label}`)
    .join("\n");
  return body ? `${headers}\n${body}` : headers;
}

async function sendVendorMail(recipient) {
  const to = String(recipient.user?.email || "").trim();
  if (!to) return;
  await sendVendorOrderPlacedEmail({
    event: recipient.event,
    to,
    name: recipient.user?.name || "Partner",
    userId: recipient.user._id,
    orderId: recipient.orderId,
    orderType: recipient.orderType,
    shortOrderId: recipient.shortOrderId,
    portalKind: recipient.portalKind,
    portalUrl: recipient.portalUrl,
    lines: recipient.lines.map((line) => line.label),
  });
}

async function sendVendorBell(recipient) {
  await notifyVendorOrderPlaced({
    type: recipient.notifyType,
    title: recipient.notifyTitle,
    message: bellMessage(recipient.shortOrderId, recipient.lines),
    recipientUserId: recipient.user._id,
    orderType: recipient.orderType,
    orderId: recipient.orderId,
    dedupeKey: `${recipient.notifyDedupePrefix}:${recipient.orderId}:${recipient.user._id}`,
  });
}

async function notifyOneVendor(recipient) {
  await sendVendorMail(recipient).catch((error) => {
    console.error(
      "Vendor order email failed:",
      error?.message || error,
      recipient.event,
      idStr(recipient.user?._id),
    );
  });
  await sendVendorBell(recipient).catch((error) => {
    console.error(
      "Vendor order notification failed:",
      error?.message || error,
      recipient.notifyType,
      idStr(recipient.user?._id),
    );
  });
}

/**
 * Soft fan-out: never throws. Safe on payment-intent replay (email + notify dedupe).
 */
export async function notifyPaidOrderVendors(order, orderType) {
  try {
    if (!order?._id || (orderType !== "custom" && orderType !== "retail")) {
      return;
    }
    const resolved = await resolveVendorRecipients(order, orderType);
    const shortId = shortOrderId(order._id);
    const recipients = resolved.map((recipient) => ({
      ...recipient,
      orderId: order._id,
      orderType,
      shortOrderId: shortId,
      portalUrl: vendorOrdersPortalUrl(recipient.portalKind),
    }));
    await Promise.all(recipients.map((recipient) => notifyOneVendor(recipient)));
  } catch (error) {
    console.error("Vendor order notify failed:", error?.message || error);
  }
}
