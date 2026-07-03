"use client";

import { useEffect, useState, FormEvent } from "react";
import { useParams, useRouter } from "next/navigation";
import { api, getApiErrorMessage } from "@/lib/api/client";
import FormField from "@/components/admin/FormField";
import toast from "react-hot-toast";
import PermissionGuard from "@/lib/auth/PermissionGuard";

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
      "Manage global pricing defaults, delivery fees, tailoring fees, VAT rate, and currency defaults.",
    deliveryFee: "Default Delivery Fee (AED)",
    tailoringFee: "Default Tailoring Fee (AED)",
    platformFee: "Platform Fee (AED)",
    vatRate: "VAT Rate (%)",
    currency: "Currency",
    currencyHelp: "The primary base currency is locked to AED.",
    saveButton: "Save Settings",
    savingButton: "Saving Settings...",
    successMessage: "Changes Saved Successfully.",
    errorMessage: "Failed to update Changes.",
    loading: "Loading settings...",
    validation: {
      deliveryFeeMin:
        "Delivery fee must be a valid number greater than or equal to 0.",
      tailoringFeeMin:
        "Tailoring fee must be a valid number greater than or equal to 0.",
      platformFeeMin:
        "Platform fee must be a valid number greater than or equal to 0.",
      vatRateRange: "VAT rate must be a valid percentage between 0% and 100%.",
    },
  },
  ar: {
    title: "إعدادات المنصة",
    subtitle:
      "إدارة قيم التسعير الافتراضية العالمية، رسوم التوصيل، رسوم الخياطة، ضريبة القيمة المضافة، والعملة الافتراضية.",
    deliveryFee: "رسوم التوصيل الافتراضية (درهم)",
    tailoringFee: "رسوم الخياطة الافتراضية (درهم)",
    platformFee: "رسوم المنصة (درهم)",
    vatRate: "نسبة ضريبة القيمة المضافة (%)",
    currency: "العملة",
    currencyHelp: "العملة الأساسية مقفلة على الدرهم الإماراتي (AED).",
    saveButton: "حفظ الإعدادات",
    savingButton: "جاري حفظ الإعدادات...",
    successMessage: "تم حفظ وتحديث إعدادات المنصة العالمية بنجاح.",
    errorMessage: "فشل في تحديث إعدادات المنصة.",
    loading: "جاري تحميل الإعدادات...",
    validation: {
      deliveryFeeMin: "يجب أن تكون رسوم التوصيل قيمة صحيحة أكبر من أو تساوي 0.",
      tailoringFeeMin:
        "يجب أن تكون رسوم الخياطة قيمة صحيحة أكبر من أو تساوي 0.",
      platformFeeMin: "يجب أن تكون رسوم المنصة قيمة صحيحة أكبر من أو تساوي 0.",
      vatRateRange: "يجب أن تكون نسبة ضريبة القيمة المضافة بين 0% و 100%.",
    },
  },
};

