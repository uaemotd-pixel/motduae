// components/account/EditProfileForm.tsx
"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api/client";
import { useRouter } from "next/navigation";
import {
  User,
  Phone,
  Calendar,
  Users,
  MapPin,
  Save,
  Loader2,
  X,
} from "lucide-react";
import toast from "react-hot-toast";

// Updated to match new customer address schema
type Address = {
  _id?: string;
  label?: "home" | "work" | "other";
  fullName: string;
  phone: string;
  emirate: string;
  city: string;
  street: string;
  building: string;
  postalCode: string;
  isDefault?: boolean;
};

type FormData = {
  name: string;
  phone: string;
  gender: string;
  dob: string;
  profilePic: string;
  address: {
    fullName: string;
    phone: string;
    emirate: string;
    city: string;
    street: string;
    building: string;
    postalCode: string;
  };
};

interface EditProfileFormProps {
  onCancel?: () => void;
}

// Reusable form field component (matches admin style)
const FormField = ({
  label,
  name,
  required,
  error,
  children,
}: {
  label: string;
  name?: string;
  required?: boolean;
  error?: string;
  children: React.ReactNode;
}) => (
  <div className="space-y-1.5">
    <label
      htmlFor={name}
      className="block text-xs uppercase tracking-widest text-gray-500"
    >
      {label} {required && "*"}
    </label>
    {children}
    {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
  </div>
);

export default function EditProfileForm({ onCancel }: EditProfileFormProps) {
  const { user: authUser } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const [form, setForm] = useState<FormData>({
    name: "",
    phone: "",
    gender: "prefer-not",
    dob: "",
    profilePic: "",
    address: {
      fullName: "",
      phone: "",
      emirate: "",
      city: "",
      street: "",
      building: "",
      postalCode: "",
    },
  });

  useEffect(() => {
    async function loadProfile() {
      if (!authUser) return;
      try {
        setLoading(true);
        const data = await api.get("/api/customer/profile");
        const defaultAddr =
          data.addresses?.find((a: Address) => a.isDefault) ||
          data.addresses?.[0] ||
          {};
        setForm({
          name: data.name || "",
          phone: data.phone || "",
          gender: data.gender || "prefer-not",
          dob: data.dob ? data.dob.split("T")[0] : "",
          profilePic: data.profilePic || "",
          address: {
            fullName: defaultAddr.fullName || data.name || "",
            phone: defaultAddr.phone || data.phone || "",
            emirate: defaultAddr.emirate || "",
            city: defaultAddr.city || "",
            street: defaultAddr.street || "",
            building: defaultAddr.building || "",
            postalCode: defaultAddr.postalCode || "",
          },
        });
      } catch (err: any) {
        if (err.status === 404) {
          // No profile – use auth name only
          setForm({
            name: authUser.name || "",
            phone: "",
            gender: "prefer-not",
            dob: "",
            profilePic: "",
            address: {
              fullName: authUser.name || "",
              phone: "",
              emirate: "",
              city: "",
              street: "",
              building: "",
              postalCode: "",
            },
          });
        } else {
          toast.error(err.message || "Failed to load profile");
        }
      } finally {
        setLoading(false);
      }
    }
    loadProfile();
  }, [authUser]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    const { name, value } = e.target;
    if (name.startsWith("address.")) {
      const field = name.split(".")[1];
      setForm((prev) => ({
        ...prev,
        address: { ...prev.address, [field]: value },
      }));
    } else {
      setForm((prev) => ({ ...prev, [name]: value }));
    }
    // Clear field error when user types
    if (fieldErrors[name]) {
      setFieldErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  const validate = (): boolean => {
    const errors: Record<string, string> = {};
    if (!form.name.trim()) errors.name = "Full name is required";
    if (!form.phone.trim()) errors.phone = "Phone number is required";
    if (!form.address.fullName.trim())
      errors["address.fullName"] = "Full name for address is required";
    if (!form.address.phone.trim())
      errors["address.phone"] = "Phone for address is required";
    if (!form.address.emirate.trim())
      errors["address.emirate"] = "Emirate is required";
    if (!form.address.city.trim()) errors["address.city"] = "City is required";
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) {
      const firstError = Object.values(fieldErrors).find(Boolean);
      if (firstError) toast.error(firstError);
      return;
    }
    setSubmitting(true);

    try {
      const payload = {
        name: form.name.trim(),
        phone: form.phone.trim(),
        gender: form.gender,
        dob: form.dob ? new Date(form.dob) : undefined,
        profilePic: form.profilePic.trim() || undefined,
        address: {
          fullName: form.address.fullName.trim(),
          phone: form.address.phone.trim(),
          emirate: form.address.emirate.trim(),
          city: form.address.city.trim(),
          street: form.address.street.trim() || "",
          building: form.address.building.trim() || "",
          postalCode: form.address.postalCode.trim() || "",
          isDefault: true, // This address becomes default
        },
      };

      await api.put("/api/customer/profile", payload);
      toast.success("Profile updated successfully!");
      setTimeout(() => {
        if (onCancel) onCancel();
      }, 1500);
    } catch (err: any) {
      toast.error(err.message || "Update failed");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="w-8 h-8 animate-spin text-gray-500" />
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
      <div className="p-6 sm:p-8">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold">Edit Profile</h2>
          {onCancel && (
            <button
              onClick={onCancel}
              className="p-2 hover:bg-gray-100 rounded-full transition"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Personal Info */}
          <div className="space-y-4">
            <h3 className="text-base font-semibold flex items-center gap-2">
              <User className="w-5 h-5" /> Personal Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <FormField
                label="Full Name"
                name="name"
                required
                error={fieldErrors.name}
              >
                <input
                  type="text"
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  placeholder="John Doe"
                  className="w-full py-1 border-b border-gray-300 focus:border-black outline-none bg-transparent"
                />
              </FormField>

              <FormField
                label="Phone"
                name="phone"
                required
                error={fieldErrors.phone}
              >
                <input
                  type="tel"
                  name="phone"
                  value={form.phone}
                  onChange={handleChange}
                  placeholder="+971 50 123 4567"
                  className="w-full py-1 border-b border-gray-300 focus:border-black outline-none bg-transparent"
                />
              </FormField>

              <FormField label="Gender" name="gender" required>
                <select
                  name="gender"
                  value={form.gender}
                  onChange={handleChange}
                  className="w-full py-1 border-b border-gray-300 focus:border-black outline-none bg-transparent"
                >
                  <option value="prefer-not">Prefer not to say</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </select>
              </FormField>

              <FormField label="Date of Birth" name="dob" required>
                <input
                  type="date"
                  name="dob"
                  value={form.dob}
                  onChange={handleChange}
                  className="w-full py-1 border-b border-gray-300 focus:border-black outline-none bg-transparent"
                />
              </FormField>

              <FormField
                label="Profile Picture URL (optional)"
                name="profilePic"
              >
                <input
                  type="url"
                  name="profilePic"
                  value={form.profilePic}
                  onChange={handleChange}
                  placeholder="https://example.com/avatar.jpg"
                  className="w-full py-1 border-b border-gray-300 focus:border-black outline-none bg-transparent"
                />
              </FormField>
            </div>
          </div>

          {/* Address – matches shipping address schema */}
          <div className="space-y-4">
            <h3 className="text-base font-semibold flex items-center gap-2">
              <MapPin className="w-5 h-5" /> Default Address
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <FormField
                label="Full Name (for address)"
                name="address.fullName"
                required
                error={fieldErrors["address.fullName"]}
              >
                <input
                  type="text"
                  name="address.fullName"
                  value={form.address.fullName}
                  onChange={handleChange}
                  placeholder="John Doe"
                  className="w-full py-1 border-b border-gray-300 focus:border-black outline-none bg-transparent"
                />
              </FormField>

              <FormField
                label="Phone (for address)"
                name="address.phone"
                required
                error={fieldErrors["address.phone"]}
              >
                <input
                  type="tel"
                  name="address.phone"
                  value={form.address.phone}
                  onChange={handleChange}
                  placeholder="+971 50 123 4567"
                  className="w-full py-1 border-b border-gray-300 focus:border-black outline-none bg-transparent"
                />
              </FormField>

              <FormField
                label="Emirate"
                name="address.emirate"
                required
                error={fieldErrors["address.emirate"]}
              >
                <input
                  type="text"
                  name="address.emirate"
                  value={form.address.emirate}
                  onChange={handleChange}
                  placeholder="Dubai"
                  className="w-full py-1 border-b border-gray-300 focus:border-black outline-none bg-transparent"
                />
              </FormField>

              <FormField
                label="City"
                name="address.city"
                required
                error={fieldErrors["address.city"]}
              >
                <input
                  type="text"
                  name="address.city"
                  value={form.address.city}
                  onChange={handleChange}
                  placeholder="Dubai"
                  className="w-full py-1 border-b border-gray-300 focus:border-black outline-none bg-transparent"
                />
              </FormField>

              <FormField label="Street" name="address.street">
                <input
                  type="text"
                  name="address.street"
                  value={form.address.street}
                  onChange={handleChange}
                  placeholder="Sheikh Zayed Road"
                  className="w-full py-1 border-b border-gray-300 focus:border-black outline-none bg-transparent"
                />
              </FormField>

              <FormField label="Building" name="address.building">
                <input
                  type="text"
                  name="address.building"
                  value={form.address.building}
                  onChange={handleChange}
                  placeholder="Burj Khalifa"
                  className="w-full py-1 border-b border-gray-300 focus:border-black outline-none bg-transparent"
                />
              </FormField>

              <FormField label="Postal Code" name="address.postalCode">
                <input
                  type="text"
                  name="address.postalCode"
                  value={form.address.postalCode}
                  onChange={handleChange}
                  placeholder="12345"
                  className="w-full py-1 border-b border-gray-300 focus:border-black outline-none bg-transparent"
                />
              </FormField>
            </div>
          </div>

          <div className="flex justify-end gap-4 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={() => (onCancel ? onCancel() : router.push("/account"))}
              className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-6 py-2 bg-black text-white rounded-lg hover:bg-gray-800 transition disabled:opacity-50 flex items-center gap-2"
            >
              {submitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
