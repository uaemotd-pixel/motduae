"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { useParams, useSearchParams } from "next/navigation";
import toast from "react-hot-toast";
import { Heart, MapPin, Star, Trash2 } from "lucide-react";
import { Link, usePathname, useRouter } from "@/i18n/navigation";
import { buttonVariants } from "@/components/ui/Button";
import { ProductGridSkeleton } from "@/components/ui/Skeleton";
import {
  favouriteApiErrorMessage,
  fetchFavourites,
  removeFavourite,
  type FavouriteShopCard,
  type FavouriteShopType,
} from "@/lib/customerFavourites";
import {
  formatTailorRating,
  getTailorDisplayFields,
  resolveTailorImage,
} from "@/lib/tailors";
import {
  formatFabricShopRating,
  getFabricShopDisplayFields,
  resolveFabricShopImage,
} from "@/lib/fabricShop";

const TOAST = {
  duration: 4000,
  style: {
    fontFamily: "var(--font-body)",
    fontSize: "13px",
    letterSpacing: "0.04em",
    borderRadius: "0",
    padding: "12px 16px",
  },
};

type FavouritesCategory = "tailors" | "stores";

function FavouriteCard({
  shop,
  type,
  locale,
  onRemove,
  removing,
  viewLabel,
  removeLabel,
  reviewsLabel,
  typeLabel,
}: {
  shop: FavouriteShopCard;
  type: FavouriteShopType;
  locale: "en" | "ar";
  onRemove: () => void;
  removing: boolean;
  viewLabel: string;
  removeLabel: string;
  reviewsLabel: string;
  typeLabel: string;
}) {
  const fields =
    type === "tailor"
      ? getTailorDisplayFields(shop, locale)
      : getFabricShopDisplayFields(shop, locale);
  const imageUrl =
    type === "tailor"
      ? resolveTailorImage(shop.logo, shop.coverImage)
      : resolveFabricShopImage(shop.logo, shop.coverImage);
  const rating =
    type === "tailor"
      ? formatTailorRating(shop.rating)
      : formatFabricShopRating(shop.rating);
  const href =
    type === "tailor" ? `/tailors/${shop.slug}` : `/brands/${shop.slug}`;

  return (
    <article className="group overflow-hidden border border-[#E4E0D8] bg-white transition hover:-translate-y-0.5 hover:shadow-lg">
      <div className="relative aspect-4/5 overflow-hidden bg-[#F0EBE3]">
        <Link href={href} className="block h-full w-full">
          <img
            src={imageUrl}
            alt={fields.name}
            loading="lazy"
            className="h-full w-full object-cover object-top transition duration-700 group-hover:scale-105"
          />
        </Link>
        <span className="absolute top-3 inset-s-3 border border-black/10 bg-white/95 px-2.5 py-1 text-[8px] uppercase tracking-[0.18em] text-black [font-family:var(--font-ui)] backdrop-blur-sm">
          {typeLabel}
        </span>
        <button
          type="button"
          onClick={onRemove}
          disabled={removing}
          aria-label={removeLabel}
          className="absolute top-3 inset-e-3 inline-flex size-9 items-center justify-center rounded-full border-0 bg-white/90 text-black shadow-sm backdrop-blur-sm transition hover:bg-white disabled:opacity-50"
        >
          <Trash2 className="size-3.5" strokeWidth={1.75} aria-hidden />
        </button>
      </div>
      <div className="p-4 sm:p-5">
        <Link href={href} className="block">
          <h3 className="mb-1 line-clamp-2 [font-family:var(--font-display)] text-[18px] leading-snug text-black sm:text-[20px]">
            {fields.name}
          </h3>
        </Link>
        {fields.location ? (
          <p className="mb-2 inline-flex max-w-full items-center gap-1 text-[9px] uppercase tracking-[0.18em] text-[#7A7A72] [font-family:var(--font-ui)]">
            <MapPin className="size-3 shrink-0" strokeWidth={1.75} aria-hidden />
            <span className="truncate">{fields.location}</span>
          </p>
        ) : null}
        <div className="mt-3 flex items-center justify-between border-t border-[#E4E0D8] pt-3">
          <div className="inline-flex items-center gap-1.5">
            <Star
              className="size-3.5 fill-black stroke-black"
              aria-hidden
            />
            <span className="text-[10px] tracking-[0.14em] text-black [font-family:var(--font-ui)]">
              {rating}
            </span>
            <span className="text-[8px] uppercase tracking-[0.16em] text-[#7A7A72] [font-family:var(--font-ui)]">
              ({shop.reviewCount ?? 0} {reviewsLabel})
            </span>
          </div>
          <Link
            href={href}
            className="text-[9px] uppercase tracking-[0.2em] text-black underline underline-offset-4 [font-family:var(--font-ui)] hover:opacity-60"
          >
            {viewLabel}
          </Link>
        </div>
      </div>
    </article>
  );
}

