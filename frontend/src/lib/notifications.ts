export type NotificationAudience = "admin" | "customer";

export type NotificationOrderType = "custom" | "retail" | null;

export type NotificationOrderSummary = {
  designName?: string;
  designNameAr?: string;
  itemName?: string;
  image?: string | null;
  total?: number | null;
  currency?: string;
  refundAmount?: number | null;
  status?: string | null;
  itemCount?: number;
  isRefund?: boolean;
};

export type NotificationItem = {
  id: string;
  _id?: string;
  type: string;
  title: string;
  message?: string;
  createdAt?: string;
  read?: boolean;
  audience?: NotificationAudience;
  orderId?: string;
  order_id?: string;
  orderType?: NotificationOrderType;
  orderSummary?: NotificationOrderSummary | null;
  tailorId?: string | null;
  status?: string | null;
  returnPickupAddress?: Record<string, unknown> | null;
  returnData?: {
    condition: string;
    reason: string;
    comment: string;
    pickupAddress: Record<string, unknown> | null;
  };
  retailOrder?: Record<string, unknown> | null;
  customerUserId?: string | null;
  createdBy?: string | null;
  statusHistory?: StatusHistoryEntry[];
};

export type NotificationPagination = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasMore: boolean;
};

export type NotificationListResponse = {
  success: boolean;
  notifications: NotificationItem[];
  pagination?: NotificationPagination;
};

export type NotificationFilters = {
  page?: number;
  limit?: number;
  type?: string;
  category?: "orders" | "returns" | "registrations" | "partners" | "";
  read?: "true" | "false";
  from?: string;
  to?: string;
  orderId?: string;
  search?: string;
};

export type NotificationCategory =
  | "all"
  | "orders"
  | "returns"
  | "registrations"
  | "partners";

export type NotificationPriority = "low" | "normal" | "high" | "urgent";

export type StatusHistoryEntry = {
  status: string;
  note?: string;
  changedAt?: string;
  changedBy?: { name?: string; email?: string; _id?: string } | string;
};

export const NOTIFICATION_REFRESH_EVENT = "motd:notifications:refresh";

export function dispatchNotificationRefresh() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(NOTIFICATION_REFRESH_EVENT));
  }
}

export function normalizeNotification(raw: Record<string, unknown>): NotificationItem {
  const rawId = raw?.id ?? raw?._id;
  const id = rawId != null ? String(rawId) : "";

  return {
    ...(raw as NotificationItem),
    id,
    orderId:
      typeof raw?.orderId === "string"
        ? raw.orderId
        : raw?.orderId != null
          ? String(raw.orderId)
          : typeof raw?.order_id === "string"
            ? raw.order_id
            : undefined,
    orderType: (raw?.orderType as NotificationOrderType) || null,
    read: typeof raw?.read === "boolean" ? raw.read : false,
    tailorId:
      typeof raw?.tailorId === "string"
        ? raw.tailorId
        : raw?.tailorUserId != null
          ? String(raw.tailorUserId)
          : null,
    status: typeof raw?.status === "string" ? raw.status : null,
    returnPickupAddress:
      (raw?.returnPickupAddress as Record<string, unknown>) ||
      (raw?.return_pickup_address as Record<string, unknown>) ||
      undefined,
    returnData:
      (raw?.returnData as NotificationItem["returnData"]) ||
      (raw?.return_data as NotificationItem["returnData"]) ||
      undefined,
    customerUserId:
      typeof raw?.customerUserId === "string"
        ? raw.customerUserId
        : raw?.customerUserId != null
          ? String(raw.customerUserId)
          : null,
    createdBy:
      typeof raw?.createdBy === "string"
        ? raw.createdBy
        : raw?.createdBy != null
          ? String(raw.createdBy)
          : null,
    statusHistory: Array.isArray(raw?.statusHistory)
      ? (raw.statusHistory as StatusHistoryEntry[])
      : [],
    orderSummary:
      (raw?.orderSummary as NotificationOrderSummary) || null,
  };
}

