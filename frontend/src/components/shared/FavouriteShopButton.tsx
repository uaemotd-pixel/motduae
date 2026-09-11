"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { useParams } from "next/navigation";
import toast from "react-hot-toast";
import { Heart } from "lucide-react";
import { useRouter } from "@/i18n/navigation";
import { useAuth } from "@/context/AuthContext";
import {
  addFavourite,
  favouriteApiErrorMessage,
  fetchFavouriteIds,
  removeFavourite,
  type FavouriteShopType,
} from "@/lib/customerFavourites";

type FavouriteShopButtonProps = {
  type: FavouriteShopType;
  shopId: string;
  /** Dark hero (white outline) vs light surface */
  variant?: "onDark" | "onLight";
  className?: string;
};

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

function canUseFavourites(role?: string | null, isGuest?: boolean): boolean {
  if (isGuest) return false;
  const r = String(role || "").toLowerCase();
  if (!r || r === "customer") return true;
  return false;
}

export default function FavouriteShopButton({
  type,
  shopId,
  variant = "onDark",
  className = "",
}: FavouriteShopButtonProps) {
  const t = useTranslations("ShopFavourites");
  const router = useRouter();
  const params = useParams();
  const locale = params.locale === "ar" ? "ar" : "en";
  const { user, isLoading: authLoading, isAuthenticated } = useAuth();

  const [favourited, setFavourited] = useState(false);
  const [checking, setChecking] = useState(false);
  const [busy, setBusy] = useState(false);

  const eligible =
    !authLoading &&
    isAuthenticated &&
    canUseFavourites(user?.role, user?.isGuest);

  const loadState = useCallback(async () => {
    if (!shopId || !eligible) {
      setFavourited(false);
      return;
    }
    try {
      setChecking(true);
      const data = await fetchFavouriteIds();
      const ids =
        type === "tailor" ? data.tailorIds || [] : data.fabricShopIds || [];
      setFavourited(ids.includes(shopId));
    } catch {
      setFavourited(false);
    } finally {
      setChecking(false);
    }
  }, [eligible, shopId, type]);

  useEffect(() => {
    void loadState();
  }, [loadState]);

  // Hide for partner/admin accounts — not their feature
  const role = String(user?.role || "").toLowerCase();
  if (
    !authLoading &&
    isAuthenticated &&
    ["tailor", "fabric_store", "admin", "sub-admin"].includes(role)
  ) {
    return null;
  }

  const onDark = variant === "onDark";
  const label = favourited ? t("saved") : t("add");

  const handleClick = async () => {
    if (busy || checking) return;

    if (authLoading) return;

    if (!isAuthenticated || user?.isGuest || !canUseFavourites(user?.role, user?.isGuest)) {
      const next = encodeURIComponent(
        typeof window !== "undefined"
          ? window.location.pathname + window.location.search
          : `/${locale}`,
      );
      toast(t("loginRequired"), TOAST);
      router.push(`/auth/login?redirect=${next}`);
      return;
    }

    try {
      setBusy(true);
      if (favourited) {
        await removeFavourite(type, shopId);
        setFavourited(false);
        toast.success(t("removed"), TOAST);
      } else {
        await addFavourite(type, shopId);
        setFavourited(true);
        toast.success(t("added"), TOAST);
      }
    } catch (err) {
      toast.error(favouriteApiErrorMessage(err, t("error")), TOAST);
    } finally {
      setBusy(false);
    }
  };

  return (
    <button
      type="button"
      onClick={() => void handleClick()}
      disabled={busy || checking}
      aria-pressed={favourited}
      aria-label={label}
      className={[
        "inline-flex items-center justify-center gap-2 px-5 py-3.5 text-[10px] uppercase tracking-[0.2em] transition [font-family:var(--font-ui)] sm:px-6",
        "disabled:cursor-wait disabled:opacity-60",
        onDark
          ? favourited
            ? "border border-white/50 bg-white text-black hover:bg-white/90"
            : "border border-white/35 bg-white/5 text-white backdrop-blur-sm hover:bg-white/15"
          : favourited
            ? "border border-black bg-black text-white hover:bg-[#2A2A28]"
            : "border border-(--color-border) bg-white text-black hover:border-black",
        className,
      ].join(" ")}
    >
      <Heart
        className={[
          "size-3.5 shrink-0 transition-colors",
          favourited ? "fill-current" : "fill-none",
        ].join(" ")}
        strokeWidth={1.75}
        aria-hidden
      />
      <span>{busy ? t("saving") : label}</span>
    </button>
  );
}
