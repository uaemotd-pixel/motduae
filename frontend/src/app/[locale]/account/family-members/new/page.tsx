"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Save, Loader2, X } from "lucide-react";
import toast from "react-hot-toast";
import { api } from "@/lib/api/client";
import CustomerImageUpload from "@/components/shared/customerImageUpload";

type Relationship = "mother" | "aunt" | "sister" | "daughter" | "other";
type Gender = "male" | "female" | "other";

type FormData = {
  name: string;
  relationship: Relationship;
  gender: Gender;
  phone: string;
  email: string;
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

type FamilyMemberFormProps = {
  onCancel: () => void;
  onSuccess: () => void;
  initialData?: {
    _id?: string;
    name: string;
    relationship: Relationship;
    phone: string;
    email?: string;
    profilePic?: string;
    address?: Partial<FormData["address"]>;
  };
};

const DEFAULT_FORM: FormData = {
  name: "",
  relationship: "other",
  gender: "other",
  phone: "",
  email: "",
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
};

export default function FamilyMembersForm({
  onCancel,
  onSuccess,
  initialData,
}: FamilyMemberFormProps) {
  const isEdit = !!initialData?._id;
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState<FormData>(DEFAULT_FORM);

  // Populate form when editing
  useEffect(() => {
    if (initialData) {
      setForm({
        name: initialData.name || "",
        relationship: initialData.relationship || "other",
        gender: "other",
        phone: initialData.phone || "",
        email: initialData.email || "",
        profilePic: initialData.profilePic || "",
        address: {
          fullName: initialData.address?.fullName || "",
          phone: initialData.address?.phone || "",
          emirate: initialData.address?.emirate || "",
          city: initialData.address?.city || "",
          street: initialData.address?.street || "",
          building: initialData.address?.building || "",
          postalCode: initialData.address?.postalCode || "",
        },
      });
    }
  }, [initialData]);

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >,
  ) => {
    const { name, value } = e.target;
    let processedValue = value;

    if (name === "phone" || name === "address.phone") {
      // Keep only digits and limit to 9 characters
      processedValue = value.replace(/[^0-9]/g, "").slice(0, 9);
    }

    if (name.startsWith("address.")) {
      const field = name.split(".")[1];
      setForm((prev) => ({
        ...prev,
        address: { ...prev.address, [field]: processedValue },
      }));
    } else {
      setForm((prev) => ({ ...prev, [name]: processedValue }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.phone.trim()) {
      toast.error("Name and phone are required");
      return;
    }

    if (form.phone.length !== 9) {
      toast.error("Phone number must be exactly 9 digits");
      return;
    }

    if (form.address.phone && form.address.phone.length !== 9) {
      toast.error("Address phone number must be exactly 9 digits");
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        name: form.name.trim(),
        phone: form.phone.trim(),
        relationship: form.relationship,
        gender: form.gender,
        email: form.email.trim() || undefined,
        profilePic: form.profilePic.trim() || undefined,
        address: {
          fullName: form.address.fullName.trim() || form.name.trim(),
          phone: form.address.phone.trim() || form.phone.trim(),
          emirate: form.address.emirate.trim(),
          city: form.address.city.trim(),
          street: form.address.street.trim(),
          building: form.address.building.trim(),
          postalCode: form.address.postalCode.trim(),
        },
      };

      if (isEdit) {
        await api.put(
          `/api/customer/family-members/${initialData._id}`,
          payload,
        );
        toast.success("Member updated");
      } else {
        await api.post("/api/customer/family-members", payload);
        toast.success("Member added");
      }
      onSuccess();
    } catch (err: any) {
      toast.error(err.message || "Operation failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100">
      <div className="border-b border-gray-100 px-8 py-6">
        <h1 className="text-2xl font-semibold text-black">
          {isEdit ? "Edit Family Member" : "Add Family Member"}
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          {isEdit
            ? "Update family member details."
            : "Add a family member who can receive deliveries on your behalf."}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="p-8 space-y-10">
        <section>
          <h2 className="text-base font-semibold text-black mb-6">
            Personal Information
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium mb-2">
                Full Name <span className="text-red-500 font-bold ml-0.5">*</span>
              </label>
              <input
                type="text"
                name="name"
                value={form.name}
                onChange={handleChange}
                required
                className="w-full rounded-lg border border-gray-300 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-black"
                placeholder="Fatima Ahmed"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">
                Phone <span className="text-red-500 font-bold ml-0.5">*</span>
              </label>
              <input
                type="tel"
                name="phone"
                value={form.phone}
                onChange={handleChange}
                required
                className="w-full rounded-lg border border-gray-300 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-black"
                placeholder="50 123 4567"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">
                Relationship
              </label>
              <select
                name="relationship"
                value={form.relationship}
                onChange={handleChange}
                className="w-full rounded-lg border border-gray-300 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-black"
              >
                <option value="mother">Mother</option>
                <option value="aunt">Aunt</option>
                <option value="sister">Sister</option>
                <option value="daughter">Daughter</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Gender</label>
              <select
                name="gender"
                value={form.gender}
                onChange={handleChange}
                className="w-full rounded-lg border border-gray-300 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-black"
              >
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Email</label>
              <input
                type="email"
                name="email"
                value={form.email}
                onChange={handleChange}
                className="w-full rounded-lg border border-gray-300 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-black"
                placeholder="example@email.com"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium mb-3">
                Profile Picture
              </label>
              <CustomerImageUpload
                value={form.profilePic}
                onChange={(url) =>
                  setForm((prev) => ({ ...prev, profilePic: url }))
                }
                uploadEndpoint="/api/customer/uploads/customer"
                chooseFileLabel="Upload photo"
                uploadingLabel="Uploading..."
                uploadFailedLabel="Upload failed"
                removeLabel="Remove"
              />
            </div>
          </div>
        </section>

        <section>
          <h2 className="text-base font-semibold text-black mb-6">
            Delivery Address (Optional)
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[
              ["Full Name", "address.fullName", "Full name"],
              ["Phone", "address.phone", "+971 50 123 4567"],
              ["Emirate", "address.emirate", "Dubai"],
              ["City", "address.city", "Dubai"],
              ["Street", "address.street", "Sheikh Zayed Road"],
              ["Building", "address.building", "Burj Khalifa"],
              ["Postal Code", "address.postalCode", "12345"],
            ].map(([label, name, placeholder]) => (
              <div
                key={name}
                className={name === "address.postalCode" ? "md:col-span-2" : ""}
              >
                <label className="block text-sm font-medium mb-2">
                  {label}
                </label>
                <input
                  type="text"
                  name={name}
                  value={
                    form.address[
                      name.split(".")[1] as keyof typeof form.address
                    ]
                  }
                  onChange={handleChange}
                  placeholder={placeholder}
                  className="w-full rounded-lg border border-gray-300 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-black"
                />
              </div>
            ))}
          </div>
        </section>

        <div className="border-t border-gray-100 pt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg border border-gray-300 px-5 py-2.5 text-gray-700 hover:bg-gray-50 transition flex items-center gap-2"
          >
            <X className="w-4 h-4" />
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="rounded-lg bg-black px-5 py-2.5 text-white flex items-center gap-2 disabled:opacity-50"
          >
            {submitting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            {isEdit ? "Update Member" : "Add Member"}
          </button>
        </div>
      </form>
    </div>
  );
}