const TYPE_I18N_KEYS: Record<string, string> = {
  user_customer_registered: "userCustomerRegistered",
  customer_registered: "userCustomerRegistered",
  user_tailor_registered: "userTailorRegistered",
  user_fabric_store_registered: "userFabricStoreRegistered",
  user_tailor_application_resubmitted: "userTailorApplicationResubmitted",
  user_fabric_store_application_resubmitted: "userFabricStoreApplicationResubmitted",
  retail_order_placed: "retailOrderPlaced",
  custom_order_placed: "customOrderPlaced",
  custom_order_received: "customOrderReceived",
  retail_order_received: "retailOrderReceived",
  custom_return_requested: "customReturnRequested",
  custom_return_received: "customReturnReceived",
  custom_return_approved: "customReturnApproved",
  custom_return_rejected: "customReturnRejected",
  return_rejected: "customReturnRejected",
  custom_refund_processed: "customRefundProcessed",
  custom_status_confirmed: "customStatusConfirmed",
  custom_status_fabric_delivered: "customStatusFabricDelivered",
  custom_status_at_tailor: "customStatusAtTailor",
  custom_status_in_production: "customStatusInProduction",
  custom_status_ready: "customStatusReady",
  custom_status_out_for_delivery: "customStatusOutForDelivery",
  custom_status_delivered: "customStatusDelivered",
  retail_status_confirmed: "retailStatusConfirmed",
  retail_status_shipped: "retailStatusShipped",
  retail_status_delivered: "retailStatusDelivered",
  retail_status_cancelled: "retailStatusCancelled",
  custom_review_prompt: "customReviewPrompt",
  retail_review_prompt: "retailReviewPrompt",
  fabric_payout_requested: "fabricPayoutRequested",
  fabric_payout_approved: "fabricPayoutApproved",
  fabric_payout_rejected: "fabricPayoutRejected",
  tailor_payout_requested: "tailorPayoutRequested",
  tailor_payout_approved: "tailorPayoutApproved",
  tailor_payout_rejected: "tailorPayoutRejected",
};

export function getNotificationTypeLabel(type: string, t?: (key: string) => string): string {
  const key = type.toLowerCase();
  const i18nKey = TYPE_I18N_KEYS[key];
  if (t && i18nKey) {
    return t(i18nKey);
  }

  const labels: Record<string, string> = {
    user_customer_registered: "New customer registered",
    customer_registered: "New customer registered",
    user_tailor_registered: "New tailor registered",
    user_fabric_store_registered: "New fabric store registered",
    user_tailor_application_resubmitted: "Tailor application resubmitted",
    user_fabric_store_application_resubmitted: "Fabric store application resubmitted",
    retail_order_placed: "New ready-made order",
    custom_order_placed: "New custom order",
    custom_order_received: "Order received",
    retail_order_received: "Order received",
    custom_return_requested: "Return requested",
    custom_return_received: "Return request received",
    custom_return_approved: "Return approved",
    custom_return_rejected: "Return rejected",
    return_rejected: "Return rejected",
    custom_refund_processed: "Refund processed",
    custom_status_confirmed: "Order confirmed",
    custom_status_fabric_delivered: "Fabric delivered",
    custom_status_at_tailor: "At tailor",
    custom_status_in_production: "In production",
    custom_status_ready: "Order ready",
    custom_status_out_for_delivery: "Out for delivery",
    custom_status_delivered: "Delivered",
    retail_status_confirmed: "Order confirmed",
    retail_status_shipped: "Order shipped",
    retail_status_delivered: "Delivered",
    retail_status_cancelled: "Order cancelled",
    custom_review_prompt: "Leave a review",
    retail_review_prompt: "Leave a review",
    fabric_payout_requested: "Fabric payout request",
    fabric_payout_approved: "Payout approved",
    fabric_payout_rejected: "Payout declined",
    tailor_payout_requested: "Tailor payout request",
    tailor_payout_approved: "Payout approved",
    tailor_payout_rejected: "Payout declined",
  };

  return labels[key] || type || "Notification";
}

export function getNotificationCategory(type: string): NotificationCategory {
  const key = type.toLowerCase();
  if (key.includes("payout")) return "partners";
  if (key.includes("return")) return "returns";
  if (key.includes("order")) return "orders";
  if (key === "user_customer_registered" || key === "customer_registered") {
    return "registrations";
  }
  if (key === "user_tailor_registered" || key === "user_fabric_store_registered") {
    return "partners";
  }
  if (
    key === "user_tailor_application_resubmitted" ||
    key === "user_fabric_store_application_resubmitted"
  ) {
    return "partners";
  }
  return "all";
}

export function getNotificationPriority(
  notification: NotificationItem,
): NotificationPriority {
  const type = notification.type.toLowerCase();
  if (type === "custom_return_requested") {
    if (isNotificationAging(notification.createdAt, 2)) return "urgent";
    return "high";
  }
  if (type.includes("payout")) return "high";
  if (type.includes("order_placed") || type.includes("return")) return "high";
  if (type.includes("registered") || type.includes("resubmitted")) return "normal";
  return "low";
}

export function isNotificationAging(
  createdAt?: string,
  days = 2,
): boolean {
  if (!createdAt) return false;
  const ageMs = Date.now() - new Date(createdAt).getTime();
  return ageMs >= days * 24 * 60 * 60 * 1000;
}

export function getPriorityStyles(priority: NotificationPriority): string {
  const styles: Record<NotificationPriority, string> = {
    low: "border-gray-100",
    normal: "border-blue-100",
    high: "border-amber-200 bg-amber-50/30",
    urgent: "border-red-300 bg-red-50/40 ring-1 ring-red-200",
  };
  return styles[priority];
}

