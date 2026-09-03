"use client";

import { useEffect, useState, useMemo } from "react";
import { useTranslations } from "next-intl";
import { useParams } from "next/navigation";
import { Link, useRouter } from "@/i18n/navigation";
import { useCustomOrder } from "@/context/CustomOrderContext";
import { api } from "@/lib/api/client";
import {
  areInitialStepsComplete,
  CUSTOM_ORDER_TOTAL_STEPS,
  getBackPathFromMeters,
  getCustomOrderResumePath,
  getCustomOrderStepNumber,
  getLineItemCutIds,
  getLineItemCutSelections,
  getMinimumMetersForDesign,
  getSuggestedMetersForDesign,
  isFabricLengthSufficientForDesign,
  isLineItemComplete,
  isLineItemMetersValid,
  isMetersStepComplete,
  useOwnFabric,
  type CustomOrderLineItem,

  type CustomOrderSelectedCut,


} from "@/lib/customOrder";
import {
  convertToWar,
  cutValueToMeters,
  formatCutLabel,
  WAR_TO_METER,
  type CutUnit,
  type FabricUnit,
} from "@/lib/fabricUnits";
import { getFabricMaxCutLength } from "@/lib/fabrics";
import { getDesignMinCutLength } from "@/lib/tailors";
import ConfiguratorStepHeader from "@/components/custom-order/ConfiguratorStepHeader";
import CustomOrderNotice, {
  FabricRequirementBadge,
} from "@/components/custom-order/CustomOrderNotice";
import { CustomOrderStepSkeleton } from "@/components/ui/Skeleton";
import { Ruler } from "lucide-react";

interface CutOption {
  _id: string;
  name: string;
  nameAr?: string;
  value: number;
  unit: CutUnit;

  metersEquivalent?: number;
  lengthInMeters?: number;
}

interface StorefrontCutPickerProps {
  item: CustomOrderLineItem;
  cutOptions: CutOption[];
  locale: "en" | "ar";
  onUpdateCuts: (itemId: string, cuts: CustomOrderSelectedCut[]) => void;
}

