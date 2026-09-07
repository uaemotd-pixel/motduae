"use client";

import { useEffect, useState, useMemo } from "react";
import { api } from "@/lib/api/client";
import {
  Activity,
  Store,
  RefreshCw,
  Search,
  PackageSearch,
  Scissors,
  Wallet,
  Truck,
  ChevronDown,
  Phone,
  Mail,
  MapPin,
  Banknote,
  Trash2,
  Check,
  X,
  type LucideIcon,
} from "lucide-react";
import LocaleSwitcher from "@/components/shared/LocaleSwitcher";
import { ConfirmationModal } from "@/components/shared/ConfirmationModal";
import TimeframePills from "@/components/dashboard/TimeframePills";
import StatCard from "@/components/dashboard/StatCard";
import { type DashAccent } from "@/components/dashboard/palette";
import { TableSkeleton } from "@/components/ui/Skeleton";
import { splitFabricCommission } from "@/lib/fabricCommission";
import toast from "react-hot-toast";

/** Courier partner — fixed platform shipping company. */
const SHIPPING_COMPANY_NAME = "SHIPAA";

type PartnerPayoutKind = "tailor" | "fabric" | "shipping";

interface PartnerPaidSummary {
  paid: number;
  releaseCount: number;
  lastReleasedAt?: string;
  byOrderId?: Record<string, number>;
}

interface PartnerPayoutTransaction {
  _id: string;
  partnerKey: string;
  partnerKind: PartnerPayoutKind;
  partnerName: string;
  payeeName?: string;
  amount: number;
  currency?: string;
  orders?: Array<{
    orderId: string;
    orderType: string;
    amount: number;
  }>;
  note?: string;
  releasedAt: string;
  releasedBy?: { _id?: string; name?: string; email?: string } | string;
}

interface PartnerShareBreakdown {
  gross: number;
  commission: number;
  net: number;
  percent: number;
  customGross?: number;
  retailGross?: number;
}

interface OrderBreakdownLine {
  orderId: string;
  channel: string;
  amount: number;
  gross: number;
  commission: number;
  percent: number;
  meta?: string;
  pickup?: string;
  deliveryLines?: any[];
  shippingLabel?: string;
}

interface DashboardStats {
  currency: string;
  retail?: { orderCount: number; revenue: number; growth?: number };
  custom?: { orderCount: number; revenue: number; growth?: number };
  partnerShares?: {
    tailor: PartnerShareBreakdown;
    fabricStore: PartnerShareBreakdown;
    shipping?: {
      gross: number;
      net: number;
      customGross?: number;
      retailGross?: number;
    };
    motdKeeps: number;
    motdEarnings?: number;
  };
}

type PayoutStatStatus = "pending" | "approved";

type ReleaseConfirmRow = {
  key: string;
  kind: PartnerPayoutKind;
  name: string;
  payeeName: string;
  ids: Set<string>;
  remaining: number;
  orders: OrderBreakdownLine[];
};

interface FabricPayoutRequestItem {
  _id: string;
  partnerKey: string;
  partnerKind: PartnerPayoutKind;
  partnerName: string;
  payeeName?: string;
  amount: number;
  currency?: string;
  status: "pending" | "approved" | "rejected" | "cancelled";
  note?: string;
  adminNote?: string;
  requestedAt?: string;
  reviewedAt?: string;
  orders?: Array<{
    orderId: string;
    orderType: string;
    amount: number;
  }>;
  requestedBy?: { _id?: string; name?: string; email?: string } | string;
}

