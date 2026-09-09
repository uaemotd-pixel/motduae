"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useLocale, useTranslations } from "next-intl";
import { api } from "@/lib/api/client";
import { useAuth } from "@/context/AuthContext";
import { Link } from "@/i18n/navigation";
import toast from "react-hot-toast";
import { Pencil, Trash2 } from "lucide-react";

/* ─── Shared star helpers (display + half-star input) ─── */

function StarRatingDisplay({
  rating,
  sizeClassName = "w-4 h-4",
  className = "",
}: {
  rating: number;
  sizeClassName?: string;
  className?: string;
}) {
  const value = Math.max(0, Math.min(5, Number(rating) || 0));

  return (
    <div
      className={`flex items-center gap-0.5 ${className}`}
      aria-label={`${value} out of 5`}
    >
      {Array.from({ length: 5 }).map((_, index) => {
        const starValue = index + 1;
        const fill =
          value >= starValue ? 1 : value >= starValue - 0.5 ? 0.5 : 0;

        return (
          <span
            key={starValue}
            className={`relative inline-block ${sizeClassName}`}
          >
            <svg
              viewBox="0 0 24 24"
              className={`${sizeClassName} text-gray-300`}
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              aria-hidden
            >
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
            </svg>
            {fill > 0 && (
              <svg
                viewBox="0 0 24 24"
                className={`${sizeClassName} text-black absolute inset-0`}
                fill="currentColor"
                stroke="currentColor"
                strokeWidth="1.5"
                aria-hidden
                style={
                  fill === 0.5 ? { clipPath: "inset(0 50% 0 0)" } : undefined
                }
              >
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
              </svg>
            )}
          </span>
        );
      })}
    </div>
  );
}