function StorefrontCutPicker({
  item,
  cutOptions,
  locale,
  onUpdateCuts,
}: StorefrontCutPickerProps) {
  const t = useTranslations("CustomOrderMeters");
  const [slot2Open, setSlot2Open] = useState(
    Boolean(item.selectedCuts && item.selectedCuts.length > 1),
  );

  const designMinLength = getDesignMinCutLength(item.design);

  // Extract cuts from fabric, matching with cutOptions for length/units
  const availableCuts: CustomOrderSelectedCut[] = useMemo(() => {
    const rawCuts = item.fabric?.cuts || [];
    if (rawCuts.length > 0) {
      return rawCuts
        .map((c) => {
          const matchedAdminCut = cutOptions.find(
            (opt) =>
              String(opt._id) ===
              String(c.cutId || (typeof c.cut === "object" ? c.cut?._id : "")),
          );
          const name = c.cut?.name || matchedAdminCut?.name || "Standard Cut";
          const nameAr = c.cut?.nameAr || matchedAdminCut?.nameAr || name;
          const value = c.cut?.value ?? matchedAdminCut?.value ?? 3.5;
          const unit = c.cut?.unit ?? matchedAdminCut?.unit ?? "meter";
          const lengthInMeters =
            c.cut?.lengthInMeters ??
            (matchedAdminCut
              ? matchedAdminCut.metersEquivalent ??
                (matchedAdminCut.unit === "war"
                  ? Number((matchedAdminCut.value * 0.9144).toFixed(2))
                  : matchedAdminCut.value)
              : 3.5);
          const cutId = String(
            c.cutId || (typeof c.cut === "object" ? c.cut?._id : "") || "",
          );

          return {
            cutId,
            name,
            nameAr,
            lengthInMeters,
            price: c.price,
            stock: c.stock ?? 0,
            value,
            unit,
          };
        })
        .filter((c) => c.stock > 0);
    }

    // Fallback if fabric.cuts is empty: map available cutOptions with default price
    return cutOptions.map((opt) => ({
      cutId: opt._id,
      name: opt.name,
      nameAr: opt.nameAr,
      lengthInMeters:
        opt.unit === "war"
          ? Number((opt.value * 0.9144).toFixed(2))
          : opt.value,
      price: item.fabric?.pricePerMeter
        ? Math.round(
            item.fabric.pricePerMeter *
              (opt.unit === "war" ? opt.value * 0.9144 : opt.value),
          )
        : 350,
      stock: 10,
      value: opt.value,
      unit: opt.unit,
    }));
  }, [item.fabric, cutOptions]);

  const selectedCuts = item.selectedCuts || [];
  const slot1 = selectedCuts[0] || null;
  const slot2 = selectedCuts[1] || null;

  // Auto-select first cut if none is selected yet and cuts exist
  useEffect(() => {
    if (!slot1 && availableCuts.length > 0 && selectedCuts.length === 0) {
      onUpdateCuts(item.id, [availableCuts[0]]);
    }
  }, [slot1, availableCuts, selectedCuts.length, item.id, onUpdateCuts]);

  const handleSelectSlot1 = (cut: CustomOrderSelectedCut) => {
    // If same cut was selected, do nothing
    if (slot1?.cutId === cut.cutId) return;

    // Check if slot2 was using the newly selected slot1 cut, and if stock is sufficient
    let newSlot2: CustomOrderSelectedCut | null = slot2;
    if (slot2 && slot2.cutId === cut.cutId && (cut.stock ?? 0) < 2) {
      newSlot2 = null;
    }

    const nextCuts = [cut, ...(newSlot2 ? [newSlot2] : [])];
    onUpdateCuts(item.id, nextCuts);
  };

  const handleSelectSlot2 = (cut: CustomOrderSelectedCut) => {
    if (slot2?.cutId === cut.cutId) {
      // Deselect slot 2
      onUpdateCuts(item.id, slot1 ? [slot1] : []);
      return;
    }

    if (!slot1) return;

    // If picking same cut as slot 1, ensure stock >= 2
    if (cut.cutId === slot1.cutId && (cut.stock ?? 0) < 2) {
      return;
    }

    onUpdateCuts(item.id, [slot1, cut]);
  };

  const handleRemoveSlot2 = () => {
    setSlot2Open(false);
    if (slot1) {
      onUpdateCuts(item.id, [slot1]);
    }
  };

  const totalLength = Number(
    ((slot1?.lengthInMeters || 0) + (slot2?.lengthInMeters || 0)).toFixed(2),
  );
  const totalPrice = (slot1?.price || 0) + (slot2?.price || 0);
  const leftover =
    totalLength > designMinLength
      ? Number((totalLength - designMinLength).toFixed(2))
      : 0;
  const isShort = slot1 !== null && totalLength < designMinLength;

  const getCutDisplayName = (cut: { name: string; nameAr?: string }) =>
    locale === "ar" ? cut.nameAr || cut.name : cut.name;

  return (
    <div className="space-y-6 pt-2">
      {/* Slot 1: First Cut */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <label className="block [font-family:var(--font-ui)] text-[11px] uppercase tracking-[0.24em] font-medium text-black">
            {t("slot1Title")}
          </label>
          <span className="text-[10px] [font-family:var(--font-ui)] text-(--color-grey-muted) uppercase tracking-wider">
            {t("cutSlotsEyebrow")}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {availableCuts.map((cut) => {
            const isSelected = slot1?.cutId === cut.cutId;
            return (
              <button
                key={`slot1-${cut.cutId}`}
                type="button"
                onClick={() => handleSelectSlot1(cut)}
                className={`p-4 border text-left transition relative rounded-sm flex flex-col justify-between hover:cursor-pointer ${
                  isSelected
                    ? "border-black bg-neutral-900 text-white shadow-sm"
                    : "border-(--color-border) bg-white text-black hover:border-black"
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <span className="[font-family:var(--font-display)] text-[15px] font-semibold">
                      {getCutDisplayName(cut)}
                    </span>
                    {isSelected && (
                      <span className="px-2 py-0.5 text-[9px] uppercase tracking-wider bg-white text-black font-medium rounded-xs">
                        {t("selectedBadge")}
                      </span>
                    )}
                  </div>
                  <p
                    className={`text-xs [font-family:var(--font-ui)] ${
                      isSelected ? "text-neutral-300" : "text-(--color-grey-muted)"
                    }`}
                  >
                    {cut.lengthInMeters} {t("meters")}
                    {cut.unit === "war" ? ` · ${cut.value} war` : ""}
                  </p>
                </div>

                <div className="flex items-center justify-between mt-4 pt-3 border-t border-current/10">
                  <span className="font-medium text-sm [font-family:var(--font-ui)]">
                    AED {cut.price}
                  </span>
                  <span
                    className={`text-[10px] [font-family:var(--font-ui)] ${
                      isSelected ? "text-neutral-300" : "text-neutral-500"
                    }`}
                  >
                    {t("piecesLeft", { count: cut.stock ?? 0 })}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Slot 2: Prompt to add or choose second cut */}
      {slot1 && (
        <div className="pt-2">
          {!slot2 && !slot2Open ? (
            <div
              className={`p-4 rounded-md border ${
                isShort
                  ? "bg-amber-50/90 border-amber-200"
                  : "bg-neutral-50 border-(--color-border)"
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="flex items-start gap-2.5">
                  <span className="text-base shrink-0">{isShort ? "💡" : "✂️"}</span>
                  <div>
                    <p
                      className={`text-xs [font-family:var(--font-ui)] font-medium leading-relaxed ${
                        isShort ? "text-amber-950" : "text-neutral-800"
                      }`}
                    >
                      {isShort
                        ? t("promptSecondCut", { min: designMinLength })
                        : t("designLengthHint", { min: designMinLength })}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setSlot2Open(true)}
                  className="shrink-0 px-4 py-2 bg-black text-white text-[10px] uppercase tracking-[0.16em] [font-family:var(--font-ui)] hover:bg-neutral-800 transition hover:cursor-pointer self-start sm:self-auto"
                >
                  {t("addSecondCutBtn")}
                </button>
              </div>
            </div>
          ) : (
            <div className="border border-(--color-border) bg-neutral-50/60 p-4 sm:p-5 rounded-md">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <label className="block [font-family:var(--font-ui)] text-[11px] uppercase tracking-[0.24em] font-medium text-black">
                    {t("slot2Title")}
                  </label>
                  {isShort && (
                    <p className="text-[11px] text-amber-800 [font-family:var(--font-ui)] mt-0.5">
                      {t("promptSecondCut", { min: designMinLength })}
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={handleRemoveSlot2}
                  className="text-[10px] uppercase tracking-[0.16em] [font-family:var(--font-ui)] text-red-600 hover:text-red-800 transition underline hover:cursor-pointer"
                >
                  {t("removeSecondCutBtn")}
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {availableCuts.map((cut) => {
                  const isSelected = slot2?.cutId === cut.cutId;
                  const isSameAsSlot1 = slot1.cutId === cut.cutId;
                  const isStockRestricted =
                    isSameAsSlot1 && (cut.stock ?? 0) < 2;

                  return (
                    <button
                      key={`slot2-${cut.cutId}`}
                      type="button"
                      disabled={isStockRestricted}
                      onClick={() => handleSelectSlot2(cut)}
                      className={`p-4 border text-left transition relative rounded-sm flex flex-col justify-between ${
                        isStockRestricted
                          ? "opacity-40 bg-neutral-100 border-neutral-200 cursor-not-allowed"
                          : isSelected
                            ? "border-black bg-neutral-900 text-white shadow-sm hover:cursor-pointer"
                            : "border-(--color-border) bg-white text-black hover:border-black hover:cursor-pointer"
                      }`}
                    >
                      <div>
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <span className="[font-family:var(--font-display)] text-[15px] font-semibold">
                            {getCutDisplayName(cut)}
                          </span>
                          {isSelected && (
                            <span className="px-2 py-0.5 text-[9px] uppercase tracking-wider bg-white text-black font-medium rounded-xs">
                              {t("selectedBadge")}
                            </span>
                          )}
                        </div>
                        <p
                          className={`text-xs [font-family:var(--font-ui)] ${
                            isSelected ? "text-neutral-300" : "text-(--color-grey-muted)"
                          }`}
                        >
                          {cut.lengthInMeters} {t("meters")}
                          {cut.unit === "war" ? ` · ${cut.value} war` : ""}
                        </p>
                      </div>

                      <div className="flex items-center justify-between mt-4 pt-3 border-t border-current/10">
                        <span className="font-medium text-sm [font-family:var(--font-ui)]">
                          AED {cut.price}
                        </span>
                        <span
                          className={`text-[10px] [font-family:var(--font-ui)] ${
                            isStockRestricted
                              ? "text-red-500 font-medium"
                              : isSelected
                                ? "text-neutral-300"
                                : "text-neutral-500"
                          }`}
                        >
                          {isStockRestricted
                            ? t("onlyOnePieceLeft")
                            : t("piecesLeft", {
                                count: isSameAsSlot1
                                  ? (cut.stock ?? 1) - 1
                                  : (cut.stock ?? 0),
                              })}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Real-time Summary Box */}
      {slot1 && (
        <div className="border border-black/10 bg-neutral-50 p-4 sm:p-5 rounded-md space-y-3">
          <p className="[font-family:var(--font-ui)] text-[10px] uppercase tracking-[0.24em] font-medium text-(--color-grey-muted)">
            {t("runningTotalTitle")}
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
            <div className="border-b sm:border-b-0 sm:border-r border-neutral-200 pb-2 sm:pb-0 pr-2">
              <span className="block text-[11px] [font-family:var(--font-ui)] text-(--color-grey-muted) uppercase tracking-wider">
                {t("totalLengthLabel")}
              </span>
              <span className="text-lg font-semibold [font-family:var(--font-display)] text-black">
                {totalLength} {t("meters")}
              </span>
            </div>

            <div className="border-b sm:border-b-0 sm:border-r border-neutral-200 pb-2 sm:pb-0 pr-2">
              <span className="block text-[11px] [font-family:var(--font-ui)] text-(--color-grey-muted) uppercase tracking-wider">
                {t("totalPriceLabel")}
              </span>
              <span className="text-lg font-semibold [font-family:var(--font-display)] text-black">
                AED {totalPrice}
              </span>
            </div>

            <div>
              <span className="block text-[11px] [font-family:var(--font-ui)] text-(--color-grey-muted) uppercase tracking-wider">
                {t("estimatedLeftoverLabel")}
              </span>
              <span className="text-lg font-semibold [font-family:var(--font-display)] text-black">
                {leftover} {t("meters")}
              </span>
            </div>
          </div>

          {leftover > 0 && (
            <p className="text-xs text-neutral-600 [font-family:var(--font-body)] pt-1 flex items-center gap-1.5">
              <span>🎁</span>
              <span>{t("leftoverReturnedNote")}</span>
            </p>
          )}

          {slot1 && slot2 && isShort && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded text-amber-900 text-xs [font-family:var(--font-ui)] flex items-start gap-2">
              <span>⚠️</span>
              <span>
                {t("stillShortWarning", {
                  total: totalLength,
                  min: designMinLength,
                })}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
  stock: number;
}

function getCutOptionsForLineItem(
  item: CustomOrderLineItem,
  globalCuts: CutOption[],
): CutOption[] {
  if (item.fabric) {
    if (!item.fabric.cuts?.length) return [];
    return item.fabric.cuts
      .filter((entry) => entry.cut && (entry.inStock ?? entry.stock > 0))
      .map((entry) => ({
        _id: entry.cutId,
        name: entry.cut!.name,
        nameAr: entry.cut!.nameAr,
        value: entry.cut!.value,
        unit: entry.cut!.unit,
        stock: Math.max(
          0,
          Math.floor(Number(entry.stockPieces ?? entry.stock) || 0),
        ),
      }));
  }
  return globalCuts.map((cut) => ({ ...cut, stock: cut.stock || 0 }));
}

function getTotalAvailableCutMeters(cuts: CutOption[]): number {
  return Number(
    cuts
      .reduce(
        (sum, cut) =>
          sum + cutValueToMeters(cut.value, cut.unit) * Math.max(0, cut.stock),
        0,
      )
      .toFixed(2),
  );
}

function getLineItemIssue(
  item: CustomOrderLineItem,
  usingOwnFabric: boolean,
  itemCutOptions: CutOption[],
) {
  const isValid = isLineItemMetersValid(item.fabricMeters, item.fabricUnit);
  const lengthSufficient = isFabricLengthSufficientForDesign(item);
  const selectedCutIds = getLineItemCutIds(item);
  const totalAvailable = getTotalAvailableCutMeters(itemCutOptions);
  const minimumMeters = getMinimumMetersForDesign(item.design);

  if (!usingOwnFabric && itemCutOptions.length === 0) {
    return "noCuts" as const;
  }

  if (
    !usingOwnFabric &&
    itemCutOptions.length > 0 &&
    totalAvailable + 0.009 < minimumMeters
  ) {
    return "cannotFulfill" as const;
  }

  if (
    !usingOwnFabric &&
    selectedCutIds.length > 0 &&
    item.fabricMeters !== null &&
    !lengthSufficient
  ) {
    return "tooShort" as const;
  }

  if (usingOwnFabric && item.fabricMeters !== null && !isValid) {
    return "invalidRange" as const;
  }

  if (
    usingOwnFabric &&
    item.fabricMeters !== null &&
    isValid &&
    !lengthSufficient
  ) {
    return "tooShort" as const;
  }

  return null;

}

export default function FabricMetersStep() {
  const t = useTranslations("CustomOrderMeters");
  const router = useRouter();
  const params = useParams();
  const locale = params.locale === "ar" ? "ar" : "en";

  const {
    draft,
    isHydrated,
    updateLineItemMeters,
    syncAutoLineItems,
    updateLineItemUnit,

    applyLineItemCut,
    updateLineItemCuts,

    setLineItemCutQuantity,

  } = useCustomOrder();
  const usingOwnFabric = useOwnFabric(draft);
  const [cutOptions, setCutOptions] = useState<CutOption[]>([]);

  useEffect(() => {
    let cancelled = false;
    const loadCuts = async () => {
      try {
        const data = await api.get<CutOption[]>("/api/filters/cuts");
        if (!cancelled && Array.isArray(data)) {
          setCutOptions(data);
        }
      } catch {
        if (!cancelled) setCutOptions([]);
      }
    };
    void loadCuts();
    return () => {
      cancelled = true;
    };
  }, []);

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

  useEffect(() => {
    if (!isHydrated || usingOwnFabric) return;
    for (const item of draft.lineItems) {
      if (
        item.fabric?.cuts?.length &&
        getLineItemCutIds(item).length === 0 &&
        item.fabricMeters !== null
      ) {
        updateLineItemMeters(item.id, null);
      }
    }
  }, [isHydrated, usingOwnFabric, draft.lineItems, updateLineItemMeters]);

  const canContinue = isMetersStepComplete(draft);
  const stepNumber = getCustomOrderStepNumber("meters", draft.firstStep);
  const backPath = getBackPathFromMeters(draft);
  const backLabel =
    draft.firstStep === "tailor" ? t("backToFabric") : t("backToTailor");

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
    if (newUnit === "war" || newUnit === "wara") {
      converted = convertToWar(item.fabricMeters, item.fabricUnit);
    } else {
      converted = Number((item.fabricMeters * WAR_TO_METER).toFixed(2));
    }

    updateLineItemUnit(itemId, newUnit);
    updateLineItemMeters(itemId, converted);
  };

  const getDisplayName = (name?: string, nameAr?: string) =>
    (locale === "ar" ? nameAr || name : name) || "—";

  if (!isHydrated) {
    return <CustomOrderStepSkeleton />;
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14">
      <ConfiguratorStepHeader
        title={t("title")}
        description={t("description")}
        stepLabel={t("stepLabel", {
          step: stepNumber,
          total: CUSTOM_ORDER_TOTAL_STEPS,
        })}
      />

      {(draft.selectedFabrics.length > 0 ||
        draft.selectedDesigns.length > 0) && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
          {draft.selectedFabrics.length > 0 && (
            <div className="border border-(--color-border) bg-white p-4 sm:p-5">
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
            <div className="border border-(--color-border) bg-white p-4 sm:p-5">
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
              item.fabricMeters !== null ? item.fabricMeters.toFixed(2) : "";
            const minimumMeters = getMinimumMetersForDesign(item.design);
            const itemCutOptions = getCutOptionsForLineItem(item, cutOptions);
            const selections = getLineItemCutSelections(item);
            const selectedCutIds = Object.keys(selections);
            const selectedMeters = item.fabricMeters ?? 0;
            const issue = getLineItemIssue(
              item,
              usingOwnFabric,
              itemCutOptions,
            );
            const requirementMet = isFabricLengthSufficientForDesign(item);
            const hasValidSelection =
              issue === null && isLineItemComplete(item, draft.fabricSource);
            const awaitingCutChoice =
              !usingOwnFabric &&
              selectedCutIds.length === 0 &&
              itemCutOptions.length > 0 &&
              issue !== "cannotFulfill";
            const cutName = (cut: CutOption) =>
              locale === "ar" ? cut.nameAr || cut.name : cut.name;

            return (
              <div
                key={item.id}
                className={`border bg-white p-5 sm:p-6 transition-shadow duration-300 ${
                  issue
                    ? "border-rose-200/80 shadow-[0_10px_40px_rgba(225,29,72,0.06)]"
                    : hasValidSelection
                      ? "border-emerald-200/70 shadow-[0_10px_40px_rgba(16,185,129,0.05)]"
                      : "border-(--color-border)"
                }`}
              >
                <div className="flex flex-col gap-4 mb-5 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
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

                  <FabricRequirementBadge
                    label={t("minimumRequiredLabel")}
                    value={`${minimumMeters.toFixed(1)} ${t("meters")}`}
                  />
                </div>


                {usingOwnFabric ? (
                  <>
                    <label className="block [font-family:var(--font-ui)] text-[10px] uppercase tracking-[0.24em] text-black mb-2">
                      {t("inputLabel")}
                    </label>

                    {cutOptions.length > 0 && (
                      <div className="flex flex-wrap gap-2 mb-4">
                        {cutOptions.map((cut) => {
                          const selected = item.cutId === cut._id;
                          return (
                            <button
                              key={cut._id}
                              type="button"
                              onClick={() =>
                                applyLineItemCut(item.id, {
                                  _id: cut._id,
                                  value: cut.value,
                                  unit: cut.unit,
                                })
                              }
                              className={`px-3 py-2 border text-[10px] uppercase tracking-[0.16em] [font-family:var(--font-ui)] transition hover:cursor-pointer ${
                                selected
                                  ? "bg-black text-white border-black"
                                  : "bg-white text-black border-(--color-border) hover:border-black"
                              }`}
                            >
                              {cutName(cut)} ·{" "}
                              {formatCutLabel(cut.value, cut.unit, locale)}
                            </button>
                          );
                        })}
                      </div>
                    )}

                    <div className="flex items-center gap-3 max-w-xs">
                      <input
                        type="number"
                        min={
                          item.fabricUnit === "war" || item.fabricUnit === "wara"
                            ? Number((2 / WAR_TO_METER).toFixed(2))
                            : 2
                        }
                        max={
                          item.fabricUnit === "war" || item.fabricUnit === "wara"
                            ? Number((7 / WAR_TO_METER).toFixed(2))
                            : 7
                        }
                        step="0.01"
                        inputMode="decimal"
                        value={metersValue}
                        onChange={(e) =>
                          handleMetersChange(item.id, e.target.value)
                        }
                        placeholder={t("inputPlaceholder")}
                        className="flex-1 border bg-white px-4 py-3 [font-family:var(--font-body)] text-[14px]"
                      />

                      <select
                        value={item.fabricUnit}
                        onChange={(e) =>
                          handleUnitChange(item.id, e.target.value as FabricUnit)
                        }
                        className="border border-(--color-border) bg-white px-3 py-3 [font-family:var(--font-body)] text-[14px] shrink-0"
                      >
                        <option value="meters">Meters</option>
                        <option value="war">War</option>
                      </select>
                    </div>
                    {metersValue && !isValid && (
                      <p className="text-red-600 text-[12px] mt-2 [font-family:var(--font-body)]">
                        {t("validationError")}
                      </p>
                    )}
                  </>
                ) : (
                  <StorefrontCutPicker
                    item={item}
                    cutOptions={cutOptions}
                    locale={locale}
                    onUpdateCuts={updateLineItemCuts}
                  />

                {hasValidSelection && (
                  <CustomOrderNotice
                    tone="success"
                    title={t("fabricChoiceValid")}
                    description={t("fabricChoiceValidDetail", {
                      required: minimumMeters.toFixed(1),
                      selected: selectedMeters.toFixed(1),
                    })}
                    className="mb-5"
                  />
                )}

                {issue === "tooShort" && (
                  <CustomOrderNotice
                    tone="error"
                    title={t("alertTitleTooShort")}
                    description={t("insufficientFabricError", {
                      required: minimumMeters.toFixed(1),
                      selected: selectedMeters.toFixed(1),
                    })}
                    className="mb-5"
                  />
                )}

                {issue === "invalidRange" && (
                  <CustomOrderNotice
                    tone="error"
                    title={t("alertTitleInvalidRange")}
                    description={t("validationError")}
                    className="mb-5"
                  />
                )}

                {(issue === "noCuts" || issue === "cannotFulfill") && (
                  <CustomOrderNotice
                    tone="error"
                    title={t("alertTitleNoCuts")}
                    description={t("noSuitableCutsError", {
                      required: minimumMeters.toFixed(1),
                    })}
                    action={
                      <Link
                        href="/custom-order/fabric"
                        className="inline-flex [font-family:var(--font-ui)] text-[10px] uppercase tracking-[0.2em] text-rose-800 underline underline-offset-4 hover:opacity-70"
                      >
                        {t("backToFabric")}
                      </Link>
                    }
                    className="mb-5"
                  />
                )}

                {awaitingCutChoice && !issue && (
                  <CustomOrderNotice
                    tone="info"
                    title={t("selectCutPromptTitle")}
                    description={t("selectCutPrompt")}
                    className="mb-5"
                  />
                )}

                <label className="mb-3 flex items-center gap-2 [font-family:var(--font-ui)] text-[10px] uppercase tracking-[0.24em] text-black">
                  <Ruler className="h-3.5 w-3.5 text-amber-700" />
                  {usingOwnFabric ? t("inputLabel") : t("selectCutLabel")}
                </label>

                {itemCutOptions.length > 0 && (
                  <>
                    <div className="space-y-0 divide-y divide-[#E4E0D8] border-y border-[#E4E0D8] mb-3">
                      {itemCutOptions.map((cut) => {
                        const quantity = selections[cut._id] || 0;
                        const selected = quantity > 0;
                        const lengthMeters = cutValueToMeters(
                          cut.value,
                          cut.unit,
                        );
                        const canIncrease =
                          !requirementMet && quantity < cut.stock;
                        const cutPayload = {
                          _id: cut._id,
                          value: cut.value,
                          unit: cut.unit,
                        };

                        return (
                          <div
                            key={cut._id}
                            className={`py-4 ${
                              requirementMet && !selected ? "opacity-50" : ""
                            }`}
                          >
                            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                              <div className="min-w-0">
                                <p className="[font-family:var(--font-body)] text-sm font-medium text-black">
                                  {cutName(cut)} ({formatCutLabel(cut.value, cut.unit, locale)})
                                </p>
                                <p className="mt-1 [font-family:var(--font-ui)] text-[10px] uppercase tracking-[0.16em] text-(--color-grey-muted)">
                                  {t("cutStockLabel", { count: cut.stock })}
                                  {" · "}
                                  {lengthMeters.toFixed(2)} {t("meters")} /{" "}
                                  {t("pieceLabel")}
                                </p>
                              </div>

                              <div className="flex items-center gap-3">
                                <button
                                  type="button"
                                  onClick={() =>
                                    setLineItemCutQuantity(
                                      item.id,
                                      cutPayload,
                                      quantity - 1,
                                    )
                                  }
                                  disabled={quantity <= 0}
                                  className="w-8 h-8 border border-gray-300 rounded flex items-center justify-center transition hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed hover:cursor-pointer"
                                  aria-label={t("decreaseQuantity")}
                                >
                                  <span className="text-lg leading-none">−</span>
                                </button>
                                <span className="w-8 text-center text-sm [font-family:var(--font-body)] text-black">
                                  {quantity}
                                </span>
                                <button
                                  type="button"
                                  onClick={() =>
                                    setLineItemCutQuantity(
                                      item.id,
                                      cutPayload,
                                      quantity + 1,
                                    )
                                  }
                                  disabled={!canIncrease}
                                  title={
                                    requirementMet
                                      ? t("cutSelectionLockedHint")
                                      : quantity >= cut.stock
                                        ? t("cutStockLimitHint")
                                        : undefined
                                  }
                                  className="w-8 h-8 border border-gray-300 rounded flex items-center justify-center transition hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed hover:cursor-pointer"
                                  aria-label={t("increaseQuantity")}
                                >
                                  <span className="text-lg leading-none">+</span>
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {!usingOwnFabric && selectedCutIds.length > 0 && (
                      <p className="mb-2 [font-family:var(--font-body)] text-[13px] text-black">
                        {t("selectedLengthProgress", {
                          selected: selectedMeters.toFixed(1),
                          required: minimumMeters.toFixed(1),
                        })}
                      </p>
                    )}

                    {!usingOwnFabric && (
                      <p className="mb-4 [font-family:var(--font-body)] text-[12px] text-stone-500">
                        {requirementMet
                          ? t("cutsLockedLegend")
                          : t("cutsCombineLegend")}
                      </p>
                    )}
                  </>
                )}

                {usingOwnFabric && (
                  <div className="flex max-w-md items-center gap-3">
                    <input
                      type="number"
                      min={
                        item.fabricUnit === "war" || item.fabricUnit === "wara"
                          ? Number((2 / WAR_TO_METER).toFixed(2))
                          : 2
                      }
                      max={
                        item.fabricUnit === "war" || item.fabricUnit === "wara"
                          ? Number((7 / WAR_TO_METER).toFixed(2))
                          : 7
                      }
                      step="0.01"
                      inputMode="decimal"
                      value={metersValue}
                      onChange={(e) =>
                        handleMetersChange(item.id, e.target.value)
                      }
                      placeholder={t("inputPlaceholder")}
                      className={`flex-1 border bg-white px-4 py-3 [font-family:var(--font-body)] text-[14px] outline-none transition-colors ${
                        issue === "invalidRange" || issue === "tooShort"
                          ? "border-rose-300 ring-2 ring-rose-100"
                          : hasValidSelection
                            ? "border-emerald-300 ring-2 ring-emerald-50"
                            : "border-(--color-border) focus:border-black"
                      }`}
                    />

                    <select
                      value={item.fabricUnit}
                      onChange={(e) =>
                        handleUnitChange(
                          item.id,
                          e.target.value as FabricUnit,
                        )
                      }
                      className="shrink-0 border border-(--color-border) bg-white px-3 py-3 [font-family:var(--font-body)] text-[14px]"
                    >
                      <option value="meters">Meters</option>
                      <option value="war">War</option>
                    </select>
                  </div>

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

      {usingOwnFabric && (
        <div className="border border-(--color-border) bg-white p-6 max-w-2xl mb-10">
          <p className="[font-family:var(--font-body)] text-[14px] leading-relaxed text-(--color-grey-muted)">
            {t("ownFabricNote")}
          </p>
        </div>
      )}

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