export default function AdminPaymentsPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeframe, setTimeframe] = useState<"week" | "month" | "year">(
    "month",
  );
  const [isRefreshing, setIsRefreshing] = useState(false);

  const [pricingOrders, setPricingOrders] = useState<any[]>([]);
  const [pricingLoading, setPricingLoading] = useState(true);
  const [pricingSearch, setPricingSearch] = useState("");
  const [expandedPartnerKey, setExpandedPartnerKey] = useState<string | null>(
    null,
  );
  const [paidByPartnerKey, setPaidByPartnerKey] = useState<
    Record<string, PartnerPaidSummary>
  >({});
  const [transactions, setTransactions] = useState<PartnerPayoutTransaction[]>(
    [],
  );
  const [releasingKey, setReleasingKey] = useState<string | null>(null);
  const [releaseConfirmRow, setReleaseConfirmRow] =
    useState<ReleaseConfirmRow | null>(null);
  const [deleteConfirmTx, setDeleteConfirmTx] =
    useState<PartnerPayoutTransaction | null>(null);
  const [deletingTxId, setDeletingTxId] = useState<string | null>(null);
  const [payoutRequests, setPayoutRequests] = useState<
    FabricPayoutRequestItem[]
  >([]);
  const [payoutRequestsPendingCount, setPayoutRequestsPendingCount] =
    useState(0);
  const [reviewingRequestId, setReviewingRequestId] = useState<string | null>(
    null,
  );
  const [approveConfirmRequest, setApproveConfirmRequest] =
    useState<FabricPayoutRequestItem | null>(null);
  const [rejectConfirmRequest, setRejectConfirmRequest] =
    useState<FabricPayoutRequestItem | null>(null);
  const [deleteConfirmRequest, setDeleteConfirmRequest] =
    useState<FabricPayoutRequestItem | null>(null);
  const [deletingRequestId, setDeletingRequestId] = useState<string | null>(
    null,
  );

  const fetchStats = async (
    mode: "initial" | "refresh" | "silent" = "initial",
  ) => {
    try {
      if (mode === "refresh") setIsRefreshing(true);
      else if (mode === "initial") setLoading(true);
      const data = await api.get<DashboardStats>(
        `/api/admin/dashboard?timeframe=${timeframe}&t=${Date.now()}`,
      );
      setStats(data);
      setError(null);
    } catch (err: any) {
      console.error("Payments fetch error:", err);
      setError(err.message || "Failed to load payments data");
    } finally {
      if (mode === "initial") setLoading(false);
      if (mode === "refresh") setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchStats("initial");
  }, [timeframe]);

  const fetchPricingOrders = async () => {
    try {
      setPricingLoading(true);
      const [customData, retailData] = await Promise.all([
        api.get<any>("/api/admin/orders/custom"),
        api.get<any>("/api/admin/orders/retail?limit=500"),
      ]);
      const customItems = (
        Array.isArray(customData) ? customData : customData.items || []
      ).map((order: any) => ({
        ...order,
        channel: "custom" as const,
      }));
      const retailItems = (
        Array.isArray(retailData) ? retailData : retailData.items || []
      ).map((order: any) => ({
        ...order,
        channel: "retail" as const,
      }));
      const merged = [...customItems, ...retailItems].sort((a, b) => {
        const at = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const bt = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return bt - at;
      });
      setPricingOrders(merged);
    } catch (err) {
      console.error("Pricing fetch error:", err);
    } finally {
      setPricingLoading(false);
    }
  };

  useEffect(() => {
    fetchPricingOrders();
  }, []);

  const fetchPartnerPayouts = async () => {
    try {
      const data = await api.get<{
        items?: PartnerPayoutTransaction[];
        paidByPartnerKey?: Record<string, PartnerPaidSummary>;
      }>("/api/admin/partner-payouts");
      setPaidByPartnerKey(data.paidByPartnerKey || {});
      setTransactions(Array.isArray(data.items) ? data.items : []);
    } catch (err) {
      console.error("Partner payouts fetch error:", err);
    }
  };

  const fetchPayoutRequests = async () => {
    try {
      const data = await api.get<{
        items?: FabricPayoutRequestItem[];
        pendingCount?: number;
      }>("/api/admin/payout-requests");
      setPayoutRequests(Array.isArray(data.items) ? data.items : []);
      setPayoutRequestsPendingCount(Number(data.pendingCount) || 0);
    } catch (err) {
      console.error("Payout requests fetch error:", err);
    }
  };

  useEffect(() => {
    fetchPartnerPayouts();
    fetchPayoutRequests();
  }, []);

  const refreshAll = async () => {
    setIsRefreshing(true);
    try {
      await Promise.all([
        fetchStats("silent"),
        fetchPricingOrders(),
        fetchPartnerPayouts(),
        fetchPayoutRequests(),
      ]);
    } finally {
      setIsRefreshing(false);
    }
  };

  const approvePayoutRequest = async (request: FabricPayoutRequestItem) => {
    if (!request?._id || reviewingRequestId) return;
    try {
      setReviewingRequestId(request._id);
      await api.post(`/api/admin/payout-requests/${request._id}/approve`, {});
      setApproveConfirmRequest(null);
      await Promise.all([fetchPayoutRequests(), fetchPartnerPayouts()]);
    } catch (err: any) {
      console.error("Approve payout request error:", err);
      toast.error(err?.message || "Failed to approve payout request.");
    } finally {
      setReviewingRequestId(null);
    }
  };

  const rejectPayoutRequest = async (request: FabricPayoutRequestItem) => {
    if (!request?._id || reviewingRequestId) return;
    try {
      setReviewingRequestId(request._id);
      await api.post(`/api/admin/payout-requests/${request._id}/reject`, {
        adminNote: "Declined by admin",
      });
      setRejectConfirmRequest(null);
      await fetchPayoutRequests();
    } catch (err: any) {
      console.error("Reject payout request error:", err);
      toast.error(err?.message || "Failed to reject payout request.");
    } finally {
      setReviewingRequestId(null);
    }
  };

  const deletePayoutRequest = async (request: FabricPayoutRequestItem) => {
    if (!request?._id || deletingRequestId) return;
    try {
      setDeletingRequestId(request._id);
      await api.delete(`/api/admin/payout-requests/${request._id}`);
      setDeleteConfirmRequest(null);
      await fetchPayoutRequests();
    } catch (err: any) {
      console.error("Delete payout request error:", err);
      toast.error(err?.message || "Failed to delete payout request.");
    } finally {
      setDeletingRequestId(null);
    }
  };

  const formatPickupAddress = (addr: any) => {
    if (!addr || typeof addr !== "object") return "";
    return [
      addr.fullName,
      addr.phone,
      addr.line1,
      addr.line2,
      addr.city,
      addr.emirate,
    ]
      .map((part) => String(part || "").trim())
      .filter(Boolean)
      .join(" · ");
  };

  const isRetailOrder = (order: any) =>
    order?.channel === "retail" ||
    order?.orderType === "retail" ||
    (Array.isArray(order?.orderItems) &&
      !Array.isArray(order?.items) &&
      order?.orderType !== "custom");

  const getDeliveryBreakdown = (order: any) => {
    if (Array.isArray(order?.pricing?.deliveryBreakdown)) {
      return order.pricing.deliveryBreakdown;
    }
    if (Array.isArray(order?.deliveryBreakdown)) {
      return order.deliveryBreakdown;
    }
    return [];
  };

  /** Shipaa payout = billable delivery legs (what Admin sees), with safe fallbacks. */
  const getOrderShippingFee = (order: any) => {
    const breakdown = getDeliveryBreakdown(order);
    if (breakdown.length > 0) {
      const sum = breakdown.reduce((total: number, line: any) => {
        if (line?.billable === false) return total;
        return total + (Number(line?.fee) || 0);
      }, 0);
      return Number(sum.toFixed(2));
    }

    const parcelCount =
      Number(order?.pricing?.parcelCount ?? order?.parcelCount) || 0;
    const perParcel = Number(
      order?.pricing?.perParcelFee ?? order?.perParcelFee,
    );
    if (parcelCount > 0 && Number.isFinite(perParcel) && perParcel >= 0) {
      return Number((parcelCount * perParcel).toFixed(2));
    }

    if (isRetailOrder(order)) {
      return Number(order?.shippingPrice) || 0;
    }
    return Number(order?.pricing?.deliveryFee) || 0;
  };

  const isPayoutEligibleOrder = (order: any) => {
    if (order?.isPaid === false) return false;
    const status = String(order?.status || "").toLowerCase();
    if (status === "cancelled" || status === "refund_processed") return false;
    return true;
  };

  const getOrderFees = (order: any) => {
    const shippingFee = getOrderShippingFee(order);
    if (isRetailOrder(order)) {
      const fabricFee = (order.orderItems || []).reduce(
        (sum: number, item: any) =>
          sum + (Number(item.price) || 0) * (Number(item.quantity) || 0),
        0,
      );
      return {
        tailorFee: 0,
        tailoringFee: 0,
        fabricFee,
        shippingFee,
      };
    }
    if (order.items && order.items.length > 0) {
      return {
        tailorFee: order.items.reduce(
          (sum: number, item: any) => sum + (item.pricing?.designBase || 0),
          0,
        ),
        tailoringFee: order.items.reduce(
          (sum: number, item: any) => sum + (item.pricing?.tailoringFee || 0),
          0,
        ),
        fabricFee: order.items.reduce(
          (sum: number, item: any) => sum + (item.pricing?.fabricCost || 0),
          0,
        ),
        shippingFee,
      };
    }
    return {
      tailorFee: order.pricing?.designBase || 0,
      tailoringFee: order.pricing?.tailoringFee || 0,
      fabricFee: order.pricing?.fabricCost || 0,
      shippingFee,
    };
  };

  const tailorCommissionPercent = stats?.partnerShares?.tailor.percent ?? 12;
  const fabricCommissionPercent =
    stats?.partnerShares?.fabricStore.percent ?? 15;

  const getOrderShares = (order: any) => {
    const fees = getOrderFees(order);
    const tailorGross = fees.tailorFee + fees.tailoringFee;
    const tailor = splitFabricCommission(tailorGross, tailorCommissionPercent);
    const fabric = splitFabricCommission(
      fees.fabricFee,
      fabricCommissionPercent,
    );
    const shipping = {
      gross: fees.shippingFee,
      net: fees.shippingFee,
      commission: 0,
      percent: 0,
    };
    const motdEarns = Number(
      (tailor.commission + fabric.commission).toFixed(2),
    );
    return { fees, tailorGross, tailor, fabric, shipping, motdEarns };
  };

  const readPartnerName = (value: any, fallback: string) => {
    if (!value) return fallback;
    if (typeof value === "string") return value;
    return value.name || fallback;
  };

  const readPartnerId = (value: any) => {
    if (!value) return "";
    if (typeof value === "string") return value;
    return String(value._id || value.id || "").trim();
  };

  const getOrderPayees = (order: any) => {
    const shares = getOrderShares(order);

    const firstObject = (...values: any[]) =>
      values.find((v) => v && typeof v === "object") || null;

    const tailorShop = firstObject(
      order.tailorShopId,
      ...(order.items || []).map((item: any) => item.tailorShopId),
    );
    const tailorOwner =
      tailorShop?.ownerId && typeof tailorShop.ownerId === "object"
        ? tailorShop.ownerId
        : null;
    const retailFabricShops = [
      ...(Array.isArray(order.fabricStores) ? order.fabricStores : []),
      ...(order.orderItems || []).flatMap((item: any) => [
        item.productId?.fabricShopId,
        item.fabricShopId,
      ]),
    ].filter((shop: any) => shop && typeof shop === "object");

    const fabricStore = firstObject(
      order.fabricStoreId,
      ...(order.items || []).map((item: any) => item.fabricStoreId),
      ...retailFabricShops,
    );

    const shopNames = (key: "tailorShopId" | "fabricStoreId") =>
      [
        readPartnerName(typeof order[key] === "object" ? order[key] : null, ""),
        ...(order.items || []).map((item: any) =>
          readPartnerName(typeof item[key] === "object" ? item[key] : null, ""),
        ),
      ].filter(Boolean);

    const itemDesigns = (order.items || [])
      .map((item: any) => item.designSnapshot?.name)
      .filter(Boolean);
    const itemFabrics = (order.items || [])
      .map((item: any) => item.fabricSnapshot?.name)
      .filter(Boolean);
    const retailProductNames = (order.orderItems || [])
      .map((item: any) => item.name)
      .filter(Boolean);

    const tailorShopName =
      [...new Set(shopNames("tailorShopId"))].join(", ") ||
      tailorShop?.name ||
      (isRetailOrder(order) ? "—" : "Tailor shop not set");
    const retailFabricShopNames = retailFabricShops
      .map((shop: any) => shop.shopName || shop.name)
      .filter(Boolean);

    const fabricShopName =
      [
        ...new Set([...shopNames("fabricStoreId"), ...retailFabricShopNames]),
      ].join(", ") ||
      fabricStore?.shopName ||
      fabricStore?.name ||
      (isRetailOrder(order) ? "Fabric store not set" : "Fabric store not set");

    const parcelCount =
      Number(order.pricing?.parcelCount || order.parcelCount) || 0;
    const deliveryLines = getDeliveryBreakdown(order);

    return {
      shares,
      channel: isRetailOrder(order) ? "retail" : "custom",
      tailor: {
        id:
          readPartnerId(tailorShop) || readPartnerId(order.tailorShopId) || "",
        shopName: tailorShopName,
        payeeName: tailorOwner?.name || tailorShop?.name || tailorShopName,
        phone: tailorShop?.phone || tailorOwner?.phone || "",
        email: tailorOwner?.email || "",
        city: tailorShop?.city || "",
        location: tailorShop?.location || "",
        pickup: formatPickupAddress(tailorShop?.pickupAddress),
        designs:
          [...new Set(itemDesigns)].join(", ") ||
          order.designSnapshot?.name ||
          "",
      },
      fabric: {
        id:
          readPartnerId(fabricStore?.shopId) ||
          readPartnerId(fabricStore) ||
          readPartnerId(order.fabricStoreId) ||
          "",
        shopName: fabricShopName,
        payeeName:
          fabricStore?.ownerName ||
          fabricStore?.shopName ||
          fabricStore?.name ||
          fabricShopName,
        phone: fabricStore?.phone || fabricStore?.ownerPhone || "",
        email: fabricStore?.ownerEmail || fabricStore?.email || "",
        city: fabricStore?.city || "",
        location: fabricStore?.location || "",
        pickup: formatPickupAddress(fabricStore?.pickupAddress),
        fabrics:
          [...new Set([...itemFabrics, ...retailProductNames])].join(", ") ||
          order.fabricSnapshot?.name ||
          "",
      },
      shipping: {
        id: "shipaa",
        payeeName: SHIPPING_COMPANY_NAME,
        companyName: SHIPPING_COMPANY_NAME,
        parcelCount,
        deliveryLines,
        label:
          parcelCount > 0
            ? `${parcelCount} parcel${parcelCount === 1 ? "" : "s"}`
            : deliveryLines.length > 0
              ? `${deliveryLines.length} delivery leg${
                  deliveryLines.length === 1 ? "" : "s"
                }`
              : "Courier delivery",
      },
    };
  };

  const partnerKindLabel = (kind: PartnerPayoutKind) =>
    kind === "tailor"
      ? "Tailor"
      : kind === "fabric"
        ? "Fabric store"
        : "Shipping company";

  const allPartnerPayoutRows = useMemo(() => {
    type PartnerRow = {
      key: string;
      kind: PartnerPayoutKind;
      name: string;
      payeeName: string;
      contact: string;
      email: string;
      city: string;
      location: string;
      pickup: string;
      orderCount: number;
      due: number;
      ids: Set<string>;
      orders: OrderBreakdownLine[];
    };

    const map = new Map<string, PartnerRow>();

    const normalizePartnerLabel = (value: string) =>
      String(value || "")
        .toLowerCase()
        .replace(/[^a-z0-9\u0600-\u06ff]+/gi, " ")
        .trim()
        .replace(/\s+/g, " ");

    const isPlaceholderName = (value: string) => {
      const norm = normalizePartnerLabel(value);
      return (
        !norm ||
        norm === "-" ||
        norm === "tailor shop not set" ||
        norm === "fabric store not set"
      );
    };

    const findExisting = (
      kind: PartnerPayoutKind,
      id: string,
      name: string,
      payeeName: string,
      placeholder: boolean,
    ) => {
      const nameNorm = normalizePartnerLabel(name);
      const payeeNorm = normalizePartnerLabel(payeeName);
      for (const row of map.values()) {
        if (row.kind !== kind) continue;
        if (id && row.ids.has(id)) return row;
        if (placeholder) continue;
        const rowNameNorm = normalizePartnerLabel(row.name);
        const rowPayeeNorm = normalizePartnerLabel(row.payeeName);
        if (
          (nameNorm &&
            (rowNameNorm === nameNorm || rowPayeeNorm === nameNorm)) ||
          (payeeNorm &&
            (rowNameNorm === payeeNorm || rowPayeeNorm === payeeNorm))
        ) {
          return row;
        }
      }
      return undefined;
    };

    const bump = (
      kind: PartnerPayoutKind,
      id: string,
      name: string,
      payeeName: string,
      contact: string,
      email: string,
      city: string,
      location: string,
      pickup: string,
      amount: number,
      orderLine: OrderBreakdownLine,
    ) => {
      if (amount <= 0) return;
      const displayName = name || payeeName;
      const placeholder = isPlaceholderName(displayName);
      const existing = findExisting(
        kind,
        id,
        displayName,
        payeeName,
        placeholder,
      );

      if (existing) {
        existing.due += amount;
        existing.orderCount += 1;
        existing.orders.push(orderLine);
        if (id) existing.ids.add(id);
        if (contact && !existing.contact) existing.contact = contact;
        if (email && !existing.email) existing.email = email;
        if (city && !existing.city) existing.city = city;
        if (location && !existing.location) existing.location = location;
        if (pickup && !existing.pickup) existing.pickup = pickup;
        if (!isPlaceholderName(name) && name.length >= existing.name.length) {
          existing.name = name;
        }
        if (payeeName && payeeName !== existing.name && !existing.payeeName) {
          existing.payeeName = payeeName;
        }
        return;
      }

      const nameNorm = normalizePartnerLabel(displayName);
      const key =
        kind === "shipping"
          ? `${kind}:shipaa`
          : !placeholder && nameNorm
            ? `${kind}:name:${nameNorm}`
            : `${kind}:${id || `unknown-${map.size}`}`;

      map.set(key, {
        key,
        kind,
        name: displayName,
        payeeName,
        contact,
        email,
        city,
        location,
        pickup,
        orderCount: 1,
        due: amount,
        ids: new Set(id ? [id] : []),
        orders: [orderLine],
      });
    };

    for (const order of pricingOrders) {
      if (!isPayoutEligibleOrder(order)) continue;
      const payees = getOrderPayees(order);
      const orderId = String(order._id || "");

      bump(
        "tailor",
        payees.tailor.id,
        payees.tailor.shopName,
        payees.tailor.payeeName,
        payees.tailor.phone,
        payees.tailor.email,
        payees.tailor.city,
        payees.tailor.location,
        payees.tailor.pickup,
        payees.shares.tailor.net,
        {
          orderId,
          channel: payees.channel,
          amount: payees.shares.tailor.net,
          gross: payees.shares.tailorGross,
          commission: payees.shares.tailor.commission,
          percent: tailorCommissionPercent,
          meta: payees.tailor.designs || undefined,
          pickup: payees.tailor.pickup || undefined,
        },
      );
      bump(
        "fabric",
        payees.fabric.id,
        payees.fabric.shopName,
        payees.fabric.payeeName,
        payees.fabric.phone,
        payees.fabric.email,
        payees.fabric.city,
        payees.fabric.location,
        payees.fabric.pickup,
        payees.shares.fabric.net,
        {
          orderId,
          channel: payees.channel,
          amount: payees.shares.fabric.net,
          gross: payees.shares.fees.fabricFee,
          commission: payees.shares.fabric.commission,
          percent: fabricCommissionPercent,
          meta: payees.fabric.fabrics || undefined,
          pickup: payees.fabric.pickup || undefined,
        },
      );
      bump(
        "shipping",
        payees.shipping.id,
        payees.shipping.companyName,
        payees.shipping.payeeName,
        SHIPPING_COMPANY_NAME,
        "",
        "",
        "",
        "",
        payees.shares.shipping.net,
        {
          orderId,
          channel: payees.channel,
          amount: payees.shares.shipping.net,
          gross: payees.shares.shipping.gross,
          commission: 0,
          percent: 0,
          shippingLabel: payees.shipping.label,
          deliveryLines: payees.shipping.deliveryLines,
        },
      );
    }

    const kindOrder: Record<PartnerPayoutKind, number> = {
      tailor: 0,
      fabric: 1,
      shipping: 2,
    };

    return Array.from(map.values())
      .map((row) => {
        const paidSummary = paidByPartnerKey[row.key];
        const byOrderId = paidSummary?.byOrderId || {};
        let paidFromOrders = 0;
        let remainingFromOrders = 0;

        for (const order of row.orders) {
          const orderPaid = Math.min(
            Number(order.amount) || 0,
            Number(byOrderId[order.orderId]) || 0,
          );
          paidFromOrders += orderPaid;
          remainingFromOrders += Math.max(
            0,
            Number(((Number(order.amount) || 0) - orderPaid).toFixed(2)),
          );
        }

        // Prefer per-order settlement. Fall back to partner total only when
        // no order-level paid rows exist (legacy releases without order lines).
        const hasOrderAttribution = Object.keys(byOrderId).length > 0;
        const paid = hasOrderAttribution
          ? paidFromOrders
          : Number(paidSummary?.paid) || 0;
        const remaining = hasOrderAttribution
          ? Number(remainingFromOrders.toFixed(2))
          : Math.max(0, Number((row.due - paid).toFixed(2)));

        return {
          ...row,
          due: Number(row.due.toFixed(2)),
          paid: Number(Math.min(paid, row.due).toFixed(2)),
          remaining,
          releaseCount: paidSummary?.releaseCount || 0,
          lastReleasedAt: paidSummary?.lastReleasedAt,
        };
      })
      .sort(
        (a, b) =>
          kindOrder[a.kind] - kindOrder[b.kind] ||
          b.remaining - a.remaining ||
          a.name.localeCompare(b.name),
      );
  }, [
    pricingOrders,
    paidByPartnerKey,
    tailorCommissionPercent,
    fabricCommissionPercent,
  ]);

  const partnerPayoutRows = useMemo(() => {
    return allPartnerPayoutRows.filter((row) => {
      if (row.remaining <= 0) return false;
      if (!pricingSearch.trim()) return true;
      const term = pricingSearch.toLowerCase();
      return (
        row.name.toLowerCase().includes(term) ||
        row.payeeName.toLowerCase().includes(term) ||
        partnerKindLabel(row.kind).toLowerCase().includes(term) ||
        row.orders.some((o) => o.orderId.toLowerCase().includes(term))
      );
    });
  }, [allPartnerPayoutRows, pricingSearch]);

  const pendingByKind = useMemo(() => {
    const totals = { tailor: 0, fabric: 0, shipping: 0 };
    for (const row of allPartnerPayoutRows) {
      if (row.remaining <= 0) continue;
      totals[row.kind] += row.remaining;
    }
    return {
      tailor: Number(totals.tailor.toFixed(2)),
      fabric: Number(totals.fabric.toFixed(2)),
      shipping: Number(totals.shipping.toFixed(2)),
    };
  }, [allPartnerPayoutRows]);

  const kindTotals = useMemo(() => {
    const totals = {
      tailor: { due: 0, paid: 0, remaining: 0 },
      fabric: { due: 0, paid: 0, remaining: 0 },
      shipping: { due: 0, paid: 0, remaining: 0 },
    };
    for (const row of allPartnerPayoutRows) {
      totals[row.kind].due += row.due;
      totals[row.kind].paid += row.paid;
      totals[row.kind].remaining += row.remaining;
    }
    return {
      tailor: {
        due: Number(totals.tailor.due.toFixed(2)),
        paid: Number(totals.tailor.paid.toFixed(2)),
        remaining: Number(totals.tailor.remaining.toFixed(2)),
      },
      fabric: {
        due: Number(totals.fabric.due.toFixed(2)),
        paid: Number(totals.fabric.paid.toFixed(2)),
        remaining: Number(totals.fabric.remaining.toFixed(2)),
      },
      shipping: {
        due: Number(totals.shipping.due.toFixed(2)),
        paid: Number(totals.shipping.paid.toFixed(2)),
        remaining: Number(totals.shipping.remaining.toFixed(2)),
      },
    };
  }, [allPartnerPayoutRows]);

  const earningsSummary = useMemo(() => {
    let totalEarnings = 0;
    let motdProfit = 0;
    for (const order of pricingOrders) {
      if (!isPayoutEligibleOrder(order)) continue;
      const shares = getOrderShares(order);
      const orderTotal =
        Number(order.totalPrice) ||
        Number(order.pricing?.total) ||
        Number(
          (
            shares.tailorGross +
            shares.fees.fabricFee +
            shares.shipping.gross
          ).toFixed(2),
        );
      totalEarnings += orderTotal;
      motdProfit += shares.motdEarns;
    }
    return {
      totalEarnings: Number(totalEarnings.toFixed(2)),
      motdProfit: Number(motdProfit.toFixed(2)),
    };
  }, [pricingOrders, tailorCommissionPercent, fabricCommissionPercent]);

  const payCardContent = (
    totals: { due: number; paid: number; remaining: number },
    emptyHint: string,
  ) => {
    if (totals.due <= 0) {
      return {
        value: 0,
        status: null as PayoutStatStatus | null,
        hint: emptyHint,
      };
    }
    // Fully released — show paid amount, not remaining/due.
    if (totals.remaining <= 0) {
      return {
        value: totals.paid,
        status: "approved" as PayoutStatStatus,
        hint: `Paid in full · ${formatKpiCurrency(totals.paid)}`,
      };
    }
    return {
      value: totals.remaining,
      status: "pending" as PayoutStatStatus,
      hint: `Still to pay · Paid ${formatKpiCurrency(totals.paid)} of ${formatKpiCurrency(totals.due)}`,
    };
  };

  const statusBadgeClass = (status: PayoutStatStatus) =>
    status === "pending"
      ? "bg-amber-50 text-amber-700 border-amber-200"
      : "bg-emerald-50 text-emerald-700 border-emerald-200";

  const PartnerIcon = ({ kind }: { kind: PartnerPayoutKind }) =>
    kind === "tailor" ? (
      <Scissors className="h-4 w-4" />
    ) : kind === "fabric" ? (
      <Store className="h-4 w-4" />
    ) : (
      <Truck className="h-4 w-4" />
    );

  const formatCurrency = (value: number) => {
    const amount = new Intl.NumberFormat("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
    return `AED ${amount}`;
  };

  const formatKpiCurrency = (value: number) => {
    const amount = new Intl.NumberFormat("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
    return `AED ${amount}`;
  };

  const formatShippingLegLine = (line: any) => {
    const from = String(line?.from?.label || "").trim();
    const to = String(line?.to?.label || "").trim();
    let title = String(line?.label || line?.type || "").trim();
    if (/^delivery to you$/i.test(title)) title = "Delivery to customer";

    const route = from && to ? `${from} → ${to}` : from || to;
    const feeText = formatKpiCurrency(Number(line?.fee) || 0);

    if (title && route) {
      const titleNorm = title.toLowerCase().replace(/\s+/g, " ");
      const routeNorm = route.toLowerCase().replace(/\s+/g, " ");
      if (titleNorm === routeNorm) return `${route}: ${feeText}`;
      return `${title} · from ${route}: ${feeText}`;
    }
    if (title) return `${title}: ${feeText}`;
    if (route) return `${route}: ${feeText}`;
    return `Delivery leg: ${feeText}`;
  };

  const releasePartnerPayment = async (row: ReleaseConfirmRow) => {
    if (row.remaining <= 0 || releasingKey) return;
    try {
      setReleasingKey(row.key);
      await api.post("/api/admin/partner-payouts", {
        partnerKey: row.key,
        partnerKind: row.kind,
        partnerId: Array.from(row.ids)[0] || "",
        partnerName: row.name,
        payeeName: row.payeeName,
        amount: row.remaining,
        currency: stats?.currency || "AED",
        orders: row.orders.map((o) => ({
          orderId: o.orderId,
          orderType: o.channel,
          amount: o.amount,
        })),
      });
      if (expandedPartnerKey === row.key) setExpandedPartnerKey(null);
      setReleaseConfirmRow(null);
      await Promise.all([fetchPartnerPayouts(), fetchPayoutRequests()]);
    } catch (err: any) {
      console.error("Release payment error:", err);
      toast.error(err?.message || "Failed to release payment. Please try again.");
    } finally {
      setReleasingKey(null);
    }
  };

  const deletePartnerTransaction = async (tx: PartnerPayoutTransaction) => {
    if (!tx?._id || deletingTxId) return;
    try {
      setDeletingTxId(tx._id);
      await api.delete(`/api/admin/partner-payouts/${tx._id}`);
      setDeleteConfirmTx(null);
      await fetchPartnerPayouts();
    } catch (err: any) {
      console.error("Delete transaction error:", err);
      toast.error(err?.message || "Failed to delete transaction. Please try again.");
    } finally {
      setDeletingTxId(null);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <p className="text-sm text-(--dash-muted)">Loading payments…</p>
        <TableSkeleton rows={8} cols={7} className="rounded-xl" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="max-w-md rounded-(--dash-radius) border border-(--dash-border) bg-(--dash-surface) p-8 text-center shadow-sm">
          <Activity className="mx-auto mb-4 h-12 w-12 text-(--dash-muted)" />
          <p className="text-xl text-(--dash-ink)">Unable to load payments</p>
          <p className="mt-2 text-sm text-(--dash-muted)">{error}</p>
          <button
            type="button"
            onClick={() => fetchStats("initial")}
            className="mt-6 rounded-xl bg-(--dash-charcoal) px-6 py-2 text-sm text-white transition hover:opacity-90"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  if (!stats) return null;

  const tailorPayCard = payCardContent(
    kindTotals.tailor,
    "No tailor deals yet",
  );
  const fabricPayCard = payCardContent(
    kindTotals.fabric,
    "No fabric deals yet",
  );
  const shipaaPayCard = payCardContent(
    kindTotals.shipping,
    "No shipping deals yet",
  );

  const summaryCards: Array<{
    key: string;
    label: string;
    value: number;
    status: PayoutStatStatus | null;
    icon: LucideIcon;
    hint: string;
    accent: DashAccent;
    delay: number;
  }> = [
    {
      key: "total-earnings",
      label: "Total Earnings",
      value: earningsSummary.totalEarnings,
      status: null,
      icon: Banknote,
      hint: "All order revenue",
      accent: "ink",
      delay: 0,
    },
    {
      key: "motd-profit",
      label: "MOTD Profit",
      value: earningsSummary.motdProfit,
      status: null,
      icon: Wallet,
      hint: "Commission kept by MOTD",
      accent: "teal",
      delay: 0.05,
    },
    {
      key: "pay-tailors",
      label: "Pay to Tailors",
      value: tailorPayCard.value,
      status: tailorPayCard.status,
      icon: Scissors,
      hint: tailorPayCard.hint,
      accent: "indigo",
      delay: 0.1,
    },
    {
      key: "pay-fabrics",
      label: "Pay To Fabrics",
      value: fabricPayCard.value,
      status: fabricPayCard.status,
      icon: Store,
      hint: fabricPayCard.hint,
      accent: "sky",
      delay: 0.15,
    },
    {
      key: "pay-shipaa",
      label: "Pay to Shipaa",
      value: shipaaPayCard.value,
      status: shipaaPayCard.status,
      icon: Truck,
      hint: shipaaPayCard.hint,
      accent: "amber",
      delay: 0.2,
    },
  ];

  return (
    <div className="space-y-6">
      <ConfirmationModal
        isOpen={!!releaseConfirmRow}
        title="Release payment"
        message={
          releaseConfirmRow
            ? `Release ${formatCurrency(releaseConfirmRow.remaining)} to ${releaseConfirmRow.name}${
                releaseConfirmRow.payeeName &&
                releaseConfirmRow.payeeName !== releaseConfirmRow.name
                  ? ` (${releaseConfirmRow.payeeName})`
                  : ""
              }? This will move the amount to Transaction History.`
            : ""
        }
        confirmLabel={releasingKey ? "Releasing…" : "Release payment"}
        cancelLabel="Cancel"
        onConfirm={() => {
          if (releaseConfirmRow) void releasePartnerPayment(releaseConfirmRow);
        }}
        onCancel={() => {
          if (!releasingKey) setReleaseConfirmRow(null);
        }}
        isLoading={!!releasingKey}
      />

      <ConfirmationModal
        isOpen={!!deleteConfirmTx}
        title="Delete Transaction"
        message={
          deleteConfirmTx
            ? `Permanently delete the ${formatCurrency(Number(deleteConfirmTx.amount) || 0)} release to ${deleteConfirmTx.partnerName} from Transaction History? The payment stays settled and will not return as unpaid.`
            : ""
        }
        confirmLabel={deletingTxId ? "Deleting…" : "Delete"}
        cancelLabel="Cancel"
        onConfirm={() => {
          if (deleteConfirmTx) void deletePartnerTransaction(deleteConfirmTx);
        }}
        onCancel={() => {
          if (!deletingTxId) setDeleteConfirmTx(null);
        }}
        isLoading={!!deletingTxId}
        isDanger
      />

      <ConfirmationModal
        isOpen={!!approveConfirmRequest}
        title="Approve payout request"
        message={
          approveConfirmRequest
            ? `Approve ${formatCurrency(Number(approveConfirmRequest.amount) || 0)} for ${approveConfirmRequest.partnerName}? This will release the payment into Transaction History.`
            : ""
        }
        confirmLabel={reviewingRequestId ? "Approving…" : "Approve & release"}
        cancelLabel="Cancel"
        onConfirm={() => {
          if (approveConfirmRequest)
            void approvePayoutRequest(approveConfirmRequest);
        }}
        onCancel={() => {
          if (!reviewingRequestId) setApproveConfirmRequest(null);
        }}
        isLoading={!!reviewingRequestId}
      />

      <ConfirmationModal
        isOpen={!!rejectConfirmRequest}
        title="Reject payout request"
        message={
          rejectConfirmRequest
            ? `Reject the ${formatCurrency(Number(rejectConfirmRequest.amount) || 0)} request from ${rejectConfirmRequest.partnerName}? They can submit a new request later.`
            : ""
        }
        confirmLabel={reviewingRequestId ? "Rejecting…" : "Reject request"}
        cancelLabel="Cancel"
        onConfirm={() => {
          if (rejectConfirmRequest)
            void rejectPayoutRequest(rejectConfirmRequest);
        }}
        onCancel={() => {
          if (!reviewingRequestId) setRejectConfirmRequest(null);
        }}
        isLoading={!!reviewingRequestId}
        isDanger
      />

      <ConfirmationModal
        isOpen={!!deleteConfirmRequest}
        title="Delete request"
        message={
          deleteConfirmRequest
            ? `Permanently delete the ${formatCurrency(Number(deleteConfirmRequest.amount) || 0)} ${deleteConfirmRequest.status} request from ${deleteConfirmRequest.partnerName} in Request History?`
            : ""
        }
        confirmLabel={deletingRequestId ? "Deleting…" : "Delete"}
        cancelLabel="Cancel"
        onConfirm={() => {
          if (deleteConfirmRequest)
            void deletePayoutRequest(deleteConfirmRequest);
        }}
        onCancel={() => {
          if (!deletingRequestId) setDeleteConfirmRequest(null);
        }}
        isLoading={!!deletingRequestId}
        isDanger
      />

      {/* Header */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="[font-family:var(--font-ui)] text-[10px] uppercase tracking-[0.28em] text-(--dash-muted)">
            Finance
          </p>
          <h1 className="[font-family:var(--font-display)] mt-1 text-3xl text-(--dash-ink) sm:text-4xl">
            Payments
          </h1>
          <p className="mt-1 max-w-xl text-sm text-(--dash-muted)">
            Collective partner payouts with order breakdown under each tailor,
            fabric store, and shipping company.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <LocaleSwitcher />
          <TimeframePills value={timeframe} onChange={setTimeframe} />
          <button
            type="button"
            onClick={() => refreshAll()}
            disabled={isRefreshing}
            className="inline-flex items-center gap-2 rounded-xl border border-(--dash-border) bg-(--dash-surface) px-3 py-2 text-xs text-(--dash-ink) transition hover:border-(--dash-gold)"
          >
            <RefreshCw
              className={`h-3.5 w-3.5 ${isRefreshing ? "animate-spin" : ""}`}
            />
            Refresh
          </button>
        </div>
      </div>

      {/* Summary totals — same StatCard UI as /admin dashboard */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
        {summaryCards.map((card) => (
          <StatCard
            key={card.key}
            icon={card.icon}
            label={card.label}
            value={formatKpiCurrency(card.value)}
            subValue={card.hint}
            compact
            delay={card.delay}
            accent={card.accent}
            badge={
              card.status ? (
                <span
                  className={`rounded-full border px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wide ${statusBadgeClass(card.status)}`}
                >
                  {card.status}
                </span>
              ) : undefined
            }
          />
        ))}
      </div>

      {/* Partner payout requests queue — only when pending exist */}
      {payoutRequestsPendingCount > 0 ? (
        <div className="rounded-(--dash-radius) border border-(--dash-border) bg-(--dash-surface) p-5 shadow-sm sm:p-6">
          <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
            <div>
              <h3 className="[font-family:var(--font-display)] text-lg text-(--dash-ink)">
                Partner payout requests
              </h3>
              <p className="mt-1 text-xs text-(--dash-muted)">
                Pending requests from fabric stores and tailors. Approve or
                reject — reviewed items move to Request History below.
              </p>
            </div>
            <span className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[10px] font-medium uppercase tracking-wide text-amber-800">
              {payoutRequestsPendingCount} pending
            </span>
          </div>

          <div className="space-y-3">
            {payoutRequests
              .filter((r) => r.status === "pending")
              .map((request) => {
                const orderCount = Array.isArray(request.orders)
                  ? request.orders.length
                  : 0;
                const isBusy = reviewingRequestId === request._id;
                const KindIcon =
                  request.partnerKind === "tailor" ? Scissors : Store;
                return (
                  <div
                    key={request._id}
                    className="flex flex-col gap-3 rounded-xl border border-(--dash-border) bg-white p-4 lg:flex-row lg:items-center lg:justify-between"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="inline-flex items-center gap-1.5 rounded-md bg-(--dash-bg) px-2 py-0.5 text-[10px] uppercase tracking-[0.14em] text-(--dash-muted)">
                          <KindIcon className="h-3.5 w-3.5" />
                          {partnerKindLabel(request.partnerKind)}
                        </span>
                        <p className="font-medium text-(--dash-ink)">
                          {request.partnerName}
                        </p>
                        <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-amber-800">
                          pending
                        </span>
                      </div>
                      <p className="mt-2 text-[11px] text-(--dash-muted)">
                        {formatCurrency(Number(request.amount) || 0)} ·{" "}
                        {orderCount} order{orderCount === 1 ? "" : "s"}
                        {request.requestedAt
                          ? ` · ${new Date(request.requestedAt).toLocaleString()}`
                          : ""}
                      </p>
                      {request.note ? (
                        <p className="mt-1 text-[11px] text-(--dash-muted)">
                          Note: {request.note}
                        </p>
                      ) : null}
                    </div>
                    <div className="flex shrink-0 flex-wrap items-center gap-2">
                      <button
                        type="button"
                        disabled={!!reviewingRequestId}
                        onClick={() => setApproveConfirmRequest(request)}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-(--dash-charcoal) px-3 py-2 text-xs text-white transition hover:opacity-90 disabled:opacity-50"
                      >
                        <Check className="h-3.5 w-3.5" />
                        {isBusy ? "Working…" : "Approve"}
                      </button>
                      <button
                        type="button"
                        disabled={!!reviewingRequestId}
                        onClick={() => setRejectConfirmRequest(request)}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-800 transition hover:bg-rose-100 disabled:opacity-50"
                      >
                        <X className="h-3.5 w-3.5" />
                        Reject
                      </button>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      ) : null}

      {/* Partner payouts with nested order breakdown */}
      <div className="rounded-(--dash-radius) border border-(--dash-border) bg-(--dash-surface) p-5 shadow-sm sm:p-6">
        <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h3 className="[font-family:var(--font-display)] text-lg text-(--dash-ink)">
              Collective amount Admin must pay
            </h3>
            <p className="mt-1 max-w-2xl text-xs text-(--dash-muted)">
              Expand a partner to see related orders. Releasing a payment
              removes it from this list and adds it to Transaction History.
            </p>
          </div>
          <div className="relative w-full max-w-xs shrink-0">
            <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-(--dash-muted)" />
            <input
              type="text"
              placeholder="Search partner or order..."
              value={pricingSearch}
              onChange={(e) => setPricingSearch(e.target.value)}
              className="w-full rounded-xl border border-(--dash-border) bg-white py-1.5 pl-9 pr-3 text-xs text-(--dash-ink) outline-none transition focus:border-(--dash-gold)"
            />
          </div>
        </div>

        {pricingLoading && partnerPayoutRows.length === 0 ? (
          <TableSkeleton rows={5} cols={4} className="rounded-xl border-0" />
        ) : partnerPayoutRows.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <PackageSearch
              className="mb-3 h-12 w-12 text-(--dash-border)"
              strokeWidth={1}
            />
            <p className="text-xs text-(--dash-muted)">
              No pending partner payouts. Released payments appear in
              Transaction History below.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {partnerPayoutRows.map((row) => {
              const expanded = expandedPartnerKey === row.key;
              return (
                <div
                  key={row.key}
                  className="rounded-xl border border-(--dash-border) bg-white"
                >
                  <div className="flex flex-col gap-3 p-4 lg:flex-row lg:items-center lg:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="inline-flex items-center gap-1.5 rounded-md bg-(--dash-bg) px-2 py-0.5 text-[10px] uppercase tracking-[0.14em] text-(--dash-muted)">
                          <PartnerIcon kind={row.kind} />
                          {partnerKindLabel(row.kind)}
                        </span>
                        <p className="font-medium text-(--dash-ink)">
                          {row.name}
                        </p>
                      </div>
                      {row.payeeName && row.payeeName !== row.name ? (
                        <p className="mt-1 text-[11px] text-(--dash-muted)">
                          Payee: {row.payeeName}
                        </p>
                      ) : null}
                      <p className="mt-2 text-[11px] text-(--dash-muted)">
                        {row.orderCount} order
                        {row.orderCount === 1 ? "" : "s"} · Amount due{" "}
                        <span className="font-medium text-(--dash-ink)">
                          {formatCurrency(row.remaining)}
                        </span>
                      </p>
                    </div>
                    <div className="flex shrink-0 flex-wrap items-center gap-2">
                      <button
                        type="button"
                        disabled={!!releasingKey}
                        onClick={() =>
                          setReleaseConfirmRow({
                            key: row.key,
                            kind: row.kind,
                            name: row.name,
                            payeeName: row.payeeName,
                            ids: row.ids,
                            remaining: row.remaining,
                            orders: row.orders,
                          })
                        }
                        className="inline-flex items-center gap-1.5 rounded-lg bg-(--dash-charcoal) px-3 py-1.5 text-xs font-medium text-white disabled:opacity-60"
                      >
                        Release {formatCurrency(row.remaining)}
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setExpandedPartnerKey(expanded ? null : row.key)
                        }
                        aria-expanded={expanded}
                        className="inline-flex items-center gap-1.5 text-xs text-(--dash-muted) transition hover:text-(--dash-ink)"
                      >
                        {expanded ? "Hide orders" : "View orders"}
                        <ChevronDown
                          className={`h-3.5 w-3.5 transition ${
                            expanded ? "rotate-180" : ""
                          }`}
                        />
                      </button>
                    </div>
                  </div>

                  {expanded && (
                    <div className="space-y-3 border-t border-(--dash-border) bg-(--dash-bg) p-4">
                      <div className="grid grid-cols-1 gap-2 text-[11px] text-(--dash-muted) sm:grid-cols-3">
                        {row.contact ? (
                          <p className="flex items-center gap-1.5">
                            <Phone className="h-3 w-3 shrink-0" />
                            {row.contact}
                          </p>
                        ) : null}
                        {row.email ? (
                          <p className="flex items-center gap-1.5">
                            <Mail className="h-3 w-3 shrink-0" />
                            {row.email}
                          </p>
                        ) : null}
                        {row.city || row.location ? (
                          <p className="flex items-center gap-1.5">
                            <MapPin className="h-3 w-3 shrink-0" />
                            {[row.location, row.city]
                              .filter(Boolean)
                              .join(", ")}
                          </p>
                        ) : null}
                        {row.pickup ? (
                          <p className="sm:col-span-3">Pickup: {row.pickup}</p>
                        ) : null}
                      </div>

                      <div className="space-y-2">
                        {row.orders.map((orderLine) => (
                          <div
                            key={`${row.key}-${orderLine.orderId}`}
                            className="rounded-lg border border-(--dash-border) bg-white p-3"
                          >
                            <div className="flex flex-wrap items-start justify-between gap-2">
                              <div>
                                <p className="text-sm font-medium text-(--dash-ink)">
                                  Order #{orderLine.orderId.slice(-6)}
                                  <span className="ml-2 rounded-md bg-(--dash-bg) px-2 py-0.5 text-[10px] font-normal capitalize text-(--dash-ink)">
                                    {orderLine.channel}
                                  </span>
                                </p>
                                {orderLine.meta ? (
                                  <p className="mt-1 text-[11px] text-(--dash-muted)">
                                    {row.kind === "tailor"
                                      ? "Design"
                                      : "Fabric"}
                                    : {orderLine.meta}
                                  </p>
                                ) : null}
                                {orderLine.shippingLabel ? (
                                  <p className="mt-1 text-[11px] text-(--dash-muted)">
                                    {orderLine.shippingLabel}
                                  </p>
                                ) : null}
                              </div>
                              <p className="text-base font-medium text-(--dash-ink)">
                                {formatCurrency(orderLine.amount)}
                              </p>
                            </div>

                            {row.kind === "shipping" ? (
                              <div className="mt-2 space-y-1 text-[11px] text-(--dash-muted)">
                                <p>
                                  Delivery fee collected ={" "}
                                  {formatKpiCurrency(orderLine.amount)} (paid in
                                  full to {SHIPPING_COMPANY_NAME})
                                </p>
                                {(orderLine.deliveryLines || [])
                                  .filter(
                                    (line: any) => line?.billable !== false,
                                  )
                                  .map((line: any, idx: number) => (
                                    <p
                                      key={`${orderLine.orderId}-leg-${idx}`}
                                      className="text-(--dash-ink)"
                                    >
                                      {formatShippingLegLine(line)}
                                    </p>
                                  ))}
                              </div>
                            ) : (
                              <p className="mt-2 text-[11px] text-(--dash-muted)">
                                Gross {formatCurrency(orderLine.gross)} − MOTD{" "}
                                {formatCurrency(orderLine.commission)} (
                                {orderLine.percent}%) ={" "}
                                {formatCurrency(orderLine.amount)}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        <p className="mt-4 text-sm text-(--dash-ink)">
          Pending to release{" "}
          <span className="font-medium">
            {formatKpiCurrency(
              pendingByKind.tailor +
                pendingByKind.fabric +
                pendingByKind.shipping,
            )}
          </span>
        </p>
      </div>

      {/* Transaction history */}
      <div className="rounded-(--dash-radius) border border-(--dash-border) bg-(--dash-surface) p-5 shadow-sm sm:p-6">
        <div className="mb-4">
          <h3 className="[font-family:var(--font-display)] text-lg text-(--dash-ink)">
            Transaction History
          </h3>
          <p className="mt-1 text-xs text-(--dash-muted)">
            Payments Admin has already released to partners.
          </p>
        </div>

        {transactions.length === 0 ? (
          <p className="py-8 text-center text-xs text-(--dash-muted)">
            No payment releases yet.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-(--dash-border)">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-(--dash-bg) text-[10px] uppercase tracking-[0.16em] text-(--dash-muted)">
                <tr>
                  <th className="px-4 py-3 font-medium">Date</th>
                  <th className="px-4 py-3 font-medium">Partner</th>
                  <th className="px-4 py-3 font-medium">Name</th>
                  <th className="px-4 py-3 font-medium">Orders</th>
                  <th className="px-4 py-3 font-medium">Amount</th>
                  <th className="px-4 py-3 font-medium">Released by</th>
                  <th className="px-4 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((tx) => {
                  const releasedByName =
                    typeof tx.releasedBy === "object" && tx.releasedBy
                      ? tx.releasedBy.name || tx.releasedBy.email || "Admin"
                      : "Admin";
                  const isDeleting = deletingTxId === tx._id;
                  return (
                    <tr
                      key={tx._id}
                      className="border-t border-(--dash-border) bg-white"
                    >
                      <td className="px-4 py-3 text-xs text-(--dash-ink)">
                        {tx.releasedAt
                          ? new Date(tx.releasedAt).toLocaleString()
                          : "—"}
                      </td>
                      <td className="px-4 py-3 text-xs text-(--dash-muted)">
                        {partnerKindLabel(tx.partnerKind)}
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-medium text-(--dash-ink)">
                          {tx.partnerName}
                        </p>
                        {tx.payeeName && tx.payeeName !== tx.partnerName ? (
                          <p className="text-[11px] text-(--dash-muted)">
                            {tx.payeeName}
                          </p>
                        ) : null}
                      </td>
                      <td className="px-4 py-3 text-xs text-(--dash-ink)">
                        {tx.orders?.length
                          ? tx.orders
                              .map((o) => `#${String(o.orderId).slice(-6)}`)
                              .join(", ")
                          : "—"}
                      </td>
                      <td className="px-4 py-3 text-xs font-medium text-(--dash-ink)">
                        {formatCurrency(Number(tx.amount) || 0)}
                      </td>
                      <td className="px-4 py-3 text-xs text-(--dash-muted)">
                        {releasedByName}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          title="Delete transaction"
                          aria-label={`Delete transaction for ${tx.partnerName}`}
                          disabled={!!deletingTxId}
                          onClick={() => setDeleteConfirmTx(tx)}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-red-600 transition hover:bg-red-50 disabled:opacity-50"
                        >
                          <Trash2
                            className={`h-4 w-4 ${isDeleting ? "animate-pulse" : ""}`}
                          />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Request history — approved / rejected fabric requests */}
      <div className="rounded-(--dash-radius) border border-(--dash-border) bg-(--dash-surface) p-5 shadow-sm sm:p-6">
        <div className="mb-4">
          <h3 className="[font-family:var(--font-display)] text-lg text-(--dash-ink)">
            Request History
          </h3>
          <p className="mt-1 text-xs text-(--dash-muted)">
            Approved and rejected partner payout requests. Delete removes the
            record from this list only.
          </p>
        </div>

        {payoutRequests.filter((r) => r.status !== "pending").length === 0 ? (
          <p className="py-8 text-center text-xs text-(--dash-muted)">
            No reviewed payout requests yet.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-(--dash-border)">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-(--dash-bg) text-[10px] uppercase tracking-[0.16em] text-(--dash-muted)">
                <tr>
                  <th className="px-4 py-3 font-medium">Requested</th>
                  <th className="px-4 py-3 font-medium">Reviewed</th>
                  <th className="px-4 py-3 font-medium">Partner</th>
                  <th className="px-4 py-3 font-medium">Name</th>
                  <th className="px-4 py-3 font-medium">Orders</th>
                  <th className="px-4 py-3 font-medium">Amount</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {payoutRequests
                  .filter((r) => r.status !== "pending")
                  .map((request) => {
                    const orderCount = Array.isArray(request.orders)
                      ? request.orders.length
                      : 0;
                    const isDeleting = deletingRequestId === request._id;
                    return (
                      <tr
                        key={request._id}
                        className="border-t border-(--dash-border) bg-white"
                      >
                        <td className="px-4 py-3 text-xs text-(--dash-ink)">
                          {request.requestedAt
                            ? new Date(request.requestedAt).toLocaleString()
                            : "—"}
                        </td>
                        <td className="px-4 py-3 text-xs text-(--dash-muted)">
                          {request.reviewedAt
                            ? new Date(request.reviewedAt).toLocaleString()
                            : "—"}
                        </td>
                        <td className="px-4 py-3 text-xs text-(--dash-muted)">
                          {partnerKindLabel(request.partnerKind)}
                        </td>
                        <td className="px-4 py-3">
                          <p className="font-medium text-(--dash-ink)">
                            {request.partnerName}
                          </p>
                        </td>
                        <td className="px-4 py-3 text-xs text-(--dash-muted)">
                          {orderCount}
                        </td>
                        <td className="px-4 py-3 font-medium text-(--dash-ink)">
                          {formatCurrency(Number(request.amount) || 0)}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide ${
                              request.status === "approved"
                                ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                                : "border-rose-200 bg-rose-50 text-rose-800"
                            }`}
                          >
                            {request.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            type="button"
                            title="Delete request"
                            aria-label={`Delete request for ${request.partnerName}`}
                            disabled={!!deletingRequestId}
                            onClick={() => setDeleteConfirmRequest(request)}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-red-600 transition hover:bg-red-50 disabled:opacity-50"
                          >
                            <Trash2
                              className={`h-4 w-4 ${isDeleting ? "animate-pulse" : ""}`}
                            />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
