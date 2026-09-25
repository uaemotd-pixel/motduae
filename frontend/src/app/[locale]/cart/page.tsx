"use client";

import { Link, useRouter } from "@/i18n/navigation";
import { useParams } from "next/navigation";
import {
  Trash2,
  Plus,
  Minus,
  ShoppingBag,
  ArrowLeft,
  Maximize2,
} from "lucide-react";
import MainLayout from "../main/layout";
import FadeInSection from "@/components/shared/fadeInSection";
import { useCart } from "@/context/CartContext";
import { resolveMediaUrl } from "@/lib/media";
import { isFabricCutCartId } from "@/lib/fabrics";
import { clearBuyNowCheckout } from "@/lib/buyNowCheckout";
import { saveCartCheckoutSelection } from "@/lib/cartStorage";
import { useState, useEffect, useRef } from "react";
import { api } from "@/lib/api/client";
import { ImageModal } from "@/components/shared/ImageModal";
import toast from "react-hot-toast";
import { ERROR_TOAST } from "@/lib/tailorPortalToast";
import { getTranslation } from "@/lib/getTranslation";
import { useMeasurementUnit } from "@/hooks/useMeasurementUnit";

export default function CartPage() {
  const {
    items,
    removeItem,
    updateQuantity,
    clearCart,
    purgeUnavailableItems,
    refreshFromAccount,
  } = useCart();
  const router = useRouter();
  const params = useParams();
  const locale = params.locale as string;
  const t = getTranslation(locale);
  const { unit: measurementUnit } = useMeasurementUnit();
  const [vatRate, setVatRate] = useState<number | null>(null);
  const [vatError, setVatError] = useState(false);
  const [imageModalOpen, setImageModalOpen] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string>("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(
    () => new Set(items.map((item) => item.id)),
  );
  const knownCartIdsRef = useRef<Set<string>>(
    new Set(items.map((item) => item.id)),
  );

  useEffect(() => {
    clearBuyNowCheckout();
  }, []);

  // Pull the signed-in account cart so items added on another device appear.
  useEffect(() => {
    void refreshFromAccount();
    // Only on mount / when landing on the cart page.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keep selection in sync when cart lines are added or removed.
  // Surviving lines keep their checked state; new lines default to selected.
  useEffect(() => {
    const currentIds = items.map((item) => item.id);
    const known = knownCartIdsRef.current;

    setSelectedIds((prev) => {
      const next = new Set<string>();
      for (const id of currentIds) {
        if (known.has(id)) {
          if (prev.has(id)) next.add(id);
        } else {
          next.add(id);
        }
      }
      return next;
    });

    knownCartIdsRef.current = new Set(currentIds);
  }, [items.map((item) => item.id).join("|")]);

  // Drop sold-out / unavailable lines before the customer reaches checkout.
  useEffect(() => {
    if (!items.length) return;

    let cancelled = false;

    const validate = async () => {
      const { purgedNames } = await purgeUnavailableItems(measurementUnit);
      if (cancelled || purgedNames.length === 0) return;

      if (purgedNames.length === 1) {
        toast.error(
          t.checkout.itemUnavailableRemoved.replace("{name}", purgedNames[0]),
          ERROR_TOAST,
        );
      } else {
        toast.error(
          t.checkout.itemsUnavailableRemoved.replace(
            "{count}",
            String(purgedNames.length),
          ),
          ERROR_TOAST,
        );
      }
    };

    void validate();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items.map((item) => `${item.id}:${item.quantity}`).join("|"), measurementUnit]);

  // Fetch VAT rate from platform settings
  useEffect(() => {
    async function fetchVatRate() {
      try {
        const data = await api.get<{ vatRate: number }>("/api/orders/settings");
        if (data?.vatRate !== undefined && data?.vatRate !== null) {
          const rate = data.vatRate > 1 ? data.vatRate / 100 : data.vatRate;
          setVatRate(rate);
          setVatError(false);
        } else {
          throw new Error("Invalid VAT settings data");
        }
      } catch (error) {
        console.error("Failed to fetch VAT rate:", error);
        setVatError(true);
      }
    }
    fetchVatRate();
  }, []);

  const selectedItems = items.filter((item) => selectedIds.has(item.id));
  const allSelected = items.length > 0 && selectedItems.length === items.length;
  const someSelected = selectedItems.length > 0;

  // Calculate totals for selected items only
  const subtotal = selectedItems.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0,
  );
  const vat = subtotal * (vatRate || 0);
  const total = subtotal + vat;
  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
  const selectedQty = selectedItems.reduce(
    (sum, item) => sum + item.quantity,
    0,
  );

  const toggleItem = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(items.map((item) => item.id)));
    }
  };

  const handleProceedToCheckout = () => {
    if (!someSelected || vatError) return;
    saveCartCheckoutSelection(selectedItems.map((item) => item.id));
    router.push("/checkout?fromCart=true");
  };

  // Quantity handlers
  const increaseQty = (id: string, currentQty: number) => {
    updateQuantity(id, currentQty + 1);
  };
  const decreaseQty = (id: string, currentQty: number) => {
    if (currentQty > 1) updateQuantity(id, currentQty - 1);
  };

  // Image modal handler
  const handleImageClick = (imageUrl: string) => {
    if (imageUrl) {
      setSelectedImage(imageUrl);
      setImageModalOpen(true);
    }
  };

  // Empty cart state
  if (!items.length) {
    return (
      <MainLayout>
        <div className="min-h-screen bg-(--bg-page) flex items-center justify-center px-4 py-12">
          <div className="text-center max-w-md">
            <div className="w-20 h-20 mx-auto mb-6 bg-[#F2F2F0] rounded-full flex items-center justify-center">
              <ShoppingBag className="w-10 h-10 text-[#5A5A56]" />
            </div>
            <h1 className="[font-family:var(--font-display)] text-[28px] xs:text-[32px] sm:text-[36px] text-black mb-3">
              Your cart is empty
            </h1>
            <p className="text-[13px] xs:text-[14px] text-[#5A5A56] mb-6">
              Looks like you haven&apos;t added any ready‑made items yet.
            </p>
            <Link
              href="/"
              className="inline-block px-6 py-3 bg-black text-white text-[10px] xs:text-[11px] tracking-[0.22em] uppercase hover:bg-[#1A1A1A] transition duration-300 cursor-pointer"
            >
              Continue Shopping
            </Link>
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <FadeInSection>
        <div className="bg-(--bg-page) py-12 xs:py-16 sm:py-20 md:py-24">
          <div className="px-4 xs:px-6 sm:px-8 md:px-12 lg:px-(--space-40) w-full mx-auto max-w-7xl">
            {/* Header with back link */}
            <div className="flex flex-wrap justify-between items-center gap-4 mb-8 xs:mb-10 md:mb-12">
              <div>
                <h1 className="[font-family:var(--font-display)] text-[32px] xs:text-[36px] sm:text-[40px] md:text-[44px] lg:text-[48px] font-normal leading-[1.1] tracking-[-0.01em] text-black">
                  Shopping Cart
                </h1>
                <p className="[font-family:var(--font-ui)] text-[9px] xs:text-[10px] uppercase tracking-[0.24em] text-(--color-grey-muted) mt-2">
                  {totalItems} {totalItems === 1 ? "item" : "items"}
                  {someSelected && selectedItems.length < items.length
                    ? ` · ${selectedQty} selected`
                    : ""}
                </p>
              </div>
              <Link
                href="/"
                className="flex items-center gap-2 [font-family:var(--font-ui)] text-[9px] xs:text-[10px] uppercase tracking-[0.24em] text-black border-b border-black pb-1 hover:opacity-50 transition hover:cursor-pointer"
              >
                <ArrowLeft className="w-3 h-3" />
                Continue Shopping
              </Link>
            </div>

            {/* Main grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 xs:gap-10 md:gap-12">
              {/* Items list */}
              <div className="lg:col-span-2 space-y-4">
                <div className="flex items-center justify-between px-1">
                  <label className="flex items-center gap-2.5 [font-family:var(--font-ui)] text-[12px] xs:text-[13px] text-black cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={allSelected}
                      ref={(el) => {
                        if (el) {
                          el.indeterminate = someSelected && !allSelected;
                        }
                      }}
                      onChange={toggleSelectAll}
                      className="h-4 w-4 rounded border-(--color-border) accent-black cursor-pointer"
                      aria-label={
                        locale === "ar" ? "تحديد الكل" : "Select all items"
                      }
                    />
                    {locale === "ar" ? "تحديد الكل" : "Select all"}
                  </label>
                  <span className="[font-family:var(--font-ui)] text-[11px] xs:text-[12px] text-(--color-grey-muted)">
                    {locale === "ar"
                      ? `${selectedItems.length} من ${items.length} محددة`
                      : `${selectedItems.length} of ${items.length} selected`}
                  </span>
                </div>

                <div className="bg-(--bg-page) border border-(--color-border) rounded-lg overflow-hidden divide-y divide-(--color-border)">
                  {items.map((item) => {
                    const imageUrl = resolveMediaUrl(item.image);
                    const isSelected = selectedIds.has(item.id);
                    return (
                      <div
                        key={item.id}
                        className={`p-4 xs:p-5 sm:p-6 flex flex-row gap-3 sm:gap-5 transition-opacity ${
                          isSelected ? "" : "opacity-55"
                        }`}
                      >
                        <div className="flex items-start pt-1 shrink-0">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleItem(item.id)}
                            className="h-4 w-4 rounded border-(--color-border) accent-black cursor-pointer"
                            aria-label={
                              locale === "ar"
                                ? `تحديد ${item.name}`
                                : `Select ${item.name}`
                            }
                          />
                        </div>

                        {/* Image with click to enlarge */}
                        <div className="w-24 h-24 sm:w-28 sm:h-28 bg-[#F5F5F0] rounded-md overflow-hidden shrink-0 relative group">
                          <img
                            src={imageUrl || "/placeholder.png"}
                            alt={item.name}
                            className="w-full h-full object-cover object-top transition-transform duration-300 group-hover:scale-105"
                          />
                          {imageUrl && (
                            <button
                              onClick={() => handleImageClick(imageUrl)}
                              className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 hover:cursor-pointer"
                            >
                              <Maximize2 className="w-6 h-6 text-white" />
                            </button>
                          )}
                        </div>

                        {/* Details */}
                        <div className="flex-1 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                          <div className="space-y-1">
                            <h3 className="[font-family:var(--font-display)] text-[16px] xs:text-[18px] sm:text-[20px] font-normal text-black">
                              {item.name}
                            </h3>
                            {item.itemType === "addon" || item.size === "N/A" ? null : (
                            <p className="[font-family:var(--font-ui)] text-[11px] xs:text-[12px] text-(--color-grey-muted)">
                              {item.itemType === "fabric" || isFabricCutCartId(item.id) ? (
                                <>
                                  {locale === "ar" ? "القصة: " : "Cut: "}
                                  {item.size}
                                  {item.cutLength ? (
                                    <span>
                                      {" "}
                                      · {locale === "ar" ? "الطول: " : "Length: "}
                                      {item.cutLength}
                                    </span>
                                  ) : null}
                                  {" "}
                                  · {locale === "ar" ? "الكمية (قطع): " : "Qty (pcs): "}
                                  {item.quantity}
                                </>
                              ) : (
                                <>
                                  {locale === "ar" ? "المقاس: " : "Size: "}
                                  {item.size}
                                </>
                              )}
                            </p>
                            )}
                            <p className="[font-family:var(--font-ui)] text-[14px] xs:text-[16px] font-medium text-black">
                              AED {item.price.toFixed(2)}
                              {(item.itemType === "fabric" ||
                                isFabricCutCartId(item.id)) && (
                                <span className="text-[11px] font-normal text-(--color-grey-muted)">
                                  {" "}
                                  / {locale === "ar" ? "قطعة" : "piece"}
                                </span>
                              )}
                            </p>
                          </div>

                          {/* Quantity & remove */}
                          <div className="flex items-center gap-4">
                            <div className="flex items-center border border-(--color-border) rounded-md">
                              <button
                                onClick={() =>
                                  decreaseQty(item.id, item.quantity)
                                }
                                disabled={item.quantity <= 1}
                                className="px-2 py-1.5 disabled:opacity-40 hover:bg-black/5 transition hover:cursor-pointer"
                              >
                                <Minus size={14} />
                              </button>
                              <span className="w-8 text-center">
                                {item.quantity}
                              </span>
                              <button
                                onClick={() =>
                                  increaseQty(item.id, item.quantity)
                                }
                                disabled={
                                  item.maxStock != null &&
                                  item.quantity >= item.maxStock
                                }
                                className="px-2 py-1.5 disabled:opacity-40 hover:bg-black/5 transition hover:cursor-pointer"
                              >
                                <Plus size={14} />
                              </button>
                            </div>
                            <button
                              onClick={() => removeItem(item.id)}
                              className="text-(--color-grey-muted) hover:text-red-600 transition hover:cursor-pointer"
                              aria-label="Remove item"
                            >
                              <Trash2 size={18} />
                            </button>
                          </div>
                        </div>

                        {/* Item total (desktop only) */}
                        <div className="hidden sm:block text-right min-w-20">
                          <p className="[font-family:var(--font-ui)] text-[14px] xs:text-[16px] font-medium text-black">
                            AED {(item.price * item.quantity).toFixed(2)}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Clear cart button */}
                <button
                  onClick={clearCart}
                  className="text-[16px] xs:text-[14px] text-(--color-grey-muted) hover:text-black transition hover:cursor-pointer"
                >
                  Clear Cart
                </button>
              </div>

              {/* Order summary */}
              <div className="lg:sticky lg:top-24 h-fit">
                <div className="bg-(--bg-page) border border-(--color-border) rounded-lg p-5 xs:p-6 md:p-8">
                  <h2 className="[font-family:var(--font-display)] text-[22px] xs:text-[24px] sm:text-[26px] font-normal text-black mb-6">
                    Order Summary
                  </h2>
                  <div className="space-y-3 border-b border-(--color-border) pb-5 mb-5">
                    <div className="flex justify-between [font-family:var(--font-ui)] text-[13px] xs:text-[14px]">
                      <span className="text-(--color-grey-muted)">
                        Subtotal
                        {someSelected && selectedItems.length < items.length
                          ? ` (${selectedItems.length})`
                          : ""}
                      </span>
                      <span className="text-black">
                        AED {subtotal.toFixed(2)}
                      </span>
                    </div>
                    <div className="flex justify-between [font-family:var(--font-ui)] text-[13px] xs:text-[14px]">
                      <span className="text-(--color-grey-muted)">
                        VAT ({((vatRate ?? 0) * 100).toFixed(0)}%)
                      </span>
                      <span className="text-black">AED {vat.toFixed(2)}</span>
                    </div>
                  </div>
                  {vatError && (
                    <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm font-sans flex flex-col gap-2 shadow-[0_2px_8px_rgba(239,68,68,0.04)]">
                      <p className="font-semibold text-red-800 text-xs uppercase tracking-wider">
                        {locale === "ar" ? "خطأ في حساب السعر" : "Pricing Error"}
                      </p>
                      <p className="text-xs leading-normal">
                        {locale === "ar"
                          ? "تعذر تحميل إعدادات ضريبة القيمة المضافة من الخادم. يرجى محاولة إعادة تحميل الصفحة للمتابعة."
                          : "Unable to retrieve VAT settings. Please refresh the page to proceed."}
                      </p>
                    </div>
                  )}
                  {!someSelected && !vatError && (
                    <p className="mb-4 [font-family:var(--font-ui)] text-[12px] text-(--color-grey-muted)">
                      {locale === "ar"
                        ? "حدد منتجًا واحدًا على الأقل للمتابعة إلى الدفع."
                        : "Select at least one item to proceed to checkout."}
                    </p>
                  )}
                  <div className="flex justify-between [font-family:var(--font-ui)] text-[16px] xs:text-[18px] font-normal mb-8">
                    <span>Total</span>
                    <span>AED {total.toFixed(2)}</span>
                  </div>
                  <button
                    type="button"
                    disabled={vatError || !someSelected}
                    onClick={handleProceedToCheckout}
                    className="w-full h-12 md:h-13 bg-black text-white font-label-sm text-[12px] md:text-[13px] uppercase tracking-[0.25em] hover:bg-black/80 transition-all duration-300 active:scale-[0.98] mt-6 md:mt-7 disabled:opacity-40 disabled:cursor-not-allowed hover:cursor-pointer"
                  >
                    Proceed to Checkout
                  </button>
                </div>
              </div>
            </div>
          </div>

          <ImageModal
            isOpen={imageModalOpen}
            imageUrl={selectedImage}
            alt="Cart Item Image"
            onClose={() => {
              setImageModalOpen(false);
              setSelectedImage("");
            }}
          />
        </div>
      </FadeInSection>
    </MainLayout>
  );
}
