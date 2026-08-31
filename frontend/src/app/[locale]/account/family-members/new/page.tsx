"use client";

import { useState, useEffect, useRef } from "react";
import { Save, Loader2, X, ChevronDown, ChevronUp } from "lucide-react";
import toast from "react-hot-toast";
import { api } from "@/lib/api/client";
import FormField from "@/components/admin/FormField";
import { motion, AnimatePresence } from "framer-motion";
import { SUCCESS_TOAST, ERROR_TOAST } from "@/lib/tailorPortalToast";
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

type Relationship =
  | "wife"
  | "mother"
  | "aunt"
  | "sister"
  | "daughter"
  | "friend"
  | "other";

type FormData = {
  name: string;
  relationship: Relationship;
  customRelationship: string;
  phone: string;
  dob: string;
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
    dob?: string | Date;
    profilePic?: string;
    address?: Partial<FormData["address"]>;
  };
};

const DEFAULT_FORM: FormData = {
  name: "",
  relationship: "other",
  customRelationship: "",
  phone: "",
  dob: "",
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

const RELATIONSHIP_OPTIONS = [
  { value: "wife", label: "Wife" },
  { value: "mother", label: "Mother" },
  { value: "aunt", label: "Aunt" },
  { value: "sister", label: "Sister" },
  { value: "daughter", label: "Daughter" },
  { value: "friend", label: "Friend" },
  { value: "other", label: "Other" },
];

export default function FamilyMembersForm({
  onCancel,
  onSuccess,
  initialData,
}: FamilyMemberFormProps) {
  const isEdit = !!initialData?._id;
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState<FormData>(DEFAULT_FORM);
  const [phoneError, setPhoneError] = useState<string>("");
  const [addrPhoneError, setAddrPhoneError] = useState<string>("");
  const [emirateOpen, setEmirateOpen] = useState(false);
  const emirateRef = useRef<HTMLDivElement>(null);
  const [relationshipOpen, setRelationshipOpen] = useState(false);
  const relationshipRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        emirateRef.current &&
        !emirateRef.current.contains(e.target as Node)
      ) {
        setEmirateOpen(false);
      }
      if (
        relationshipRef.current &&
        !relationshipRef.current.contains(e.target as Node)
      ) {
        setRelationshipOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (initialData) {
      const knownRelationships = [
        "wife",
        "mother",
        "aunt",
        "sister",
        "daughter",
        "friend",
        "other",
      ];
      const isKnown = knownRelationships.includes(initialData.relationship);
      const normalizedPhone = normalizeUaePhone(initialData.phone || "");
      const normalizedAddrPhone = normalizeUaePhone(
        initialData.address?.phone || "",
      );

      setForm({
        name: initialData.name || "",
        relationship: isKnown ? initialData.relationship : "other",
        customRelationship: isKnown ? "" : initialData.relationship || "",
        phone: normalizedPhone,
        address: {
          fullName: initialData.address?.fullName || "",
          phone: normalizedAddrPhone,
          emirate: initialData.address?.emirate || "",
          city: initialData.address?.city || "",
          street: initialData.address?.street || "",
          building: initialData.address?.building || "",
          postalCode: initialData.address?.postalCode || "",
        },
        dob: initialData.dob
          ? new Date(initialData.dob).toISOString().slice(0, 10)
          : "",
      });
    }
  }, [initialData]);

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >,
  ) => {
    const { name, value } = e.target;

    if (name === "phone") {
      const digits = extractDigits(value);
      if (digits.length <= 9) {
        const normalized = normalizeUaePhone(digits);
        setForm((prev) => ({ ...prev, phone: normalized }));
        if (phoneError) setPhoneError("");
      }
      return;
    }

    if (name === "address.phone") {
      const digits = extractDigits(value);
      if (digits.length <= 9) {
        const normalized = normalizeUaePhone(digits);
        setForm((prev) => ({
          ...prev,
          address: { ...prev.address, phone: normalized },
        }));
        if (addrPhoneError) setAddrPhoneError("");
      }
      return;
    }

    if (name.startsWith("address.")) {
      const field = name.split(".")[1];
      setForm((prev) => ({
        ...prev,
        address: { ...prev.address, [field]: value },
      }));
    } else {
      setForm((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handlePhoneBlur = (field: "phone" | "address.phone") => {
    const phoneValue = field === "phone" ? form.phone : form.address.phone;
    const setError = field === "phone" ? setPhoneError : setAddrPhoneError;
    const updateForm =
      field === "phone"
        ? (val: string) => setForm((prev) => ({ ...prev, phone: val }))
        : (val: string) =>
            setForm((prev) => ({
              ...prev,
              address: { ...prev.address, phone: val },
            }));

    if (!phoneValue) {
      setError("Phone number is required");
      return;
    }

    const isValid = isValidUaePhone(phoneValue);
    if (!isValid) {
      setError("Invalid UAE number. Must be +971 followed by 9 digits");
    } else {
      setError("");
      const normalized = normalizeUaePhone(phoneValue);
      updateForm(normalized);
    }
  };

  const getPhoneDisplayValue = (phone: string): string => {
    if (!phone) return "";
    const digits = extractDigits(phone);
    if (digits.startsWith("971")) {
      return digits.slice(3);
    }
    return digits.slice(0, 9);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (form.dob) {
      const selected = new Date(form.dob + "T00:00:00");
      const now = new Date();
      if (
        selected.getTime() >
        new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
      ) {
        toast.error("D.O.B cannot be in the future");
        return;
      }
    }

    if (!form.name.trim()) {
      toast.error("Full name is required", ERROR_TOAST);
      return;
    }

    const phoneValidation = isValidUaePhone(form.phone);
    if (!form.phone) {
      toast.error("Phone number is required", ERROR_TOAST);
      return;
    }
    if (!phoneValidation) {
      toast.error(
        "Invalid UAE number. Must be +971 followed by 9 digits",
        ERROR_TOAST,
      );
      return;
    }

    if (form.address.phone) {
      const addrPhoneValid = isValidUaePhone(form.address.phone);
      if (!addrPhoneValid) {
        toast.error(
          "Invalid UAE number for address. Must be +971 followed by 9 digits",
          ERROR_TOAST,
        );
        return;
      }
    }

    if (form.address.emirate && !isValidEmirate(form.address.emirate)) {
      toast.error("Valid UAE emirate required", ERROR_TOAST);
      return;
    }

    setSubmitting(true);
    try {
      const normalizedPhone = normalizeUaePhone(form.phone);
      const normalizedAddrPhone = form.address.phone
        ? normalizeUaePhone(form.address.phone)
        : "";

      const relationshipValue =
        form.relationship === "other" && form.customRelationship.trim()
          ? form.customRelationship.trim()
          : form.relationship;

      const addressHasData =
        form.address.fullName.trim() ||
        (form.address.phone.trim() && form.address.phone.trim() !== "+971") ||
        form.address.emirate.trim() ||
        form.address.city.trim() ||
        form.address.street.trim() ||
        form.address.building.trim() ||
        form.address.postalCode.trim();

      const payload: any = {
        name: form.name.trim(),
        phone: normalizedPhone,
        relationship: relationshipValue,
        dob: form.dob || undefined,
      };

      if (addressHasData) {
        payload.address = {
          fullName: form.address.fullName.trim() || form.name.trim(),
          phone: normalizedAddrPhone || normalizedPhone,
          emirate: form.address.emirate.trim(),
          city: form.address.city.trim(),
          street: form.address.street.trim(),
          building: form.address.building.trim(),
          postalCode: form.address.postalCode.trim(),
        };
      }

      if (isEdit) {
        await api.put(
          `/api/customer/family-members/${initialData._id}`,
          payload,
        );
        toast.success("Member updated", SUCCESS_TOAST);
      } else {
        await api.post("/api/customer/family-members", payload);
        toast.success("Member added", SUCCESS_TOAST);
      }
      onSuccess();
    } catch (err: any) {
      toast.error(err.message || "Operation failed", ERROR_TOAST);
    } finally {
      setSubmitting(false);
    }
  };

  const renderPhoneInput = (
    value: string,
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void,
    onBlur: () => void,
    placeholder: string,
    name: string,
  ) => (
    <div className="relative">
      <div className="flex items-center border-b border-black/15 focus-within:border-black transition-all">
        <span className="text-black/40 font-mono text-[15px] md:text-[16px] pr-2">
          +971
        </span>
        <input
          type="tel"
          name={name}
          value={getPhoneDisplayValue(value)}
          onChange={onChange}
          onBlur={onBlur}
          placeholder={placeholder}
          maxLength={9}
          className="flex-1 h-11 md:h-12 bg-transparent text-[15px] md:text-[16px] font-mono rounded-none px-0 focus:outline-none placeholder:text-black/40 text-black"
        />
      </div>
      <p className="text-[10px] text-gray-400 mt-1">
        Enter 9 digits after +971
      </p>
    </div>
  );

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100">
      <div className="border-b border-gray-100 px-4 sm:px-6 md:px-8 py-4 sm:py-5 md:py-6">
        <h1 className="text-xl sm:text-2xl font-medium text-black">
          {isEdit ? "Edit Family Member" : "Add Family Member"}
        </h1>
        <p className="mt-1 text-xs sm:text-sm text-gray-500">
          {isEdit
            ? "Update family member details."
            : "Add a family member who can receive deliveries on your behalf."}
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="p-4 sm:p-6 md:p-8 space-y-6 sm:space-y-8 md:space-y-10"
      >
        <section>
          <h2 className="text-sm sm:text-base font-medium text-black mb-4 sm:mb-6">
            Personal Information
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
            <FormField label="Full Name" name="name" required>
              <input
                type="text"
                name="name"
                value={form.name}
                onChange={handleChange}
                required
                className="w-full h-11 md:h-12 bg-transparent border-b border-black/15 text-[15px] md:text-[16px] font-body-md rounded-none px-0 transition-all focus:border-black focus:outline-none placeholder:text-black/40 text-black"
                placeholder="Fatima Ahmed"
              />
            </FormField>

            <FormField label="Phone" name="phone" required error={phoneError}>
              {renderPhoneInput(
                form.phone,
                handleChange,
                () => handlePhoneBlur("phone"),
                "XXXXXXXXX",
                "phone",
              )}
            </FormField>

            <FormField label="Relationship" name="relationship">
              <div className="relative" ref={relationshipRef}>
                <button
                  type="button"
                  onClick={() => setRelationshipOpen(!relationshipOpen)}
                  className="w-full h-11 md:h-12 bg-transparent border-b border-black/15 text-[15px] md:text-[16px] font-body-md rounded-none px-0 transition-all focus:border-black focus:outline-none text-black flex items-center justify-between hover:cursor-pointer"
                >
                  <span
                    className={
                      form.relationship ? "text-black" : "text-black/40"
                    }
                  >
                    {form.relationship
                      ? RELATIONSHIP_OPTIONS.find(
                          (opt) => opt.value === form.relationship,
                        )?.label
                      : "Select Relationship"}
                  </span>
                  {relationshipOpen ? (
                    <ChevronUp className="w-4 h-4 text-black/40" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-black/40" />
                  )}
                </button>

                <AnimatePresence>
                  {relationshipOpen && (
                    <motion.ul
                      initial={{ opacity: 0, y: -10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -10, scale: 0.95 }}
                      transition={{ duration: 0.15, ease: "easeOut" }}
                      className="absolute left-0 right-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto z-50 py-1"
                      style={{ overscrollBehavior: "contain" }}
                      onWheel={(e) => e.stopPropagation()}
                      onTouchMove={(e) => e.stopPropagation()}
                    >
                      {RELATIONSHIP_OPTIONS.map((option) => (
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
                                relationship: option.value as Relationship,
                              }));
                              setRelationshipOpen(false);
                            }}
                            className={`w-full text-left px-4 py-2.5 text-[15px] md:text-[16px] hover:bg-gray-50 transition hover:cursor-pointer ${
                              form.relationship === option.value
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
              {form.relationship === "other" && (
                <div className="mt-3">
                  <input
                    type="text"
                    name="customRelationship"
                    value={form.customRelationship}
                    onChange={handleChange}
                    placeholder="Please specify relationship..."
                    className="w-full h-11 md:h-12 bg-transparent border-b border-black/15 text-[15px] md:text-[16px] font-body-md rounded-none px-0 transition-all focus:border-black focus:outline-none placeholder:text-black/40 text-black"
                  />
                </div>
              )}
            </FormField>

            <FormField label="D.O.B" name="dob">
              <input
                type="date"
                name="dob"
                value={form.dob}
                onChange={handleChange}
                max={new Date().toISOString().slice(0, 10)}
                className="w-full h-11 md:h-12 bg-transparent border-b border-black/15 text-[15px] md:text-[16px] font-body-md rounded-none px-0 transition-all focus:border-black focus:outline-none placeholder:text-black/40 text-black"
              />
            </FormField>
          </div>
        </section>

        <section>
          <h2 className="text-sm sm:text-base font-medium text-black mb-4 sm:mb-6">
            Delivery Address (Optional)
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
            <FormField label="Full Name" name="address.fullName">
              <input
                type="text"
                name="address.fullName"
                value={form.address.fullName}
                onChange={handleChange}
                placeholder="Full name"
                className="w-full h-11 md:h-12 bg-transparent border-b border-black/15 text-[15px] md:text-[16px] font-body-md rounded-none px-0 transition-all focus:border-black focus:outline-none placeholder:text-black/40 text-black"
              />
            </FormField>

            <FormField
              label="Phone"
              name="address.phone"
              error={addrPhoneError}
            >
              {renderPhoneInput(
                form.address.phone,
                handleChange,
                () => handlePhoneBlur("address.phone"),
                "XXXXXXXXX",
                "address.phone",
              )}
            </FormField>

            <FormField label="Emirate" name="address.emirate">
              <div className="relative" ref={emirateRef}>
                <button
                  type="button"
                  onClick={() => setEmirateOpen(!emirateOpen)}
                  className="w-full h-11 md:h-12 bg-transparent border-b border-black/15 text-[15px] md:text-[16px] font-body-md rounded-none px-0 transition-all focus:border-black focus:outline-none text-black flex items-center justify-between hover:cursor-pointer"
                >
                  <span
                    className={
                      form.address.emirate ? "text-black" : "text-black/40"
                    }
                  >
                    {form.address.emirate
                      ? `${getEmirateEn(form.address.emirate)} / ${getEmirateAr(form.address.emirate)}`
                      : "Select Emirate"}
                  </span>
                  {emirateOpen ? (
                    <ChevronUp className="w-4 h-4 text-black/40" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-black/40" />
                  )}
                </button>

                <AnimatePresence>
                  {emirateOpen && (
                    <motion.ul
                      initial={{ opacity: 0, y: -10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -10, scale: 0.95 }}
                      transition={{ duration: 0.15, ease: "easeOut" }}
                      className="absolute left-0 right-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto z-50 py-1"
                      style={{ overscrollBehavior: "contain" }}
                      onWheel={(e) => e.stopPropagation()}
                      onTouchMove={(e) => e.stopPropagation()}
                    >
                      {UAE_EMIRATES.map((emirate) => (
                        <motion.li
                          key={emirate.value}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: 0.05 }}
                        >
                          <button
                            type="button"
                            onClick={() => {
                              setForm((prev) => ({
                                ...prev,
                                address: {
                                  ...prev.address,
                                  emirate: emirate.value,
                                },
                              }));
                              setEmirateOpen(false);
                            }}
                            className={`w-full text-left px-4 py-2.5 text-[15px] md:text-[16px] hover:bg-gray-50 transition hover:cursor-pointer ${
                              form.address.emirate === emirate.value
                                ? "text-black font-medium bg-gray-50"
                                : "text-gray-700"
                            }`}
                          >
                            {emirate.en} / {emirate.ar}
                          </button>
                        </motion.li>
                      ))}
                    </motion.ul>
                  )}
                </AnimatePresence>
              </div>
            </FormField>

            <FormField label="City" name="address.city">
              <input
                type="text"
                name="address.city"
                value={form.address.city}
                onChange={handleChange}
                placeholder="Dubai"
                className="w-full h-11 md:h-12 bg-transparent border-b border-black/15 text-[15px] md:text-[16px] font-body-md rounded-none px-0 transition-all focus:border-black focus:outline-none placeholder:text-black/40 text-black"
              />
            </FormField>

            <FormField label="Street" name="address.street">
              <input
                type="text"
                name="address.street"
                value={form.address.street}
                onChange={handleChange}
                placeholder="Sheikh Zayed Road"
                className="w-full h-11 md:h-12 bg-transparent border-b border-black/15 text-[15px] md:text-[16px] font-body-md rounded-none px-0 transition-all focus:border-black focus:outline-none placeholder:text-black/40 text-black"
              />
            </FormField>

            <FormField label="Building" name="address.building">
              <input
                type="text"
                name="address.building"
                value={form.address.building}
                onChange={handleChange}
                placeholder="Burj Khalifa"
                className="w-full h-11 md:h-12 bg-transparent border-b border-black/15 text-[15px] md:text-[16px] font-body-md rounded-none px-0 transition-all focus:border-black focus:outline-none placeholder:text-black/40 text-black"
              />
            </FormField>

            <FormField label="Postal Code" name="address.postalCode">
              <input
                type="text"
                name="address.postalCode"
                value={form.address.postalCode}
                onChange={handleChange}
                placeholder="12345"
                className="w-full h-11 md:h-12 bg-transparent border-b border-black/15 text-[15px] md:text-[16px] font-body-md rounded-none px-0 transition-all focus:border-black focus:outline-none placeholder:text-black/40 text-black"
              />
            </FormField>
          </div>
        </section>

        <div className="border-t border-gray-100 pt-4 sm:pt-6 flex flex-col-reverse sm:flex-row justify-end gap-2 sm:gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg border border-gray-300 px-4 sm:px-5 py-2 sm:py-2.5 text-gray-700 hover:bg-gray-50 transition flex items-center justify-center gap-2 text-sm sm:text-base w-full sm:w-auto hover:cursor-pointer"
          >
            <X className="w-4 h-4" />
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="rounded-lg bg-black px-4 sm:px-5 py-2 sm:py-2.5 text-white flex items-center justify-center gap-2 disabled:opacity-50 hover:bg-gray-800 transition text-sm sm:text-base w-full sm:w-auto hover:cursor-pointer"
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
