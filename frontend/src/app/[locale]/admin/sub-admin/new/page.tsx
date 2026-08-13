// app/[locale]/admin/sub-admin/create/page.tsx
"use client";

import { useState, FormEvent, useRef, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { api } from "@/lib/api/client";
import FormField from "@/components/admin/FormField";
import toast from "react-hot-toast";
import { Eye, EyeOff } from "lucide-react";
import {
  isValidUaePhone,
  normalizeUaePhone,
  extractDigits,
} from "@/lib/uaePhone";
import {
  UAE_EMIRATES,
  isValidEmirate,
  normalizeEmirate,
  getEmirateEn,
  getEmirateAr,
} from "@/lib/uaeAddress";

interface SubAdminForm {
  name: string;
  email: string;
  password: string;
  phone: string;
  addressName: string;
  addressPhone: string;
  emirate: string;
  city: string;
  street: string;
  building: string;
  postalCode: string;
  perms: {
    customers: boolean;
    readyMade: boolean;
    fabrics: boolean;
    tailors: boolean;
    orders: boolean;
    partners: boolean;
    settings: boolean;
  };
}

export default function CreateSubAdminPage() {
  const router = useRouter();
  const params = useParams();
  const locale = (params.locale as string) || "en";
  const [loading, setLoading] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [showPassword, setShowPassword] = useState(false);
  const [openEmirate, setOpenEmirate] = useState(false);
  const emirateRef = useRef<HTMLDivElement>(null);

  const [form, setForm] = useState<SubAdminForm>({
    name: "",
    email: "",
    password: "",
    phone: "",
    addressName: "",
    addressPhone: "",
    emirate: "",
    city: "",
    street: "",
    building: "",
    postalCode: "",
    perms: {
      customers: false,
      readyMade: false,
      fabrics: false,
      tailors: false,
      orders: false,
      partners: false,
      settings: false,
    },
  });

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        emirateRef.current &&
        !emirateRef.current.contains(event.target as Node)
      ) {
        setOpenEmirate(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const SelectTrigger = ({ onClick }: { onClick: () => void }) => (
    <button
      type="button"
      onClick={onClick}
      className="w-full py-1 border-b border-gray-300 focus:border-black text-left bg-transparent text-xs sm:text-[14px] flex items-center justify-between hover:cursor-pointer"
    >
      <span className={form.emirate ? "text-black" : "text-gray-400"}>
        {form.emirate
          ? `${getEmirateEn(form.emirate)} / ${getEmirateAr(form.emirate)}`
          : "Select emirate"}
      </span>
      <span className="text-gray-400">▾</span>
    </button>
  );

  const getPhoneDisplayValue = (phone: string): string => {
    if (!phone) return "";
    const digits = extractDigits(phone);
    if (digits.startsWith("971")) {
      return digits.slice(3);
    }
    return digits.slice(0, 9);
  };

  const handlePhoneChange = (
    field: "phone" | "addressPhone",
    value: string,
  ) => {
    const digits = extractDigits(value);
    if (digits.length <= 9) {
      const normalized = normalizeUaePhone(digits);

      if (field === "phone") {
        setForm({ ...form, phone: normalized });
      } else {
        setForm({ ...form, addressPhone: normalized });
      }

      if (fieldErrors[field]) {
        setFieldErrors({ ...fieldErrors, [field]: "" });
      }
    }
  };

  const validate = (): boolean => {
    const errors: Record<string, string> = {};

    if (!form.name.trim()) errors.name = "Full name is required";
    if (!form.email.trim()) errors.email = "Email is required";
    if (!form.password.trim()) errors.password = "Password is required";
    if (form.password.length < 6)
      errors.password = "Password must be at least 6 characters";

    if (!form.phone || form.phone === "") {
      errors.phone = "Phone number is required";
    } else if (!isValidUaePhone(form.phone)) {
      errors.phone = "Invalid UAE phone. Must be +971 followed by 9 digits";
    }

    if (form.addressPhone && !isValidUaePhone(form.addressPhone)) {
      errors.addressPhone =
        "Invalid UAE phone for address. Must be +971 followed by 9 digits";
    }

    // Validate emirate using uaeAddress
    if (!form.emirate) {
      errors.emirate = "Emirate is required";
    } else if (!isValidEmirate(form.emirate)) {
      errors.emirate = "Valid UAE emirate required";
    }
    if (!form.city.trim()) errors.city = "City is required";

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    setFieldErrors({});

    try {
      const normalizedEmirate = normalizeEmirate(form.emirate);

      const payload = {
        name: form.name.trim(),
        email: form.email.trim(),
        password: form.password,
        phone: normalizeUaePhone(form.phone),
        address: {
          name: form.addressName.trim(),
          phone: form.addressPhone ? normalizeUaePhone(form.addressPhone) : "",
          emirate: normalizedEmirate,
          city: form.city.trim(),
          street: form.street.trim(),
          building: form.building.trim(),
          postalCode: form.postalCode.trim(),
        },
        perms: form.perms,
      };

      await api.post("/api/subadmins", payload);
      toast.success("Sub-admin created successfully");
      router.push(`/${locale}/admin/sub-admin`);
    } catch (err) {
      const errorMessage =
        err && typeof err === "object" && "message" in err
          ? (err as any).message
          : "Failed to create sub-admin";
      toast.error(errorMessage as string);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 p-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-light text-black tracking-tight">
          Create Sub‑Admin
        </h1>
        <p className="text-gray-500 text-sm mt-1">
          Add a new sub‑administrator with specific permissions
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField label="Full Name" required error={fieldErrors.name}>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="John Doe"
              className="w-full py-1 border-b border-gray-300 focus:border-black outline-none"
            />
          </FormField>

          <FormField label="Email" required error={fieldErrors.email}>
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="john@example.com"
              className="w-full py-1 border-b border-gray-300 focus:border-black outline-none"
            />
          </FormField>

          <FormField label="Password" required error={fieldErrors.password}>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                placeholder="••••••••"
                className="w-full py-1 border-b border-gray-300 focus:border-black outline-none pr-8"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-0 top-1/2 -translate-y-1/2 text-gray-400 hover:text-black transition"
              >
                {showPassword ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>
          </FormField>

          <FormField label="Phone" required error={fieldErrors.phone}>
            <div className="relative">
              <span className="absolute left-0 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none">
                +971
              </span>
              <input
                type="tel"
                inputMode="numeric"
                value={getPhoneDisplayValue(form.phone)}
                onChange={(e) => handlePhoneChange("phone", e.target.value)}
                placeholder="50 123 4567"
                maxLength={9}
                className="w-full py-1 border-b border-gray-300 focus:border-black outline-none pl-12"
              />
            </div>
          </FormField>

          <div className="md:col-span-2">
            <h3 className="text-sm font-medium text-gray-700 mb-3">
              Address Details
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField label="Full Name">
                <input
                  type="text"
                  value={form.addressName}
                  onChange={(e) =>
                    setForm({ ...form, addressName: e.target.value })
                  }
                  placeholder="John Doe"
                  className="w-full py-1 border-b border-gray-300 focus:border-black outline-none"
                />
              </FormField>

              <FormField label="Phone" error={fieldErrors.addressPhone}>
                <div className="relative">
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none">
                    +971
                  </span>
                  <input
                    type="tel"
                    inputMode="numeric"
                    value={getPhoneDisplayValue(form.addressPhone)}
                    onChange={(e) =>
                      handlePhoneChange("addressPhone", e.target.value)
                    }
                    placeholder="50 123 4567"
                    maxLength={9}
                    className="w-full py-1 border-b border-gray-300 focus:border-black outline-none pl-12"
                  />
                </div>
              </FormField>

              <FormField label="Emirate" required error={fieldErrors.emirate}>
                <div className="relative" ref={emirateRef}>
                  <SelectTrigger onClick={() => setOpenEmirate(!openEmirate)} />
                  {openEmirate && (
                    <div className="absolute left-0 right-0 mt-2 bg-white rounded-xl shadow-lg border border-gray-200 max-h-60 overflow-y-auto py-1 z-50">
                      <button
                        type="button"
                        onClick={() => {
                          setForm({ ...form, emirate: "" });
                          setOpenEmirate(false);
                        }}
                        className="w-full px-3 sm:px-4 py-1.5 text-left text-xs sm:text-sm hover:bg-gray-100"
                      >
                        Select emirate
                      </button>
                      {UAE_EMIRATES.map((emirate) => (
                        <button
                          key={emirate.value}
                          type="button"
                          onClick={() => {
                            setForm({ ...form, emirate: emirate.value });
                            setOpenEmirate(false);
                          }}
                          className="w-full px-3 sm:px-4 py-1.5 text-left text-xs sm:text-sm hover:bg-gray-100"
                        >
                          {emirate.en} / {emirate.ar}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </FormField>

              <FormField label="City" required error={fieldErrors.city}>
                <input
                  type="text"
                  value={form.city}
                  onChange={(e) => setForm({ ...form, city: e.target.value })}
                  placeholder="Dubai"
                  className="w-full py-1 border-b border-gray-300 focus:border-black outline-none"
                />
              </FormField>

              <FormField label="Street">
                <input
                  type="text"
                  value={form.street}
                  onChange={(e) => setForm({ ...form, street: e.target.value })}
                  placeholder="Sheikh Zayed Road"
                  className="w-full py-1 border-b border-gray-300 focus:border-black outline-none"
                />
              </FormField>

              <FormField label="Building">
                <input
                  type="text"
                  value={form.building}
                  onChange={(e) =>
                    setForm({ ...form, building: e.target.value })
                  }
                  placeholder="Burj Khalifa"
                  className="w-full py-1 border-b border-gray-300 focus:border-black outline-none"
                />
              </FormField>

              <FormField label="Postal Code">
                <input
                  type="text"
                  value={form.postalCode}
                  onChange={(e) =>
                    setForm({ ...form, postalCode: e.target.value })
                  }
                  placeholder="12345"
                  className="w-full py-1 border-b border-gray-300 focus:border-black outline-none"
                />
              </FormField>
            </div>
          </div>

          <div className="md:col-span-2">
            <label className="block text-xs uppercase tracking-widest text-gray-500 mb-3">
              Permissions
            </label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {Object.entries(form.perms).map(([key, value]) => (
                <label
                  key={key}
                  className="flex items-center gap-2 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={value}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        perms: { ...form.perms, [key]: e.target.checked },
                      })
                    }
                    className="accent-black w-4 h-4"
                  />
                  <span className="text-sm capitalize">{key}</span>
                </label>
              ))}
            </div>
          </div>
        </div>

        <div className="flex flex-row-reverse gap-3 pt-6 mt-3 border-t border-gray-100">
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2 bg-black text-white rounded-lg hover:cursor-pointer disabled:opacity-50"
          >
            {loading ? "Creating..." : "Create Sub‑Admin"}
          </button>
          <button
            type="button"
            onClick={() => router.back()}
            className="px-6 py-2 border border-gray-300 rounded-lg hover:cursor-pointer"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
