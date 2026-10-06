import User from "../models/User.js";
import { resolveOrderMailTo } from "./emailVerification/orderMailTo.js";
import { sendOrderPlacedEmail } from "./emailService.js";
import { buildPublicOrderTrackingUrl } from "./publicTrackingToken.js";
import { displayPublicOrderId } from "./publicOrderId.js";

function orderTotalAed(order, orderType) {
  const raw =
    orderType === "custom" ? order?.pricing?.total : order?.totalPrice;
  const amount = Number(raw);
  if (!Number.isFinite(amount)) return "";
  return amount.toFixed(2);
}

export async function sendPaidOrderPlacedEmail({ order, userId, orderType }) {
  try {
    const token = order?.publicTrackingToken;
    const trackingUrl = buildPublicOrderTrackingUrl(token);
    if (!trackingUrl) return;

    const user = await User.findById(userId).select("name email").lean();
    const to = resolveOrderMailTo(order, user);
    if (!to) return;

    const shortId = displayPublicOrderId(order);
    await sendOrderPlacedEmail({
      to,
      name: user?.name || "there",
      userId,
      orderId: order._id,
      orderType,
      trackingUrl,
      shortOrderId: shortId,
      totalAed: orderTotalAed(order, orderType),
    });
  } catch (error) {
    console.error("Order placed email failed:", error?.message || error);
  }
}
