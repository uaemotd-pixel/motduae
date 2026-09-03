"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  ChevronDown,
  Info,
  Maximize2,
  Package,
  RefreshCw,
  Scissors,
  Sparkles,
  CheckCircle2,
  MapPin,
} from "lucide-react";
import MainLayout from "@/app/[locale]/main/layout";
import { api, type ApiError } from "@/lib/api/client";
import { formatCurrency } from "@/lib/format";
import {
  formatOrderDate,
  getDesignDisplayName,
  getDesignMinimumMeters,
  getFabricDisplayName,
  getOrderItemsSummary,
  getTailorDisplayName,
  groupSelectedCutPieces,
  hasMultipleTailors,
  resolveOrderLeftoverMeters,
  shortenOrderId,
  type CustomOrderStatus,
  type PublicCustomTrackOrder,
  type PublicDeliveryAddress,
  type PublicRetailTrackOrder,
} from "@/lib/customOrders";
import OrderProgressPanel from "@/components/orders/OrderProgressPanel";
import { ImageModal } from "@/components/shared/ImageModal";
import { Skeleton } from "@/components/ui/Skeleton";
import { resolveDesignImage } from "@/lib/tailors";
import { resolveFabricImage } from "@/lib/fabrics";
import { resolveReadyMadeImage } from "@/lib/readyMade";
import { resolveMediaUrl } from "@/lib/media";

type TrackResponse =
  | { success: true; orderType: "custom"; order: PublicCustomTrackOrder }
  | { success: true; orderType: "retail"; order: PublicRetailTrackOrder }
  | { success: false; message?: string };

function formatAddress(address: PublicDeliveryAddress | null) {
  if (!address) return null;
  const lines = [
    address.fullName,
    [address.line1, address.line2].filter(Boolean).join(", "),
    [address.city, address.emirate, address.postalCode]
      .filter(Boolean)
      .join(", "),
  ].filter(Boolean);
  if (lines.length === 0) return null;
  return lines;
}

