// components/account/EditProfileForm.tsx
"use client";

import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api/client";
import { useRouter } from "next/navigation";
import {
  User,
  MapPin,
  Save,
  Loader2,
  X,
  ChevronDown,
  ChevronUp,
  Plus,
  Trash2,
} from "lucide-react";
import toast from "react-hot-toast";
import CustomerImageUpload from "@/components/shared/customerImageUpload";
import { motion, AnimatePresence } from "framer-motion";
import { SUCCESS_TOAST, ERROR_TOAST } from "@/lib/tailorPortalToast";
import {
  isValidUaePhone,
  normalizeUaePhone,
  extractDigits,
} from "@/lib/uaePhone";
import { AccountPanelSkeleton } from "@/components/ui/Skeleton";
import {
  UAE_EMIRATES,
  getEmirateEn,
  getEmirateAr,
  validateAddress,
  normalizeAddress,
} from "@/lib/uaeAddress";

type Address = {
  _id?: string;
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
  addresses: Address[];
};

interface EditProfileFormProps {
  onCancel?: () => void;
}

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
      className="block text-[10px] sm:text-xs uppercase tracking-widest text-gray-500"
    >
      {label}{" "}
      {required && <span className="text-red-500 font-bold ml-0.5">*</span>}
    </label>
    {children}
    {error && (
      <p className="text-red-500 text-[10px] sm:text-xs mt-1">{error}</p>
    )}
  </div>
);

const validatePhone = (phone: string): string | null => {
  if (!phone || phone === "+971") return "Phone number required";
  if (!isValidUaePhone(phone))
    return "Invalid phone. Must be 9 digits after +971";
  return null;
};

const GENDER_OPTIONS = [
  { value: "prefer-not", label: "Prefer not to say" },
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
  { value: "other", label: "Other" },
];

