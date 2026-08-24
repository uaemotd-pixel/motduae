"use client";

import { useEffect, useState, FormEvent, FocusEvent } from "react";
import { useParams } from "next/navigation";
import { api, getApiErrorMessage } from "@/lib/api/client";
import FormField from "@/components/admin/FormField";
import ReadyMadePickupAddressFields from "@/components/admin/ReadyMadePickupAddressFields";
import toast from "react-hot-toast";
import { FormPageSkeleton } from "@/components/ui/Skeleton";
import {
  emptyShopPickupAddress,
  toUaeLocalPhoneDigits,
  type ShopPickupAddress,
} from "@/lib/fabricShop";
import { pickupAddressErrors } from "@/lib/readyMadeAdmin";

const TOAST_BASE = {
  position: "top-right" as const,
  duration: 6000,
  style: {
    fontFamily: "var(--font-body)",
    fontSize: "13px",
    letterSpacing: "0.04em",
    borderRadius: "0",
    padding: "14px 18px",
    maxWidth: "360px",
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

const translations = {
  en: {
    title: "Platform Settings",
    subtitle:
      "Manage global pricing defaults, per-parcel delivery fees, tailoring fees, MOTD commissions, VAT rate, and currency defaults.",
    deliveryFee: "Per-parcel delivery fee (AED)",
    tailoringFee: "Default Tailoring Fee (AED)",
    motdCommissionFromTailor: "MOTD Commission from Tailor (%)",
    motdCommissionFromFabricStore: "MOTD Commission from Fabric Store (%)",
    vatRate: "VAT Rate (%)",
    returnDeductionPercent: "Return Deduction (%)",
    returnAllowedDays: "Return Allowed Days",
    currency: "Currency",
    currencyHelp: "The primary base currency is locked to AED.",
    saveButton: "Save Settings",
    savingButton: "Saving Settings...",
    successMessage: "Changes Saved Successfully.",
    errorMessage: "Failed to update Changes.",
    loading: "Loading settings...",
    fulfillmentTitle: "MOTD fulfillment address",
    fulfillmentHelp:
      "Canonical warehouse for packing hops and last-mile pickup. Required before Shipa can create MOTD parcels.",
    validation: {
      deliveryFeeMin:
        "Per-parcel delivery fee must be a valid number greater than or equal to 0.",
      tailoringFeeMin:
        "Tailoring fee must be a valid number greater than or equal to 0.",
      motdCommissionFromTailorRange:
        "MOTD commission from tailor must be a valid percentage between 0% and 100%.",
      motdCommissionFromFabricStoreRange:
        "MOTD commission from fabric store must be a valid percentage between 0% and 100%.",
      vatRateRange: "VAT rate must be a valid percentage between 0% and 100%.",
      returnDeductionRange:
        "Return deduction percent must be a valid percentage between 0% and 100%.",
      returnAllowedDaysMin:
        "Return allowed days must be a valid number greater than or equal to 0.",
    },
  },
  ar: {
    title: "إعدادات المنصة",
    subtitle:
      "إدارة قيم التسعير الافتراضية العالمية، رسوم التوصيل لكل طرد، رسوم الخياطة، عمولات MOTD، ضريبة القيمة المضافة، والعملة الافتراضية.",
    deliveryFee: "رسوم التوصيل لكل طرد (درهم)",
    tailoringFee: "رسوم الخياطة الافتراضية (درهم)",
    motdCommissionFromTailor: "عمولة MOTD من الخياط (%)",
    motdCommissionFromFabricStore: "عمولة MOTD من متجر الأقمشة (%)",
    vatRate: "نسبة ضريبة القيمة المضافة (%)",
    returnDeductionPercent: "خصم الإرجاع (%)",
    returnAllowedDays: "عدد أيام الإرجاع المسموحة",
    currency: "العملة",
    currencyHelp: "العملة الأساسية مقفلة على الدرهم الإماراتي (AED).",
    saveButton: "حفظ الإعدادات",
    savingButton: "جاري حفظ الإعدادات...",
    successMessage: "تم حفظ وتحديث إعدادات المنصة العالمية بنجاح.",
    errorMessage: "فشل في تحديث إعدادات المنصة.",
    loading: "جاري تحميل الإعدادات...",
    fulfillmentTitle: "عنوان استيفاء MOTD",
    fulfillmentHelp:
      "عنوان المستودع المعتمد لرحلات التعبئة واستلام الميل الأخير. مطلوب قبل إنشاء طرود MOTD عبر شيبا.",
    validation: {
      deliveryFeeMin:
        "يجب أن تكون رسوم التوصيل لكل طرد قيمة صحيحة أكبر من أو تساوي 0.",
      tailoringFeeMin:
        "يجب أن تكون رسوم الخياطة قيمة صحيحة أكبر من أو تساوي 0.",
      motdCommissionFromTailorRange:
        "يجب أن تكون عمولة MOTD من الخياط نسبة بين 0% و 100%.",
      motdCommissionFromFabricStoreRange:
        "يجب أن تكون عمولة MOTD من متجر الأقمشة نسبة بين 0% و 100%.",
      vatRateRange: "يجب أن تكون نسبة ضريبة القيمة المضافة بين 0% و 100%.",
      returnDeductionRange: "يجب أن تكون نسبة خصم الإرجاع بين 0% و 100%.",
      returnAllowedDaysMin:
        "يجب أن يكون عدد أيام الإرجاع مسموحًا قيمة صحيحة أكبر من أو تساوي 0.",
    },
  },
};

function fulfillmentFromApi(
  address?: ShopPickupAddress | null,
): ShopPickupAddress {
  if (!address || typeof address !== "object") return emptyShopPickupAddress();
  return {
    fullName: address.fullName || "",
    phone: toUaeLocalPhoneDigits(address.phone),
    line1: address.line1 || "",
    line2: address.line2 || "",
    city: address.city || "",
    emirate: address.emirate || "",
  };
}

function isFulfillmentEmpty(address: ShopPickupAddress): boolean {
  return (
    !address.fullName.trim() &&
    !address.phone.trim() &&
    !address.line1.trim() &&
    !address.line2.trim() &&
    !address.city.trim() &&
    !address.emirate.trim()
  );
}

function parseNonNegativeNumber(raw: string): number | null {
  const trimmed = raw.trim();
  if (
    trimmed === "" ||
    trimmed === "-" ||
    trimmed === "." ||
    trimmed === "-."
  ) {
    return null;
  }
  const value = Number(trimmed);
  if (!Number.isFinite(value) || value < 0) {
    return null;
  }
  return value;
}

type PlatformSettingsPayload = {
  defaultDeliveryFee?: number;
  perParcelDeliveryFee?: number;
  defaultTailoringFee: number;
  motdCommissionFromTailor: number;
  motdCommissionFromFabricStore: number;
  vatRate: number;
  returnDeductionPercent: number;
  returnAllowedDays: number;
  currency: string;
  fulfillmentAddress?: ShopPickupAddress;
};

export default function AdminSettingsGeneralPage() {
  const params = useParams();
  const locale = (params.locale as string) || "en";
  const t =
    translations[locale as keyof typeof translations] || translations.en;

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  // Input states (stored as string for better user typing experience)
  const [deliveryFee, setDeliveryFee] = useState<string>("0");
  const [tailoringFee, setTailoringFee] = useState<string>("0");
  const [motdCommissionFromTailor, setMotdCommissionFromTailor] =
    useState<string>("0");
  const [motdCommissionFromFabricStore, setMotdCommissionFromFabricStore] =
    useState<string>("15");
  const [vatRatePercent, setVatRatePercent] = useState<string>("5");
  const [returnDeductionPercent, setReturnDeductionPercent] =
    useState<string>("0");
  const [returnAllowedDays, setReturnAllowedDays] = useState<string>("0");
  const [currency, setCurrency] = useState<string>("AED");
  const [fulfillmentAddress, setFulfillmentAddress] =
    useState<ShopPickupAddress>(emptyShopPickupAddress());

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        setLoading(true);
        const data = await api.get<PlatformSettingsPayload>(
          "/api/admin/settings",
        );

        const parcelFee =
          data.perParcelDeliveryFee ?? data.defaultDeliveryFee ?? 30;
        setDeliveryFee(parcelFee.toString());
        setTailoringFee(data.defaultTailoringFee.toString());
        setMotdCommissionFromTailor(
          (data.motdCommissionFromTailor ?? 0).toString(),
        );
        setMotdCommissionFromFabricStore(
          (data.motdCommissionFromFabricStore ?? 0).toString(),
        );
        setVatRatePercent((data.vatRate * 100).toString());
        setReturnDeductionPercent(
          (data.returnDeductionPercent ?? 0).toString(),
        );
        setReturnAllowedDays((data.returnAllowedDays ?? 0).toString());
        setCurrency(data.currency || "AED");
        setFulfillmentAddress(fulfillmentFromApi(data.fulfillmentAddress));
      } catch (err: unknown) {
        toast.error(getApiErrorMessage(err, t.errorMessage), ERROR_TOAST);
      } finally {
        setLoading(false);
      }
    };

    fetchSettings();
  }, [locale]);

  const getNumericFieldError = (
    field: string,
    val: string,
    options?: { allowEmpty?: boolean },
  ): string => {
    const trimmed = val.trim();
    if (options?.allowEmpty && trimmed === "") {
      return "";
    }

    const parsed = parseNonNegativeNumber(val);

    if (field === "deliveryFee") {
      return parsed === null ? t.validation.deliveryFeeMin : "";
    }
    if (field === "tailoringFee") {
      return parsed === null ? t.validation.tailoringFeeMin : "";
    }
    if (field === "motdCommissionFromTailor") {
      return parsed === null || parsed > 100
        ? t.validation.motdCommissionFromTailorRange
        : "";
    }
    if (field === "motdCommissionFromFabricStore") {
      return parsed === null || parsed > 100
        ? t.validation.motdCommissionFromFabricStoreRange
        : "";
    }
    if (field === "vatRatePercent") {
      return parsed === null || parsed > 100 ? t.validation.vatRateRange : "";
    }
    if (field === "returnDeductionPercent") {
      return parsed === null || parsed > 100
        ? t.validation.returnDeductionRange
        : "";
    }
    if (field === "returnAllowedDays") {
      return parsed === null || !Number.isInteger(parsed)
        ? t.validation.returnAllowedDaysMin
        : "";
    }
    return "";
  };

  const setNumericFieldValue = (field: string, val: string) => {
    if (field === "deliveryFee") setDeliveryFee(val);
    if (field === "tailoringFee") setTailoringFee(val);
    if (field === "motdCommissionFromTailor") setMotdCommissionFromTailor(val);
    if (field === "motdCommissionFromFabricStore")
      setMotdCommissionFromFabricStore(val);
    if (field === "vatRatePercent") setVatRatePercent(val);
    if (field === "returnDeductionPercent") setReturnDeductionPercent(val);
    if (field === "returnAllowedDays") setReturnAllowedDays(val);
  };

  const handleChange = (field: string, val: string) => {
    setNumericFieldValue(field, val);

    const error = getNumericFieldError(field, val, { allowEmpty: true });
    setFieldErrors((prev) => {
      if (!error && !prev[field]) return prev;
      if (!error) {
        const next = { ...prev };
        delete next[field];
        return next;
      }
      return { ...prev, [field]: error };
    });
  };

  const handleNumericFocus = (
    e: FocusEvent<HTMLInputElement>,
    field: string,
    currentValue: string,
  ) => {
    // Clear a lone zero so typing starts fresh instead of becoming "05".
    if (currentValue.trim() === "0") {
      setNumericFieldValue(field, "");
      setFieldErrors((prev) => {
        if (!prev[field]) return prev;
        const next = { ...prev };
        delete next[field];
        return next;
      });
      return;
    }
    e.target.select();
  };

  const handleNumericBlur = (field: string, currentValue: string) => {
    const error = getNumericFieldError(field, currentValue);
    setFieldErrors((prev) => {
      if (!error && !prev[field]) return prev;
      if (!error) {
        const next = { ...prev };
        delete next[field];
        return next;
      }
      return { ...prev, [field]: error };
    });
  };

  const validate = (): boolean => {
    const errors: Record<string, string> = {};

    const numericFields: Array<[string, string]> = [
      ["deliveryFee", deliveryFee],
      ["tailoringFee", tailoringFee],
      ["motdCommissionFromTailor", motdCommissionFromTailor],
      ["motdCommissionFromFabricStore", motdCommissionFromFabricStore],
      ["vatRatePercent", vatRatePercent],
      ["returnDeductionPercent", returnDeductionPercent],
      ["returnAllowedDays", returnAllowedDays],
    ];

    for (const [field, value] of numericFields) {
      const error = getNumericFieldError(field, value);
      if (error) errors[field] = error;
    }

    if (!isFulfillmentEmpty(fulfillmentAddress)) {
      Object.assign(errors, pickupAddressErrors(fulfillmentAddress));
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!validate()) return;

    setSubmitting(true);
    try {
      const payload = {
        perParcelDeliveryFee: parseFloat(deliveryFee),
        defaultDeliveryFee: parseFloat(deliveryFee),
        defaultTailoringFee: parseFloat(tailoringFee),
        motdCommissionFromTailor: parseFloat(motdCommissionFromTailor),
        motdCommissionFromFabricStore: parseFloat(
          motdCommissionFromFabricStore,
        ),
        vatRate: parseFloat(vatRatePercent) / 100,
        returnDeductionPercent: parseFloat(returnDeductionPercent),
        returnAllowedDays: parseFloat(returnAllowedDays),
        currency,
        fulfillmentAddress,
      };

      const response = await api.put<{
        message: string;
        settings: PlatformSettingsPayload;
      }>("/api/admin/settings", payload);

      const saved = response.settings;
      const parcelFee =
        saved.perParcelDeliveryFee ?? saved.defaultDeliveryFee ?? 30;
      setDeliveryFee(parcelFee.toString());
      setTailoringFee(saved.defaultTailoringFee.toString());
      setMotdCommissionFromTailor(
        (saved.motdCommissionFromTailor ?? 0).toString(),
      );
      setMotdCommissionFromFabricStore(
        (saved.motdCommissionFromFabricStore ?? 0).toString(),
      );
      setVatRatePercent((saved.vatRate * 100).toString());
      setReturnDeductionPercent((saved.returnDeductionPercent ?? 0).toString());
      setReturnAllowedDays((saved.returnAllowedDays ?? 0).toString());
      setCurrency(saved.currency || "AED");
      setFulfillmentAddress(fulfillmentFromApi(saved.fulfillmentAddress));
      toast.success(t.successMessage, SUCCESS_TOAST);
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, t.errorMessage), ERROR_TOAST);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <FormPageSkeleton fields={4} />;
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-light text-black tracking-tight">
          {t.title}
        </h1>
        <p className="text-gray-500 text-sm mt-1">{t.subtitle}</p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField
            label={t.deliveryFee}
            name="deliveryFee"
            required
            error={fieldErrors.deliveryFee}
          >
            <input
              type="number"
              step="0.01"
              min="0"
              inputMode="decimal"
              value={deliveryFee}
              onChange={(e) => handleChange("deliveryFee", e.target.value)}
              onFocus={(e) =>
                handleNumericFocus(e, "deliveryFee", deliveryFee)
              }
              onBlur={() => handleNumericBlur("deliveryFee", deliveryFee)}
              aria-invalid={Boolean(fieldErrors.deliveryFee)}
              className={`w-full py-1 border-b focus:outline-none text-sm text-black ${
                fieldErrors.deliveryFee
                  ? "border-red-500 focus:border-red-500"
                  : "border-gray-300 focus:border-black"
              }`}
            />
          </FormField>

          <FormField
            label={t.tailoringFee}
            name="tailoringFee"
            required
            error={fieldErrors.tailoringFee}
          >
            <input
              type="number"
              step="1"
              min="0"
              inputMode="numeric"
              value={tailoringFee}
              onChange={(e) => handleChange("tailoringFee", e.target.value)}
              onFocus={(e) =>
                handleNumericFocus(e, "tailoringFee", tailoringFee)
              }
              onBlur={() => handleNumericBlur("tailoringFee", tailoringFee)}
              aria-invalid={Boolean(fieldErrors.tailoringFee)}
              className={`w-full py-1 border-b focus:outline-none text-sm text-black ${
                fieldErrors.tailoringFee
                  ? "border-red-500 focus:border-red-500"
                  : "border-gray-300 focus:border-black"
              }`}
            />
          </FormField>

          <FormField
            label={t.motdCommissionFromTailor}
            name="motdCommissionFromTailor"
            required
            error={fieldErrors.motdCommissionFromTailor}
          >
            <input
              type="number"
              step="0.01"
              min="0"
              max="100"
              inputMode="decimal"
              value={motdCommissionFromTailor}
              onChange={(e) =>
                handleChange("motdCommissionFromTailor", e.target.value)
              }
              onFocus={(e) =>
                handleNumericFocus(
                  e,
                  "motdCommissionFromTailor",
                  motdCommissionFromTailor,
                )
              }
              onBlur={() =>
                handleNumericBlur(
                  "motdCommissionFromTailor",
                  motdCommissionFromTailor,
                )
              }
              aria-invalid={Boolean(fieldErrors.motdCommissionFromTailor)}
              className={`w-full py-1 border-b focus:outline-none text-sm text-black ${
                fieldErrors.motdCommissionFromTailor
                  ? "border-red-500 focus:border-red-500"
                  : "border-gray-300 focus:border-black"
              }`}
            />
          </FormField>

          <FormField
            label={t.motdCommissionFromFabricStore}
            name="motdCommissionFromFabricStore"
            required
            error={fieldErrors.motdCommissionFromFabricStore}
          >
            <input
              type="number"
              step="0.01"
              min="0"
              max="100"
              inputMode="decimal"
              value={motdCommissionFromFabricStore}
              onChange={(e) =>
                handleChange("motdCommissionFromFabricStore", e.target.value)
              }
              onFocus={(e) =>
                handleNumericFocus(
                  e,
                  "motdCommissionFromFabricStore",
                  motdCommissionFromFabricStore,
                )
              }
              onBlur={() =>
                handleNumericBlur(
                  "motdCommissionFromFabricStore",
                  motdCommissionFromFabricStore,
                )
              }
              aria-invalid={Boolean(fieldErrors.motdCommissionFromFabricStore)}
              className={`w-full py-1 border-b focus:outline-none text-sm text-black ${
                fieldErrors.motdCommissionFromFabricStore
                  ? "border-red-500 focus:border-red-500"
                  : "border-gray-300 focus:border-black"
              }`}
            />
          </FormField>

          <FormField
            label={t.vatRate}
            name="vatRatePercent"
            required
            error={fieldErrors.vatRatePercent}
          >
            <input
              type="number"
              step="0.01"
              min="0"
              max="100"
              inputMode="decimal"
              value={vatRatePercent}
              onChange={(e) => handleChange("vatRatePercent", e.target.value)}
              onFocus={(e) =>
                handleNumericFocus(e, "vatRatePercent", vatRatePercent)
              }
              onBlur={() =>
                handleNumericBlur("vatRatePercent", vatRatePercent)
              }
              aria-invalid={Boolean(fieldErrors.vatRatePercent)}
              className={`w-full py-1 border-b focus:outline-none text-sm text-black ${
                fieldErrors.vatRatePercent
                  ? "border-red-500 focus:border-red-500"
                  : "border-gray-300 focus:border-black"
              }`}
            />
          </FormField>

          <FormField
            label={t.returnDeductionPercent}
            name="returnDeductionPercent"
            required
            error={fieldErrors.returnDeductionPercent}
          >
            <input
              type="number"
              step="0.01"
              min="0"
              max="100"
              inputMode="decimal"
              value={returnDeductionPercent}
              onChange={(e) =>
                handleChange("returnDeductionPercent", e.target.value)
              }
              onFocus={(e) =>
                handleNumericFocus(
                  e,
                  "returnDeductionPercent",
                  returnDeductionPercent,
                )
              }
              onBlur={() =>
                handleNumericBlur(
                  "returnDeductionPercent",
                  returnDeductionPercent,
                )
              }
              aria-invalid={Boolean(fieldErrors.returnDeductionPercent)}
              className={`w-full py-1 border-b focus:outline-none text-sm text-black ${
                fieldErrors.returnDeductionPercent
                  ? "border-red-500 focus:border-red-500"
                  : "border-gray-300 focus:border-black"
              }`}
            />
          </FormField>

          <FormField
            label={t.returnAllowedDays}
            name="returnAllowedDays"
            required
            error={fieldErrors.returnAllowedDays}
          >
            <input
              type="number"
              step="1"
              min="0"
              inputMode="numeric"
              value={returnAllowedDays}
              onChange={(e) =>
                handleChange("returnAllowedDays", e.target.value)
              }
              onFocus={(e) =>
                handleNumericFocus(e, "returnAllowedDays", returnAllowedDays)
              }
              onBlur={() =>
                handleNumericBlur("returnAllowedDays", returnAllowedDays)
              }
              aria-invalid={Boolean(fieldErrors.returnAllowedDays)}
              className={`w-full py-1 border-b focus:outline-none text-sm text-black ${
                fieldErrors.returnAllowedDays
                  ? "border-red-500 focus:border-red-500"
                  : "border-gray-300 focus:border-black"
              }`}
            />
          </FormField>

          <div className="md:col-span-2">
            <FormField label={t.currency} name="currency" hint={t.currencyHelp}>
              <input
                type="text"
                value={currency}
                readOnly
                className="w-full py-1 border-b border-gray-200 bg-gray-50 text-gray-500 focus:outline-none text-sm cursor-not-allowed"
              />
            </FormField>
          </div>
        </div>

        <div className="pt-6 mt-6 border-t border-gray-100">
          <ReadyMadePickupAddressFields
            value={fulfillmentAddress}
            onChange={(next) => {
              setFulfillmentAddress(next);
              setFieldErrors((prev) => {
                const nextErrors = { ...prev };
                delete nextErrors["pickupAddress.fullName"];
                delete nextErrors["pickupAddress.phone"];
                delete nextErrors["pickupAddress.line1"];
                delete nextErrors["pickupAddress.line2"];
                delete nextErrors["pickupAddress.city"];
                delete nextErrors["pickupAddress.emirate"];
                return nextErrors;
              });
            }}
            fieldErrors={fieldErrors}
            title={t.fulfillmentTitle}
            description={t.fulfillmentHelp}
          />
        </div>

        <div className="flex gap-3 pt-6 mt-6 border-t border-gray-100">
          <button
            type="submit"
            disabled={submitting}
            className="px-6 py-2 bg-black text-white rounded-lg hover:bg-gray-800 transition disabled:opacity-50 text-sm font-medium hover:cursor-pointer"
          >
            {submitting ? t.savingButton : t.saveButton}
          </button>
        </div>
      </form>
    </div>
  );
}