export function getAdminDeepLinkHref(
  notification: NotificationItem,
  locale?: string,
): { href: string; label: string } | null {
  const type = (notification.type || "").toLowerCase();

  if (type === "user_tailor_registered" && notification.tailorId) {
    return {
      href: "/admin/tailors",
      label: "Approve tailor",
    };
  }

  if (type === "user_tailor_application_resubmitted" && notification.tailorId) {
    return {
      href: `/admin/tailors/${notification.tailorId}/application`,
      label: "View application",
    };
  }

  if (type === "user_fabric_store_registered") {
    return {
      href: "/admin/partners",
      label: "Review fabric store",
    };
  }

  if (type === "user_fabric_store_application_resubmitted") {
    const userId = notification.createdBy;
    return {
      href: userId
        ? `/admin/partners/${userId}/application`
        : "/admin/partners",
      label: "View application",
    };
  }

  if (
    (type === "user_customer_registered" || type === "customer_registered") &&
    (notification.customerUserId || notification.createdBy)
  ) {
    const userId = notification.customerUserId || notification.createdBy;
    return {
      href: `/admin/customers?search=${encodeURIComponent(userId!)}`,
      label: "View customer",
    };
  }

  if (notification.orderId) {
    const orderHref = getOrderDetailHref(
      { ...notification, audience: "admin" },
      locale,
    );
    if (orderHref) {
      return { href: orderHref, label: "View order" };
    }
  }

  return null;
}

export function getReturnWorkflowStep(status?: string | null): number {
  switch (status) {
    case "return_approved":
      return 2;
    case "refund_processed":
      return 3;
    case "return_rejected":
      return 3;
    default:
      return 1;
  }
}

export function getActionAuditFromHistory(
  history: StatusHistoryEntry[] = [],
  statuses: string[],
): StatusHistoryEntry | null {
  const matches = history.filter((entry) => statuses.includes(entry.status));
  if (!matches.length) return null;
  return matches[matches.length - 1];
}

export function exportNotificationsCsv(
  notifications: NotificationItem[],
  filename = "admin-notifications.csv",
) {
  const headers = [
    "id",
    "type",
    "title",
    "message",
    "status",
    "read",
    "orderId",
    "createdAt",
  ];
  const rows = notifications.map((n) =>
    [
      n.id,
      n.type,
      n.title,
      n.message || "",
      n.status || "",
      n.read ? "yes" : "no",
      n.orderId || "",
      n.createdAt || "",
    ]
      .map((cell) => `"${String(cell).replace(/"/g, '""')}"`)
      .join(","),
  );
  const csv = [headers.join(","), ...rows].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

const DESKTOP_ALERTS_KEY = "motd:admin:desktop-alerts";

export function getDesktopAlertsEnabled(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(DESKTOP_ALERTS_KEY) === "true";
}

export function setDesktopAlertsEnabled(enabled: boolean) {
  if (typeof window === "undefined") return;
  localStorage.setItem(DESKTOP_ALERTS_KEY, enabled ? "true" : "false");
}

export async function requestDesktopAlertPermission(): Promise<boolean> {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return false;
  }
  if (Notification.permission === "granted") return true;
  if (Notification.permission === "denied") return false;
  const result = await Notification.requestPermission();
  return result === "granted";
}

export function showDesktopNotification(title: string, body: string) {
  if (
    typeof window === "undefined" ||
    !getDesktopAlertsEnabled() ||
    !("Notification" in window) ||
    Notification.permission !== "granted"
  ) {
    return;
  }
  new Notification(title, { body, icon: "/favicon.ico" });
}

export function getOrderDetailHref(
  notification: NotificationItem,
  _locale?: string,
): string | null {
  const orderId = notification.orderId || notification.order_id;
  if (!orderId) return null;

  const type = (notification.type || "").toLowerCase();
  const isRetail =
    notification.orderType === "retail" || type.startsWith("retail_");

  const encodedId = encodeURIComponent(String(orderId));

  if (notification.audience === "customer" || !notification.audience) {
    const orderType = isRetail ? "retail" : "custom";
    return `/account?tab=orders&orderId=${encodedId}&orderType=${orderType}`;
  }

  // next-intl Link prefixes the locale; do not include it in the path.
  return isRetail
    ? `/admin/orders/retail?orderId=${encodedId}`
    : `/admin/orders/custom?orderId=${encodedId}`;
}

export function getReviewHref(): string {
  return "/account?tab=reviews";
}

export function isReviewPromptType(type: string): boolean {
  const key = type.toLowerCase();
  return key === "custom_review_prompt" || key === "retail_review_prompt";
}

export function buildNotificationQuery(filters: NotificationFilters = {}) {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== "") {
      params.set(key, String(value));
    }
  });
  const query = params.toString();
  return query ? `?${query}` : "";
}