export default function EditProfileForm({ onCancel }: EditProfileFormProps) {
  const { user: authUser } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [todayStr, setTodayStr] = useState("");
  const [genderOpen, setGenderOpen] = useState(false);
  const genderRef = useRef<HTMLDivElement>(null);
  const [emirateOpen, setEmirateOpen] = useState<Record<number, boolean>>({});
  const emirateRefs = useRef<Record<number, HTMLDivElement | null>>({});

  const [form, setForm] = useState<FormData>({
    name: "",
    phone: "",
    gender: "prefer-not",
    dob: "",
    profilePic: "",
    addresses: [],
  });

  useEffect(() => {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, "0");
    const dd = String(today.getDate()).padStart(2, "0");
    setTodayStr(`${yyyy}-${mm}-${dd}`);
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (genderRef.current && !genderRef.current.contains(e.target as Node)) {
        setGenderOpen(false);
      }
      Object.keys(emirateOpen).forEach((key) => {
        const index = parseInt(key);
        if (
          emirateRefs.current[index] &&
          !emirateRefs.current[index]?.contains(e.target as Node)
        ) {
          setEmirateOpen((prev) => ({ ...prev, [index]: false }));
        }
      });
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [emirateOpen]);

  useEffect(() => {
    async function loadProfile() {
      if (!authUser) return;
      try {
        setLoading(true);
        const data = await api.get("/api/customer/profile");

        let addresses = data.addresses || [];

        if (addresses.length === 0) {
          addresses = [
            {
              fullName: data.name || "",
              phone: normalizeUaePhone(data.phone || ""),
              emirate: "",
              city: "",
              street: "",
              building: "",
              postalCode: "",
              isDefault: true,
            },
          ];
        } else {
          // Only prefilled first address with name/phone
          addresses = addresses.map((addr: Address, index: number) => {
            if (index === 0) {
              return {
                ...addr,
                fullName: addr.fullName || data.name || "",
                phone: addr.phone
                  ? normalizeUaePhone(addr.phone)
                  : normalizeUaePhone(data.phone || ""),
              };
            }
            return {
              ...addr,
              fullName: addr.fullName || "",
              phone: addr.phone ? normalizeUaePhone(addr.phone) : "",
            };
          });
        }

        setForm({
          name: data.name || "",
          phone: normalizeUaePhone(data.phone || ""),
          gender: data.gender || "prefer-not",
          dob: data.dob ? data.dob.split("T")[0] : "",
          profilePic: data.profilePic || "",
          addresses: addresses,
        });
      } catch (err: any) {
        if (err.status === 404) {
          setForm({
            name: authUser.name || "",
            phone: "",
            gender: "prefer-not",
            dob: "",
            profilePic: "",
            addresses: [
              {
                fullName: authUser.name || "",
                phone: "",
                emirate: "",
                city: "",
                street: "",
                building: "",
                postalCode: "",
                isDefault: true,
              },
            ],
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

  const handleTextOnlyInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    const filtered = value.replace(/[^a-zA-Z\u0600-\u06FF\s\-']/g, "");

    if (name.startsWith("address.")) {
      const parts = name.split(".");
      const index = parseInt(parts[1]);
      const field = parts[2];
      setForm((prev) => {
        const newAddresses = [...prev.addresses];
        newAddresses[index] = { ...newAddresses[index], [field]: filtered };
        return { ...prev, addresses: newAddresses };
      });
    } else {
      setForm((prev) => ({ ...prev, [name]: filtered }));
    }

    if (fieldErrors[name]) setFieldErrors((prev) => ({ ...prev, [name]: "" }));
  };

  const handleNumberOnlyInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    const filtered = value.replace(/\D/g, "");

    if (name.startsWith("address.")) {
      const parts = name.split(".");
      const index = parseInt(parts[1]);
      const field = parts[2];
      setForm((prev) => {
        const newAddresses = [...prev.addresses];
        newAddresses[index] = { ...newAddresses[index], [field]: filtered };
        return { ...prev, addresses: newAddresses };
      });
    }

    if (fieldErrors[name]) setFieldErrors((prev) => ({ ...prev, [name]: "" }));
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    const { name, value } = e.target;
    if (name.startsWith("address.")) {
      const parts = name.split(".");
      const index = parseInt(parts[1]);
      const field = parts[2];
      setForm((prev) => {
        const newAddresses = [...prev.addresses];
        newAddresses[index] = { ...newAddresses[index], [field]: value };
        return { ...prev, addresses: newAddresses };
      });
    } else {
      setForm((prev) => ({ ...prev, [name]: value }));
    }
    if (fieldErrors[name]) setFieldErrors((prev) => ({ ...prev, [name]: "" }));
  };

  const handlePhoneChange = (field: string, value: string, index?: number) => {
    const digits = extractDigits(value);
    if (digits.length <= 9) {
      const normalized = normalizeUaePhone(digits);
      if (field === "phone") {
        setForm((prev) => ({ ...prev, phone: normalized }));
        if (fieldErrors.phone)
          setFieldErrors((prev) => ({ ...prev, phone: "" }));
      } else if (field === "address.phone" && index !== undefined) {
        setForm((prev) => {
          const newAddresses = [...prev.addresses];
          newAddresses[index] = { ...newAddresses[index], phone: normalized };
          return { ...prev, addresses: newAddresses };
        });
        const errorKey = `address.${index}.phone`;
        if (fieldErrors[errorKey])
          setFieldErrors((prev) => ({ ...prev, [errorKey]: "" }));
      }
    }
  };

  const getPhoneDisplayValue = (phone: string): string => {
    if (!phone) return "";
    const digits = extractDigits(phone);
    if (digits.startsWith("971")) return digits.slice(3);
    return digits.slice(0, 9);
  };

  const addAddress = () => {
    setForm((prev) => ({
      ...prev,
      addresses: [
        ...prev.addresses,
        {
          fullName: "",
          phone: "",
          emirate: "",
          city: "",
          street: "",
          building: "",
          postalCode: "",
          isDefault: false,
        },
      ],
    }));
    setTimeout(() => {
      const newAddressElement = document.getElementById(
        `address-${form.addresses.length}`,
      );
      if (newAddressElement) {
        newAddressElement.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
      }
    }, 100);
  };

  const removeAddress = (index: number) => {
    if (index === 0) {
      toast.error("Cannot remove primary address");
      return;
    }
    setForm((prev) => ({
      ...prev,
      addresses: prev.addresses.filter((_, i) => i !== index),
    }));
  };

  const validate = (): { isValid: boolean; firstError?: string } => {
    const errors: Record<string, string> = {};

    if (!form.name.trim()) errors.name = "Full name required";
    const phoneError = validatePhone(form.phone);
    if (phoneError) errors.phone = phoneError;

    form.addresses.forEach((address, index) => {
      const addressValidation = validateAddress(address);
      Object.entries(addressValidation.errors).forEach(([key, error]) => {
        if (error) errors[`address.${index}.${key}`] = error;
      });
    });

    if (!form.dob) {
      errors.dob = "Date of Birth required";
    } else {
      const dobDate = new Date(form.dob);
      const today = new Date();
      today.setHours(23, 59, 59, 999);
      if (dobDate > today) errors.dob = "Date of birth cannot be in future";
    }

    setFieldErrors(errors);
    const firstError = Object.values(errors).find(Boolean);
    return { isValid: Object.keys(errors).length === 0, firstError };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const { isValid, firstError } = validate();
    if (!isValid) {
      toast.error(firstError || "Fill all required fields.", ERROR_TOAST);
      return;
    }
    setSubmitting(true);

    try {
      const normalizedAddresses = form.addresses.map((address, index) => ({
        ...normalizeAddress(address),
        isDefault: index === 0,
        fullName: address.fullName || form.name.trim(),
        phone: address.phone || form.phone,
      }));

      const payload = {
        name: form.name.trim(),
        phone: form.phone,
        gender: form.gender,
        dob: form.dob ? new Date(form.dob) : undefined,
        profilePic: form.profilePic.trim() || null,
        addresses: normalizedAddresses,
      };

      await api.put("/api/customer/profile", payload);
      toast.success("Profile updated!", SUCCESS_TOAST);
      setTimeout(() => {
        if (onCancel) onCancel();
      }, 1500);
    } catch (err: any) {
      toast.error(err.message || "Update failed", ERROR_TOAST);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <AccountPanelSkeleton />;

  return (
    <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
      <div className="p-4 sm:p-6 md:p-8">
        <div className="flex justify-between items-center mb-4 sm:mb-6">
          <h2 className="text-lg sm:text-xl font-medium">Edit Profile</h2>
          {onCancel && (
            <button
              onClick={onCancel}
              className="p-1.5 sm:p-2 hover:bg-gray-100 rounded-full transition hover:cursor-pointer"
            >
              <X className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-6 sm:space-y-8">
          <div className="space-y-3 sm:space-y-4">
            <h3 className="text-sm sm:text-base font-medium flex items-center gap-2">
              <User className="w-4 h-4 sm:w-5 sm:h-5" /> Personal Information
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
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
                  onChange={handleTextOnlyInput}
                  placeholder="John Doe"
                  className="w-full py-1 sm:py-1.5 text-sm sm:text-base border-b border-gray-300 focus:border-black outline-none bg-transparent"
                />
              </FormField>

              <FormField
                label="Phone"
                name="phone"
                required
                error={fieldErrors.phone}
              >
                <div className="relative">
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 text-gray-500 font-mono text-sm sm:text-base">
                    +971
                  </span>
                  <input
                    type="tel"
                    name="phone"
                    value={getPhoneDisplayValue(form.phone)}
                    onChange={(e) => handlePhoneChange("phone", e.target.value)}
                    placeholder="XXXXXXXXX"
                    maxLength={9}
                    className="w-full py-1 sm:py-1.5 pl-10 sm:pl-12 text-sm sm:text-base border-b border-gray-300 focus:border-black outline-none bg-transparent font-mono"
                  />
                </div>
                <p className="text-gray-400 mt-1 text-[8px] sm:text-[10px]">
                  Enter 9 digits after +971
                </p>
              </FormField>

              <FormField label="Gender" name="gender" required>
                <div className="relative" ref={genderRef}>
                  <button
                    type="button"
                    onClick={() => setGenderOpen(!genderOpen)}
                    className="w-full py-1 sm:py-1.5 text-sm sm:text-base border-b border-gray-300 focus:border-black outline-none bg-transparent flex items-center justify-between hover:cursor-pointer"
                  >
                    <span
                      className={form.gender ? "text-black" : "text-gray-400"}
                    >
                      {form.gender
                        ? GENDER_OPTIONS.find(
                            (opt) => opt.value === form.gender,
                          )?.label
                        : "Select Gender"}
                    </span>
                    {genderOpen ? (
                      <ChevronUp className="w-4 h-4 text-gray-400" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-gray-400" />
                    )}
                  </button>

                  <AnimatePresence>
                    {genderOpen && (
                      <motion.ul
                        initial={{ opacity: 0, y: -10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -10, scale: 0.95 }}
                        transition={{ duration: 0.15, ease: "easeOut" }}
                        className="absolute left-0 right-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto z-50 py-1"
                      >
                        {GENDER_OPTIONS.map((option) => (
                          <motion.li
                            key={option.value}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.05 }}
                          >
                            <button
                              type="button"
                              onClick={() => {
                                setForm((prev) => ({
                                  ...prev,
                                  gender: option.value,
                                }));
                                setGenderOpen(false);
                                if (fieldErrors.gender) {
                                  setFieldErrors((prev) => ({
                                    ...prev,
                                    gender: "",
                                  }));
                                }
                              }}
                              className={`w-full text-left px-4 py-2.5 text-sm sm:text-base hover:bg-gray-50 transition hover:cursor-pointer ${
                                form.gender === option.value
                                  ? "text-black font-medium bg-gray-50"
                                  : "text-gray-700"
                              }`}
                            >
                              {option.label}
                            </button>
                          </motion.li>
                        ))}
                      </motion.ul>
                    )}
                  </AnimatePresence>
                </div>
              </FormField>

              <FormField
                label="Date of Birth"
                name="dob"
                required
                error={fieldErrors.dob}
              >
                <input
                  type="date"
                  name="dob"
                  value={form.dob}
                  max={todayStr || new Date().toISOString().split("T")[0]}
                  onChange={handleChange}
                  className="w-full py-1 sm:py-1.5 text-sm sm:text-base border-b border-gray-300 focus:border-black outline-none bg-transparent"
                />
              </FormField>

              <div className="sm:col-span-2">
                <FormField label="Profile Picture" name="profilePic">
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
                </FormField>
              </div>
            </div>
          </div>

          <div className="space-y-3 sm:space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm sm:text-base font-medium flex items-center gap-2">
                <MapPin className="w-4 h-4 sm:w-5 sm:h-5" /> Addresses
              </h3>
              <button
                type="button"
                onClick={addAddress}
                className="flex items-center gap-1 text-sm text-black hover:text-gray-600 transition hover:cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                Add Address
              </button>
            </div>

            <div className="space-y-6">
              {form.addresses.map((address, index) => (
                <div
                  key={index}
                  id={`address-${index}`}
                  className={`border rounded-lg p-4 relative ${
                    index === 0
                      ? "border-black bg-gray-50/30"
                      : "border-gray-200"
                  }`}
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-medium">
                        {index === 0
                          ? "Primary Address"
                          : `Address ${index + 1}`}
                        {index === 0 && (
                          <span className="ml-2 text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                            Default
                          </span>
                        )}
                      </span>
                    </div>
                    {index > 0 && (
                      <button
                        type="button"
                        onClick={() => removeAddress(index)}
                        className="text-red-500 hover:text-red-700 transition hover:cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
                    <FormField
                      label="Full Name"
                      name={`address.${index}.fullName`}
                      required
                      error={fieldErrors[`address.${index}.fullName`]}
                    >
                      <input
                        type="text"
                        name={`address.${index}.fullName`}
                        value={address.fullName}
                        onChange={handleTextOnlyInput}
                        placeholder="John Doe"
                        className="w-full py-1 sm:py-1.5 text-sm sm:text-base border-b border-gray-300 focus:border-black outline-none bg-transparent"
                      />
                    </FormField>

                    <FormField
                      label="Phone"
                      name={`address.${index}.phone`}
                      required
                      error={fieldErrors[`address.${index}.phone`]}
                    >
                      <div className="relative">
                        <span className="absolute left-0 top-1/2 -translate-y-1/2 text-gray-500 font-mono text-sm sm:text-base">
                          +971
                        </span>
                        <input
                          type="tel"
                          name={`address.${index}.phone`}
                          value={getPhoneDisplayValue(address.phone)}
                          onChange={(e) =>
                            handlePhoneChange(
                              "address.phone",
                              e.target.value,
                              index,
                            )
                          }
                          placeholder="XXXXXXXXX"
                          maxLength={9}
                          className="w-full py-1 sm:py-1.5 pl-10 sm:pl-12 text-sm sm:text-base border-b border-gray-300 focus:border-black outline-none bg-transparent font-mono"
                        />
                      </div>
                      <p className="text-[8px] sm:text-[10px] text-gray-400 mt-1">
                        Enter 9 digits after +971
                      </p>
                    </FormField>

                    <FormField
                      label="Emirate"
                      name={`address.${index}.emirate`}
                      required
                      error={fieldErrors[`address.${index}.emirate`]}
                    >
                      <div
                        className="relative"
                        ref={(el) => {
                          emirateRefs.current[index] = el;
                        }}
                      >
                        <button
                          type="button"
                          onClick={() =>
                            setEmirateOpen((prev) => ({
                              ...prev,
                              [index]: !prev[index],
                            }))
                          }
                          className="w-full py-1 sm:py-1.5 text-sm sm:text-base border-b border-gray-300 focus:border-black outline-none bg-transparent flex items-center justify-between hover:cursor-pointer"
                        >
                          <span
                            className={
                              address.emirate ? "text-black" : "text-gray-400"
                            }
                          >
                            {address.emirate
                              ? `${getEmirateEn(address.emirate)} / ${getEmirateAr(address.emirate)}`
                              : "Select Emirate"}
                          </span>
                          {emirateOpen[index] ? (
                            <ChevronUp className="w-4 h-4" />
                          ) : (
                            <ChevronDown className="w-4 h-4" />
                          )}
                        </button>
                        <AnimatePresence>
                          {emirateOpen[index] && (
                            <motion.ul
                              initial={{ opacity: 0, y: -10, scale: 0.95 }}
                              animate={{ opacity: 1, y: 0, scale: 1 }}
                              exit={{ opacity: 0, y: -10, scale: 0.95 }}
                              className="absolute left-0 right-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto z-50 py-1"
                            >
                              {UAE_EMIRATES.map((emirate) => (
                                <li
                                  key={emirate.value}
                                  onClick={() => {
                                    setForm((prev) => {
                                      const newAddresses = [...prev.addresses];
                                      newAddresses[index] = {
                                        ...newAddresses[index],
                                        emirate: emirate.value,
                                      };
                                      return {
                                        ...prev,
                                        addresses: newAddresses,
                                      };
                                    });
                                    setEmirateOpen((prev) => ({
                                      ...prev,
                                      [index]: false,
                                    }));
                                    const errorKey = `address.${index}.emirate`;
                                    if (fieldErrors[errorKey]) {
                                      setFieldErrors((prev) => ({
                                        ...prev,
                                        [errorKey]: "",
                                      }));
                                    }
                                  }}
                                  className="px-4 py-2 hover:bg-gray-50 cursor-pointer text-sm text-black"
                                >
                                  {emirate.en} / {emirate.ar}
                                </li>
                              ))}
                            </motion.ul>
                          )}
                        </AnimatePresence>
                      </div>
                    </FormField>

                    <FormField
                      label="City"
                      name={`address.${index}.city`}
                      required
                      error={fieldErrors[`address.${index}.city`]}
                    >
                      <input
                        type="text"
                        name={`address.${index}.city`}
                        value={address.city}
                        onChange={handleTextOnlyInput}
                        placeholder="Dubai"
                        className="w-full py-1 sm:py-1.5 text-sm sm:text-base border-b border-gray-300 focus:border-black outline-none bg-transparent"
                      />
                    </FormField>

                    <FormField label="Street" name={`address.${index}.street`}>
                      <input
                        type="text"
                        name={`address.${index}.street`}
                        value={address.street}
                        onChange={handleChange}
                        placeholder="Sheikh Zayed Road"
                        className="w-full py-1 sm:py-1.5 text-sm sm:text-base border-b border-gray-300 focus:border-black outline-none bg-transparent"
                      />
                    </FormField>

                    <FormField
                      label="Building"
                      name={`address.${index}.building`}
                    >
                      <input
                        type="text"
                        name={`address.${index}.building`}
                        value={address.building}
                        onChange={handleChange}
                        placeholder="Burj Khalifa"
                        className="w-full py-1 sm:py-1.5 text-sm sm:text-base border-b border-gray-300 focus:border-black outline-none bg-transparent"
                      />
                    </FormField>

                    <FormField
                      label="Postal Code"
                      name={`address.${index}.postalCode`}
                    >
                      <input
                        type="text"
                        name={`address.${index}.postalCode`}
                        value={address.postalCode}
                        onChange={handleNumberOnlyInput}
                        placeholder="12345"
                        className="w-full py-1 sm:py-1.5 text-sm sm:text-base border-b border-gray-300 focus:border-black outline-none bg-transparent"
                      />
                    </FormField>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 sm:gap-4 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={() => (onCancel ? onCancel() : router.push("/account"))}
              className="px-4 sm:px-6 py-1.5 sm:py-2 text-sm sm:text-base border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition hover:cursor-pointer w-full sm:w-auto"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || !form.dob}
              className="px-4 sm:px-6 py-1.5 sm:py-2 text-sm sm:text-base bg-black text-white rounded-lg hover:bg-gray-800 transition disabled:opacity-50 flex items-center justify-center gap-2 hover:cursor-pointer w-full sm:w-auto"
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
