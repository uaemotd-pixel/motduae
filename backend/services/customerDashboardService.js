import CustomOrder from "../models/CustomOrder.js";
import RetailOrder from "../models/RetailOrder.js";
import Customer from "../models/customer.js";
import {
  buildCustomerNotificationFilter,
  countUnread,
  getCustomerOrderIds,
} from "./notificationService.js";
import { getTimeframeWindow } from "../utils/dateRange.js";

const CUSTOM_IN_PROGRESS = new Set([
  "pending",
  "confirmed",
  "fabric_delivered",
  "at_tailor",
  "in_production",
  "ready",
  "out_for_delivery",
]);

const RETAIL_IN_PROGRESS = new Set(["pending", "confirmed", "shipped"]);

const CUSTOM_RETURN = new Set([
  "return_requested",
  "return_approved",
  "return_rejected",
  "refund_processed",
]);

function hasMeasurements(measurements) {
  if (!measurements || typeof measurements !== "object") return false;
  const keys = [
    "totalLength",
    "shoulderWidth",
    "armLength",
    "chestWidth",
    "waist",
    "hips",
  ];
  return keys.some((k) => {
    const v = measurements[k];
    return typeof v === "number" && Number.isFinite(v) && v > 0;
  });
}

function customTotal(order) {
  return Number(order?.pricing?.total) || 0;
}

function retailTotal(order) {
  return Number(order?.totalPrice) || 0;
}

/**
 * Aggregated customer account dashboard for the logged-in user.
 */
export async function getCustomerDashboard(userId, timeframe = "month") {
  const tf =
    timeframe === "week" || timeframe === "month" || timeframe === "year"
      ? timeframe
      : "month";
  const { start, end } = getTimeframeWindow(tf);
  const userFilter = { userId };

  const [
    customInWindow,
    retailInWindow,
    recentCustom,
    recentRetail,
    customer,
    orderIds,
  ] = await Promise.all([
    CustomOrder.find({
      ...userFilter,
      createdAt: { $gte: start, $lte: end },
    })
      .select("_id createdAt status pricing")
      .lean(),
    RetailOrder.find({
      ...userFilter,
      createdAt: { $gte: start, $lte: end },
    })
      .select("_id createdAt status totalPrice")
      .lean(),
    CustomOrder.find(userFilter)
      .sort({ createdAt: -1 })
      .limit(8)
      .select("_id createdAt status pricing")
      .lean(),
    RetailOrder.find(userFilter)
      .sort({ createdAt: -1 })
      .limit(8)
      .select("_id createdAt status totalPrice")
      .lean(),
    Customer.findOne(userFilter)
      .select("name measurements savedUsers reviews addresses profilePic")
      .lean(),
    getCustomerOrderIds(userId),
  ]);

  const notifFilter = buildCustomerNotificationFilter(userId, orderIds);
  const unreadNotifications = await countUnread(notifFilter);

  let totalSpent = 0;
  let customCount = 0;
  let retailCount = 0;
  let inProgress = 0;
  let delivered = 0;
  let returns = 0;
  const statusMap = new Map();

  for (const order of customInWindow) {
    customCount += 1;
    totalSpent += customTotal(order);
    const st = order.status || "unknown";
    statusMap.set(st, (statusMap.get(st) || 0) + 1);
    if (CUSTOM_IN_PROGRESS.has(st)) inProgress += 1;
    if (st === "delivered") delivered += 1;
    if (CUSTOM_RETURN.has(st)) returns += 1;
  }

  for (const order of retailInWindow) {
    retailCount += 1;
    totalSpent += retailTotal(order);
    const st = order.status || "unknown";
    statusMap.set(`retail_${st}`, (statusMap.get(`retail_${st}`) || 0) + 1);
    if (RETAIL_IN_PROGRESS.has(st)) inProgress += 1;
    if (st === "delivered") delivered += 1;
    if (st === "cancelled") returns += 1;
  }

  // Last 6 months spend chart (all-time window for chart, not filtered by pill)
  const monthEnd = new Date();
  const monthStarts = [];
  for (let i = 5; i >= 0; i -= 1) {
    const d = new Date(
      Date.UTC(monthEnd.getUTCFullYear(), monthEnd.getUTCMonth() - i, 1),
    );
    monthStarts.push(d);
  }
  const chartStart = monthStarts[0];
  const [chartCustom, chartRetail] = await Promise.all([
    CustomOrder.find({
      ...userFilter,
      createdAt: { $gte: chartStart, $lte: end },
    })
      .select("createdAt pricing")
      .lean(),
    RetailOrder.find({
      ...userFilter,
      createdAt: { $gte: chartStart, $lte: end },
    })
      .select("createdAt totalPrice")
      .lean(),
  ]);

  const monthlyMap = new Map();
  const addMonth = (createdAt, amount) => {
    const d = new Date(createdAt);
    const key = `${d.getUTCFullYear()}-${d.getUTCMonth() + 1}`;
    monthlyMap.set(key, (monthlyMap.get(key) || 0) + amount);
  };
  for (const o of chartCustom) addMonth(o.createdAt, customTotal(o));
  for (const o of chartRetail) addMonth(o.createdAt, retailTotal(o));

  const monthlyData = monthStarts.map((d) => {
    const key = `${d.getUTCFullYear()}-${d.getUTCMonth() + 1}`;
    return {
      month: d.toLocaleString("en-US", { month: "short", timeZone: "UTC" }),
      spent: Number((monthlyMap.get(key) || 0).toFixed(2)),
    };
  });

  const recentOrders = [
    ...recentCustom.map((o) => ({
      id: String(o._id),
      type: "custom",
      amount: customTotal(o),
      status: o.status || "pending",
      date: o.createdAt ? new Date(o.createdAt).toISOString() : "",
    })),
    ...recentRetail.map((o) => ({
      id: String(o._id),
      type: "retail",
      amount: retailTotal(o),
      status: o.status || "pending",
      date: o.createdAt ? new Date(o.createdAt).toISOString() : "",
    })),
  ]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 8);

  const statusBreakdown = Array.from(statusMap.entries())
    .map(([status, count]) => ({
      status: status.replace(/^retail_/, ""),
      count,
      channel: status.startsWith("retail_") ? "retail" : "custom",
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);

  const familyMembersCount = Array.isArray(customer?.savedUsers)
    ? customer.savedUsers.length
    : 0;
  const reviewsCount = Array.isArray(customer?.reviews)
    ? customer.reviews.length
    : 0;
  const addressCount = Array.isArray(customer?.addresses)
    ? customer.addresses.length
    : 0;
  const measurementsSaved = hasMeasurements(customer?.measurements);

  const setup = {
    hasProfile: Boolean(customer?.name),
    hasMeasurements: measurementsSaved,
    hasAddress: addressCount > 0,
    hasFamilyMembers: familyMembersCount > 0,
    hasReviews: reviewsCount > 0,
  };

  return {
    success: true,
    currency: "AED",
    timeframe: tf,
    generatedAt: new Date().toISOString(),
    kpis: {
      totalSpent: Number(totalSpent.toFixed(2)),
      orderCount: customCount + retailCount,
      customCount,
      retailCount,
      inProgress,
      delivered,
      returns,
      reviewsCount,
      familyMembersCount,
      unreadNotifications,
    },
    setup,
    monthlyData,
    statusBreakdown,
    recentOrders,
  };
}