function StarRatingInput({
  value,
  onChange,
  labelForValue,
  sizeClassName = "w-7 h-7",
}: {
  value: number;
  onChange: (value: number) => void;
  labelForValue?: (value: number) => string;
  sizeClassName?: string;
}) {
  const [hover, setHover] = useState<number | null>(null);
  const display = hover ?? value;

  return (
    <div
      className="flex items-center gap-0.5"
      onMouseLeave={() => setHover(null)}
    >
      {[1, 2, 3, 4, 5].map((star) => {
        const halfValue = star - 0.5;
        const fill =
          display >= star ? 1 : display >= halfValue ? 0.5 : 0;

        return (
          <div
            key={star}
            className={`relative inline-block ${sizeClassName} select-none`}
          >
            <button
              type="button"
              className="absolute inset-y-0 left-0 w-1/2 z-10 cursor-pointer"
              aria-label={labelForValue?.(halfValue) ?? `${halfValue} stars`}
              onClick={() => onChange(halfValue)}
              onMouseEnter={() => setHover(halfValue)}
            />
            <button
              type="button"
              className="absolute inset-y-0 right-0 w-1/2 z-10 cursor-pointer"
              aria-label={labelForValue?.(star) ?? `${star} stars`}
              onClick={() => onChange(star)}
              onMouseEnter={() => setHover(star)}
            />
            <svg
              viewBox="0 0 24 24"
              className={`${sizeClassName} text-gray-300 pointer-events-none`}
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              aria-hidden
            >
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
            </svg>
            {fill > 0 && (
              <svg
                viewBox="0 0 24 24"
                className={`${sizeClassName} text-black absolute inset-0 pointer-events-none`}
                fill="currentColor"
                stroke="currentColor"
                strokeWidth="1.5"
                aria-hidden
                style={
                  fill === 0.5 ? { clipPath: "inset(0 50% 0 0)" } : undefined
                }
              >
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
              </svg>
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ─── Product detail reviews section ─── */

type ProductReview = {
  id: string;
  nameEn: string;
  nameAr: string;
  titleEn: string;
  titleAr: string;
  quoteEn: string;
  quoteAr: string;
  rating: number;
  createdAt: string;
  verified?: boolean;
};

export function ProductReviewsSection({
  productId,
  locale,
  labels,
}: {
  productId: string;
  locale: string;
  labels: {
    title: string;
    empty: string;
    loading: string;
    averageLabel: string;
    countLabel: string;
    verifiedLabel?: string;
  };
}) {
  const isArabic = locale === "ar";
  const [loading, setLoading] = useState(true);
  const [reviews, setReviews] = useState<ProductReview[]>([]);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        setLoading(true);
        const data = await api.get<
          ProductReview[] | { items?: ProductReview[] }
        >(
          `/api/customer/reviews?productId=${encodeURIComponent(productId)}&limit=50`,
        );
        const list = Array.isArray(data)
          ? data
          : Array.isArray(data?.items)
            ? data.items
            : [];
        if (!cancelled) {
          setReviews(list);
        }
      } catch (err) {
        console.error("Failed to load product reviews:", err);
        if (!cancelled) setReviews([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    if (productId) load();
    return () => {
      cancelled = true;
    };
  }, [productId]);

  const average =
    reviews.length > 0
      ? reviews.reduce((sum, r) => sum + Number(r.rating || 0), 0) /
        reviews.length
      : 0;

  return (
    <section
      className="bg-(--bg-page) border-t border-(--color-border) py-12 sm:py-16"
      dir={isArabic ? "rtl" : "ltr"}
    >
      <div className="px-4 xs:px-6 sm:px-8 md:px-12 lg:px-(--space-40) w-full mx-auto max-w-7xl">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 mb-8 sm:mb-10">
        <div>
          <h2 className="[font-family:var(--font-display)] text-2xl sm:text-[32px] text-black tracking-[-0.01em]">
            {labels.title}
          </h2>
          {!loading && reviews.length > 0 && (
            <p className="mt-2 text-sm text-(--color-grey-muted) [font-family:var(--font-body)]">
              {labels.averageLabel.replace("{rating}", average.toFixed(1))} ·{" "}
              {labels.countLabel.replace("{count}", String(reviews.length))}
            </p>
          )}
        </div>
        {!loading && reviews.length > 0 && (
          <StarRatingDisplay rating={average} sizeClassName="w-5 h-5" />
        )}
      </div>

      {loading ? (
        <p className="text-sm text-gray-500 [font-family:var(--font-body)]">
          {labels.loading}
        </p>
      ) : reviews.length === 0 ? (
        <p className="text-sm text-gray-500 [font-family:var(--font-body)]">
          {labels.empty}
        </p>
      ) : (
        <ul className="space-y-6 sm:space-y-8">
          {reviews.map((rev) => {
            const quote = isArabic
              ? rev.quoteAr || rev.quoteEn
              : rev.quoteEn || rev.quoteAr;
            const name = isArabic
              ? rev.nameAr || rev.nameEn
              : rev.nameEn || rev.nameAr;
            const title = isArabic
              ? rev.titleAr || rev.titleEn
              : rev.titleEn || rev.titleAr;

            return (
              <li
                key={rev.id}
                className="border-b border-gray-100 pb-6 sm:pb-8 last:border-0"
              >
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <StarRatingDisplay
                    rating={rev.rating}
                    sizeClassName="w-3.5 h-3.5 sm:w-4 sm:h-4"
                  />
                  {rev.verified ? (
                    <span className="text-[9px] sm:text-[10px] uppercase tracking-wider px-1.5 py-0.5 border border-gray-200 text-gray-600 [font-family:var(--font-ui)]">
                      {labels.verifiedLabel || "Verified purchase"}
                    </span>
                  ) : null}
                  <span className="text-[10px] sm:text-xs text-gray-400 [font-family:var(--font-body)]">
                    {new Date(rev.createdAt).toLocaleDateString(
                      isArabic ? "ar" : "en",
                    )}
                  </span>
                </div>
                <p className="[font-family:var(--font-display)] text-sm sm:text-base text-black uppercase tracking-wide">
                  {name}
                </p>
                {title ? (
                  <p className="text-[10px] sm:text-xs uppercase tracking-[0.18em] text-gray-400 mt-1 [font-family:var(--font-ui)]">
                    {title}
                  </p>
                ) : null}
                <p className="mt-3 [font-family:var(--font-body)] text-sm sm:text-[15px] leading-relaxed italic text-gray-800">
                  &ldquo;{quote}&rdquo;
                </p>
              </li>
            );
          })}
        </ul>
      )}
      </div>
    </section>
  );
}

/* ─── Account: write / list customer reviews ─── */

interface Review {
  _id: string;
  rating: number;
  quoteEn: string;
  quoteAr: string;
  titleEn: string;
  titleAr: string;
  createdAt: string;
  status?: "pending" | "approved" | "rejected";
  productId?: string | null;
  productKind?: string;
  productName?: string;
  productNameAr?: string;
  productSlug?: string;
  orderType?: string;
  orderId?: string | null;
}

type EligibleProduct = {
  productId: string;
  orderId: string;
  orderType?: "retail" | "custom" | string;
  kind?: "readyMade" | "fabric" | "addon" | "design" | string;
  name: string;
  nameAr: string;
  slug: string;
  image: string;
};

type CardDraft = {
  rating: number;
  quote: string;
};

function targetKeyProduct(productId: string) {
  return `product:${productId}`;
}

function kindLabel(
  t: (key: "kindDesign" | "kindFabric" | "kindAddon" | "kindProduct") => string,
  kind?: string,
) {
  if (kind === "design") return t("kindDesign");
  if (kind === "fabric") return t("kindFabric");
  if (kind === "addon") return t("kindAddon");
  return t("kindProduct");
}

const TOAST_BASE = {
  duration: 6000,
  style: {
    fontFamily: "var(--font-body)",
    fontSize: "12px",
    letterSpacing: "0.04em",
    borderRadius: "0",
    padding: "12px 16px",
    maxWidth: "340px",
  },
};

const SUCCESS_TOAST = {
  ...TOAST_BASE,
  style: {
    ...TOAST_BASE.style,
    background: "#f0fdf4",
    color: "#166534",
    border: "1px solid #86efac",
  },
  iconTheme: { primary: "#16a34a", secondary: "#ffffff" },
};

const ERROR_TOAST = {
  ...TOAST_BASE,
  style: {
    ...TOAST_BASE.style,
    background: "#fef2f2",
    color: "#991b1b",
    border: "1px solid #fca5a5",
  },
  iconTheme: { primary: "#dc2626", secondary: "#ffffff" },
};

const INPUT_CLASS =
  "w-full border border-gray-200 bg-white px-3 sm:px-4 py-2.5 sm:py-3 text-sm sm:text-[14px] [font-family:var(--font-body)] text-black focus:border-black focus:outline-none transition-colors";
const TEXTAREA_CLASS = `${INPUT_CLASS} min-h-[80px] sm:min-h-[100px] resize-y`;

export default function CustomerReviewsView({
  initialOrderId = null,
  initialOrderType = null,
}: {
  initialOrderId?: string | null;
  initialOrderType?: "custom" | "retail" | null;
} = {}) {
  const t = useTranslations("Account.Reviews");
  const locale = useLocale();
  const isArabic = locale === "ar";
  const { user } = useAuth();

  const fromNotification = Boolean(initialOrderId);
  const isRetailContext = initialOrderType === "retail";
  const isCustomContext = initialOrderType === "custom";

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [eligibleProducts, setEligibleProducts] = useState<EligibleProduct[]>(
    [],
  );
  const [cardDrafts, setCardDrafts] = useState<Record<string, CardDraft>>({});

  const [rating, setRating] = useState<number>(5);
  const [quote, setQuote] = useState("");
  const [title, setTitle] = useState("");
  /** "" | product:<id> */
  const [selectedTarget, setSelectedTarget] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingProductLabel, setEditingProductLabel] = useState("");

  const canReview =
    Boolean(user) && String(user?.role || "").toLowerCase() === "customer";

  const customEligible = eligibleProducts.filter(
    (p) => p.orderType === "custom",
  );
  const showMultiCard =
    !editingId && isCustomContext && customEligible.length > 0;

  const lockedProduct =
    fromNotification && isRetailContext
      ? eligibleProducts.find(
          (p) => selectedTarget === targetKeyProduct(p.productId),
        ) ||
        eligibleProducts[0] ||
        null
      : null;

  const lockedLabel = lockedProduct
    ? isArabic
      ? lockedProduct.nameAr || lockedProduct.name
      : lockedProduct.name || lockedProduct.nameAr
    : null;

  const notificationAlreadyReviewed =
    fromNotification &&
    !editingId &&
    ((isRetailContext && !lockedProduct) ||
      (isCustomContext && customEligible.length === 0));

  const fetchProfileAndReviews = async () => {
    try {
      setLoading(true);
      let eligibleQuery = "";
      if (fromNotification && initialOrderId) {
        const params = new URLSearchParams();
        params.set("orderId", initialOrderId);
        if (isRetailContext) params.set("orderType", "retail");
        if (isCustomContext) params.set("orderType", "custom");
        eligibleQuery = `?${params.toString()}`;
      }

      const [profile, eligible] = await Promise.all([
        api.get("/api/customer/profile"),
        api
          .get<{
            success: boolean;
            products: EligibleProduct[];
          }>(`/api/customer/reviews/eligible-products${eligibleQuery}`)
          .catch(() => ({
            success: false,
            products: [] as EligibleProduct[],
          })),
      ]);

      if (profile && profile.reviews) {
        const sorted = [...profile.reviews].sort(
          (a: Review, b: Review) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
        );
        setReviews(sorted);
      }

      const products = Array.isArray(eligible?.products)
        ? eligible.products
        : [];
      setEligibleProducts(products);
      setCardDrafts((prev) => {
        const next: Record<string, CardDraft> = { ...prev };
        for (const product of products) {
          if (!next[product.productId]) {
            next[product.productId] = { rating: 5, quote: "" };
          }
        }
        return next;
      });

      if (fromNotification && isRetailContext && products.length > 0) {
        setSelectedTarget(targetKeyProduct(products[0].productId));
      } else if (fromNotification) {
        setSelectedTarget("");
      }
    } catch (err) {
      console.error("Failed to load reviews:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!canReview) {
      setLoading(false);
      return;
    }
    fetchProfileAndReviews();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reload when notification context changes
  }, [canReview, initialOrderId, initialOrderType]);

  const resetForm = () => {
    setQuote("");
    setTitle("");
    setRating(5);
    setSelectedTarget("");
    setEditingId(null);
    setEditingProductLabel("");
  };

  const startEdit = (rev: Review) => {
    setEditingId(rev._id);
    setRating(Number(rev.rating) || 5);
    setQuote(
      isArabic
        ? rev.quoteAr || rev.quoteEn || ""
        : rev.quoteEn || rev.quoteAr || "",
    );
    setTitle(
      isArabic
        ? rev.titleAr || rev.titleEn || ""
        : rev.titleEn || rev.titleAr || "",
    );
    if (rev.productId) {
      setSelectedTarget(targetKeyProduct(String(rev.productId)));
    } else {
      setSelectedTarget("");
    }
    setEditingProductLabel(
      isArabic
        ? rev.productNameAr || rev.productName || ""
        : rev.productName || rev.productNameAr || "",
    );
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!canReview) {
      toast.error(t("registeredOnly"), ERROR_TOAST);
      return;
    }

    if (showMultiCard) {
      const filled = customEligible.filter((product) =>
        (cardDrafts[product.productId]?.quote || "").trim(),
      );
      if (filled.length === 0) {
        toast.error(t("commentRequired"), ERROR_TOAST);
        return;
      }

      setSubmitting(true);
      try {
        const trimmedTitle = title.trim();
        const items = filled.map((product) => {
          const draft = cardDrafts[product.productId];
          const payload: Record<string, unknown> = {
            productId: product.productId,
            rating: draft.rating,
          };
          if (isArabic) {
            payload.quoteAr = draft.quote.trim();
            if (trimmedTitle) payload.titleAr = trimmedTitle;
          } else {
            payload.quoteEn = draft.quote.trim();
            if (trimmedTitle) payload.titleEn = trimmedTitle;
          }
          return payload;
        });
        await api.post("/api/customer/reviews", { items });
        toast.success(t("submitSuccess"), SUCCESS_TOAST);
        resetForm();
        setCardDrafts({});
        fetchProfileAndReviews();
      } catch (err: unknown) {
        const msg =
          err instanceof Error && err.message ? err.message : t("submitFailed");
        toast.error(msg, ERROR_TOAST);
      } finally {
        setSubmitting(false);
      }
      return;
    }

    if (!quote.trim()) {
      toast.error(t("commentRequired"), ERROR_TOAST);
      return;
    }

    setSubmitting(true);

    try {
      const trimmedQuote = quote.trim();
      const trimmedTitle = title.trim();

      const textPayload = isArabic
        ? {
            quoteAr: trimmedQuote,
            titleAr: trimmedTitle || undefined,
          }
        : {
            quoteEn: trimmedQuote,
            titleEn: trimmedTitle || undefined,
          };

      if (editingId) {
        await api.put(`/api/customer/reviews/${encodeURIComponent(editingId)}`, {
          rating,
          ...textPayload,
        });
        toast.success(t("editSuccess"), SUCCESS_TOAST);
      } else {
        const linkPayload: { productId?: string } = {};
        if (selectedTarget.startsWith("product:")) {
          linkPayload.productId = selectedTarget.slice("product:".length);
        } else if (
          fromNotification &&
          isRetailContext &&
          lockedProduct?.productId
        ) {
          linkPayload.productId = lockedProduct.productId;
        }

        await api.post("/api/customer/reviews", {
          rating,
          ...linkPayload,
          ...textPayload,
        });
        toast.success(t("submitSuccess"), SUCCESS_TOAST);
      }

      resetForm();
      fetchProfileAndReviews();
    } catch (err: unknown) {
      const msg =
        err instanceof Error && err.message
          ? err.message
          : editingId
            ? t("editFailed")
            : t("submitFailed");
      toast.error(msg, ERROR_TOAST);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (reviewId: string) => {
    if (!canReview || !reviewId) return;
    if (!window.confirm(t("confirmDelete"))) return;

    setDeletingId(reviewId);
    try {
      await api.delete(`/api/customer/reviews/${encodeURIComponent(reviewId)}`);
      toast.success(t("deleteSuccess"), SUCCESS_TOAST);
      if (editingId === reviewId) resetForm();
      setReviews((prev) => prev.filter((rev) => rev._id !== reviewId));
      fetchProfileAndReviews();
    } catch (err: unknown) {
      const msg =
        err instanceof Error && err.message
          ? err.message
          : t("deleteFailed");
      toast.error(msg, ERROR_TOAST);
    } finally {
      setDeletingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-3 py-8 sm:py-10 justify-center">
        <div className="w-4 h-4 sm:w-5 sm:h-5 border-2 border-black/30 border-t-black rounded-full animate-spin" />
        <span className="[font-family:var(--font-ui)] text-[10px] sm:text-sm tracking-widest uppercase text-gray-500">
          {t("loading")}
        </span>
      </div>
    );
  }

  if (!canReview) {
    return (
      <div className="bg-white border border-gray-200 rounded-2xl p-4 sm:p-6 md:p-8 shadow-sm space-y-4">
        <h2 className="text-lg sm:text-xl md:text-2xl font-['Ivy_Ora'] text-black">
          {t("writeTitle")}
        </h2>
        <p className="text-gray-500 text-xs sm:text-sm font-['TT_Norms_Pro']">
          {t("registeredOnly")}
        </p>
        <div className="flex flex-wrap gap-3 pt-1">
          <Link
            href="/auth/login"
            className="px-6 sm:px-8 py-2 sm:py-3 bg-black text-white text-[10px] sm:text-[12px] tracking-[0.18em] sm:tracking-[0.22em] uppercase hover:bg-gray-800 transition [font-family:var(--font-ui)]"
          >
            {t("loginCta")}
          </Link>
          <Link
            href="/auth/register"
            className="px-6 sm:px-8 py-2 sm:py-3 border border-black text-black text-[10px] sm:text-[12px] tracking-[0.18em] sm:tracking-[0.22em] uppercase hover:bg-gray-50 transition [font-family:var(--font-ui)]"
          >
            {t("signupCta")}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div
      className="space-y-6 sm:space-y-8 md:space-y-10"
      dir={isArabic ? "rtl" : "ltr"}
    >
      <div className="bg-white border border-gray-200 rounded-2xl p-4 sm:p-6 md:p-8 shadow-sm">
        <h2 className="text-lg sm:text-xl md:text-2xl font-['Ivy_Ora'] mb-1.5 sm:mb-2 text-black">
          {editingId ? t("editTitle") : t("writeTitle")}
        </h2>
        <p className="text-gray-500 text-xs sm:text-sm font-['TT_Norms_Pro'] mb-4 sm:mb-6">
          {editingId ? t("editSubtitle") : t("writeSubtitle")}
        </p>

        {notificationAlreadyReviewed ? (
          <p className="text-gray-500 text-xs sm:text-sm font-['TT_Norms_Pro'] mb-4 sm:mb-6">
            {t("orderAlreadyReviewed")}
          </p>
        ) : null}

        {!fromNotification && !editingId && eligibleProducts.length === 0 ? (
          <p className="text-gray-500 text-xs sm:text-sm font-['TT_Norms_Pro'] mb-4 sm:mb-6">
            {t("noEligibleProducts")}
          </p>
        ) : null}

        {!notificationAlreadyReviewed ? (
        <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
          {editingId && editingProductLabel ? (
            <div className="space-y-1.5 sm:space-y-2">
              <label className="block text-[10px] sm:text-[11px] uppercase tracking-[0.18em] sm:tracking-[0.2em] font-medium text-gray-700 [font-family:var(--font-ui)]">
                {t("productLockedLabel")}
              </label>
              <p className="text-sm sm:text-[15px] text-black font-['TT_Norms_Pro'] border border-gray-200 bg-gray-50 px-3 sm:px-4 py-2.5 sm:py-3">
                {editingProductLabel}
              </p>
            </div>
          ) : null}

          {!editingId && fromNotification && lockedLabel && !showMultiCard ? (
            <div className="space-y-1.5 sm:space-y-2">
              <label className="block text-[10px] sm:text-[11px] uppercase tracking-[0.18em] sm:tracking-[0.2em] font-medium text-gray-700 [font-family:var(--font-ui)]">
                {t("productLockedLabel")}
              </label>
              <p className="text-sm sm:text-[15px] text-black font-['TT_Norms_Pro'] border border-gray-200 bg-gray-50 px-3 sm:px-4 py-2.5 sm:py-3">
                {lockedLabel}
              </p>
              <p className="text-[10px] sm:text-xs text-gray-400 font-['TT_Norms_Pro']">
                {t("productLockedHint")}
              </p>
            </div>
          ) : null}

          {showMultiCard ? (
            <div className="space-y-4">
              <p className="text-[10px] sm:text-xs text-gray-400 font-['TT_Norms_Pro']">
                {t("multiCardHint")}
              </p>
              {customEligible.map((product) => {
                const draft = cardDrafts[product.productId] || {
                  rating: 5,
                  quote: "",
                };
                const label = isArabic
                  ? product.nameAr || product.name
                  : product.name || product.nameAr;
                return (
                  <div
                    key={product.productId}
                    className="border border-gray-200 p-3 sm:p-4 space-y-3"
                  >
                    <p className="text-[10px] sm:text-[11px] uppercase tracking-[0.18em] font-medium text-gray-700 [font-family:var(--font-ui)]">
                      {kindLabel(t, product.kind)} · {label}
                    </p>
                    <StarRatingInput
                      value={draft.rating}
                      onChange={(value) =>
                        setCardDrafts((prev) => ({
                          ...prev,
                          [product.productId]: { ...draft, rating: value },
                        }))
                      }
                      labelForValue={(value) => t("starLabel", { count: value })}
                      sizeClassName="w-6 h-6 sm:w-7 sm:h-7"
                    />
                    <textarea
                      value={draft.quote}
                      onChange={(e) =>
                        setCardDrafts((prev) => ({
                          ...prev,
                          [product.productId]: {
                            ...draft,
                            quote: e.target.value,
                          },
                        }))
                      }
                      placeholder={t("commentPlaceholder")}
                      className={TEXTAREA_CLASS}
                      dir={isArabic ? "rtl" : "ltr"}
                    />
                  </div>
                );
              })}
            </div>
          ) : null}

          {!editingId &&
          !fromNotification &&
          !showMultiCard &&
          eligibleProducts.length > 0 ? (
            <div className="space-y-1.5 sm:space-y-2">
              <label className="block text-[10px] sm:text-[11px] uppercase tracking-[0.18em] sm:tracking-[0.2em] font-medium text-gray-700 [font-family:var(--font-ui)]">
                {t("productLabel")}
              </label>
              <select
                value={selectedTarget}
                onChange={(e) => setSelectedTarget(e.target.value)}
                className={INPUT_CLASS}
              >
                <option value="">{t("productGeneral")}</option>
                {eligibleProducts.map((product) => (
                  <option
                    key={product.productId}
                    value={targetKeyProduct(product.productId)}
                  >
                    {kindLabel(t, product.kind)} ·{" "}
                    {isArabic
                      ? product.nameAr || product.name
                      : product.name || product.nameAr}
                  </option>
                ))}
              </select>
              <p className="text-[10px] sm:text-xs text-gray-400 font-['TT_Norms_Pro']">
                {t("productHint")}
              </p>
            </div>
          ) : null}

          {showMultiCard ? null : (
          <div className="space-y-1.5 sm:space-y-2">
            <label className="block text-[10px] sm:text-[11px] uppercase tracking-[0.18em] sm:tracking-[0.2em] font-medium text-gray-700 [font-family:var(--font-ui)]">
              {t("rating")} ({rating})
            </label>
            <StarRatingInput
              value={rating}
              onChange={setRating}
              labelForValue={(value) => t("starLabel", { count: value })}
              sizeClassName="w-6 h-6 sm:w-7 sm:h-7"
            />
            <p className="text-[10px] sm:text-xs text-gray-400 font-['TT_Norms_Pro']">
              {t("halfStarHint")}
            </p>
          </div>
          )}

          {showMultiCard ? null : (
          <div className="space-y-1.5 sm:space-y-2">
            <label className="block text-[10px] sm:text-[11px] uppercase tracking-[0.18em] sm:tracking-[0.2em] font-medium text-gray-700 [font-family:var(--font-ui)]">
              {t("commentLabel")} *
            </label>
            <textarea
              value={quote}
              onChange={(e) => setQuote(e.target.value)}
              placeholder={t("commentPlaceholder")}
              className={TEXTAREA_CLASS}
              dir={isArabic ? "rtl" : "ltr"}
              required={!showMultiCard}
            />
          </div>
          )}

          <div className="space-y-1.5 sm:space-y-2">
            <label className="block text-[10px] sm:text-[11px] uppercase tracking-[0.18em] sm:tracking-[0.2em] font-medium text-gray-700 [font-family:var(--font-ui)]">
              {t("titleLabel")}
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t("titlePlaceholder")}
              className={INPUT_CLASS}
              dir={isArabic ? "rtl" : "ltr"}
            />
          </div>

          <div className="pt-1 sm:pt-2 flex flex-wrap gap-3">
            <button
              type="submit"
              disabled={submitting}
              className="px-6 sm:px-8 py-2 sm:py-3 bg-black text-white text-[10px] sm:text-[12px] tracking-[0.18em] sm:tracking-[0.22em] uppercase hover:bg-gray-800 transition disabled:opacity-50 [font-family:var(--font-ui)] cursor-pointer w-full sm:w-auto"
            >
              {submitting
                ? t("submitting")
                : editingId
                  ? t("saveEdit")
                  : t("submit")}
            </button>
            {editingId ? (
              <button
                type="button"
                onClick={resetForm}
                disabled={submitting}
                className="px-6 sm:px-8 py-2 sm:py-3 border border-black text-black text-[10px] sm:text-[12px] tracking-[0.18em] sm:tracking-[0.22em] uppercase hover:bg-gray-50 transition disabled:opacity-50 [font-family:var(--font-ui)] cursor-pointer w-full sm:w-auto"
              >
                {t("cancelEdit")}
              </button>
            ) : null}
          </div>
        </form>
        ) : null}
      </div>

      <div className="bg-white border border-gray-200 rounded-2xl p-4 sm:p-6 md:p-8 shadow-sm">
        <h2 className="text-lg sm:text-xl md:text-2xl font-['Ivy_Ora'] mb-4 sm:mb-6 text-black">
          {t("pastTitle")}
        </h2>

        {reviews.length === 0 ? (
          <p className="text-gray-500 text-xs sm:text-sm font-['TT_Norms_Pro']">
            {t("pastEmpty")}
          </p>
        ) : (
          <div className="space-y-4 sm:space-y-6 divide-y divide-gray-100">
            {reviews.map((rev, index) => {
              const displayQuote = isArabic
                ? rev.quoteAr || rev.quoteEn
                : rev.quoteEn || rev.quoteAr;
              const displayTitle = isArabic
                ? rev.titleAr || rev.titleEn || t("defaultTitle")
                : rev.titleEn || rev.titleAr || t("defaultTitle");
              const productLabel = isArabic
                ? rev.productNameAr || rev.productName
                : rev.productName || rev.productNameAr;

              return (
                <div
                  key={rev._id}
                  className={`pt-4 sm:pt-6 ${index === 0 ? "pt-0" : ""}`}
                >
                  <div className="flex flex-wrap items-start justify-between gap-3 mb-2 sm:mb-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <StarRatingDisplay
                        rating={rev.rating}
                        sizeClassName="w-3.5 h-3.5 sm:w-4 sm:h-4"
                      />
                      <span className="text-[10px] sm:text-xs text-gray-400 font-['TT_Norms_Pro']">
                        {rev.rating.toFixed(1)} ·{" "}
                        {new Date(rev.createdAt).toLocaleDateString(
                          isArabic ? "ar" : "en",
                        )}
                      </span>
                      <span
                        className={`text-[9px] sm:text-[10px] uppercase tracking-wider px-1.5 py-0.5 border ${
                          rev.status === "approved"
                            ? "border-green-200 text-green-700 bg-green-50"
                            : rev.status === "rejected"
                              ? "border-red-200 text-red-700 bg-red-50"
                              : "border-amber-200 text-amber-800 bg-amber-50"
                        }`}
                      >
                        {rev.status === "approved"
                          ? t("statusApproved")
                          : rev.status === "rejected"
                            ? t("statusRejected")
                            : t("statusPending")}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => startEdit(rev)}
                        disabled={deletingId === rev._id || submitting}
                        className="p-1.5 text-gray-600 hover:text-black disabled:opacity-50 cursor-pointer transition-colors"
                        aria-label={t("editAria")}
                        title={t("editAria")}
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(rev._id)}
                        disabled={deletingId === rev._id || submitting}
                        className="p-1.5 text-gray-600 hover:text-red-600 disabled:opacity-50 cursor-pointer transition-colors"
                        aria-label={t("deleteAria")}
                        title={t("deleteAria")}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {productLabel ? (
                    <p className="text-[10px] sm:text-xs text-gray-500 font-['TT_Norms_Pro'] mb-1">
                      {t("reviewedProduct", { name: productLabel })}
                    </p>
                  ) : null}

                  <p className="text-[10px] sm:text-[13px] text-gray-400 font-['TT_Norms_Pro'] uppercase tracking-widest mb-0.5 sm:mb-1">
                    {displayTitle}
                  </p>
                  <p className="[font-family:var(--font-body)] text-sm sm:text-[14px] leading-relaxed italic text-gray-800">
                    &ldquo;{displayQuote}&rdquo;
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
