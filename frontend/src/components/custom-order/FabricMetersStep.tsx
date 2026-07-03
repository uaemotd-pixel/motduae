"use client";

import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { useParams } from "next/navigation";
import { Link, useRouter } from "@/i18n/navigation";
import { useCustomOrder } from "@/context/CustomOrderContext";
import {
  areInitialStepsComplete,
  buildAutoLineItem,
  CUSTOM_ORDER_TOTAL_STEPS,
  getBackPathFromMeters,
  getCustomOrderResumePath,
  getCustomOrderStepNumber,
  getLineItemPairKey,
  getSuggestedMetersForDesign,
  isLineItemMetersValid,
  isMetersStepComplete,
  type CustomOrderLineItem,
  useOwnFabric,
  WARA_TO_METERS,
  convertToMeters,
  type FabricUnit,
} from "@/lib/customOrder";
import ConfiguratorStepHeader from "@/components/custom-order/ConfiguratorStepHeader";

export default function FabricMetersStep() {
  const t = useTranslations("CustomOrderMeters");
  const router = useRouter();
  const params = useParams();
  const locale = params.locale === "ar" ? "ar" : "en";

  const {
    draft,
    isHydrated,
    addLineItem,
    updateLineItemMeters,
    removeLineItem,
    syncAutoLineItems,
    updateLineItemUnit,
  } = useCustomOrder();
  const usingOwnFabric = useOwnFabric(draft);

  const [addDesignId, setAddDesignId] = useState("");
  const [addFabricId, setAddFabricId] = useState("");
  const [unit, setUnit] = useState<FabricUnit>("meters");

  useEffect(() => {
    if (!isHydrated) return;
    if (!areInitialStepsComplete(draft)) {
      router.push(getCustomOrderResumePath(draft));
    }
  }, [draft, isHydrated, router]);

  useEffect(() => {
    if (!isHydrated) return;
    syncAutoLineItems();
  }, [
    isHydrated,
    syncAutoLineItems,
    draft.selectedDesigns.length,
    draft.selectedFabrics.length,
    draft.fabricSource,
  ]);

  const canContinue = isMetersStepComplete(draft);
  const stepNumber = getCustomOrderStepNumber("meters", draft.firstStep);
  const backPath = getBackPathFromMeters(draft.firstStep);
  const backLabel =
    draft.firstStep === "tailor" ? t("backToFabric") : t("backToTailor");

  const needsManualPairing =
    draft.lineItems.length === 0 &&
    draft.selectedDesigns.length > 1 &&
    draft.selectedFabrics.length > 1;

  const existingPairKeys = useMemo(
    () =>
      new Set(
        draft.lineItems.map((item) =>
          getLineItemPairKey(item.design._id, item.fabric?._id ?? null),
        ),
      ),
    [draft.lineItems],
  );

  const availablePairs = useMemo(() => {
    const pairs: CustomOrderLineItem[] = [];

    for (const design of draft.selectedDesigns) {
      if (usingOwnFabric) {
        const key = getLineItemPairKey(design._id, null);
        if (!existingPairKeys.has(key)) {
          pairs.push(buildAutoLineItem(design, null));
        }
        continue;
      }

      for (const fabric of draft.selectedFabrics) {
        const key = getLineItemPairKey(design._id, fabric._id);
        if (!existingPairKeys.has(key)) {
          pairs.push(buildAutoLineItem(design, fabric));
        }
      }
    }

    return pairs;
  }, [
    draft.selectedDesigns,
    draft.selectedFabrics,
    existingPairKeys,
    usingOwnFabric,
  ]);

  useEffect(() => {
    if (availablePairs.length === 0) return;
    const first = availablePairs[0];
    setAddDesignId((current) => current || first.design._id);
    if (!usingOwnFabric) {
      setAddFabricId((current) => current || first.fabric?._id || "");
    }
  }, [availablePairs, usingOwnFabric]);

  const handleMetersChange = (itemId: string, value: string) => {
    if (value.trim() === "") {
      updateLineItemMeters(itemId, null);
      return;
    }

    const parsed = Number(value);
    if (Number.isFinite(parsed) && parsed >= 2 && parsed <= 7) {
      updateLineItemMeters(itemId, parsed);
    } else {
      updateLineItemMeters(itemId, null);
    }
  };

  const handleUnitChange = (itemId: string, newUnit: FabricUnit) => {
    const item = draft.lineItems.find((i) => i.id === itemId);
    if (!item || item.fabricMeters === null) {
      updateLineItemUnit(itemId, newUnit);
      return;
    }

    let converted: number;
    if (newUnit === "wara") {
      converted = Number((item.fabricMeters / WARA_TO_METERS).toFixed(2));
    } else {
      converted = Number((item.fabricMeters * WARA_TO_METERS).toFixed(2));
    }

    updateLineItemUnit(itemId, newUnit);
    updateLineItemMeters(itemId, converted);
  };

  const handleAddItem = () => {
    const design = draft.selectedDesigns.find(
      (entry) => entry._id === addDesignId,
    );
    const fabric = usingOwnFabric
      ? null
      : (draft.selectedFabrics.find((entry) => entry._id === addFabricId) ??
        null);

    if (!design) return;
    if (!usingOwnFabric && !fabric) return;

    addLineItem(buildAutoLineItem(design, fabric));
    setAddDesignId("");
    setAddFabricId("");
  };

  const getDisplayName = (name?: string, nameAr?: string) =>
    (locale === "ar" ? nameAr || name : name) || "—";

  if (!isHydrated) {
    return (
      <div className="min-h-[40vh] flex items-center justify-center">
        <p className="[font-family:var(--font-ui)] text-sm uppercase tracking-[0.2em] text-(--color-grey-muted)">
          {t("loading")}
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14">
      <ConfiguratorStepHeader
        title={t("titleMulti")}
        description={t("descriptionMulti")}
        stepLabel={t("stepLabel", {
          step: stepNumber,
          total: CUSTOM_ORDER_TOTAL_STEPS,
        })}
      />

      {(draft.selectedFabrics.length > 0 ||
        draft.selectedDesigns.length > 0) && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
          {draft.selectedFabrics.length > 0 && (
            <div className="border border-(--color-border) bg-[#FDFAF5] p-4 sm:p-5">
              <p className="[font-family:var(--font-ui)] text-[10px] uppercase tracking-[0.24em] text-(--color-grey-muted) mb-3">
                {t("selectedFabricsSummary", {
                  count: draft.selectedFabrics.length,
                })}
              </p>
              <div className="flex flex-wrap gap-2">
                {draft.selectedFabrics.map((fabric) => (
                  <span
                    key={fabric._id}
                    className="px-3 py-1.5 bg-black text-white [font-family:var(--font-ui)] text-[10px] uppercase tracking-[0.16em]"
                  >
                    {getDisplayName(fabric.name, fabric.nameAr)}
                  </span>
                ))}
              </div>
            </div>
          )}
          {draft.selectedDesigns.length > 0 && (
            <div className="border border-(--color-border) bg-[#FDFAF5] p-4 sm:p-5">
              <p className="[font-family:var(--font-ui)] text-[10px] uppercase tracking-[0.24em] text-(--color-grey-muted) mb-3">
                {t("selectedDesignsSummary", {
                  count: draft.selectedDesigns.length,
                })}
              </p>
              <div className="flex flex-wrap gap-2">
                {draft.selectedDesigns.map((design) => (
                  <span
                    key={design._id}
                    className="px-3 py-1.5 bg-black text-white [font-family:var(--font-ui)] text-[10px] uppercase tracking-[0.16em]"
                  >
                    {getDisplayName(design.name, design.nameAr)}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {needsManualPairing && draft.lineItems.length === 0 && (
        <div className="border border-(--color-border) bg-[#FDFAF5] p-6 mb-8">
          <p className="[font-family:var(--font-body)] text-[14px] text-(--color-grey-muted)">
            {t("pairingHint")}
          </p>
        </div>
      )}

      {draft.lineItems.length > 0 ? (
        <div className="space-y-4 mb-8">
          {draft.lineItems.map((item) => {
            const designName = getDisplayName(
              item.design.name,
              item.design.nameAr,
            );
            const fabricName = item.fabric
              ? getDisplayName(item.fabric.name, item.fabric.nameAr)
              : t("ownFabricLabel");
            const tailorName = getDisplayName(
              item.tailor.name,
              item.tailor.nameAr,
            );
            const metersValue =
              item.fabricMeters !== null
                ? item.fabricUnit === "wara"
                  ? item.fabricMeters.toFixed(2)
                  : item.fabricMeters.toFixed(2)
                : "";
            const isValid = isLineItemMetersValid(
              item.fabricMeters,
              item.fabricUnit,
            );

            return (
              <div
                key={item.id}
                className="border border-(--color-border) bg-white p-5 sm:p-6"
              >
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-4">
                  <div>
                    <p className="[font-family:var(--font-display)] text-[18px] mb-1">
                      {designName}
                    </p>
                    <p className="[font-family:var(--font-ui)] text-[10px] uppercase tracking-[0.16em] text-(--color-grey-muted)">
                      {t("itemTailor", { name: tailorName })}
                    </p>
                    <p className="[font-family:var(--font-ui)] text-[10px] uppercase tracking-[0.16em] text-(--color-grey-muted) mt-1">
                      {t("itemFabric", { name: fabricName })}
                    </p>
                    <p className="[font-family:var(--font-ui)] text-[10px] uppercase tracking-[0.16em] text-(--color-grey-muted) mt-1">
                      {t("suggestedLabel")}:{" "}
                      {getSuggestedMetersForDesign(item.design)} {t("meters")}
                    </p>
                  </div>
                  {draft.lineItems.length > 0 && (
                    <button
                      type="button"
                      onClick={() => removeLineItem(item.id)}
                      className="[font-family:var(--font-ui)] text-[10px] uppercase tracking-[0.2em] text-(--color-grey-muted) border-b border-(--color-grey-muted) pb-0.5 hover:opacity-50 self-start hover:cursor-pointer"
                    >
                      {t("removeItem")}
                    </button>
                  )}
                </div>

                <label className="block [font-family:var(--font-ui)] text-[10px] uppercase tracking-[0.24em] text-black mb-2">
                  {t("inputLabel")}
                </label>
                <div className="flex items-center gap-3 max-w-xs">
                  <input
                    type="number"
                    min={
                      item.fabricUnit === "wara"
                        ? Number((2 / WARA_TO_METERS).toFixed(2))
                        : 2
                    }
                    max={
                      item.fabricUnit === "wara"
                        ? Number((7 / WARA_TO_METERS).toFixed(2))
                        : 7
                    }
                    step={item.fabricUnit === "wara" ? "0.01" : "0.01"}
                    inputMode="decimal"
                    value={metersValue}
                    onChange={(e) =>
                      handleMetersChange(item.id, e.target.value)
                    }
                    placeholder={t("inputPlaceholder")}
                    className="flex-1 border bg-white px-4 py-3 ..."
                  />

                  <select
                    value={item.fabricUnit}
                    onChange={(e) =>
                      handleUnitChange(item.id, e.target.value as FabricUnit)
                    }
                    className="border border-(--color-border) bg-white px-3 py-3 [font-family:var(--font-body)] text-[14px] shrink-0"
                  >
                    <option value="meters">Meters</option>
                    <option value="wara">Wara</option>
                  </select>
                </div>
                {metersValue && !isValid && (
                  <p className="text-red-600 text-[12px] mt-2 [font-family:var(--font-body)]">
                    {t("validationError")}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <p className="[font-family:var(--font-ui)] text-sm uppercase tracking-[0.2em] text-center py-10 text-(--color-grey-muted) mb-8">
          {t("noItemsYet")}
        </p>
      )}

      {availablePairs.length > 0 && (
        <div className="border border-(--color-border) bg-[#FDFAF5] p-6 mb-8 max-w-2xl">
          <h3 className="[font-family:var(--font-display)] text-[18px] mb-4">
            {t("addItemTitle")}
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block [font-family:var(--font-ui)] text-[10px] uppercase tracking-[0.2em] text-black mb-2">
                {t("selectDesign")}
              </label>
              <select
                value={addDesignId}
                onChange={(e) => setAddDesignId(e.target.value)}
                className="w-full border border-(--color-border) bg-white px-3 py-2.5 [font-family:var(--font-body)] text-[14px]"
              >
                <option value="">{t("selectDesignPlaceholder")}</option>
                {draft.selectedDesigns.map((design) => (
                  <option key={design._id} value={design._id}>
                    {getDisplayName(design.name, design.nameAr)}
                  </option>
                ))}
              </select>
            </div>
            {!usingOwnFabric && (
              <div>
                <label className="block [font-family:var(--font-ui)] text-[10px] uppercase tracking-[0.2em] text-black mb-2">
                  {t("selectFabric")}
                </label>
                <select
                  value={addFabricId}
                  onChange={(e) => setAddFabricId(e.target.value)}
                  className="w-full border border-(--color-border) bg-white px-3 py-2.5 [font-family:var(--font-body)] text-[14px]"
                >
                  <option value="">{t("selectFabricPlaceholder")}</option>
                  {draft.selectedFabrics.map((fabric) => (
                    <option key={fabric._id} value={fabric._id}>
                      {getDisplayName(fabric.name, fabric.nameAr)}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={handleAddItem}
            disabled={!addDesignId || (!usingOwnFabric && !addFabricId)}
            className="px-6 py-2.5 bg-black text-white text-[10px] tracking-[0.22em] uppercase hover:bg-[#2A2A28] transition disabled:opacity-40 [font-family:var(--font-ui)]"
          >
            {t("addItem")}
          </button>
        </div>
      )}

      <div className="border border-(--color-border) bg-white p-6 max-w-2xl mb-10">
        <p className="[font-family:var(--font-body)] text-[14px] leading-relaxed text-(--color-grey-muted)">
          {usingOwnFabric ? t("ownFabricNote") : t("platformFabricNote")}
        </p>
      </div>

      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 pt-6 border-t border-(--color-border) max-w-2xl">
        <Link
          href={backPath}
          className="[font-family:var(--font-ui)] text-[10px] uppercase tracking-[0.24em] text-black border-b border-black pb-0.5 hover:opacity-50 transition text-center sm:text-left"
        >
          {backLabel}
        </Link>

        <button
          type="button"
          onClick={() => router.push("/custom-order/measurements")}
          disabled={!canContinue}
          className="px-8 py-3 bg-black text-white text-[10px] tracking-[0.22em] uppercase hover:bg-[#2A2A28] transition disabled:opacity-40 disabled:cursor-not-allowed [font-family:var(--font-ui)] hover:cursor-pointer"
        >
          {t("continue")}
        </button>
      </div>
    </div>
  );
}