function normalizeCategory(raw: string | null): FavouritesCategory | null {
  const value = String(raw || "")
    .trim()
    .toLowerCase();
  if (value === "tailors" || value === "tailor") return "tailors";
  if (
    value === "stores" ||
    value === "store" ||
    value === "fabric" ||
    value === "fabrics" ||
    value === "brands"
  ) {
    return "stores";
  }
  return null;
}

export default function CustomerFavouritesView() {
  const t = useTranslations("Account.Favourites");
  const params = useParams();
  const locale = params.locale === "ar" ? "ar" : "en";
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const [tailors, setTailors] = useState<FavouriteShopCard[]>([]);
  const [stores, setStores] = useState<FavouriteShopCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [category, setCategory] = useState<FavouritesCategory>(() => {
    return normalizeCategory(searchParams.get("fav")) || "tailors";
  });

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchFavourites();
      const nextTailors = (
        Array.isArray(data.favouriteTailors) ? data.favouriteTailors : []
      ).filter((shop) => !shop.type || shop.type === "tailor");
      const nextStores = (
        Array.isArray(data.favouriteFabricShops)
          ? data.favouriteFabricShops
          : []
      ).filter((shop) => !shop.type || shop.type === "fabricShop");
      setTailors(nextTailors);
      setStores(nextStores);

      setCategory((prev) => {
        const fromUrl = normalizeCategory(searchParams.get("fav"));
        if (fromUrl) return fromUrl;
        if (nextTailors.length === 0 && nextStores.length > 0) return "stores";
        if (nextStores.length === 0 && nextTailors.length > 0) return "tailors";
        return prev;
      });
    } catch (err) {
      setError(favouriteApiErrorMessage(err, t("loadError")));
      setTailors([]);
      setStores([]);
    } finally {
      setLoading(false);
    }
    // searchParams read once per load for default tab; tab switches update URL separately
    // eslint-disable-next-line react-hooks/exhaustive-deps -- avoid refetch on fav= query change
  }, [t]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const fromUrl = normalizeCategory(searchParams.get("fav"));
    if (fromUrl) setCategory(fromUrl);
  }, [searchParams]);

  const selectCategory = (next: FavouritesCategory) => {
    setCategory(next);
    const paramsNext = new URLSearchParams(searchParams.toString());
    paramsNext.set("tab", "favourites");
    paramsNext.set("fav", next);
    router.replace(`${pathname}?${paramsNext.toString()}`, { scroll: false });
  };

  const handleRemove = async (type: FavouriteShopType, id: string) => {
    try {
      setRemovingId(id);
      await removeFavourite(type, id);
      if (type === "tailor") {
        setTailors((prev) => prev.filter((s) => s._id !== id));
      } else {
        setStores((prev) => prev.filter((s) => s._id !== id));
      }
      toast.success(t("removed"), TOAST);
    } catch (err) {
      toast.error(favouriteApiErrorMessage(err, t("removeError")), TOAST);
    } finally {
      setRemovingId(null);
    }
  };

  const isEmpty = !loading && !error && tailors.length === 0 && stores.length === 0;
  const activeItems = category === "tailors" ? tailors : stores;
  const activeType: FavouriteShopType =
    category === "tailors" ? "tailor" : "fabricShop";
  const activeEmptyLabel =
    category === "tailors" ? t("noTailors") : t("noStores");
  const activeBrowseHref = category === "tailors" ? "/tailors" : "/brands";
  const activeBrowseLabel =
    category === "tailors" ? t("browseTailors") : t("browseStores");
  const activeTypeLabel =
    category === "tailors" ? t("typeTailor") : t("typeStore");

  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-5 sm:p-6 md:p-8 shadow-sm">
      <div className="mb-6 sm:mb-8">
        <div className="mb-2 inline-flex items-center gap-2 text-[10px] uppercase tracking-[0.22em] text-[#7A7A72] [font-family:var(--font-ui)]">
          <Heart className="size-3.5" strokeWidth={1.75} aria-hidden />
          {t("eyebrow")}
        </div>
        <h2 className="[font-family:var(--font-display)] text-[26px] tracking-[-0.01em] text-black sm:text-[30px]">
          {t("title")}
        </h2>
        <p className="mt-2 max-w-xl [font-family:var(--font-body)] text-[14px] leading-relaxed text-[#7A7A72]">
          {t("description")}
        </p>
      </div>

      {loading ? (
        <ProductGridSkeleton
          count={4}
          columnsClassName="grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
        />
      ) : error ? (
        <div className="border border-red-200 bg-red-50 px-5 py-8 text-center">
          <p className="[font-family:var(--font-body)] text-[14px] text-red-700">
            {error}
          </p>
        </div>
      ) : isEmpty ? (
        <div className="border border-[#E4E0D8] bg-[#FAFAF7] px-6 py-16 text-center">
          <Heart
            className="mx-auto mb-4 size-8 text-[#7A7A72]"
            strokeWidth={1.25}
            aria-hidden
          />
          <h3 className="mb-2 text-[14px] uppercase tracking-[0.2em] text-black [font-family:var(--font-ui)]">
            {t("emptyTitle")}
          </h3>
          <p className="mx-auto mb-6 max-w-sm [font-family:var(--font-body)] text-[13px] leading-relaxed text-[#7A7A72]">
            {t("empty")}
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/tailors"
              className={buttonVariants({ variant: "primary", size: "md" })}
            >
              {t("browseTailors")}
            </Link>
            <Link
              href="/brands"
              className={buttonVariants({ variant: "secondary", size: "md" })}
            >
              {t("browseStores")}
            </Link>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          <div
            role="tablist"
            aria-label={t("title")}
            className="flex flex-wrap gap-2 border-b border-[#E4E0D8] pb-4"
          >
            <button
              type="button"
              role="tab"
              aria-selected={category === "tailors"}
              onClick={() => selectCategory("tailors")}
              className={[
                "px-4 py-2.5 text-[10px] uppercase tracking-[0.2em] transition [font-family:var(--font-ui)]",
                category === "tailors"
                  ? "bg-black text-white"
                  : "border border-[#E4E0D8] bg-white text-[#7A7A72] hover:border-black hover:text-black",
              ].join(" ")}
            >
              {t("tabTailors")} ({tailors.length})
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={category === "stores"}
              onClick={() => selectCategory("stores")}
              className={[
                "px-4 py-2.5 text-[10px] uppercase tracking-[0.2em] transition [font-family:var(--font-ui)]",
                category === "stores"
                  ? "bg-black text-white"
                  : "border border-[#E4E0D8] bg-white text-[#7A7A72] hover:border-black hover:text-black",
              ].join(" ")}
            >
              {t("tabStores")} ({stores.length})
            </button>
          </div>

          <section
            role="tabpanel"
            aria-label={
              category === "tailors" ? t("tailorsSection") : t("storesSection")
            }
          >
            <h3 className="mb-4 [font-family:var(--font-display)] text-[20px] tracking-[-0.01em] text-black sm:text-[22px]">
              {category === "tailors"
                ? t("tailorsSection")
                : t("storesSection")}
            </h3>

            {activeItems.length === 0 ? (
              <div className="border border-[#E4E0D8] bg-[#FAFAF7] px-5 py-10 text-center">
                <p className="mb-4 [font-family:var(--font-body)] text-[13px] text-[#7A7A72]">
                  {activeEmptyLabel}
                </p>
                <Link
                  href={activeBrowseHref}
                  className={buttonVariants({ variant: "secondary", size: "sm" })}
                >
                  {activeBrowseLabel}
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {activeItems.map((shop) => (
                  <FavouriteCard
                    key={`${activeType}-${shop._id}`}
                    shop={shop}
                    type={activeType}
                    locale={locale}
                    removing={removingId === shop._id}
                    onRemove={() => void handleRemove(activeType, shop._id)}
                    viewLabel={t("viewShop")}
                    removeLabel={t("remove")}
                    reviewsLabel={t("reviews")}
                    typeLabel={activeTypeLabel}
                  />
                ))}
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
