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
  shortenOrderId,
  type CustomOrderDetail,
  type CustomOrderLineItemSummary,
  type CustomOrderListItem,
} from "@/lib/customOrders";
import OrderTimeline from "@/components/orders/OrderTimeline";
import { X, ChevronDown, ChevronUp, Package } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

type CustomOrdersTabProps = {
  locale: Locale;
};

export default function CustomOrdersTab({ locale }: CustomOrdersTabProps) {
  const t = useTranslations("OrdersPage.custom");

  const [orders, setOrders] = useState<CustomOrderListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [itemsOpenId, setItemsOpenId] = useState<string | null>(null);
  const [detailById, setDetailById] = useState<
    Record<string, CustomOrderDetail>
  >({});
  const [detailLoadingId, setDetailLoadingId] = useState<string | null>(null);
  const [detailError, setDetailError] = useState<string | null>(null);

  const [returnCheckedById, setReturnCheckedById] = useState<
    Record<string, boolean>
  >({});
  const [returnConfirmingById, setReturnConfirmingById] = useState<
    Record<string, boolean>
  >({});
  const [returnErrorById, setReturnErrorById] = useState<
    Record<string, string | null>
  >({});

  const [returnModalOpenById, setReturnModalOpenById] = useState<
    Record<string, boolean>
  >({});
  const [conditionDropdownOpenById, setConditionDropdownOpenById] = useState<
    Record<string, boolean>
  >({});

  const [returnDraftById, setReturnDraftById] = useState<
    Record<
      string,
      {
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
      }
    >
  >({});

  const [returnSubmittingById, setReturnSubmittingById] = useState<
    Record<string, boolean>
  >({});

  const [returnSuccessMessageById, setReturnSuccessMessageById] = useState<
    Record<string, string | null>
  >({});

  const [customerProfile, setCustomerProfile] = useState<any>(null);

  // Lock body scroll when modal is open
  useEffect(() => {
    const isAnyModalOpen = Object.values(returnModalOpenById).some(Boolean);
    if (isAnyModalOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [returnModalOpenById]);

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        setLoading(true);
        setError(null);

        const data = await api.get<{
          success: boolean;
          orders: CustomOrderListItem[];
        }>("/api/orders/custom/mine");

        if (!data?.success) {
          throw new Error("Failed to load custom orders");
        }

        setOrders(data.orders || []);
      } catch (err: unknown) {
        const message =
          (err as ApiError)?.message ||
          (err instanceof Error ? err.message : t("error"));
        setError(message);
      } finally {
        setLoading(false);
      }
    };

    const fetchCustomerProfile = async () => {
      try {
        const data = await api.get("/api/customer/profile");
        setCustomerProfile(data);
      } catch (err) {
        console.error("Failed to fetch customer profile:", err);
      }
    };

    fetchOrders();
    fetchCustomerProfile();
  }, [t]);

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

        if (!data?.success || !data.order) {
          throw new Error("Failed to load order detail");
        }

        setDetailById((prev) => ({ ...prev, [orderId]: data.order }));
      } catch (err: unknown) {
        const message =
          (err as ApiError)?.message ||
          (err instanceof Error ? err.message : t("detailError"));
        setDetailError(message);
      } finally {
        setDetailLoadingId(null);
      }
    },
    [detailById, t],
  );

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
    setItemsOpenId((current) => (current === orderId ? null : orderId));
  };

  const handleOpenReturnModal = (orderId: string) => {
    setReturnSuccessMessageById((prev) => ({ ...prev, [orderId]: null }));
    setReturnErrorById((prev) => ({ ...prev, [orderId]: null }));

    setReturnModalOpenById((prev) => ({ ...prev, [orderId]: true }));

    const defaultAddr =
      customerProfile?.addresses?.find((a: any) => a.isDefault) ||
      customerProfile?.addresses?.[0];

    setReturnDraftById((prev) => ({
      ...prev,
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
    }));
  };

  const handleCloseReturnModal = (orderId: string) => {
    setReturnModalOpenById((prev) => ({ ...prev, [orderId]: false }));
    setConditionDropdownOpenById((prev) => ({ ...prev, [orderId]: false }));
  };

  const handlePhoneChange = (orderId: string, value: string) => {
    const digits = value.replace(/\D/g, "");
    if (digits.length <= 9) {
      const full = `+971${digits}`;
      setReturnDraftById((prev) => ({
        ...prev,
        [orderId]: {
          ...(prev[orderId] ?? ({} as any)),
          pickupAddress: {
            ...(prev[orderId]?.pickupAddress ?? ({} as any)),
            phone: full,
          },
        },
      }));
    }
  };

  const CONDITION_OPTIONS = [
    { value: "Good", label: "Good" },
    { value: "Bad", label: "Bad" },
    { value: "Perfect", label: "Perfect" },
  ];

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
      <div className="flex justify-center py-16">
        <div className="w-8 h-8 border-2 border-gray-300 border-t-black rounded-full animate-spin" />
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

  if (orders.length === 0) {
    return (
      <div className="text-center py-16 sm:py-20 border border-gray-200 bg-[#FDFAF5] rounded-2xl px-6">
        <Package className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <p className="font-display text-xl sm:text-2xl mb-2">
          {t("emptyTitle")}
        </p>
        <p className="text-sm text-gray-500 mb-6 max-w-md mx-auto">
          {t("emptyDescription")}
        </p>
        <Link
          href="/custom-order/fabric"
          className="inline-block px-8 py-3 bg-black text-white text-[10px] tracking-[0.22em] uppercase hover:bg-[#2A2A28] transition font-ui rounded-lg"
        >
          {t("startOrder")}
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {orders.map((order) => {
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

        return (
          <article
            key={order.id}
            className="border border-gray-200 bg-white rounded-2xl shadow-sm hover:shadow-md transition-shadow overflow-hidden"
          >
            <div className="p-4 sm:p-6">
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] uppercase tracking-[0.2em] text-gray-400 mb-1.5">
                    {t("orderId", { id: shortenOrderId(order.id) })}
                  </p>
                  <h3 className="font-display text-lg sm:text-xl mb-0.5">
                    {headline}
                  </h3>
                  {items.length === 1 && tailorName && (
                    <p className="text-sm text-gray-500">{tailorName}</p>
                  )}
                  {showItemsToggle && (
                    <div className="mt-3">
                      <button
                        type="button"
                        onClick={(event) => handleToggleItems(order.id, event)}
                        className="inline-flex items-center gap-2 px-3 py-1.5 border border-gray-200 bg-white hover:bg-[#FDFAF5] transition text-[10px] uppercase tracking-[0.16em] text-black rounded-lg hover:cursor-pointer"
                        aria-expanded={isItemsOpen}
                      >
                        {t("viewItems", { count: items.length })}
                        {isItemsOpen ? (
                          <ChevronUp className="w-3.5 h-3.5" />
                        ) : (
                          <ChevronDown className="w-3.5 h-3.5" />
                        )}
                      </button>

                      <AnimatePresence>
                        {isItemsOpen && (
                          <motion.div
                            initial={{ opacity: 0, y: -8 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -8 }}
                            transition={{ duration: 0.2 }}
                            className="mt-2 max-w-sm sm:max-w-md border border-gray-200 rounded-xl overflow-hidden bg-[#FDFAF5]"
                          >
                            <p className="px-3 sm:px-4 py-1.5 sm:py-2 border-b border-gray-200 text-[9px] uppercase tracking-[0.18em] text-gray-400">
                              {t("itemsDropdownTitle")}
                            </p>
                            <ul>
                              {items.map((item, index) =>
                                renderItemRow(item, index, order.fabricSource),
                              )}
                            </ul>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  )}
                  <p className="text-[10px] uppercase tracking-[0.16em] text-gray-400 mt-2">
                    {formatOrderDate(order.date, locale)}
                  </p>
                </div>

                <div className="flex flex-row sm:flex-col items-center sm:items-end gap-2 flex-wrap">
                  <span className="text-[10px] uppercase tracking-[0.18em] bg-black text-white px-2.5 py-0.5 rounded-full whitespace-nowrap">
                    {t(`statuses.${order.status}`)}
                  </span>
                  {order.total !== undefined && (
                    <span className="font-display text-lg sm:text-xl text-black whitespace-nowrap">
                      {formatCurrency(order.total, locale)}
                    </span>
                  )}
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
            </div>

            <div className="px-4 sm:px-6 pb-4">
              <div className="mt-2 border border-gray-200 rounded-xl bg-[#FDFAF5] p-4">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={!!returnCheckedById[order.id]}
                    onChange={(e) =>
                      setReturnCheckedById((prev) => ({
                        ...prev,
                        [order.id]: e.target.checked,
                      }))
                    }
                    disabled={
                      !detail?.status ||
                      detail.status !== "delivered" ||
                      !!returnConfirmingById[order.id]
                    }
                    className="mt-0.5 w-4 h-4 accent-black"
                  />
                  <span className="text-[11px] uppercase tracking-[0.16em] text-black">
                    Return this item
                  </span>
                </label>

                {returnErrorById[order.id] && (
                  <p className="mt-2 text-red-600 text-sm">
                    {returnErrorById[order.id]}
                  </p>
                )}

                <div className="mt-3">
                  <button
                    type="button"
                    onClick={() => {
                      if (!returnCheckedById[order.id]) return;
                      handleOpenReturnModal(order.id);
                    }}
                    disabled={
                      !detail?.status ||
                      detail.status !== "delivered" ||
                      !returnCheckedById[order.id] ||
                      !!returnConfirmingById[order.id]
                    }
                    className="inline-block px-6 py-2 bg-black text-white text-[10px] tracking-[0.2em] uppercase hover:bg-[#2A2A28] transition font-ui rounded-lg disabled:opacity-50 disabled:hover:bg-black"
                  >
                    {returnConfirmingById[order.id]
                      ? t("loading")
                      : "Confirm return"}
                  </button>
                </div>
              </div>
            </div>

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
                      <h4 className="font-display text-lg mb-4">
                        {t("timelineTitle")}
                      </h4>
                      <OrderTimeline
                        currentStatus={detail.status}
                        statusHistory={detail.statusHistory || []}
                        locale={locale}
                      />
                    </>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Return Modal - Fixed Scrolling */}
            <AnimatePresence>
              {returnModalOpenById[order.id] && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  role="dialog"
                  aria-modal="true"
                  aria-label="Return request"
                  className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-4"
                  style={{}}
                  onWheel={(e) => e.stopPropagation()}
                  onClick={(e) => {
                    if (e.target === e.currentTarget)
                      handleCloseReturnModal(order.id);
                  }}
                >
                  <motion.div
                    initial={{ y: 40, opacity: 0, scale: 0.95 }}
                    animate={{ y: 0, opacity: 1, scale: 1 }}
                    exit={{ y: 40, opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.25, ease: "easeOut" }}
                    className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col my-4 sm:my-8 h-[calc(100vh-2rem)] sm:h-[90vh]"
                    style={{}}
                  >
                    {/* Header - Fixed */}
                    <div className="px-4 sm:px-6 py-4 border-b border-gray-200 bg-white flex items-start justify-between gap-4 shrink-0">
                      <div>
                        <h4 className="font-display text-xl sm:text-2xl">
                          Return this order
                        </h4>
                        <p className="text-sm text-gray-500 mt-1">
                          Tell us the details and we'll review your request.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleCloseReturnModal(order.id)}
                        className="w-10 h-10 rounded-full border border-gray-200 bg-white hover:bg-gray-50 transition flex items-center justify-center text-gray-500 hover:text-black shrink-0"
                        aria-label="Close"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>

                    {/* Body - Scrollable */}
                    <div className="p-4 sm:p-6 overflow-y-auto flex-1 min-h-0 overscroll-contain">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {/* Condition Dropdown with Animation */}
                        <div>
                          <label className="text-[11px] uppercase tracking-[0.14em] text-gray-400 block mb-1.5">
                            Condition <span className="text-red-500">*</span>
                          </label>
                          <div className="relative">
                            <button
                              type="button"
                              onClick={() =>
                                setConditionDropdownOpenById((prev) => ({
                                  ...prev,
                                  [order.id]: !prev[order.id],
                                }))
                              }
                              className="w-full border border-gray-200 rounded-xl p-2.5 text-sm text-black focus:outline-none focus:border-black transition bg-white flex items-center justify-between hover:cursor-pointer"
                            >
                              <span>
                                {returnDraftById[order.id]?.condition ||
                                  "Select condition"}
                              </span>
                              {conditionDropdownOpenById[order.id] ? (
                                <ChevronUp className="w-4 h-4 text-gray-400" />
                              ) : (
                                <ChevronDown className="w-4 h-4 text-gray-400" />
                              )}
                            </button>

                            <AnimatePresence>
                              {conditionDropdownOpenById[order.id] && (
                                <motion.ul
                                  initial={{ opacity: 0, y: -10, scale: 0.95 }}
                                  animate={{ opacity: 1, y: 0, scale: 1 }}
                                  exit={{ opacity: 0, y: -10, scale: 0.95 }}
                                  transition={{
                                    duration: 0.15,
                                    ease: "easeOut",
                                  }}
                                  className="absolute left-0 right-0 top-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-60 overflow-y-auto z-50 py-1"
                                  style={{ overscrollBehavior: "contain" }}
                                >
                                  {CONDITION_OPTIONS.map((option) => (
                                    <motion.li
                                      key={option.value}
                                      initial={{ opacity: 0 }}
                                      animate={{ opacity: 1 }}
                                      transition={{ delay: 0.05 }}
                                    >
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setReturnDraftById((prev) => ({
                                            ...prev,
                                            [order.id]: {
                                              ...(prev[order.id] ??
                                                ({} as any)),
                                              condition: option.value,
                                            },
                                          }));
                                          setConditionDropdownOpenById(
                                            (prev) => ({
                                              ...prev,
                                              [order.id]: false,
                                            }),
                                          );
                                        }}
                                        className={`w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50 transition hover:cursor-pointer ${
                                          returnDraftById[order.id]
                                            ?.condition === option.value
                                            ? "text-black font-medium bg-gray-50"
                                            : "text-gray-700"
                                        }`}
                                      >
                                        {option.label}
                                      </button>
                                    </motion.li>
                                  ))}
                                </motion.ul>
                              )}
                            </AnimatePresence>
                          </div>
                        </div>

                        {/* Reason - Text Input */}
                        <div>
                          <label className="text-[11px] uppercase tracking-[0.14em] text-gray-400 block mb-1.5">
                            Reason of return{" "}
                            <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="text"
                            value={returnDraftById[order.id]?.reason ?? ""}
                            onChange={(e) => {
                              const next = e.target.value;
                              setReturnDraftById((prev) => ({
                                ...prev,
                                [order.id]: {
                                  ...(prev[order.id] ?? ({} as any)),
                                  reason: next,
                                },
                              }));
                            }}
                            placeholder="e.g. Size doesn't fit"
                            className="w-full border border-gray-200 rounded-xl p-2.5 text-sm text-black focus:outline-none focus:border-black transition bg-white"
                          />
                        </div>
                      </div>

                      <div className="mt-4">
                        <label className="text-[11px] uppercase tracking-[0.14em] text-gray-400 block mb-1.5">
                          Comment{" "}
                          <span className="text-gray-400 text-[9px]">
                            (optional)
                          </span>
                        </label>
                        <textarea
                          value={returnDraftById[order.id]?.comment ?? ""}
                          onChange={(e) => {
                            const next = e.target.value;
                            setReturnDraftById((prev) => ({
                              ...prev,
                              [order.id]: {
                                ...(prev[order.id] ?? ({} as any)),
                                comment: next,
                              },
                            }));
                          }}
                          rows={3}
                          className="w-full border border-gray-200 rounded-xl p-3 text-sm text-black focus:outline-none focus:border-black transition resize-y min-h-20 bg-white"
                          placeholder="Add any additional details (optional)..."
                        />
                      </div>

                      <div className="mt-4 pt-4 border-t border-gray-200">
                        <h5 className="text-[11px] uppercase tracking-[0.14em] text-gray-400">
                          Pickup address <span className="text-red-500">*</span>
                        </h5>
                        <p className="text-xs text-gray-500 mt-1">
                          This is prefilled from your delivery address. You can
                          edit it if needed.
                        </p>

                        <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className="text-[10px] uppercase tracking-[0.12em] text-gray-400 block mb-1">
                              Full name <span className="text-red-500">*</span>
                            </label>
                            <input
                              value={
                                returnDraftById[order.id]?.pickupAddress
                                  .fullName ?? ""
                              }
                              onChange={(e) => {
                                const next = e.target.value;
                                setReturnDraftById((prev) => ({
                                  ...prev,
                                  [order.id]: {
                                    ...(prev[order.id] ?? ({} as any)),
                                    pickupAddress: {
                                      ...(prev[order.id]?.pickupAddress ??
                                        ({} as any)),
                                      fullName: next,
                                    },
                                  },
                                }));
                              }}
                              className="w-full border border-gray-200 rounded-xl p-2 text-sm text-black focus:outline-none focus:border-black transition bg-white"
                              placeholder="John Doe"
                            />
                          </div>

                          <div>
                            <label className="text-[10px] uppercase tracking-[0.12em] text-gray-400 block mb-1">
                              Phone <span className="text-red-500">*</span>
                            </label>
                            <div className="relative">
                              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-mono text-sm">
                                +971
                              </span>
                              <input
                                type="tel"
                                value={
                                  returnDraftById[order.id]?.pickupAddress.phone
                                    ?.replace(/\D/g, "")
                                    .slice(3) || ""
                                }
                                onChange={(e) => {
                                  handlePhoneChange(order.id, e.target.value);
                                }}
                                placeholder="50 123 4567"
                                maxLength={9}
                                className="w-full border border-gray-200 rounded-xl p-2 pl-14 text-sm text-black focus:outline-none focus:border-black transition bg-white font-mono"
                              />
                            </div>
                            <p className="text-[8px] text-gray-400 mt-0.5">
                              Enter 9 digits after +971
                            </p>
                          </div>

                          <div className="sm:col-span-2">
                            <label className="text-[10px] uppercase tracking-[0.12em] text-gray-400 block mb-1">
                              Address line 1{" "}
                              <span className="text-red-500">*</span>
                            </label>
                            <input
                              value={
                                returnDraftById[order.id]?.pickupAddress
                                  .line1 ?? ""
                              }
                              onChange={(e) => {
                                const next = e.target.value;
                                setReturnDraftById((prev) => ({
                                  ...prev,
                                  [order.id]: {
                                    ...(prev[order.id] ?? ({} as any)),
                                    pickupAddress: {
                                      ...(prev[order.id]?.pickupAddress ??
                                        ({} as any)),
                                      line1: next,
                                    },
                                  },
                                }));
                              }}
                              className="w-full border border-gray-200 rounded-xl p-2 text-sm text-black focus:outline-none focus:border-black transition bg-white"
                              placeholder="Street address"
                            />
                          </div>

                          <div className="sm:col-span-2">
                            <label className="text-[10px] uppercase tracking-[0.12em] text-gray-400 block mb-1">
                              Address line 2
                            </label>
                            <input
                              value={
                                returnDraftById[order.id]?.pickupAddress
                                  .line2 ?? ""
                              }
                              onChange={(e) => {
                                const next = e.target.value;
                                setReturnDraftById((prev) => ({
                                  ...prev,
                                  [order.id]: {
                                    ...(prev[order.id] ?? ({} as any)),
                                    pickupAddress: {
                                      ...(prev[order.id]?.pickupAddress ??
                                        ({} as any)),
                                      line2: next,
                                    },
                                  },
                                }));
                              }}
                              className="w-full border border-gray-200 rounded-xl p-2 text-sm text-black focus:outline-none focus:border-black transition bg-white"
                              placeholder="Apartment, suite, etc."
                            />
                          </div>

                          <div>
                            <label className="text-[10px] uppercase tracking-[0.12em] text-gray-400 block mb-1">
                              City <span className="text-red-500">*</span>
                            </label>
                            <input
                              value={
                                returnDraftById[order.id]?.pickupAddress.city ??
                                ""
                              }
                              onChange={(e) => {
                                const next = e.target.value;
                                setReturnDraftById((prev) => ({
                                  ...prev,
                                  [order.id]: {
                                    ...(prev[order.id] ?? ({} as any)),
                                    pickupAddress: {
                                      ...(prev[order.id]?.pickupAddress ??
                                        ({} as any)),
                                      city: next,
                                    },
                                  },
                                }));
                              }}
                              className="w-full border border-gray-200 rounded-xl p-2 text-sm text-black focus:outline-none focus:border-black transition bg-white"
                              placeholder="Dubai"
                            />
                          </div>

                          <div>
                            <label className="text-[10px] uppercase tracking-[0.12em] text-gray-400 block mb-1">
                              State <span className="text-red-500">*</span>
                            </label>
                            <input
                              value={
                                returnDraftById[order.id]?.pickupAddress
                                  .state ?? ""
                              }
                              onChange={(e) => {
                                const next = e.target.value;
                                setReturnDraftById((prev) => ({
                                  ...prev,
                                  [order.id]: {
                                    ...(prev[order.id] ?? ({} as any)),
                                    pickupAddress: {
                                      ...(prev[order.id]?.pickupAddress ??
                                        ({} as any)),
                                      state: next,
                                    },
                                  },
                                }));
                              }}
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
                                returnDraftById[order.id]?.pickupAddress
                                  .postalCode ?? ""
                              }
                              onChange={(e) => {
                                const next = e.target.value;
                                setReturnDraftById((prev) => ({
                                  ...prev,
                                  [order.id]: {
                                    ...(prev[order.id] ?? ({} as any)),
                                    pickupAddress: {
                                      ...(prev[order.id]?.pickupAddress ??
                                        ({} as any)),
                                      postalCode: next,
                                    },
                                  },
                                }));
                              }}
                              className="w-full border border-gray-200 rounded-xl p-2 text-sm text-black focus:outline-none focus:border-black transition bg-white"
                              placeholder="00000"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Messages */}
                      {returnErrorById[order.id] && (
                        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-xl">
                          <p className="text-red-600 text-sm">
                            {returnErrorById[order.id]}
                          </p>
                        </div>
                      )}
                      {returnSuccessMessageById[order.id] && (
                        <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-xl">
                          <p className="text-green-700 text-sm">
                            {returnSuccessMessageById[order.id]}
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Footer - Fixed */}
                    <div className="px-4 sm:px-6 py-4 border-t border-gray-200 bg-white flex flex-col-reverse sm:flex-row items-center justify-end gap-3 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleCloseReturnModal(order.id)}
                        className="w-full sm:w-auto px-6 py-2.5 border border-gray-200 rounded-xl text-black text-[11px] uppercase tracking-[0.14em] font-ui hover:bg-gray-50 transition disabled:opacity-50"
                        disabled={!!returnSubmittingById[order.id]}
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={async () => {
                          setReturnErrorById((prev) => ({
                            ...prev,
                            [order.id]: null,
                          }));
                          setReturnSuccessMessageById((prev) => ({
                            ...prev,
                            [order.id]: null,
                          }));

                          setReturnSubmittingById((prev) => ({
                            ...prev,
                            [order.id]: true,
                          }));

                          try {
                            const draft = returnDraftById[order.id];
                            if (!draft)
                              throw new Error("Missing return details");

                            // Validate required fields
                            if (!draft.condition)
                              throw new Error("Condition is required");
                            if (!draft.reason.trim())
                              throw new Error("Reason is required");
                            if (!draft.pickupAddress.fullName)
                              throw new Error("Full name is required");
                            if (
                              !draft.pickupAddress.phone ||
                              draft.pickupAddress.phone.replace(/\D/g, "")
                                .length < 12
                            )
                              throw new Error("Valid phone number is required");
                            if (!draft.pickupAddress.line1)
                              throw new Error("Address line 1 is required");
                            if (!draft.pickupAddress.city)
                              throw new Error("City is required");
                            if (!draft.pickupAddress.state)
                              throw new Error("State is required");
                            if (!draft.pickupAddress.postalCode)
                              throw new Error("Postal code is required");
                            // Real API call
                            const payload = {
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
                            };

                            const apiRes = await api.post<{
                              success: boolean;
                              order?: any;
                            }>(
                              `/api/orders/custom/${order.id}/return-request`,
                              payload,
                            );

                            if (!apiRes?.success) {
                              throw new Error(
                                "Failed to submit return request",
                              );
                            }

                            setReturnSuccessMessageById((prev) => ({
                              ...prev,
                              [order.id]:
                                "Return request accepted. Once MOTD approves, you will get your refund.",
                            }));
                          } catch (err: unknown) {
                            const message =
                              (err as ApiError)?.message ||
                              (err instanceof Error ? err.message : t("error"));
                            setReturnErrorById((prev) => ({
                              ...prev,
                              [order.id]: message,
                            }));
                          } finally {
                            setReturnSubmittingById((prev) => ({
                              ...prev,
                              [order.id]: false,
                            }));
                          }
                        }}
                        disabled={!!returnSubmittingById[order.id]}
                        className="w-full sm:w-auto px-8 py-2.5 bg-black text-white rounded-xl text-[11px] uppercase tracking-[0.14em] font-ui hover:bg-[#2A2A28] transition disabled:opacity-50"
                      >
                        {returnSubmittingById[order.id] ? (
                          <span className="flex items-center gap-2">
                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            {t("loading")}
                          </span>
                        ) : (
                          "Submit"
                        )}
                      </button>
                    </div>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>
          </article>
        );
      })}
    </div>
  );
}
