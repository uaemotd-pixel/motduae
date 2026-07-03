"use client";

import { useEffect, useState, FormEvent } from "react";
import { useRouter, useParams } from "next/navigation";
import { api, getApiErrorMessage } from "@/lib/api/client";
import FormField from "@/components/admin/FormField";
import toast from "react-hot-toast";
import { Eye, EyeOff } from "lucide-react";

type PermKey =
  | "customers"
  | "fabrics"
  | "readyMade"
  | "tailors"
  | "orders"
  | "partners"
  | "settings"

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
  perms: Record<PermKey, boolean>;
}

const defaultForm: SubAdminForm = {
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
    fabrics: false,
    readyMade: false,
    tailors: false,
    orders: false,
    partners: false,
    settings: false,
  },
};

const permLabels: Record<PermKey, string> = {
  customers: "Modify Customers",
  fabrics: "Modify Fabrics",
  readyMade: "Modify Ready‑Made",
  tailors: "Modify Tailors",
  orders: "Modify Orders",
  partners: "Modify Partners",
  settings: "Modify Settings",
};

export default function EditSubAdminPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [showPassword, setShowPassword] = useState(false);
  const [form, setForm] = useState<SubAdminForm>(defaultForm);

  useEffect(() => {
    const fetchSubAdmin = async () => {
      try {
        const data = await api.get(`/api/subadmins/${id}`);
        setForm({
          name: data.name || "",
          email: data.email || "",
          password: "",
          phone: data.phone || "",
          addressName: data.address?.name || "",
          addressPhone: data.address?.phone || "",
          emirate: data.address?.emirate || "",
          city: data.address?.city || "",
          street: data.address?.street || "",
          building: data.address?.building || "",
          postalCode: data.address?.postalCode || "",
          perms: data.perms || defaultForm.perms,
        });
      } catch (err) {
        toast.error("Failed to load sub-admin");
        router.back();
      } finally {
        setLoading(false);
      }
    };
    fetchSubAdmin();
  }, [id, router]);

  const handleChange = (field: keyof SubAdminForm, value: any) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handlePermToggle = (perm: PermKey) => {
    setForm((prev) => ({
      ...prev,
      perms: { ...prev.perms, [perm]: !prev.perms[perm] },
    }));
  };

  const validate = (): boolean => {
    const errors: Record<string, string> = {};
    if (!form.name.trim()) errors.name = "Full name required";
    if (!form.email.trim()) errors.email = "Email required";
    if (form.password.length > 0 && form.password.length < 6) {
      errors.password = "Password must be at least 6 characters";
    }

    if (form.phone) {
      const phoneDigits = form.phone.replace("+971", "");
      if (!/^\d{9}$/.test(phoneDigits)) {
        errors.phone = "Invalid UAE phone – must be 9 digits after +971";
      }
    }
    if (form.addressPhone) {
      const addrDigits = form.addressPhone.replace("+971", "");
      if (!/^\d{9}$/.test(addrDigits)) {
        errors.addressPhone = "Invalid UAE phone – must be 9 digits after +971";
      }
    }
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    const payload: any = {
      name: form.name,
      email: form.email,
      phone: form.phone,
      address: {
        name: form.addressName,
        phone: form.addressPhone,
        emirate: form.emirate,
        city: form.city,
        street: form.street,
        building: form.building,
        postalCode: form.postalCode,
      },
      perms: form.perms,
    };

    if (form.password) payload.password = form.password;

    setSaving(true);
    try {
      await api.put(`/api/subadmins/${id}`, payload);
      toast.success("Sub‑admin updated");
      router.push("/admin/sub-admin");
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Update failed"));
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-6">Loading...</div>;

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-light text-black tracking-tight">
          Edit Sub‑Admin
        </h1>
        <p className="text-gray-500 text-sm mt-1">
          Update sub‑administrator details and permissions
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Personal Information */}
          <FormField label="Full Name" required error={fieldErrors.name}>
            <input
              type="text"
              value={form.name}
              onChange={(e) => handleChange("name", e.target.value)}
              placeholder="John Doe"
              className="w-full py-1 border-b border-gray-300 focus:border-black outline-none"
            />
          </FormField>

          <FormField label="Email" required error={fieldErrors.email}>
            <input
              type="email"
              value={form.email}
              onChange={(e) => handleChange("email", e.target.value)}
              placeholder="john@example.com"
              className="w-full py-1 border-b border-gray-300 focus:border-black outline-none"
            />
          </FormField>

          <FormField
            label="Password (leave blank to keep current)"
            error={fieldErrors.password}
          >
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={form.password}
                onChange={(e) => handleChange("password", e.target.value)}
                placeholder="Enter new password only if changing"
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

          <FormField label="Phone" error={fieldErrors.phone}>
            <div className="relative">
              <span className="absolute left-0 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none">
                +971
              </span>
              <input
                type="text"
                value={form.phone.replace("+971", "")}
                onChange={(e) => {
                  const digits = e.target.value.replace(/\D/g, "");
                  if (digits.length <= 9) {
                    handleChange("phone", "+971" + digits);
                  }
                }}
                placeholder="50 123 4567"
                className="w-full py-1 border-b border-gray-300 focus:border-black outline-none pl-12"
              />
            </div>
          </FormField>

          {/* Address Section – full width */}
          <div className="md:col-span-2">
            <h3 className="text-sm font-medium text-gray-700 mb-3">
              Address Details
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField label="Full Name">
                <input
                  type="text"
                  value={form.addressName}
                  onChange={(e) => handleChange("addressName", e.target.value)}
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
                    type="text"
                    value={form.addressPhone.replace("+971", "")}
                    onChange={(e) => {
                      const digits = e.target.value.replace(/\D/g, "");
                      if (digits.length <= 9) {
                        handleChange("addressPhone", "+971" + digits);
                      }
                    }}
                    placeholder="50 123 4567"
                    className="w-full py-1 border-b border-gray-300 focus:border-black outline-none pl-12"
                  />
                </div>
              </FormField>
              <FormField label="Emirate">
                <input
                  type="text"
                  value={form.emirate}
                  onChange={(e) => handleChange("emirate", e.target.value)}
                  placeholder="Dubai"
                  className="w-full py-1 border-b border-gray-300 focus:border-black outline-none"
                />
              </FormField>
              <FormField label="City">
                <input
                  type="text"
                  value={form.city}
                  onChange={(e) => handleChange("city", e.target.value)}
                  placeholder="Dubai"
                  className="w-full py-1 border-b border-gray-300 focus:border-black outline-none"
                />
              </FormField>
              <FormField label="Street">
                <input
                  type="text"
                  value={form.street}
                  onChange={(e) => handleChange("street", e.target.value)}
                  placeholder="Sheikh Zayed Road"
                  className="w-full py-1 border-b border-gray-300 focus:border-black outline-none"
                />
              </FormField>
              <FormField label="Building">
                <input
                  type="text"
                  value={form.building}
                  onChange={(e) => handleChange("building", e.target.value)}
                  placeholder="Burj Khalifa"
                  className="w-full py-1 border-b border-gray-300 focus:border-black outline-none"
                />
              </FormField>
              <FormField label="Postal Code">
                <input
                  type="text"
                  value={form.postalCode}
                  onChange={(e) => handleChange("postalCode", e.target.value)}
                  placeholder="12345"
                  className="w-full py-1 border-b border-gray-300 focus:border-black outline-none"
                />
              </FormField>
            </div>
          </div>

          {/* Permissions – full width */}
          <div className="md:col-span-2">
            <label className="block text-xs uppercase tracking-widest text-gray-500 mb-3">
              Permissions
            </label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {Object.keys(defaultForm.perms).map((key) => (
                <label
                  key={key}
                  className="flex items-center gap-2 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={form.perms[key as PermKey]}
                    onChange={() => handlePermToggle(key as PermKey)}
                    className="accent-black w-4 h-4"
                  />
                  <span className="text-sm">{permLabels[key as PermKey]}</span>
                </label>
              ))}
            </div>
          </div>
        </div>

        {/* Submit */}
        <div className="flex flex-row-reverse gap-3 pt-6 mt-3 border-t border-gray-100">
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-2 bg-black text-white rounded-lg hover:cursor-pointer disabled:opacity-50"
          >
            {saving ? "Saving..." : "Update Sub‑Admin"}
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
