"use client";

import { useCallback, useEffect, useState, type MouseEvent } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { api, type ApiError } from "@/lib/api/client";
import { formatCurrency } from "@/lib/format";
import type { Locale } from "@/i18n/routing";
import {
  formatOrderDate,
  getDesignDisplayName,
  getFabricDisplayName,
  getOrderHeadline,
  getOrderItemsSummary,
  getTailorDisplayName,
  hasActiveCustomerShipments,
  shortenOrderId,
  type CustomOrderDetail,
  type CustomOrderLineItemSummary,
  type CustomOrderListItem,
  type RetailOrderListItem,
} from "@/lib/customOrders";
import OrderProgressPanel from "@/components/orders/OrderProgressPanel";
import { ChevronDown, ChevronUp, Maximize2, Package, Scissors, Sparkles, CheckCircle2, Info } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { resolveDesignImage } from "@/lib/tailors";
import { resolveFabricImage } from "@/lib/fabrics";
import { resolveReadyMadeImage } from "@/lib/readyMade";
import { resolveMediaUrl } from "@/lib/media";
import { useMemo } from "react";
import { ImageModal } from "@/components/shared/ImageModal";
import { Skeleton } from "@/components/ui/Skeleton";

type ReturnDraft = {
  condition: string;
  reason: string;
  comment: string;
  pickupAddress: {
    fullName: string;
    line1: string;
    line2: string;
    city: string;
    state: string;
    postalCode: string;
    phone: string;
  };
};

type ReturnState = {
  checked: Record<string, boolean>;
  error: Record<string, string | null>;
  formOpen: Record<string, boolean>;
  dropdownOpen: Record<string, boolean>;
  submitting: Record<string, boolean>;
  success: Record<string, string | null>;
  draft: Record<string, ReturnDraft>;
};

type ReceivedState = {
  submitting: Record<string, boolean>;
  error: Record<string, string | null>;
};

const CONDITION_OPTIONS = [
  { value: "Good", label: "Good" },
  { value: "Bad", label: "Bad" },
  { value: "Perfect", label: "Perfect" },
];

type CustomOrdersTabProps = {
  locale: Locale;
  initialOrderId?: string | null;
};

type Address = {
  isDefault?: boolean;
  fullName?: string;
  street?: string;
  building?: string;
  city?: string;
  emirate?: string;
  postalCode?: string;
  phone?: string;
};

type CustomerProfile = {
  name?: string;
  phone?: string;
  addresses?: Address[];
};

