"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { api, getApiErrorMessage } from "@/lib/api/client";
import FormField from "@/components/admin/FormField";
import toast from "react-hot-toast";

interface SubAdminForm {
  name: string;
  email: string;
  password: string;
  phone: string;
  dob: string;
  // Address fields
  addressName: string;
  addressPhone: string;
  emirate: string;
  city: string;
  street: string;
  building: string;
  postalCode: string;
  // Permissions
  perms: {
    customers: boolean;
    readyMade: boolean;
    fabrics: boolean;
    tailors: boolean;
    orders: boolean;
    partners: boolean;
    createSubAdmin: boolean;
    settings: boolean;
  };
}

export default function CreateSubAdminPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const [form, setForm] = useState<SubAdminForm>({
    name: "",
    email: "",
    password: "",
    phone: "",
    dob: "",
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
      createSubAdmin: false,
      settings: false,
    },
  });

  const handleChange = (field: keyof SubAdminForm, value: any) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handlePermToggle = (perm: keyof typeof form.perms) => {
    setForm((prev) => ({
      ...prev,
      perms: {
        ...prev.perms,
        [perm]: !prev.perms[perm],
      },
    }));
  };

  const validate = (): boolean => {
    const errors: Record<string, string> = {};
    if (!form.name.trim()) errors.name = "Full name required";
    if (!form.email.trim()) errors.email = "Email required";
    if (form.password.length < 6)
      errors.password = "Password must be at least 6 characters";
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!validate()) {
      toast.error("Please fix highlighted fields");
      return;
    }

    setLoading(true);
    try {
      await api.post("/api/subadmins", form);
      toast.success("Sub‑admin created");
      setForm({
        name: "",
        email: "",
        password: "",
        phone: "",
        dob: "",
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
          createSubAdmin: false,
          settings: false,
        },
      });
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Creation failed"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-light text-black tracking-tight">
          Create Sub‑Admin
        </h1>
        <p className="text-gray-500 text-sm mt-1">
          Add a new sub‑administrator with permissions and address details
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

          <FormField label="Password" required error={fieldErrors.password}>
            <input
              type="password"
              value={form.password}
              onChange={(e) => handleChange("password", e.target.value)}
              placeholder="••••••••"
              className="w-full py-1 border-b border-gray-300 focus:border-black outline-none"
            />
          </FormField>

          <FormField label="Phone">
            <input
              type="tel"
              value={form.phone}
              onChange={(e) => handleChange("phone", e.target.value)}
              placeholder="+971 50 123 4567"
              className="w-full py-1 border-b border-gray-300 focus:border-black outline-none"
            />
          </FormField>

          <FormField label="Date of Birth">
            <input
              type="date"
              value={form.dob}
              onChange={(e) => handleChange("dob", e.target.value)}
              className="w-full py-1 border-b border-gray-300 focus:border-black outline-none"
            />
          </FormField>

          {/* Address Section – full width */}
          <div className="md:col-span-2">
            <h3 className="text-sm font-medium text-gray-700 mb-3">
              Address Details
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField label="Contact Name">
                <input
                  type="text"
                  value={form.addressName}
                  onChange={(e) => handleChange("addressName", e.target.value)}
                  placeholder="John Doe"
                  className="w-full py-1 border-b border-gray-300 focus:border-black outline-none"
                />
              </FormField>
              <FormField label="Contact Phone">
                <input
                  type="tel"
                  value={form.addressPhone}
                  onChange={(e) => handleChange("addressPhone", e.target.value)}
                  placeholder="+971 50 123 4567"
                  className="w-full py-1 border-b border-gray-300 focus:border-black outline-none"
                />
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
              {Object.entries(form.perms).map(([key, value]) => {
                const label =
                  key === "createSubAdmin"
                    ? "Create Sub‑Admins"
                    : `Modify ${key.charAt(0).toUpperCase() + key.slice(1)}`;
                return (
                  <label
                    key={key}
                    className="flex items-center gap-2 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={value}
                      onChange={() =>
                        handlePermToggle(key as keyof typeof form.perms)
                      }
                      className="accent-black w-4 h-4"
                    />
                    <span className="text-sm">{label}</span>
                  </label>
                );
              })}
            </div>
          </div>
        </div>

        {/* Submit */}
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