export default function PublicOrderTrackPage() {
  const params = useParams();
  const token = String(params.token || "");
  const locale = params.locale === "ar" ? "ar" : "en";
  const t = useTranslations("OrdersPage.track");
  const tCustom = useTranslations("OrdersPage.custom");
  const tRetail = useTranslations("OrdersPage.retail");
  const tReview = useTranslations("CustomOrderReview");

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [invalid, setInvalid] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [payload, setPayload] = useState<TrackResponse | null>(null);
  const [priceOpen, setPriceOpen] = useState(false);
  const [imageModalOpen, setImageModalOpen] = useState(false);
  const [selectedImage, setSelectedImage] = useState("");

  const load = useCallback(
    async (isRefresh = false) => {
      if (!token) {
        setInvalid(true);
        setLoading(false);
        return;
      }
      try {
        if (isRefresh) setRefreshing(true);
        else setLoading(true);
        setError(null);
        const data = await api.get<TrackResponse>(
          `/api/orders/track/${encodeURIComponent(token)}`,
        );
        if (!data?.success || !data.order) {
          setInvalid(true);
          setPayload(null);
          return;
        }
        setInvalid(false);
        setPayload(data);
      } catch (err: unknown) {
        const status = (err as ApiError)?.status;
        if (status === 404) {
          setInvalid(true);
          setPayload(null);
          return;
        }
        setError(
          (err as ApiError)?.message ||
            (err instanceof Error ? err.message : t("error")),
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [token, t],
  );

  useEffect(() => {
    void load(false);
  }, [load]);

  const handleImageClick = (imageUrl: string) => {
    if (!imageUrl) return;
    setSelectedImage(imageUrl);
    setImageModalOpen(true);
  };

  return (
    <MainLayout>
      <div className="max-w-4xl mx-auto px-3 sm:px-6 lg:px-8 py-6 sm:py-10 lg:py-14">
        <div className="mb-6 sm:mb-8 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div>
            <h1 className="[font-family:var(--font-display)] text-2xl sm:text-[32px] lg:text-[40px] font-normal leading-[1.1] tracking-[-0.01em] text-black mb-2 sm:mb-3">
              {t("title")}
            </h1>
            <p className="[font-family:var(--font-body)] text-xs sm:text-sm lg:text-[14px] leading-relaxed text-(--color-grey-muted) max-w-2xl">
              {t("description")}
            </p>
          </div>
          {payload?.success && (
            <button
              type="button"
              onClick={() => void load(true)}
              disabled={refreshing}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 border border-black/10 bg-white hover:bg-gray-50 text-[10px] uppercase tracking-[0.18em] font-ui font-semibold rounded-lg transition disabled:opacity-50"
            >
              <RefreshCw
                className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`}
              />
              {t("refresh")}
            </button>
          )}
        </div>

        {loading && (
          <div className="space-y-3 py-4" role="status">
            {Array.from({ length: 2 }).map((_, i) => (
              <div
                key={i}
                className="border border-(--color-border) bg-white p-4 space-y-3 rounded-2xl"
              >
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-2/3" />
              </div>
            ))}
          </div>
        )}

        {!loading && (invalid || (!payload && !error)) && (
          <p className="text-center text-gray-600 py-16 text-sm sm:text-base [font-family:var(--font-body)]">
            {t("invalid")}
          </p>
        )}

        {!loading && error && !invalid && (
          <p className="text-center text-red-600 py-16 text-sm sm:text-base">
            {error}
          </p>
        )}

        {!loading && payload?.success && payload.orderType === "custom" && (
          <CustomPublicCard
            order={payload.order}
            locale={locale}
            tCustom={tCustom}
            tReview={tReview}
            tTrack={t}
            priceOpen={priceOpen}
            onTogglePrice={() => setPriceOpen((v) => !v)}
            onImageClick={handleImageClick}
          />
        )}

        {!loading && payload?.success && payload.orderType === "retail" && (
          <RetailPublicCard
            order={payload.order}
            locale={locale}
            tRetail={tRetail}
            tTrack={t}
            priceOpen={priceOpen}
            onTogglePrice={() => setPriceOpen((v) => !v)}
            onImageClick={handleImageClick}
          />
        )}
      </div>
      <ImageModal
        isOpen={imageModalOpen}
        imageUrl={selectedImage}
        alt="Item Image"
        onClose={() => {
          setImageModalOpen(false);
          setSelectedImage("");
        }}
      />
    </MainLayout>
  );
}

function AddressBlock({
  address,
  locale,
  title,
}: {
  address: PublicDeliveryAddress | null;
  locale: string;
  title: string;
}) {
  const lines = formatAddress(address);
  if (!lines) return null;
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] font-ui font-bold text-black/50">
        <MapPin className="w-3.5 h-3.5 text-black/30" />
        <span>{title}</span>
      </div>
      <div className="border border-black/5 rounded-xl p-5 bg-[#FAF9F6]/60 text-sm text-black/80 [font-family:var(--font-body)] space-y-1">
        {lines.map((line) => (
          <p key={line}>{line}</p>
        ))}
      </div>
    </div>
  );
}

function CustomPublicCard({
  order,
  locale,
  tCustom,
  tReview,
  tTrack,
  priceOpen,
  onTogglePrice,
  onImageClick,
}: {
  order: PublicCustomTrackOrder;
  locale: "en" | "ar";
  tCustom: ReturnType<typeof useTranslations>;
  tReview: ReturnType<typeof useTranslations>;
  tTrack: ReturnType<typeof useTranslations>;
  priceOpen: boolean;
  onTogglePrice: () => void;
  onImageClick: (url: string) => void;
}) {
  const items = getOrderItemsSummary(order);
  const showPieceStatus = hasMultipleTailors(items);
  const dateValue =
    typeof order.date === "string"
      ? order.date
      : new Date(order.date).toISOString();

  return (
    <article className="border border-gray-200 bg-white rounded-2xl shadow-sm overflow-hidden p-4 sm:p-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-gray-100 pb-3 mb-4 gap-2">
        <div>
          <p className="text-[10px] uppercase tracking-[0.2em] text-gray-400 font-ui font-medium">
            {tCustom("orderId", { id: shortenOrderId(String(order.id)) })}
          </p>
          <p className="text-[11px] text-gray-500 font-ui mt-0.5">
            {formatOrderDate(dateValue, locale)}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="inline-flex items-center text-[9px] uppercase tracking-[0.18em] px-2 py-0.5 font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-md">
            {locale === "ar" ? "تفصيل" : "Custom Order"}
          </span>
          <span className="text-[10px] uppercase tracking-[0.18em] bg-black text-white px-2.5 py-0.5 rounded-full whitespace-nowrap">
            {tCustom(`statuses.${order.status}`)}
          </span>
        </div>
      </div>

      <div className="flex flex-col gap-8 mt-2">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 pb-8 border-b border-black/5">
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] font-ui font-bold text-black/50">
              <Scissors className="w-3.5 h-3.5 text-black/30" />
              <span>{locale === "ar" ? "التصاميم" : "DESIGNS"}</span>
            </div>
            {items.map((item, index) => {
              const designName =
                getDesignDisplayName(item.design, locale) ||
                tCustom("unknownDesign");
              const dImage = item.design?.images?.[0];
              const pieceStatus = (item.tailorStatus ||
                order.status) as CustomOrderStatus;
              const tailorName = getTailorDisplayName(item.tailorShop, locale);
              return (
                <div
                  key={index}
                  className="flex flex-col sm:flex-row items-start sm:items-center gap-4 bg-white p-4 rounded-xl border border-black/5"
                >
                  <div className="w-16 h-16 sm:w-20 sm:h-20 bg-[#F0EBE3] overflow-hidden rounded-lg border border-black/5 shrink-0 relative flex items-center justify-center">
                    {dImage ? (
                      <>
                        <img
                          src={resolveDesignImage(dImage)}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                        <button
                          type="button"
                          onClick={() =>
                            onImageClick(resolveDesignImage(dImage))
                          }
                          className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 hover:opacity-100 transition-opacity rounded-lg"
                        >
                          <Maximize2 className="w-4 h-4 text-white" />
                        </button>
                      </>
                    ) : (
                      <Package size={20} className="text-gray-300" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h4 className="text-sm font-semibold text-black leading-tight">
                      {designName}
                    </h4>
                    {showPieceStatus ? (
                      <>
                        {tailorName ? (
                          <p className="text-[11px] text-gray-500 [font-family:var(--font-body)] mt-1">
                            {tailorName}
                          </p>
                        ) : null}
                        <span className="mt-2 inline-flex items-center text-[9px] uppercase tracking-[0.18em] bg-black text-white px-2 py-0.5 rounded-full whitespace-nowrap">
                          {tCustom(`statuses.${pieceStatus}`)}
                        </span>
                        {item.awaitingRestOfOrder ? (
                          <p className="text-[11px] text-teal-700 [font-family:var(--font-body)] mt-1.5">
                            {tTrack("pieceReadyWaiting")}
                          </p>
                        ) : null}
                      </>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] font-ui font-bold text-black/50">
              <Sparkles className="w-3.5 h-3.5 text-black/30" />
              <span>{locale === "ar" ? "الأقمشة" : "FABRICS"}</span>
            </div>
            {items.map((item, index) => {
              const fabricName =
                order.fabricSource === "self"
                  ? tCustom("ownFabric")
                  : getFabricDisplayName(item.fabric, locale) ||
                    tCustom("unknownFabric");
              const fImage =
                order.fabricSource === "storefront"
                  ? item.fabric?.images?.[0]
                  : null;
              const minRequired = getDesignMinimumMeters(item.design);
              const leftoverVal = resolveOrderLeftoverMeters({
                leftoverMeters:
                  item.leftoverMeters ??
                  (order.leftoverMeters && items.length === 1
                    ? order.leftoverMeters
                    : null),
                fabricMeters: item.fabricMeters,
                minRequired,
              });
              const cuts =
                item.selectedCuts && item.selectedCuts.length > 0
                  ? item.selectedCuts
                  : order.selectedCuts && items.length === 1
                    ? order.selectedCuts
                    : [];
              const cutRows = groupSelectedCutPieces(cuts, locale);
              const showCuts =
                cutRows.length > 0 && order.fabricSource !== "self";

              return (
                <div
                  key={index}
                  className="flex flex-col sm:flex-row items-start sm:items-center gap-4 bg-white p-4 rounded-xl border border-black/5"
                >
                  <div className="w-16 h-16 sm:w-20 sm:h-20 bg-[#F0EBE3] overflow-hidden rounded-lg border border-black/5 shrink-0 relative flex items-center justify-center">
                    {fImage ? (
                      <>
                        <img
                          src={resolveFabricImage(fImage)}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                        <button
                          type="button"
                          onClick={() =>
                            onImageClick(resolveFabricImage(fImage))
                          }
                          className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 hover:opacity-100 transition-opacity rounded-lg"
                        >
                          <Maximize2 className="w-4 h-4 text-white" />
                        </button>
                      </>
                    ) : (
                      <Package size={20} className="text-gray-300" />
                    )}
                  </div>
                  <div className="flex-1 space-y-1">
                    <h4 className="text-sm font-semibold text-black leading-tight">
                      {fabricName}
                    </h4>

                    {showCuts && (
                      <p className="text-xs text-black/60 font-ui">
                        {cutRows
                          .map((row) =>
                            tTrack("piecesCount", {
                              count: row.quantity,
                              cut: row.label,
                            }),
                          )
                          .join(" + ")}
                      </p>
                    )}

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500 font-ui pt-0.5">
                      {!showCuts && item.fabricMeters != null && (
                        <span>
                          <strong className="text-black font-medium">
                            {tTrack("totalFabricSent")}:
                          </strong>{" "}
                          {item.fabricMeters} {tCustom("meters")}
                        </span>
                      )}
                      {leftoverVal > 0 && (
                        <span>
                          <strong className="text-emerald-700 font-medium">
                            {tTrack("leftoverToReturn")}:
                          </strong>{" "}
                          <span className="text-emerald-700 font-semibold">
                            {leftoverVal} {tCustom("meters")}
                          </span>
                        </span>
                      )}
                    </div>

                    {leftoverVal > 0 && (
                      <p className="text-xs text-emerald-700 font-medium font-ui pt-1">
                        {tTrack("customerLeftoverNotice", { meters: leftoverVal })}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {order.addons && order.addons.length > 0 && (
          <div className="space-y-4 pb-8 border-b border-black/5">
            <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] font-ui font-bold text-black/50">
              <CheckCircle2 className="w-3.5 h-3.5 text-black/30" />
              <span>{locale === "ar" ? "الإضافات" : "SELECTED ADD-ONS"}</span>
            </div>
            <ul className="border border-black/5 rounded-xl p-5 bg-[#FAF9F6]/60 divide-y divide-black/5">
              {order.addons.map((addon, idx) => {
                const name =
                  locale === "ar" ? addon.nameAr || addon.name : addon.name;
                return (
                  <li
                    key={idx}
                    className="flex justify-between items-center text-xs py-2.5 first:pt-0 last:pb-0 gap-4"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-[#F0EBE3] overflow-hidden rounded-lg shrink-0">
                        {addon.thumbnailImage ? (
                          <img
                            src={resolveMediaUrl(addon.thumbnailImage)}
                            alt=""
                            className="w-full h-full object-cover"
                          />
                        ) : null}
                      </div>
                      <span className="font-medium text-black/70">{name}</span>
                    </div>
                    <span className="font-bold text-black">
                      {formatCurrency(addon.price, locale)}
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        <div className="space-y-4">
          <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] font-ui font-bold text-black/50">
            <Info className="w-3.5 h-3.5 text-black/30" />
            <span>{locale === "ar" ? "المجموع" : "TOTAL PRICE"}</span>
          </div>
          <div className="relative overflow-hidden bg-black text-white rounded-xl p-5 w-full shadow-md flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
            <div className="flex justify-between sm:justify-start items-center gap-6">
              <span className="text-[10px] uppercase tracking-widest text-white/60 font-ui font-semibold">
                {locale === "ar" ? "المجموع الإجمالي" : "Total Price"}
              </span>
              {order.total !== undefined && (
                <span className="font-display text-xl font-bold tracking-tight">
                  {formatCurrency(order.total, locale)}
                </span>
              )}
            </div>
            {order.pricing && (
              <button
                type="button"
                onClick={onTogglePrice}
                className="text-center py-2.5 px-6 bg-white/10 hover:bg-white/20 border border-white/10 text-[10px] uppercase tracking-widest text-white rounded-lg font-ui font-semibold flex items-center justify-center gap-2"
              >
                {priceOpen
                  ? locale === "ar"
                    ? "إخفاء التفاصيل"
                    : "Hide Price Details"
                  : locale === "ar"
                    ? "عرض تفاصيل السعر"
                    : "View Price Details"}
                <ChevronDown
                  className={`w-3.5 h-3.5 transition-transform ${priceOpen ? "rotate-180" : ""}`}
                />
              </button>
            )}
          </div>
        </div>

        <AddressBlock
          address={order.deliveryAddress}
          locale={locale}
          title={tTrack("deliveryAddress")}
        />
      </div>

      {priceOpen && order.pricing && (
        <div className="mt-4 border-t border-gray-100 pt-4 w-full">
          <div className="bg-[#FDFAF5] border border-gray-200 rounded-xl p-4 space-y-2 text-xs text-gray-600 font-ui">
            <div className="flex justify-between">
              <span>{tReview("lines.designBase")}</span>
              <span className="font-semibold text-black">
                {formatCurrency(order.pricing.designBase, locale)}
              </span>
            </div>
            <div className="flex justify-between">
              <span>{tReview("lines.fabricCost")}</span>
              <span className="font-semibold text-black">
                {formatCurrency(order.pricing.fabricCost, locale)}
              </span>
            </div>
            <div className="flex justify-between">
              <span>{tReview("lines.tailoringFee")}</span>
              <span className="font-semibold text-black">
                {formatCurrency(order.pricing.tailoringFee, locale)}
              </span>
            </div>
            {order.pricing.deliveryFee > 0 && (
              <div className="flex justify-between">
                <span>{tReview("lines.deliveryFee")}</span>
                <span className="font-semibold text-black">
                  {formatCurrency(order.pricing.deliveryFee, locale)}
                </span>
              </div>
            )}
            <div className="flex justify-between pt-2 border-t border-black">
              <span className="font-bold uppercase tracking-wider">
                {tReview("lines.total")}
              </span>
              <span className="font-bold text-sm">
                {formatCurrency(order.pricing.total, locale)}
              </span>
            </div>
          </div>
        </div>
      )}

      <div className="mt-6 border-t border-gray-200 p-4 sm:p-6 bg-[#FDFAF5] -mx-4 sm:-mx-6 -mb-4 sm:-mb-6">
        <h4 className="font-display text-lg mb-4">{tCustom("timelineTitle")}</h4>
        <OrderProgressPanel
          variant="custom"
          currentStatus={order.status as CustomOrderStatus}
          statusHistory={order.statusHistory || []}
          shipments={order.shipments}
          locale={locale}
          visibility="customer"
          hasReturnItems={order.hasReturnItems}
          emptyShipmentsMessage={tTrack("courierEmpty")}
        />
      </div>
    </article>
  );
}

function RetailPublicCard({
  order,
  locale,
  tRetail,
  tTrack,
  priceOpen,
  onTogglePrice,
  onImageClick,
}: {
  order: PublicRetailTrackOrder;
  locale: "en" | "ar";
  tRetail: ReturnType<typeof useTranslations>;
  tTrack: ReturnType<typeof useTranslations>;
  priceOpen: boolean;
  onTogglePrice: () => void;
  onImageClick: (url: string) => void;
}) {
  const dateValue =
    typeof order.date === "string"
      ? order.date
      : new Date(order.date).toISOString();

  return (
    <article className="border border-gray-200 bg-white rounded-2xl shadow-sm overflow-hidden p-4 sm:p-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-gray-100 pb-3 mb-4 gap-2">
        <div>
          <p className="text-[10px] uppercase tracking-[0.2em] text-gray-400 mb-1.5 font-ui font-medium">
            {tRetail("orderId", { id: shortenOrderId(String(order.id)) })}
          </p>
          <p className="text-[11px] text-gray-500 font-ui mt-0.5">
            {formatOrderDate(dateValue, locale)}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="inline-flex items-center text-[9px] uppercase tracking-[0.18em] px-2 py-0.5 font-semibold bg-amber-50 text-amber-700 border border-amber-200 rounded-md">
            {locale === "ar" ? "جاهز" : "Ready-Made Order"}
          </span>
          <span className="text-[10px] uppercase tracking-[0.18em] bg-black text-white px-2.5 py-0.5 rounded-full">
            {tRetail(`statuses.${order.status}`, {
              defaultValue: order.status,
            })}
          </span>
        </div>
      </div>

      <div className="flex flex-col gap-8 mt-2">
        <div className="space-y-3 pb-6 border-b border-black/5">
          <p className="text-[10px] uppercase tracking-[0.2em] font-ui font-bold text-black/50">
            {locale === "ar" ? "الاسم" : "ITEM NAME"}
          </p>
          {order.items.map((item, idx) => (
            <div
              key={idx}
              className="flex flex-col sm:flex-row items-start sm:items-center gap-4 bg-white p-4 rounded-xl border border-black/5"
            >
              <div className="w-16 h-16 sm:w-20 sm:h-20 bg-[#F0EBE3] overflow-hidden rounded-lg shrink-0 relative flex items-center justify-center">
                {item.image ? (
                  <>
                    <img
                      src={resolveReadyMadeImage(item.image)}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        onImageClick(resolveReadyMadeImage(item.image))
                      }
                      className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 hover:opacity-100 transition-opacity rounded-lg"
                    >
                      <Maximize2 className="w-4 h-4 text-white" />
                    </button>
                  </>
                ) : (
                  <Package size={20} className="text-gray-300" />
                )}
              </div>
              <div>
                <h4 className="text-sm font-semibold text-black">
                  {locale === "ar" ? item.nameAr || item.name : item.name}
                </h4>
                <span className="block text-[10px] text-gray-500 font-ui mt-1 font-semibold">
                  Qty: {item.quantity}
                  {item.size ? ` | Size: ${item.size}` : ""}
                </span>
              </div>
            </div>
          ))}
        </div>

        <div className="space-y-4">
          <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] font-ui font-bold text-black/50">
            <Info className="w-3.5 h-3.5 text-black/30" />
            <span>{locale === "ar" ? "المجموع" : "TOTAL PRICE"}</span>
          </div>
          <div className="relative overflow-hidden bg-black text-white rounded-xl p-5 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
            <div className="flex items-center gap-6">
              <span className="text-[10px] uppercase tracking-widest text-white/60 font-ui font-semibold">
                {locale === "ar" ? "المجموع الإجمالي" : "Total Price"}
              </span>
              <span className="font-display text-xl font-bold">
                {formatCurrency(order.totalPrice, locale)}
              </span>
            </div>
            <button
              type="button"
              onClick={onTogglePrice}
              className="text-center py-2.5 px-6 bg-white/10 hover:bg-white/20 border border-white/10 text-[10px] uppercase tracking-widest text-white rounded-lg font-ui font-semibold flex items-center justify-center gap-2"
            >
              {priceOpen
                ? locale === "ar"
                  ? "إخفاء التفاصيل"
                  : "Hide Price Details"
                : locale === "ar"
                  ? "عرض تفاصيل السعر"
                  : "View Price Details"}
              <ChevronDown
                className={`w-3.5 h-3.5 transition-transform ${priceOpen ? "rotate-180" : ""}`}
              />
            </button>
          </div>
        </div>

        <AddressBlock
          address={order.deliveryAddress}
          locale={locale}
          title={tTrack("deliveryAddress")}
        />
      </div>

      {priceOpen && (
        <div className="mt-4 border-t border-gray-100 pt-4">
          <div className="bg-[#FDFAF5] border border-gray-200 rounded-xl p-4 space-y-2 text-xs text-gray-600 font-ui">
            <div className="flex justify-between">
              <span>{locale === "ar" ? "سعر المنتجات" : "Items Price"}</span>
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
            {(order.shippingPrice || 0) > 0 && (
              <div className="flex justify-between">
                <span>{locale === "ar" ? "رسوم التوصيل" : "Delivery Fee"}</span>
                <span className="font-semibold text-black">
                  {formatCurrency(order.shippingPrice || 0, locale)}
                </span>
              </div>
            )}
            {(order.vatAmount || 0) > 0 && (
              <div className="flex justify-between">
                <span>
                  {locale === "ar" ? "ضريبة القيمة المضافة" : "VAT"}
                </span>
                <span className="font-semibold text-black">
                  {formatCurrency(order.vatAmount || 0, locale)}
                </span>
              </div>
            )}
            <div className="flex justify-between pt-2 border-t border-black">
              <span className="font-bold uppercase tracking-wider">
                {locale === "ar" ? "المجموع الإجمالي" : "Total Amount"}
              </span>
              <span className="font-bold text-sm">
                {formatCurrency(order.totalPrice, locale)}
              </span>
            </div>
          </div>
        </div>
      )}

      <div className="mt-6 border-t border-gray-100 pt-4">
        <div className="mt-4 bg-[#FDFAF5] border border-gray-200 rounded-xl p-4 sm:p-6">
          <h4 className="font-display text-lg mb-4">{tTrack("progress")}</h4>
          <OrderProgressPanel
            variant="retail"
            currentStatus={order.status}
            statusHistory={order.statusHistory || []}
            shipments={order.shipments}
            locale={locale}
            visibility="customer"
            compact
            emptyShipmentsMessage={tTrack("courierEmpty")}
          />
        </div>
      </div>
    </article>
  );
}