export default function CustomOrdersTab({
  locale,
  initialOrderId = null,
}: CustomOrdersTabProps) {
  const t = useTranslations("OrdersPage.custom");
  const tRetail = useTranslations("OrdersPage.retail");
  const tLogistics = useTranslations("OrdersPage.logistics");
  const tReview = useTranslations("CustomOrderReview");

  const [customOrders, setCustomOrders] = useState<CustomOrderListItem[]>([]);
  const [retailOrders, setRetailOrders] = useState<RetailOrderListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [retailExpandedId, setRetailExpandedId] = useState<string | null>(null);
  const [itemsOpenId, setItemsOpenId] = useState<string | null>(null);
  const [priceDetailsOpenIds, setPriceDetailsOpenIds] = useState<
    Record<string, boolean>
  >({});
  const [retailFabricDesignOpenIds, setRetailFabricDesignOpenIds] = useState<
    Record<string, boolean>
  >({});
  const [retailProgressOpenIds, setRetailProgressOpenIds] = useState<
    Record<string, boolean>
  >({});

  const handleToggleRetailProgress = (orderId: string) => {
    setRetailProgressOpenIds((prev) => ({
      ...prev,
      [orderId]: !prev[orderId],
    }));
  };

  const handleTogglePriceDetails = (orderId: string) => {
    setPriceDetailsOpenIds((prev) => ({
      ...prev,
      [orderId]: !prev[orderId],
    }));
  };

  const handleToggleRetailDetails = (orderId: string) => {
    setRetailFabricDesignOpenIds((prev) => ({
      ...prev,
      [orderId]: !prev[orderId],
    }));
  };

  const [detailById, setDetailById] = useState<
    Record<string, CustomOrderDetail>
  >({});
  const [detailLoadingId, setDetailLoadingId] = useState<string | null>(null);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [customerProfile, setCustomerProfile] =
    useState<CustomerProfile | null>(null);

  const [returnState, setReturnState] = useState<ReturnState>({
    checked: {},
    error: {},
    formOpen: {},
    dropdownOpen: {},
    submitting: {},
    success: {},
    draft: {},
  });

  const [receivedState, setReceivedState] = useState<ReceivedState>({
    submitting: {},
    error: {},
  });

  const [imageModalOpen, setImageModalOpen] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string>("");
  const [selectedImageAlt, setSelectedImageAlt] = useState<string>("");

  const handleImageClick = (imageUrl: string, alt: string = "Image") => {
    if (imageUrl) {
      setSelectedImage(imageUrl);
      setSelectedImageAlt(alt);
      setImageModalOpen(true);
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        const [customRes, retailRes, profileRes] = await Promise.all([
          api
            .get<{
              success: boolean;
              orders: CustomOrderListItem[];
            }>("/api/orders/custom/mine")
            .catch(() => ({ success: false, orders: [] })),
          api
            .get<{
              success: boolean;
              orders: RetailOrderListItem[];
            }>("/api/orders/retail/mine")
            .catch(() => ({ success: false, orders: [] })),
          api.get<CustomerProfile>("/api/customer/profile").catch(() => null),
        ]);

        setCustomOrders(customRes.orders || []);
        setRetailOrders(retailRes.orders || []);
        if (profileRes) setCustomerProfile(profileRes);
      } catch (err: unknown) {
        setError(
          (err as ApiError)?.message ||
            (err instanceof Error ? err.message : t("error")),
        );
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [t]);

  type UnifiedOrderListItem =
    | {
        type: "custom";
        date: string | Date;
        id: string;
        order: CustomOrderListItem;
      }
    | {
        type: "retail";
        date: string | Date;
        id: string;
        order: RetailOrderListItem;
      };

  const unifiedOrders = useMemo(() => {
    const list: UnifiedOrderListItem[] = [
      ...customOrders.map((o) => ({
        type: "custom" as const,
        date: o.date,
        id: o.id,
        order: o,
      })),
      ...retailOrders.map((o) => ({
        type: "retail" as const,
        date: o.date,
        id: o.id,
        order: o,
      })),
    ];
    return list.sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
    );
  }, [customOrders, retailOrders]);

  const loadDetail = useCallback(
    async (orderId: string) => {
      if (detailById[orderId]) return;
      try {
        setDetailLoadingId(orderId);
        setDetailError(null);
        const data = await api.get<{
          success: boolean;
          order: CustomOrderDetail;
        }>(`/api/orders/custom/${orderId}`);
        if (!data?.success || !data.order)
          throw new Error("Failed to load order detail");
        setDetailById((prev) => ({ ...prev, [orderId]: data.order }));
      } catch (err: unknown) {
        setDetailError(
          (err as ApiError)?.message ||
            (err instanceof Error ? err.message : t("detailError")),
        );
      } finally {
        setDetailLoadingId(null);
      }
    },
    [detailById, t],
  );

  useEffect(() => {
    if (!initialOrderId || loading) return;
    const customMatch = customOrders.find((o) => o.id === initialOrderId);
    if (customMatch) {
      setExpandedId(initialOrderId);
      void loadDetail(initialOrderId);
      return;
    }
    const retailMatch = retailOrders.find((o) => o.id === initialOrderId);
    if (retailMatch) {
      setRetailExpandedId(initialOrderId);
    }
  }, [initialOrderId, loading, customOrders, retailOrders, loadDetail]);

  const handleToggleTimeline = async (orderId: string) => {
    if (expandedId === orderId) {
      setExpandedId(null);
      return;
    }
    setExpandedId(orderId);
    await loadDetail(orderId);
  };

  const handleToggleItems = (orderId: string, event: MouseEvent) => {
    event.stopPropagation();
    setItemsOpenId((prev) => (prev === orderId ? null : orderId));
  };

  const markReceived = async (orderId: string) => {
    setReceivedState((prev) => ({
      ...prev,
      submitting: { ...prev.submitting, [orderId]: true },
      error: { ...prev.error, [orderId]: null },
    }));

    try {
      const res = await api.post<{ success: boolean }>(
        `/api/orders/custom/${orderId}/mark-received`,
        {},
      );
      if (!res?.success) throw new Error("Failed to mark as received");

      await loadDetail(orderId);
      setCustomOrders((prev) =>
        prev.map((o) => (o.id === orderId ? { ...o, status: "delivered" } : o)),
      );
      setReceivedState((prev) => ({
        ...prev,
        error: { ...prev.error, [orderId]: null },
      }));
    } catch (err: unknown) {
      setReceivedState((prev) => ({
        ...prev,
        error: {
          ...prev.error,
          [orderId]:
            (err as ApiError)?.message ||
            (err instanceof Error ? err.message : t("error")),
        },
      }));
    } finally {
      setReceivedState((prev) => ({
        ...prev,
        submitting: { ...prev.submitting, [orderId]: false },
      }));
    }
  };

  const getDefaultAddress = (): Address | null => {
    if (!customerProfile?.addresses?.length) return null;
    return (
      customerProfile.addresses.find((a) => a.isDefault) ||
      customerProfile.addresses[0]
    );
  };

  const toggleReturnForm = (orderId: string) => {
    const isOpen = returnState.formOpen[orderId];
    if (!isOpen) {
      const defaultAddr = getDefaultAddress();
      setReturnState((prev) => ({
        ...prev,
        formOpen: { ...prev.formOpen, [orderId]: true },
        error: { ...prev.error, [orderId]: null },
        success: { ...prev.success, [orderId]: null },
        draft: {
          ...prev.draft,
          [orderId]: {
            condition: "Good",
            reason: "",
            comment: "",
            pickupAddress: {
              fullName: defaultAddr?.fullName || customerProfile?.name || "",
              line1: defaultAddr?.street || "",
              line2: defaultAddr?.building || "",
              city: defaultAddr?.city || "",
              state: defaultAddr?.emirate || "",
              postalCode: defaultAddr?.postalCode || "",
              phone: defaultAddr?.phone || customerProfile?.phone || "",
            },
          },
        },
      }));
    } else {
      setReturnState((prev) => ({
        ...prev,
        formOpen: { ...prev.formOpen, [orderId]: false },
        dropdownOpen: { ...prev.dropdownOpen, [orderId]: false },
      }));
    }
  };

  const closeReturnForm = (orderId: string) => {
    setReturnState((prev) => ({
      ...prev,
      formOpen: { ...prev.formOpen, [orderId]: false },
      dropdownOpen: { ...prev.dropdownOpen, [orderId]: false },
      error: { ...prev.error, [orderId]: null },
      success: { ...prev.success, [orderId]: null },
    }));
  };

  const submitReturn = async (orderId: string) => {
    setReturnState((prev) => ({
      ...prev,
      error: { ...prev.error, [orderId]: null },
      success: { ...prev.success, [orderId]: null },
      submitting: { ...prev.submitting, [orderId]: true },
    }));

    try {
      const draft = returnState.draft[orderId];
      if (!draft) throw new Error("Missing return details");

      const fields: [any, string][] = [
        [draft.condition, "Condition is required"],
        [draft.reason.trim(), "Reason is required"],
        [draft.pickupAddress.fullName, "Full name is required"],
        [
          draft.pickupAddress.phone?.replace(/\D/g, "").length >= 12,
          "Valid phone number required",
        ],
        [draft.pickupAddress.line1, "Address line 1 required"],
        [draft.pickupAddress.city, "City required"],
        [draft.pickupAddress.state, "State required"],
        [draft.pickupAddress.postalCode, "Postal code required"],
      ];

      for (const [value, message] of fields) {
        if (!value) throw new Error(message);
      }

      const res = await api.post<{ success: boolean }>(
        `/api/orders/custom/${orderId}/return-request`,
        {
          returnCondition: draft.condition,
          returnReason: draft.reason,
          returnComment: draft.comment,
          returnPickupAddress: {
            fullName: draft.pickupAddress.fullName,
            line1: draft.pickupAddress.line1,
            line2: draft.pickupAddress.line2,
            city: draft.pickupAddress.city,
            emirate: draft.pickupAddress.state,
            postalCode: draft.pickupAddress.postalCode,
            phone: draft.pickupAddress.phone,
          },
        },
      );

      if (!res?.success) throw new Error("Return request failed");
      setReturnState((prev) => ({
        ...prev,
        success: {
          ...prev.success,
          [orderId]: "Return request submitted successfully",
        },
        checked: { ...prev.checked, [orderId]: false },
      }));
      setTimeout(() => closeReturnForm(orderId), 3000);
    } catch (err: unknown) {
      setReturnState((prev) => ({
        ...prev,
        error: {
          ...prev.error,
          [orderId]:
            (err as ApiError)?.message ||
            (err instanceof Error ? err.message : t("error")),
        },
      }));
    } finally {
      setReturnState((prev) => ({
        ...prev,
        submitting: { ...prev.submitting, [orderId]: false },
      }));
    }
  };

  const updateDraft = (orderId: string, updates: Partial<ReturnDraft>) => {
    setReturnState((prev) => ({
      ...prev,
      draft: {
        ...prev.draft,
        [orderId]: { ...prev.draft[orderId], ...updates } as ReturnDraft,
      },
    }));
  };

  const updateAddress = (
    orderId: string,
    updates: Partial<ReturnDraft["pickupAddress"]>,
  ) => {
    setReturnState((prev) => ({
      ...prev,
      draft: {
        ...prev.draft,
        [orderId]: {
          ...prev.draft[orderId],
          pickupAddress: { ...prev.draft[orderId]?.pickupAddress, ...updates },
        } as ReturnDraft,
      },
    }));
  };

  const renderItemRow = (
    item: CustomOrderLineItemSummary,
    index: number,
    fabricSource: CustomOrderListItem["fabricSource"],
  ) => {
    const designName =
      getDesignDisplayName(item.design, locale) || t("unknownDesign");
    const fabricName =
      fabricSource === "self"
        ? t("ownFabric")
        : getFabricDisplayName(item.fabric, locale) || t("unknownFabric");
    const tailorName = getTailorDisplayName(item.tailorShop, locale);

    return (
      <li
        key={`${designName}-${index}`}
        className="px-3 sm:px-4 py-2.5 sm:py-3 border-b border-gray-100 last:border-b-0 bg-white hover:bg-gray-50/50 transition"
      >
        <p className="font-medium text-sm sm:text-[15px] text-black mb-1">
          {designName}
        </p>
        <div className="flex flex-wrap gap-x-3 gap-y-1 text-[10px] sm:text-[11px] text-gray-500">
          {tailorName && <span>{tailorName}</span>}
          <span>{fabricName}</span>
          {item.fabricMeters != null && (
            <span>
              {item.fabricMeters} {t("meters")}
            </span>
          )}
        </div>
      </li>
    );
  };

  if (loading) {
    return (
      <div className="space-y-3 py-4" role="status" aria-label="Loading">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="border border-(--color-border) bg-white p-4 space-y-3"
          >
            <div className="flex justify-between gap-3">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-20" />
            </div>
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-2/3" />
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <p className="text-center text-red-600 py-16 text-sm sm:text-base">
        {error}
      </p>
    );
  }

  if (unifiedOrders.length === 0) {
    return (
      <div className="text-center py-16 sm:py-20 border border-gray-200 bg-[#FDFAF5] rounded-2xl px-6">
        <Package className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <p className="font-display text-xl sm:text-2xl mb-2">
          {t("emptyTitle")}
        </p>
        <p className="text-sm text-gray-500 mb-6 max-w-md mx-auto">
          {t("emptyDescription")}
        </p>
        <div className="flex flex-wrap gap-4 justify-center">
          <Link
            href="/custom-order/fabric"
            className="inline-block px-6 sm:px-8 py-2.5 sm:py-3 bg-black text-white text-[9px] tracking-[0.2em] uppercase hover:bg-[#2A2A28] transition font-ui rounded-lg"
          >
            {t("startOrder")}
          </Link>
          <Link
            href="/#ready-made"
            className="inline-block px-6 sm:px-8 py-2.5 sm:py-3 bg-transparent border border-black text-black text-[9px] tracking-[0.2em] uppercase hover:bg-black hover:text-white transition font-ui rounded-lg"
          >
            {tRetail("browseReadyMade") || "Browse Ready Made"}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {unifiedOrders.map((unified) => {
        if (unified.type === "custom") {
          const order = unified.order;
          const isExpanded = expandedId === order.id;
          const isItemsOpen = itemsOpenId === order.id;
          const detail = detailById[order.id];
          const items = getOrderItemsSummary(order);
          const headline = getOrderHeadline(order, locale, {
            singleFallback: t("unknownDesign"),
            multiple: (count) => t("multipleItemsTitle", { count }),
          });
          const tailorName = getTailorDisplayName(order.tailorShop, locale);
          const showItemsToggle = items.length > 0;
          const isDelivered = detail?.status === "delivered";
          const isOutForDelivery = detail?.status === "out_for_delivery";

          return (
            <article
              key={`custom-${order.id}`}
              className="border border-gray-200 bg-white rounded-2xl shadow-sm hover:shadow-md transition-shadow overflow-hidden p-4 sm:p-6"
            >
              {/* Top info line */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-gray-100 pb-3 mb-4 gap-2">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.2em] text-gray-400 font-ui font-medium">
                    {t("orderId", { id: shortenOrderId(order.id) })}
                  </p>
                  <p className="text-[11px] text-gray-500 font-ui mt-0.5">
                    {formatOrderDate(order.date, locale)}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="inline-flex items-center text-[9px] uppercase tracking-[0.18em] px-2 py-0.5 font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-md">
                    {locale === "ar" ? "تفصيل" : "Custom Order"}
                  </span>
                  <span className="text-[10px] uppercase tracking-[0.18em] bg-black text-white px-2.5 py-0.5 rounded-full whitespace-nowrap">
                    {t(`statuses.${order.status}`)}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleToggleTimeline(order.id)}
                    className="text-[10px] uppercase tracking-[0.18em] text-gray-400 hover:text-black transition hover:cursor-pointer whitespace-nowrap"
                    aria-expanded={isExpanded}
                  >
                    {isExpanded ? t("hideTimeline") : t("viewTimeline")}
                  </button>
                </div>
              </div>

              {/* Row-wise Order Details Layout */}
              <div className="flex flex-col gap-8 mt-2">
                {/* Row 1: Designs and Fabrics Details */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 pb-8 border-b border-black/5">
                  {/* Designs Section */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] font-ui font-bold text-black/50">
                      <Scissors className="w-3.5 h-3.5 text-black/30" />
                      <span>{locale === "ar" ? "التصاميم" : "DESIGNS"}</span>
                    </div>
                    <div className="space-y-4">
                      {items.map((item, index) => {
                        const designName =
                          getDesignDisplayName(item.design, locale) ||
                          t("unknownDesign");
                        const dImage = item.design?.images?.[0];
                        const tailorName = getTailorDisplayName(
                          item.tailorShop,
                          locale,
                        );
                        return (
                          <div
                            key={index}
                            className="group relative flex flex-col sm:flex-row items-start sm:items-center gap-4 bg-white p-4 rounded-xl border border-black/5 hover:border-black/15 shadow-[0_2px_8px_rgba(0,0,0,0.02)] hover:shadow-[0_4px_16px_rgba(0,0,0,0.06)] transition-all duration-300"
                          >
                            <div className="w-16 h-16 sm:w-20 sm:h-20 bg-[#F0EBE3] overflow-hidden rounded-lg border border-black/5 shrink-0 relative flex items-center justify-center">
                              {dImage ? (
                                <>
                                  <img
                                    src={resolveDesignImage(dImage)}
                                    alt="Design"
                                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                                  />
                                  <button
                                    onClick={() =>
                                      handleImageClick(
                                        resolveDesignImage(dImage),
                                        designName,
                                      )
                                    }
                                    className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 hover:cursor-pointer rounded-lg"
                                  >
                                    <Maximize2 className="w-4 h-4 text-white" />
                                  </button>
                                </>
                              ) : (
                                <div className="w-full h-full flex items-center justify-center bg-gray-50 text-gray-300">
                                  <Package size={20} />
                                </div>
                              )}
                            </div>
                            <div className="flex-1 min-w-0 space-y-1">
                              <h4 className="text-sm font-semibold text-black leading-tight line-clamp-2">
                                {designName}
                              </h4>

                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Fabrics Section */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] font-ui font-bold text-black/50">
                      <Sparkles className="w-3.5 h-3.5 text-black/30" />
                      <span>{locale === "ar" ? "الأقمشة" : "FABRICS"}</span>
                    </div>
                    <div className="space-y-4">
                      {items.map((item, index) => {
                        const fabricName =
                          order.fabricSource === "self"
                            ? t("ownFabric")
                            : getFabricDisplayName(item.fabric, locale) ||
                              t("unknownFabric");
                        const fImage =
                          order.fabricSource === "storefront"
                            ? item.fabric?.images?.[0]
                            : null;
                        const isSelf = order.fabricSource === "self";
                        return (
                          <div
                            key={index}
                            className="group relative flex flex-col sm:flex-row items-start sm:items-center gap-4 bg-white p-4 rounded-xl border border-black/5 hover:border-black/15 shadow-[0_2px_8px_rgba(0,0,0,0.02)] hover:shadow-[0_4px_16px_rgba(0,0,0,0.06)] transition-all duration-300"
                          >
                            <div className="w-16 h-16 sm:w-20 sm:h-20 bg-[#F0EBE3] overflow-hidden rounded-lg border border-black/5 shrink-0 flex items-center justify-center relative">
                              {fImage ? (
                                <>
                                  <img
                                    src={resolveFabricImage(fImage)}
                                    alt="Fabric"
                                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                                  />
                                  <button
                                    onClick={() =>
                                      handleImageClick(
                                        resolveFabricImage(fImage),
                                        fabricName,
                                      )
                                    }
                                    className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 hover:cursor-pointer rounded-lg"
                                  >
                                    <Maximize2 className="w-4 h-4 text-white" />
                                  </button>
                                </>
                              ) : (
                                <div className="w-full h-full flex items-center justify-center bg-gray-50 text-gray-300">
                                  <Package size={20} />
                                </div>
                              )}
                            </div>
                            <div className="flex-1 min-w-0 space-y-1.5">
                              <h4 className="text-sm font-semibold text-black leading-tight line-clamp-2">
                                {fabricName}
                              </h4>

                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Row 2: Selected Add-ons (Only rendered if present) */}
                {order.addons && order.addons.length > 0 && (
                  <div className="space-y-4 pb-8 border-b border-black/5">
                    <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] font-ui font-bold text-black/50">
                      <CheckCircle2 className="w-3.5 h-3.5 text-black/30" />
                      <span>{locale === "ar" ? "الإضافات" : "SELECTED ADD-ONS"}</span>
                    </div>
                    <div className="border border-black/5 rounded-xl p-5 bg-[#FAF9F6]/60 w-full shadow-[inset_0_1px_3px_rgba(0,0,0,0.01)]">
                      <ul className="divide-y divide-black/5 font-sans">
                        {order.addons.map((addon: any, idx: number) => {
                          const name =
                            locale === "ar"
                              ? addon.nameAr || addon.name
                              : addon.name;
                          const addOnImage = addon.thumbnailImage;
                          return (
                            <li
                              key={idx}
                              className="flex justify-between items-center text-xs py-2.5 first:pt-0 last:pb-0 gap-4"
                            >
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-[#F0EBE3] overflow-hidden rounded-lg border border-black/5 shrink-0 flex items-center justify-center relative">
                                  {addOnImage ? (
                                    <>
                                      <img
                                        src={resolveMediaUrl(addOnImage)}
                                        alt={name}
                                        className="w-full h-full object-cover"
                                      />
                                      <button
                                        type="button"
                                        onClick={() =>
                                          handleImageClick(
                                            resolveMediaUrl(addOnImage),
                                            name,
                                          )
                                        }
                                        className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 hover:opacity-100 transition-opacity duration-300 hover:cursor-pointer rounded-lg"
                                      >
                                        <Maximize2 className="w-3.5 h-3.5 text-white" />
                                      </button>
                                    </>
                                  ) : (
                                    <div className="w-full h-full flex items-center justify-center bg-gray-50 text-gray-300">
                                      <Package size={16} />
                                    </div>
                                  )}
                                </div>
                                <span className="font-medium text-black/70">{name}</span>
                              </div>
                              <span className="font-bold text-black shrink-0">
                                {formatCurrency(addon.price, locale)}
                              </span>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  </div>
                )}

                {/* Row 3: Total Price */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] font-ui font-bold text-black/50">
                    <Info className="w-3.5 h-3.5 text-black/30" />
                    <span>{locale === "ar" ? "المجموع" : "TOTAL PRICE"}</span>
                  </div>
                  <div className="relative overflow-hidden bg-black text-white rounded-xl p-5 w-full shadow-md flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 before:absolute before:left-0 before:top-0 before:bottom-0 before:w-1.5 before:bg-white/20">
                    <div className="flex justify-between sm:justify-start items-center gap-6">
                      <span className="text-[10px] uppercase tracking-widest text-white/60 font-ui font-semibold">
                        {locale === "ar" ? "المجموع الإجمالي" : "Total Price"}
                      </span>
                      {order.total !== undefined && (
                        <span className="font-display text-xl font-bold tracking-tight text-white whitespace-nowrap">
                          {formatCurrency(order.total, locale)}
                        </span>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => handleTogglePriceDetails(order.id)}
                      className="text-center py-2.5 px-6 bg-white/10 hover:bg-white/20 border border-white/10 text-[10px] uppercase tracking-widest text-white rounded-lg transition-all duration-300 font-ui font-semibold cursor-pointer select-none flex items-center justify-center gap-2"
                    >
                      <span>
                        {priceDetailsOpenIds[order.id]
                          ? locale === "ar"
                            ? "إخفاء التفاصيل"
                            : "Hide Price Details"
                          : locale === "ar"
                            ? "عرض تفاصيل السعر"
                            : "View Price Details"}
                      </span>
                      <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-300 ${priceDetailsOpenIds[order.id] ? "rotate-180" : ""}`} />
                    </button>
                  </div>
                </div>
              </div>

              {/* Price Breakdown collapse section below the grid */}
              {priceDetailsOpenIds[order.id] && order.pricing && (
                <div className="mt-4 border-t border-gray-100 pt-4 w-full">
                  <p className="text-[9px] uppercase tracking-[0.18em] text-gray-400 mb-2 font-ui font-semibold">
                    {locale === "ar" ? "تفاصيل السعر" : "PRICE BREAKDOWN"}
                  </p>
                  <div className="bg-[#FDFAF5] border border-gray-200 rounded-xl p-4 space-y-2 text-xs text-gray-600 font-ui">
                    <div className="flex justify-between">
                      <span>
                        {tReview("lines.designBase", {
                          defaultValue: "Design Base Price",
                        })}
                      </span>
                      <span className="font-semibold text-black">
                        {formatCurrency(order.pricing.designBase, locale)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>
                        {tReview("lines.fabricCost", {
                          defaultValue: "Fabric Cost",
                        })}
                        {order.pricing.fabricPricePerMeter > 0 && (
                          <span className="block text-[10px] text-gray-400">
                            ({order.pricing.fabricMeters}m ×{" "}
                            {formatCurrency(
                              order.pricing.fabricPricePerMeter,
                              locale,
                            )}
                            /m)
                          </span>
                        )}
                      </span>
                      <span className="font-semibold text-black">
                        {formatCurrency(order.pricing.fabricCost, locale)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>
                        {tReview("lines.tailoringFee", {
                          defaultValue: "Tailoring Fee",
                        })}
                      </span>
                      <span className="font-semibold text-black">
                        {formatCurrency(order.pricing.tailoringFee, locale)}
                      </span>
                    </div>
                    {order.pricing.deliveryFee > 0 && (
                      <div className="flex justify-between">
                        <span>
                          {tReview("lines.deliveryFee", {
                            defaultValue: "Delivery Fee",
                          })}
                        </span>
                        <span className="font-semibold text-black">
                          {formatCurrency(order.pricing.deliveryFee, locale)}
                        </span>
                      </div>
                    )}
                    {order.addons && order.addons.length > 0 && (
                      <div className="flex justify-between">
                        <span>{locale === "ar" ? "الإضافات" : "Add-Ons"}</span>
                        <span className="font-semibold text-black">
                          {formatCurrency(
                            order.addons.reduce((acc, a) => acc + a.price, 0),
                            locale,
                          )}
                        </span>
                      </div>
                    )}
                    <div className="flex justify-between pt-2 border-t border-gray-200">
                      <span className="font-semibold text-black">
                        {tReview("lines.subtotal", {
                          defaultValue: "Subtotal",
                        })}
                      </span>
                      <span className="font-semibold text-black">
                        {formatCurrency(order.pricing.subtotal, locale)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>
                        {tReview("lines.vat", {
                          rate: Math.round(order.pricing.vatRate * 100),
                          defaultValue: `VAT (${Math.round(order.pricing.vatRate * 100)}%)`,
                        })}
                      </span>
                      <span className="font-semibold text-black">
                        {formatCurrency(order.pricing.vatAmount, locale)}
                      </span>
                    </div>
                    <div className="flex justify-between pt-2 border-t border-black">
                      <span className="font-bold text-black uppercase tracking-wider">
                        {tReview("lines.total", {
                          defaultValue: "Total Amount",
                        })}
                      </span>
                      <span className="font-bold text-black text-sm">
                        {formatCurrency(order.pricing.total, locale)}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {isDelivered && (
                <div className="px-4 sm:px-6 pb-4">
                  <div className="mt-2 border border-gray-200 rounded-xl bg-[#FDFAF5] p-4">
                    <label className="flex items-start gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={!!returnState.checked[order.id]}
                        onChange={(e) =>
                          setReturnState((prev) => ({
                            ...prev,
                            checked: {
                              ...prev.checked,
                              [order.id]: e.target.checked,
                            },
                          }))
                        }
                        className="mt-0.5 w-4 h-4 accent-black"
                      />
                      <span className="text-[11px] uppercase tracking-[0.16em] text-black">
                        Return this item
                      </span>
                    </label>

                    {returnState.error[order.id] &&
                      !returnState.formOpen[order.id] && (
                        <p className="mt-2 text-red-600 text-sm">
                          {returnState.error[order.id]}
                        </p>
                      )}

                    <div className="mt-3">
                      <button
                        type="button"
                        onClick={() => toggleReturnForm(order.id)}
                        disabled={!returnState.checked[order.id]}
                        className="inline-block px-6 py-2 bg-black text-white text-[10px] tracking-[0.2em] uppercase hover:bg-[#2A2A28] transition font-ui rounded-lg disabled:opacity-50 disabled:hover:bg-black"
                      >
                        {returnState.formOpen[order.id]
                          ? "Cancel return"
                          : "Confirm return"}
                      </button>
                    </div>

                    <AnimatePresence>
                      {returnState.formOpen[order.id] && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.3 }}
                          className="mt-4 pt-4 border-t border-gray-200"
                        >
                          <div className="space-y-4">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                              <div>
                                <label className="text-[11px] uppercase tracking-[0.14em] text-gray-400 block mb-1.5">
                                  Condition{" "}
                                  <span className="text-red-500">*</span>
                                </label>
                                <div className="relative">
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setReturnState((prev) => ({
                                        ...prev,
                                        dropdownOpen: {
                                          ...prev.dropdownOpen,
                                          [order.id]:
                                            !prev.dropdownOpen[order.id],
                                        },
                                      }))
                                    }
                                    className="w-full border border-gray-200 rounded-xl p-2.5 text-sm text-black focus:outline-none focus:border-black transition bg-white flex items-center justify-between hover:cursor-pointer"
                                  >
                                    <span>
                                      {returnState.draft[order.id]?.condition ||
                                        "Select condition"}
                                    </span>
                                    {returnState.dropdownOpen[order.id] ? (
                                      <ChevronUp className="w-4 h-4 text-gray-400" />
                                    ) : (
                                      <ChevronDown className="w-4 h-4 text-gray-400" />
                                    )}
                                  </button>
                                  <AnimatePresence>
                                    {returnState.dropdownOpen[order.id] && (
                                      <motion.ul
                                        initial={{
                                          opacity: 0,
                                          y: -10,
                                          scale: 0.95,
                                        }}
                                        animate={{ opacity: 1, y: 0, scale: 1 }}
                                        exit={{
                                          opacity: 0,
                                          y: -10,
                                          scale: 0.95,
                                        }}
                                        transition={{
                                          duration: 0.15,
                                          ease: "easeOut",
                                        }}
                                        className="absolute left-0 right-0 top-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-60 overflow-y-auto z-10 py-1"
                                        role="listbox"
                                      >
                                        {CONDITION_OPTIONS.map((option) => (
                                          <li key={option.value}>
                                            <button
                                              type="button"
                                              onClick={() => {
                                                updateDraft(order.id, {
                                                  condition: option.value,
                                                });
                                                setReturnState((prev) => ({
                                                  ...prev,
                                                  dropdownOpen: {
                                                    ...prev.dropdownOpen,
                                                    [order.id]: false,
                                                  },
                                                }));
                                              }}
                                              className={`w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50 transition hover:cursor-pointer ${
                                                returnState.draft[order.id]
                                                  ?.condition === option.value
                                                  ? "text-black font-medium bg-gray-50"
                                                  : "text-gray-700"
                                              }`}
                                            >
                                              {option.label}
                                            </button>
                                          </li>
                                        ))}
                                      </motion.ul>
                                    )}
                                  </AnimatePresence>
                                </div>
                              </div>

                              <div>
                                <label className="text-[11px] uppercase tracking-[0.14em] text-gray-400 block mb-1.5">
                                  Reason <span className="text-red-500">*</span>
                                </label>
                                <input
                                  type="text"
                                  value={
                                    returnState.draft[order.id]?.reason ?? ""
                                  }
                                  onChange={(e) =>
                                    updateDraft(order.id, {
                                      reason: e.target.value,
                                    })
                                  }
                                  className="w-full border border-gray-200 rounded-xl p-2.5 text-sm text-black focus:outline-none focus:border-black transition bg-white"
                                  placeholder="e.g. Size fits loose, wrong color"
                                />
                              </div>
                            </div>

                            <div>
                              <label className="text-[11px] uppercase tracking-[0.14em] text-gray-400 block mb-1.5">
                                Comment
                              </label>
                              <textarea
                                value={
                                  returnState.draft[order.id]?.comment ?? ""
                                }
                                onChange={(e) =>
                                  updateDraft(order.id, {
                                    comment: e.target.value,
                                  })
                                }
                                rows={3}
                                className="w-full border border-gray-200 rounded-xl p-2.5 text-sm text-black focus:outline-none focus:border-black transition bg-white"
                                placeholder="Any additional comments..."
                              />
                            </div>

                            <div className="border-t border-gray-100 pt-4">
                              <h5 className="font-display text-sm mb-3">
                                Pickup Address Details
                              </h5>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                  <label className="text-[10px] uppercase tracking-[0.12em] text-gray-400 block mb-1">
                                    Full Name{" "}
                                    <span className="text-red-500">*</span>
                                  </label>
                                  <input
                                    value={
                                      returnState.draft[order.id]?.pickupAddress
                                        .fullName ?? ""
                                    }
                                    onChange={(e) =>
                                      updateAddress(order.id, {
                                        fullName: e.target.value,
                                      })
                                    }
                                    className="w-full border border-gray-200 rounded-xl p-2 text-sm text-black focus:outline-none focus:border-black transition bg-white"
                                    placeholder="John Doe"
                                  />
                                </div>
                                <div>
                                  <label className="text-[10px] uppercase tracking-[0.12em] text-gray-400 block mb-1">
                                    Phone Number (format: 971XXXXXXXXX){" "}
                                    <span className="text-red-500">*</span>
                                  </label>
                                  <input
                                    value={
                                      returnState.draft[order.id]?.pickupAddress
                                        .phone ?? ""
                                    }
                                    onChange={(e) =>
                                      updateAddress(order.id, {
                                        phone: e.target.value,
                                      })
                                    }
                                    className="w-full border border-gray-200 rounded-xl p-2 text-sm text-black focus:outline-none focus:border-black transition bg-white"
                                    placeholder="971501234567"
                                  />
                                </div>
                                <div>
                                  <label className="text-[10px] uppercase tracking-[0.12em] text-gray-400 block mb-1">
                                    Street Name / Line 1{" "}
                                    <span className="text-red-500">*</span>
                                  </label>
                                  <input
                                    value={
                                      returnState.draft[order.id]?.pickupAddress
                                        .line1 ?? ""
                                    }
                                    onChange={(e) =>
                                      updateAddress(order.id, {
                                        line1: e.target.value,
                                      })
                                    }
                                    className="w-full border border-gray-200 rounded-xl p-2 text-sm text-black focus:outline-none focus:border-black transition bg-white"
                                    placeholder="Sheikh Zayed Rd"
                                  />
                                </div>
                                <div>
                                  <label className="text-[10px] uppercase tracking-[0.12em] text-gray-400 block mb-1">
                                    Building / Villa / Line 2
                                  </label>
                                  <input
                                    value={
                                      returnState.draft[order.id]?.pickupAddress
                                        .line2 ?? ""
                                    }
                                    onChange={(e) =>
                                      updateAddress(order.id, {
                                        line2: e.target.value,
                                      })
                                    }
                                    className="w-full border border-gray-200 rounded-xl p-2 text-sm text-black focus:outline-none focus:border-black transition bg-white"
                                    placeholder="Apartment 4B, Tower A"
                                  />
                                </div>
                                <div>
                                  <label className="text-[10px] uppercase tracking-[0.12em] text-gray-400 block mb-1">
                                    City <span className="text-red-500">*</span>
                                  </label>
                                  <input
                                    value={
                                      returnState.draft[order.id]?.pickupAddress
                                        .city ?? ""
                                    }
                                    onChange={(e) =>
                                      updateAddress(order.id, {
                                        city: e.target.value,
                                      })
                                    }
                                    className="w-full border border-gray-200 rounded-xl p-2 text-sm text-black focus:outline-none focus:border-black transition bg-white"
                                    placeholder="Dubai"
                                  />
                                </div>
                                <div>
                                  <label className="text-[10px] uppercase tracking-[0.12em] text-gray-400 block mb-1">
                                    State{" "}
                                    <span className="text-red-500">*</span>
                                  </label>
                                  <input
                                    value={
                                      returnState.draft[order.id]?.pickupAddress
                                        .state ?? ""
                                    }
                                    onChange={(e) =>
                                      updateAddress(order.id, {
                                        state: e.target.value,
                                      })
                                    }
                                    className="w-full border border-gray-200 rounded-xl p-2 text-sm text-black focus:outline-none focus:border-black transition bg-white"
                                    placeholder="Dubai"
                                  />
                                </div>
                                <div>
                                  <label className="text-[10px] uppercase tracking-[0.12em] text-gray-400 block mb-1">
                                    Postal code{" "}
                                    <span className="text-red-500">*</span>
                                  </label>
                                  <input
                                    value={
                                      returnState.draft[order.id]?.pickupAddress
                                        .postalCode ?? ""
                                    }
                                    onChange={(e) =>
                                      updateAddress(order.id, {
                                        postalCode: e.target.value,
                                      })
                                    }
                                    className="w-full border border-gray-200 rounded-xl p-2 text-sm text-black focus:outline-none focus:border-black transition bg-white"
                                    placeholder="00000"
                                  />
                                </div>
                              </div>
                            </div>

                            {returnState.error[order.id] && (
                              <div className="p-3 bg-red-50 border border-red-200 rounded-xl">
                                <p className="text-red-600 text-sm">
                                  {returnState.error[order.id]}
                                </p>
                              </div>
                            )}
                            {returnState.success[order.id] && (
                              <div className="p-3 bg-green-50 border border-green-200 rounded-xl">
                                <p className="text-green-700 text-sm">
                                  {returnState.success[order.id]}
                                </p>
                              </div>
                            )}

                            <div className="flex flex-col-reverse sm:flex-row items-center justify-end gap-3 pt-2">
                              <button
                                type="button"
                                onClick={() => closeReturnForm(order.id)}
                                className="w-full sm:w-auto px-6 py-2.5 border border-gray-200 rounded-xl text-black text-[11px] uppercase tracking-[0.14em] font-ui hover:bg-gray-50 transition disabled:opacity-50"
                                disabled={!!returnState.submitting[order.id]}
                              >
                                Cancel
                              </button>
                              <button
                                type="button"
                                onClick={() => submitReturn(order.id)}
                                disabled={!!returnState.submitting[order.id]}
                                className="w-full sm:w-auto px-6 py-2.5 bg-black text-white rounded-xl text-[11px] uppercase tracking-[0.14em] font-ui hover:bg-[#2A2A28] transition disabled:opacity-50"
                              >
                                {returnState.submitting[order.id]
                                  ? t("loading")
                                  : "Submit return"}
                              </button>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              )}

              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.3 }}
                    className="border-t border-gray-200 p-4 sm:p-6 bg-[#FDFAF5]"
                  >
                    {detailLoadingId === order.id && (
                      <div className="flex justify-center py-4">
                        <div className="w-6 h-6 border-2 border-gray-300 border-t-black rounded-full animate-spin" />
                      </div>
                    )}
                    {detailError && detailLoadingId !== order.id && !detail && (
                      <p className="text-red-600 text-sm py-4">{detailError}</p>
                    )}
                    {detail && (
                      <>
                        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                          <h4 className="font-display text-lg">
                            {t("timelineTitle")}
                          </h4>
                          {isOutForDelivery &&
                            !receivedState.submitting[order.id] &&
                            detail.status === "out_for_delivery" &&
                            !hasActiveCustomerShipments(detail.shipments) && (
                              <button
                                type="button"
                                onClick={() => markReceived(order.id)}
                                className="text-[11px] uppercase tracking-[0.16em] text-white bg-green-600 hover:bg-green-700 transition px-4 py-1.5 rounded-lg shadow-sm hover:shadow whitespace-nowrap flex items-center gap-2"
                              >
                                ✓ CUSTOMER RECEIVED
                              </button>
                            )}
                          {receivedState.submitting[order.id] && (
                            <button
                              type="button"
                              disabled
                              className="text-[11px] uppercase tracking-[0.16em] text-white bg-green-400 px-4 py-1.5 rounded-lg whitespace-nowrap flex items-center gap-2 cursor-not-allowed"
                            >
                              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                              Processing...
                            </button>
                          )}
                        </div>
                        {receivedState.error[order.id] && (
                          <p className="text-red-600 text-sm mb-3">
                            {receivedState.error[order.id]}
                          </p>
                        )}
                        <OrderProgressPanel
                          variant="custom"
                          currentStatus={detail.status}
                          statusHistory={detail.statusHistory || []}
                          shipments={detail.shipments}
                          locale={locale}
                          visibility="customer"
                          hasReturnItems={
                            (detail.returnItems?.length || 0) > 0 ||
                            [
                              "return_requested",
                              "return_approved",
                              "return_rejected",
                              "refund_processed",
                            ].includes(detail.status)
                          }
                        />
                      </>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </article>
          );
        } else {
          const order = unified.order;
          const isMulti = order.items.length > 1;
          const isExpanded = retailExpandedId === order.id;

          return (
            <article
              key={`retail-${order.id}`}
              className="border border-gray-200 bg-white rounded-2xl shadow-sm hover:shadow-md transition-shadow overflow-hidden p-4 sm:p-6"
            >
              {/* Top info line */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-gray-100 pb-3 mb-4 gap-2">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.2em] text-gray-400 mb-1.5 font-ui font-medium">
                    {tRetail("orderId", { id: shortenOrderId(order.id) })}
                  </p>
                  <p className="text-[11px] text-gray-500 font-ui mt-0.5">
                    {formatOrderDate(order.date.toString(), locale)}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="inline-flex items-center text-[9px] uppercase tracking-[0.18em] px-2 py-0.5 font-semibold bg-amber-50 text-amber-700 border border-amber-200 rounded-md">
                    {locale === "ar" ? "جاهز" : "Ready-Made Order"}
                  </span>
                  <span className="text-[10px] uppercase tracking-[0.18em] bg-black text-white px-2.5 py-0.5 rounded-full whitespace-nowrap">
                    {tRetail(`statuses.${order.status}`, {
                      defaultValue: order.status,
                    })}
                  </span>
                  {isMulti && (
                    <button
                      type="button"
                      onClick={() =>
                        setRetailExpandedId(isExpanded ? null : order.id)
                      }
                      className="text-[10px] uppercase tracking-[0.18em] text-gray-400 hover:text-black transition hover:cursor-pointer whitespace-nowrap"
                      aria-expanded={isExpanded}
                    >
                      {isExpanded ? "Hide items" : "Show all items"}
                    </button>
                  )}
                </div>
              </div>

              {/* Row-wise Order Details Layout */}
              <div className="flex flex-col gap-8 mt-2">
                {/* Row 1: Ready-made Item name & Toggle Button */}
                <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 pb-6 border-b border-black/5">
                  {/* Left Side: Items name list */}
                  <div className="flex-1 space-y-3">
                    <p className="text-[10px] uppercase tracking-[0.2em] font-ui font-bold text-black/50">
                      {locale === "ar" ? "الاسم" : "ITEM NAME"}
                    </p>
                    <div className="space-y-3">
                      {(isExpanded ? order.items : [order.items[0]]).map(
                        (item, idx) =>
                          item && (
                            <div
                              key={idx}
                              className="group flex flex-col sm:flex-row items-start sm:items-center gap-4 bg-white p-4 rounded-xl border border-black/5 hover:border-black/15 shadow-[0_2px_8px_rgba(0,0,0,0.02)] hover:shadow-[0_4px_16px_rgba(0,0,0,0.06)] transition-all duration-300 w-full"
                            >
                              <div className="w-16 h-16 sm:w-20 sm:h-20 bg-[#F0EBE3] overflow-hidden rounded-lg border border-black/5 shrink-0 relative flex items-center justify-center">
                                {item.image ? (
                                  <>
                                    <img
                                      src={resolveReadyMadeImage(item.image)}
                                      alt={item.name}
                                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                                    />
                                    <button
                                      onClick={() =>
                                        handleImageClick(
                                          resolveReadyMadeImage(item.image),
                                          item.name,
                                        )
                                      }
                                      className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 hover:cursor-pointer rounded-lg"
                                    >
                                      <Maximize2 className="w-4 h-4 text-white" />
                                    </button>
                                  </>
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center bg-gray-50 text-gray-300">
                                    <Package size={20} />
                                  </div>
                                )}
                              </div>
                              <div className="min-w-0 flex-1">
                                <h4 className="text-sm font-semibold text-black leading-tight line-clamp-2">
                                  {locale === "ar"
                                    ? item.nameAr || item.name
                                    : item.name}
                                </h4>
                                <span className="block text-[10px] text-gray-500 font-ui mt-1 font-semibold">
                                  Qty: {item.quantity}{" "}
                                  {item.size && `| Size: ${item.size}`}
                                </span>
                              </div>
                            </div>
                          ),
                      )}
                    </div>
                  </div>

                  {/* Right Side: Toggle Fabric & Design Details Button */}
                  {(() => {
                    const hasAnyFabric = order.items.some(
                      (item) =>
                        item &&
                        (item.fabricName || item.fabricImage || item.size === "Per Meter")
                    );
                    const hasAnyDesign = order.items.some(
                      (item) =>
                        item &&
                        item.designName &&
                        item.size !== "Per Meter"
                    );
                    const showToggle = hasAnyFabric || hasAnyDesign;

                    if (!showToggle) return null;

                    return (
                      <div className="flex items-center justify-end shrink-0 pt-4 md:pt-0">
                        <button
                          type="button"
                          onClick={() => handleToggleRetailDetails(order.id)}
                          className="w-full md:w-auto text-center py-2.5 px-6 border border-black/10 hover:border-black/20 bg-white hover:bg-gray-50 text-[10px] uppercase tracking-widest text-black/70 hover:text-black rounded-lg transition-all duration-300 font-ui font-semibold cursor-pointer select-none flex items-center justify-center gap-2 shadow-sm hover:shadow"
                        >
                          <span>
                            {retailFabricDesignOpenIds[order.id]
                              ? locale === "ar"
                                ? "إخفاء القماش والتصميم"
                                : "Hide Fabric & Design"
                              : locale === "ar"
                                ? "عرض القماش والتصميم"
                                : "View Fabric & Design"}
                          </span>
                          <ChevronDown
                            className={`w-3.5 h-3.5 transition-transform duration-300 ${
                              retailFabricDesignOpenIds[order.id] ? "rotate-180" : ""
                            }`}
                          />
                        </button>
                      </div>
                    );
                  })()}
                </div>

                {/* Row 2: Retail Fabric & Design Details (Conditional) */}
                {(() => {
                  if (!retailFabricDesignOpenIds[order.id]) return null;

                  const hasAnyFabric = order.items.some(
                    (item) =>
                      item &&
                      (item.fabricName || item.fabricImage || item.size === "Per Meter")
                  );
                  const hasAnyDesign = order.items.some(
                    (item) =>
                      item &&
                      item.designName &&
                      item.size !== "Per Meter"
                  );

                  if (!hasAnyFabric && !hasAnyDesign) return null;

                  return (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 pb-8 border-b border-black/5">
                      {/* Designs Section */}
                      {hasAnyDesign && (
                        <div className="space-y-4">
                          <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] font-ui font-bold text-black/50">
                            <Scissors className="w-3.5 h-3.5 text-black/30" />
                            <span>{locale === "ar" ? "التصاميم" : "DESIGNS"}</span>
                          </div>
                          <div className="space-y-4">
                            {order.items.map((item, idx) => {
                              if (!item) return null;
                              const isFabricOnly = item.size === "Per Meter";
                              const hasDesign =
                                Boolean(item.designName) && !isFabricOnly;

                              if (!hasDesign) return null;

                              const designName =
                                locale === "ar"
                                  ? item.designNameAr || item.designName
                                  : item.designName;

                              return (
                                <div
                                  key={idx}
                                  className="group relative flex flex-col sm:flex-row items-start sm:items-center gap-4 bg-white p-4 rounded-xl border border-black/5 hover:border-black/15 shadow-[0_2px_8px_rgba(0,0,0,0.02)] hover:shadow-[0_4px_16px_rgba(0,0,0,0.06)] transition-all duration-300 w-full"
                                >
                                  <div className="w-16 h-16 sm:w-20 sm:h-20 bg-white overflow-hidden rounded-lg border border-black/5 shrink-0 flex items-center justify-center relative">
                                    {item.designImage ? (
                                      <>
                                        <img
                                          src={resolveDesignImage(item.designImage)}
                                          alt="Design"
                                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                                        />
                                        <button
                                          onClick={() =>
                                            handleImageClick(
                                              resolveDesignImage(item.designImage),
                                              designName,
                                            )
                                          }
                                          className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 hover:cursor-pointer rounded-lg"
                                        >
                                          <Maximize2 className="w-4 h-4 text-white" />
                                        </button>
                                      </>
                                    ) : (
                                      <div className="w-full h-full flex items-center justify-center bg-gray-50 text-gray-300">
                                        <Package size={20} />
                                      </div>
                                    )}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <span className="[font-family:var(--font-ui)] text-[9px] uppercase tracking-[0.24em] text-black/40 block font-semibold mb-1">
                                      {locale === "ar"
                                        ? "تصميم المنتج"
                                        : "PRODUCT DESIGN"}
                                    </span>
                                    <h4 className="text-sm font-semibold text-black leading-tight line-clamp-2">
                                      {designName}
                                    </h4>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Fabrics Section */}
                      {hasAnyFabric && (
                        <div className="space-y-4">
                          <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] font-ui font-bold text-black/50">
                            <Sparkles className="w-3.5 h-3.5 text-black/30" />
                            <span>{locale === "ar" ? "الأقمشة" : "FABRICS"}</span>
                          </div>
                          <div className="space-y-4">
                            {order.items.map((item, idx) => {
                              if (!item) return null;
                              const isFabricOnly = item.size === "Per Meter";
                              const hasFabric =
                                Boolean(item.fabricName) || isFabricOnly;

                              if (!hasFabric) return null;

                              const fabricNameDisplay = item.fabricName
                                ? locale === "ar"
                                  ? item.fabricNameAr || item.fabricName
                                  : item.fabricName
                                : isFabricOnly
                                  ? locale === "ar"
                                    ? item.nameAr || item.name
                                    : item.name
                                  : "";
                              const fabricImageDisplay =
                                item.fabricImage ||
                                (isFabricOnly ? item.image : "");

                              return (
                                <div
                                  key={idx}
                                  className="group relative flex flex-col sm:flex-row items-start sm:items-center gap-4 bg-white p-4 rounded-xl border border-black/5 hover:border-black/15 shadow-[0_2px_8px_rgba(0,0,0,0.02)] hover:shadow-[0_4px_16px_rgba(0,0,0,0.06)] transition-all duration-300 w-full"
                                >
                                  <div className="w-16 h-16 sm:w-20 sm:h-20 bg-white overflow-hidden rounded-lg border border-black/5 shrink-0 flex items-center justify-center relative">
                                    {fabricImageDisplay ? (
                                      <>
                                        <img
                                          src={resolveFabricImage(
                                            fabricImageDisplay,
                                          )}
                                          alt="Fabric"
                                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                                        />
                                        <button
                                          onClick={() =>
                                            handleImageClick(
                                              resolveFabricImage(
                                                fabricImageDisplay,
                                              ),
                                              fabricNameDisplay,
                                            )
                                          }
                                          className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 hover:cursor-pointer rounded-lg"
                                        >
                                          <Maximize2 className="w-4 h-4 text-white" />
                                        </button>
                                      </>
                                    ) : (
                                      <div className="w-full h-full flex items-center justify-center bg-gray-50 text-gray-300">
                                        <Package size={20} />
                                      </div>
                                    )}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <span className="[font-family:var(--font-ui)] text-[9px] uppercase tracking-[0.24em] text-black/40 block font-semibold mb-1">
                                      {locale === "ar"
                                        ? "قماش المنتج"
                                        : "PRODUCT FABRIC"}
                                    </span>
                                    <h4 className="text-sm font-semibold text-black leading-tight line-clamp-2">
                                      {fabricNameDisplay}
                                    </h4>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })()}

                {/* Row 3: Total Price */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] font-ui font-bold text-black/50">
                    <Info className="w-3.5 h-3.5 text-black/30" />
                    <span>{locale === "ar" ? "المجموع" : "TOTAL PRICE"}</span>
                  </div>
                  <div className="relative overflow-hidden bg-black text-white rounded-xl p-5 w-full shadow-md flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 before:absolute before:left-0 before:top-0 before:bottom-0 before:w-1.5 before:bg-white/20">
                    <div className="flex justify-between sm:justify-start items-center gap-6">
                      <span className="text-[10px] uppercase tracking-widest text-white/60 font-ui font-semibold">
                        {locale === "ar" ? "المجموع الإجمالي" : "Total Price"}
                      </span>
                      {order.totalPrice !== undefined && (
                        <span className="font-display text-xl font-bold tracking-tight text-white whitespace-nowrap">
                          {formatCurrency(order.totalPrice, locale)}
                        </span>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => handleTogglePriceDetails(order.id)}
                      className="text-center py-2.5 px-6 bg-white/10 hover:bg-white/20 border border-white/10 text-[10px] uppercase tracking-widest text-white rounded-lg transition-all duration-300 font-ui font-semibold cursor-pointer select-none flex items-center justify-center gap-2"
                    >
                      <span>
                        {priceDetailsOpenIds[order.id]
                          ? locale === "ar"
                            ? "إخفاء التفاصيل"
                            : "Hide Price Details"
                          : locale === "ar"
                            ? "عرض تفاصيل السعر"
                            : "View Price Details"}
                      </span>
                      <ChevronDown
                        className={`w-3.5 h-3.5 transition-transform duration-300 ${
                          priceDetailsOpenIds[order.id] ? "rotate-180" : ""
                        }`}
                      />
                    </button>
                  </div>
                </div>
              </div>

              {/* Price Breakdown collapse section below the grid */}
              {priceDetailsOpenIds[order.id] && (
                <div className="mt-4 border-t border-gray-100 pt-4 w-full">
                  <p className="text-[9px] uppercase tracking-[0.18em] text-gray-400 mb-2 font-ui font-semibold">
                    {locale === "ar" ? "تفاصيل السعر" : "PRICE BREAKDOWN"}
                  </p>
                  <div className="bg-[#FDFAF5] border border-gray-200 rounded-xl p-4 space-y-2 text-xs text-gray-600 font-ui">
                    <div className="flex justify-between">
                      <span>
                        {locale === "ar" ? "سعر المنتجات" : "Items Price"}
                      </span>
                      <span className="font-semibold text-black">
                        {formatCurrency(
                          order.itemsPrice ||
                            order.totalPrice -
                              (order.vatAmount || 0) -
                              (order.shippingPrice || 0),
                          locale,
                        )}
                      </span>
                    </div>
                    {order.shippingPrice !== undefined &&
                      order.shippingPrice > 0 && (
                        <div className="flex justify-between">
                          <span>
                            {locale === "ar" ? "رسوم التوصيل" : "Delivery Fee"}
                          </span>
                          <span className="font-semibold text-black">
                            {formatCurrency(order.shippingPrice, locale)}
                          </span>
                        </div>
                      )}
                    {order.vatAmount !== undefined && order.vatAmount > 0 && (
                      <div className="flex justify-between">
                        <span>
                          {locale === "ar"
                            ? `ضريبة القيمة المضافة (${Math.round((order.vatRate || 0.05) * 100)}%)`
                            : `VAT (${Math.round((order.vatRate || 0.05) * 100)}%)`}
                        </span>
                        <span className="font-semibold text-black">
                          {formatCurrency(order.vatAmount, locale)}
                        </span>
                      </div>
                    )}
                    <div className="flex justify-between pt-2 border-t border-black">
                      <span className="font-bold text-black uppercase tracking-wider">
                        {locale === "ar" ? "المجموع الإجمالي" : "Total Amount"}
                      </span>
                      <span className="font-bold text-black text-sm">
                        {formatCurrency(order.totalPrice, locale)}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              <div className="mt-4 border-t border-gray-100 pt-4 w-full">
                <button
                  type="button"
                  onClick={() => handleToggleRetailProgress(order.id)}
                  className="text-[10px] uppercase tracking-[0.18em] text-gray-500 hover:text-black transition font-ui"
                  aria-expanded={!!retailProgressOpenIds[order.id]}
                >
                  {retailProgressOpenIds[order.id]
                    ? tLogistics("hide")
                    : tLogistics("show")}
                </button>

                <AnimatePresence>
                  {retailProgressOpenIds[order.id] && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.3 }}
                      className="overflow-hidden"
                    >
                      <div className="mt-4 bg-[#FDFAF5] border border-gray-200 rounded-xl p-4 sm:p-6">
                        <h4 className="font-display text-lg mb-4">
                          {tLogistics("title")}
                        </h4>
                        <OrderProgressPanel
                          variant="retail"
                          currentStatus={order.status}
                          statusHistory={order.statusHistory || []}
                          shipments={order.shipments}
                          locale={locale}
                          visibility="customer"
                          compact
                        />
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </article>
          );
        }
      })}
      <ImageModal
        isOpen={imageModalOpen}
        imageUrl={selectedImage}
        alt="Item Image"
        onClose={() => {
          setImageModalOpen(false);
          setSelectedImage("");
        }}
      />
    </div>
  );
}
