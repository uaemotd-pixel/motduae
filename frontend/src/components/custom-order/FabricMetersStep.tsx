"use client";

import { useEffect, useState } from "react";
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

  const selectedDesign = draft.selectedDesigns[0] ?? null;
  const selectedFabric = draft.selectedFabrics[0] ?? null;
  const designMinLength = selectedDesign ? getDesignMinCutLength(selectedDesign) : 0;
  const fabricMaxCut = selectedFabric ? getFabricMaxCutLength(selectedFabric) : 0;
  const needsSecondCutHint =
    !usingOwnFabric &&
    selectedFabric &&
    fabricMaxCut > 0 &&
    designMinLength > 0 &&
    designMinLength > fabricMaxCut;

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

      {needsSecondCutHint && (
        <div className="mb-8 p-4 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-3">
          <span className="text-lg shrink-0">💡</span>
          <p className="[font-family:var(--font-ui)] text-xs text-amber-950 font-medium leading-relaxed">
            {t("designLengthHint", { min: designMinLength })}
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
