"use client";

import { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";
import { useParams } from "next/navigation";
import { Store, Loader2, Power } from "lucide-react";
import TailorSettingsForm from "@/components/tailor/TailorSettingsForm";
import { ConfirmationModal } from "@/components/shared/ConfirmationModal";
import { getApiErrorMessage } from "@/lib/api/client";
import {
  fetchOwnTailorShop,
  updateTailorShopVisibility,
  type TailorShopProfile,
} from "@/lib/tailorShop";

export default function TailorSettingsPage() {
  const params = useParams();
  const locale = params.locale === "ar" ? "ar" : "en";
  const isAr = locale === "ar";

  const [shop, setShop] = useState<TailorShopProfile | null>(null);
  const [loadingShop, setLoadingShop] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deactivateModalOpen, setDeactivateModalOpen] = useState(false);

  const loadShop = useCallback(async () => {
    setLoadingShop(true);
    try {
      setShop(await fetchOwnTailorShop());
    } catch (err) {
      toast.error(
        getApiErrorMessage(
          err,
          isAr ? "تعذر تحميل المتجر" : "Failed to load shop",
        ),
      );
    } finally {
      setLoadingShop(false);
    }
  }, [isAr]);

  useEffect(() => {
    void loadShop();
  }, [loadShop]);

  const isActive = shop?.isActive !== false;

  const handleActivate = async () => {
    setSaving(true);
    try {
      const item = await updateTailorShopVisibility({ isActive: true });
      setShop(item);
      toast.success(isAr ? "تم تفعيل المتجر" : "Shop activated");
    } catch (err) {
      toast.error(
        getApiErrorMessage(
          err,
          isAr ? "تعذر تفعيل المتجر" : "Failed to activate shop",
        ),
      );
    } finally {
      setSaving(false);
    }
  };

  const confirmDeactivate = async () => {
    setSaving(true);
    try {
      const item = await updateTailorShopVisibility({ isActive: false });
      setShop(item);
      setDeactivateModalOpen(false);
      toast.success(isAr ? "تم إلغاء تفعيل المتجر" : "Shop deactivated");
    } catch (err) {
      toast.error(
        getApiErrorMessage(
          err,
          isAr ? "تعذر إلغاء تفعيل المتجر" : "Failed to deactivate shop",
        ),
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="w-full space-y-6">
      <TailorSettingsForm />

      <div className="bg-white border border-gray-200 rounded-2xl p-5 sm:p-6 md:p-8 shadow-sm">
        <div className="flex items-start gap-3 mb-5">
          <div className="mt-0.5 rounded-xl bg-gray-100 p-2.5 text-gray-700">
            <Store className="w-5 h-5" />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-base sm:text-lg font-semibold text-gray-900">
              {isAr ? "ظهور المتجر" : "Shop visibility"}
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              {isAr
                ? "عند إلغاء التفعيل يختفي متجرك وتصاميمك من الموقع حتى تعيد تفعيله."
                : "Deactivating hides your shop and designs across the site until you reactivate."}
            </p>
          </div>
        </div>

        {loadingShop ? (
          <div className="flex items-center gap-2 text-sm text-gray-500 py-4">
            <Loader2 className="w-4 h-4 animate-spin" />
            {isAr ? "جاري التحميل…" : "Loading…"}
          </div>
        ) : !shop ? (
          <p className="text-sm text-gray-500">
            {isAr
              ? "لم يتم إعداد ملف المتجر بعد."
              : "Shop profile is not set up yet."}
          </p>
        ) : (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium ${
                  isActive
                    ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                    : "border-amber-200 bg-amber-50 text-amber-900"
                }`}
              >
                {isActive
                  ? isAr
                    ? "نشط"
                    : "Active"
                  : isAr
                    ? "غير نشط"
                    : "Inactive"}
              </span>
              {!isActive ? (
                <span className="text-xs sm:text-sm text-gray-600">
                  {isAr
                    ? "معطّل حتى تعيد التفعيل يدوياً"
                    : "Paused until you reactivate manually"}
                </span>
              ) : null}
            </div>

            {isActive ? (
              <div className="flex justify-end border-t border-gray-100 pt-4">
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => setDeactivateModalOpen(true)}
                  className="inline-flex items-center justify-center gap-2 rounded-lg border border-red-200 bg-white px-8 py-3 text-xs font-medium uppercase tracking-[0.18em] text-red-700 transition hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed hover:cursor-pointer"
                >
                  {saving ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Power className="w-4 h-4" />
                  )}
                  {isAr ? "إلغاء تفعيل المتجر" : "DEACTIVATE SHOP"}
                </button>
              </div>
            ) : (
              <div className="flex justify-end border-t border-gray-100 pt-4">
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => void handleActivate()}
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-black px-8 py-3 text-xs font-medium uppercase tracking-[0.18em] text-white transition hover:bg-[#1A1A1A] disabled:opacity-50 disabled:cursor-not-allowed hover:cursor-pointer"
                >
                  {saving ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Power className="w-4 h-4" />
                  )}
                  {isAr ? "تفعيل المتجر الآن" : "ACTIVATE SHOP"}
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      <ConfirmationModal
        isOpen={deactivateModalOpen}
        title={isAr ? "إلغاء تفعيل المتجر" : "Deactivate shop"}
        message={
          isAr
            ? "سيتم إخفاء متجرك وتصاميمك حتى تعيد تفعيله يدوياً."
            : "Your shop and designs will stay hidden until you reactivate them manually."
        }
        confirmLabel={isAr ? "إلغاء التفعيل" : "Deactivate"}
        cancelLabel={isAr ? "إلغاء" : "Cancel"}
        onConfirm={() => void confirmDeactivate()}
        onCancel={() => {
          if (saving) return;
          setDeactivateModalOpen(false);
        }}
        isLoading={saving}
        isDanger
      />
    </div>
  );
}
