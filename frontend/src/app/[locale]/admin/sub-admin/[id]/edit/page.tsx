"use client";

import { useEffect, useState, FormEvent } from "react";
import { useRouter, useParams } from "next/navigation";
import { api, getApiErrorMessage } from "@/lib/api/client";
import FormField from "@/components/admin/FormField";
import toast from "react-hot-toast";

type PermKey =
  | "customers"
  | "fabrics"
  | "readyMade"
  | "tailors"
  | "orders"
  | "partners"
  | "settings"
  | "createSubAdmin";

interface SubAdminForm {
  name: string;
  email: string;
  password: string; // optional (only if changing)
  phone: string;
  dob: string;
  address: {
    name: string;
    phone: string;
    emirate: string;
    city: string;
    street: string;
    building: string;
    postalCode: string;
  };
  perms: Record<PermKey, boolean>;
}

const defaultForm: SubAdminForm = {
  name: "",
  email: "",
  password: "",
  phone: "",
  dob: "",
  address: {
    name: "",
    phone: "",
    emirate: "",
    city: "",
    street: "",
    building: "",
    postalCode: "",
  },
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
};

const permLabels: Record<PermKey, string> = {
  customers: "Modify Customers",
  fabrics: "Modify Fabrics",
  readyMade: "Modify Ready‑Made",
  tailors: "Modify Tailors",
  orders: "Modify Orders",
  partners: "Modify Shops",
  settings: "Modify Settings",
  createSubAdmin: "Create Sub‑Admins",
};

export default function EditSubAdminPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [form, setForm] = useState<SubAdminForm>(defaultForm);

  // Fetch existing data
  useEffect(() => {
    const fetchSubAdmin = async () => {
      try {
        const data = await api.get(`/api/subadmins/${id}`);
        setForm({
          name: data.name || "",
          email: data.email || "",
          password: "",
          phone: data.phone || "",
          dob: data.dob ? data.dob.split("T")[0] : "",
          address: data.address || defaultForm.address,
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

  const handleChange = <K extends keyof SubAdminForm>(
    field: K,
    value: SubAdminForm[K],
  ) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleAddressChange = (
    field: keyof SubAdminForm["address"],
    value: string,
  ) => {
    setForm((prev) => ({
      ...prev,
      address: { ...prev.address, [field]: value },
    }));
  };

  const togglePerm = (perm: PermKey) => {
    setForm((prev) => ({
      ...prev,
      perms: { ...prev.perms, [perm]: !prev.perms[perm] },
    }));
  };

  const validate = (): boolean => {
    const errors: Record<string, string> = {};
    if (!form.name.trim()) errors.name = "Name required";
    if (!form.email.trim()) errors.email = "Email required";
    if (form.password.length > 0 && form.password.length < 6) {
      errors.password = "Password must be at least 6 characters";
    }
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!validate()) {
      toast.error("Please fix highlighted fields");
      return;
    }

    // If password is empty, remove it from payload to avoid updating it
    const payload = { ...form };

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
          {/* Personal Info */}
          <FormField label="Full Name" required error={fieldErrors.name}>
            <input
              type="text"
              value={form.name}
              onChange={(e) => handleChange("name", e.target.value)}
              className="w-full py-1 border-b border-gray-300 focus:border-black outline-none"
            />
          </FormField>

          <FormField label="Email" required error={fieldErrors.email}>
            <input
              type="email"
              value={form.email}
              onChange={(e) => handleChange("email", e.target.value)}
              className="w-full py-1 border-b border-gray-300 focus:border-black outline-none"
            />
          </FormField>

          <FormField
            label="Password (leave blank to keep current)"
            error={fieldErrors.password}
          >
            <input
              type="password"
              value={form.password}
              onChange={(e) => handleChange("password", e.target.value)}
              placeholder="Enter new password only if changing"
              className="w-full py-1 border-b border-gray-300 focus:border-black outline-none"
            />
          </FormField>

          <FormField label="Phone">
            <input
              type="tel"
              value={form.phone}
              onChange={(e) => handleChange("phone", e.target.value)}
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

          {/* Address Section */}
          <div className="md:col-span-2">
            <h3 className="text-sm font-medium text-gray-700 mb-3">
              Address Details
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField label="Contact Name">
                <input
                  type="text"
                  value={form.address.name}
                  onChange={(e) => handleAddressChange("name", e.target.value)}
                  className="w-full py-1 border-b border-gray-300 focus:border-black outline-none"
                />
              </FormField>
              <FormField label="Contact Phone">
                <input
                  type="tel"
                  value={form.address.phone}
                  onChange={(e) => handleAddressChange("phone", e.target.value)}
                  className="w-full py-1 border-b border-gray-300 focus:border-black outline-none"
                />
              </FormField>
              <FormField label="Emirate">
                <input
                  type="text"
                  value={form.address.emirate}
                  onChange={(e) =>
                    handleAddressChange("emirate", e.target.value)
                  }
                  className="w-full py-1 border-b border-gray-300 focus:border-black outline-none"
                />
              </FormField>
              <FormField label="City">
                <input
                  type="text"
                  value={form.address.city}
                  onChange={(e) => handleAddressChange("city", e.target.value)}
                  className="w-full py-1 border-b border-gray-300 focus:border-black outline-none"
                />
              </FormField>
              <FormField label="Street">
                <input
                  type="text"
                  value={form.address.street}
                  onChange={(e) =>
                    handleAddressChange("street", e.target.value)
                  }
                  className="w-full py-1 border-b border-gray-300 focus:border-black outline-none"
                />
              </FormField>
              <FormField label="Building">
                <input
                  type="text"
                  value={form.address.building}
                  onChange={(e) =>
                    handleAddressChange("building", e.target.value)
                  }
                  className="w-full py-1 border-b border-gray-300 focus:border-black outline-none"
                />
              </FormField>
              <FormField label="Postal Code">
                <input
                  type="text"
                  value={form.address.postalCode}
                  onChange={(e) =>
                    handleAddressChange("postalCode", e.target.value)
                  }
                  className="w-full py-1 border-b border-gray-300 focus:border-black outline-none"
                />
              </FormField>
            </div>
          </div>

          {/* Permissions */}
          <div className="md:col-span-2">
            <label className="block text-xs uppercase tracking-widest text-gray-500 mb-3">
              Permissions
            </label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {(Object.keys(defaultForm.perms) as PermKey[]).map((key) => (
                <label
                  key={key}
                  className="flex items-center gap-2 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={form.perms[key]}
                    onChange={() => togglePerm(key)}
                    className="accent-black w-4 h-4"
                  />
                  <span className="text-sm">{permLabels[key]}</span>
                </label>
              ))}
            </div>
          </div>
        </div>

        <div className="flex gap-3 pt-6 mt-3 border-t border-gray-100">
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