export default function AdminSettingsPage() {
  const params = useParams();
  const router = useRouter();
  const locale = (params.locale as string) || "en";
  const t =
    translations[locale as keyof typeof translations] || translations.en;

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  // Input states (stored as string for better user typing experience)
  const [deliveryFee, setDeliveryFee] = useState<string>("0");
  const [tailoringFee, setTailoringFee] = useState<string>("0");
  const [platformFee, setPlatformFee] = useState<string>("0");
  const [vatRatePercent, setVatRatePercent] = useState<string>("5");
  const [currency, setCurrency] = useState<string>("AED");

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        setLoading(true);
        const data = await api.get<{
          defaultDeliveryFee: number;
          defaultTailoringFee: number;
          platformFee: number;
          vatRate: number;
          currency: string;
        }>("/api/admin/settings");

        setDeliveryFee(data.defaultDeliveryFee.toString());
        setTailoringFee(data.defaultTailoringFee.toString());
        setPlatformFee(data.platformFee.toString());
        setVatRatePercent((data.vatRate * 100).toString());
        setCurrency(data.currency || "AED");
      } catch (err: unknown) {
        toast.error(getApiErrorMessage(err, t.errorMessage), ERROR_TOAST);
      } finally {
        setLoading(false);
      }
    };

    fetchSettings();
  }, [locale]);

  const handleChange = (field: string, val: string) => {
    if (field === "deliveryFee") setDeliveryFee(val);
    if (field === "tailoringFee") setTailoringFee(val);
    if (field === "platformFee") setPlatformFee(val);
    if (field === "vatRatePercent") setVatRatePercent(val);

    if (fieldErrors[field]) {
      setFieldErrors((prev) => ({ ...prev, [field]: "" }));
    }
  };

  const validate = (): boolean => {
    const errors: Record<string, string> = {};

    const delFee = parseFloat(deliveryFee);
    const tailFee = parseFloat(tailoringFee);
    const platFee = parseFloat(platformFee);
    const vat = parseFloat(vatRatePercent);

    if (isNaN(delFee) || delFee < 0) {
      errors.deliveryFee = t.validation.deliveryFeeMin;
    }
    if (isNaN(tailFee) || tailFee < 0) {
      errors.tailoringFee = t.validation.tailoringFeeMin;
    }
    if (isNaN(platFee) || platFee < 0) {
      errors.platformFee = t.validation.platformFeeMin;
    }
    if (isNaN(vat) || vat < 0 || vat > 100) {
      errors.vatRatePercent = t.validation.vatRateRange;
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
        defaultDeliveryFee: parseFloat(deliveryFee),
        defaultTailoringFee: parseFloat(tailoringFee),
        platformFee: parseFloat(platformFee),
        vatRate: parseFloat(vatRatePercent) / 100,
        currency,
      };

      const response = await api.put<{
        message: string;
        settings: {
          defaultDeliveryFee: number;
          defaultTailoringFee: number;
          platformFee: number;
          vatRate: number;
          currency: string;
        };
      }>("/api/admin/settings", payload);

      toast.success(t.successMessage, SUCCESS_TOAST);

      // Update with exact response numbers from the server just in case
      if (response && response.settings) {
        setDeliveryFee(response.settings.defaultDeliveryFee.toString());
        setTailoringFee(response.settings.defaultTailoringFee.toString());
        setPlatformFee(response.settings.platformFee.toString());
        setVatRatePercent((response.settings.vatRate * 100).toString());
        setCurrency(response.settings.currency || "AED");
      }
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, t.errorMessage), ERROR_TOAST);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6 max-w-4xl mx-auto">
        <div className="animate-pulse">
          <div className="h-8 w-48 bg-gray-200 rounded mb-2"></div>
          <div className="h-4 w-96 bg-gray-200 rounded mb-8"></div>
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="space-y-2">
                <div className="h-4 w-24 bg-gray-200 rounded"></div>
                <div className="h-10 bg-gray-100 rounded w-full"></div>
              </div>
            ))}
            <div className="h-10 w-32 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <PermissionGuard requiredPerm="settings">
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
                value={deliveryFee}
                onChange={(e) => handleChange("deliveryFee", e.target.value)}
                className="w-full py-1 border-b border-gray-300 focus:border-black focus:outline-none text-sm text-black"
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
                value={tailoringFee}
                onChange={(e) => handleChange("tailoringFee", e.target.value)}
                className="w-full py-1 border-b border-gray-300 focus:border-black focus:outline-none text-sm text-black"
              />
            </FormField>

            <FormField
              label={t.platformFee}
              name="platformFee"
              required
              error={fieldErrors.platformFee}
            >
              <input
                type="number"
                step="0.01"
                min="0"
                value={platformFee}
                onChange={(e) => handleChange("platformFee", e.target.value)}
                className="w-full py-1 border-b border-gray-300 focus:border-black focus:outline-none text-sm text-black"
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
                value={vatRatePercent}
                onChange={(e) => handleChange("vatRatePercent", e.target.value)}
                className="w-full py-1 border-b border-gray-300 focus:border-black focus:outline-none text-sm text-black"
              />
            </FormField>

            <div className="md:col-span-2">
              <FormField
                label={t.currency}
                name="currency"
                hint={t.currencyHelp}
              >
                <input
                  type="text"
                  value={currency}
                  readOnly
                  className="w-full py-1 border-b border-gray-200 bg-gray-50 text-gray-500 focus:outline-none text-sm cursor-not-allowed"
                />
              </FormField>
            </div>
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
    </PermissionGuard>
  );
}
