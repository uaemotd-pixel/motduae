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
  getEmirateEn,
  getEmirateAr,
  validateAddress,
} from "@/lib/uaeAddress";

type Relationship =
  | "wife"
  | "mother"
  | "aunt"
  | "sister"
  | "daughter"
  | "friend"
  | "other"
  | "";

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
    relationship: Relationship | string;
    phone: string;
    dob?: string | Date;
    profilePic?: string;
    address?: Partial<FormData["address"]>;
  };
};

const DEFAULT_FORM: FormData = {
  name: "",
  relationship: "",
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

const KNOWN_RELATIONSHIPS = RELATIONSHIP_OPTIONS.map((o) => o.value);

export default function FamilyMembersForm({
  onCancel,
  onSuccess,
  initialData,
}: FamilyMemberFormProps) {
  const isEdit = !!initialData?._id;
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState<FormData>(DEFAULT_FORM);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [emirateOpen, setEmirateOpen] = useState(false);
  const emirateRef = useRef<HTMLDivElement>(null);
  const [relationshipOpen, setRelationshipOpen] = useState(false);
  const relationshipRef = useRef<HTMLDivElement>(null);

  const clearFieldError = (key: string) => {
    setFieldErrors((prev) => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

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
      const isKnown = KNOWN_RELATIONSHIPS.includes(
        initialData.relationship as (typeof KNOWN_RELATIONSHIPS)[number],
      );
      const normalizedPhone = normalizeUaePhone(initialData.phone || "");
      const normalizedAddrPhone = normalizeUaePhone(
        initialData.address?.phone || "",
      );

      setForm({
        name: initialData.name || "",
        relationship: isKnown
          ? (initialData.relationship as Relationship)
          : "other",
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
        clearFieldError("phone");
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
        clearFieldError("address.phone");
      }
      return;
    }

    if (name.startsWith("address.")) {
      const field = name.split(".")[1];
      setForm((prev) => ({
        ...prev,
        address: { ...prev.address, [field]: value },
      }));
      clearFieldError(name);
    } else {
      setForm((prev) => ({ ...prev, [name]: value }));
      clearFieldError(name);
    }
  };

  const handlePhoneBlur = (field: "phone" | "address.phone") => {
    const phoneValue = field === "phone" ? form.phone : form.address.phone;
    const updateForm =
      field === "phone"
        ? (val: string) => setForm((prev) => ({ ...prev, phone: val }))
        : (val: string) =>
            setForm((prev) => ({
              ...prev,
              address: { ...prev.address, phone: val },
            }));

    if (!phoneValue || phoneValue === "+971") {
      setFieldErrors((prev) => ({
        ...prev,
        [field]: "Phone number is required",
      }));
      return;
    }

    if (!isValidUaePhone(phoneValue)) {
      setFieldErrors((prev) => ({
        ...prev,
        [field]: "Invalid phone. Must be 9 digits after +971",
      }));
    } else {
      clearFieldError(field);
      updateForm(normalizeUaePhone(phoneValue));
    }
  };

  const validate = (): {
    isValid: boolean;
    firstError?: string;
    firstKey?: string;
  } => {
    const errors: Record<string, string> = {};

    if (!form.name.trim()) {
      errors.name = "Full name is required";
    }

    if (!form.phone || form.phone === "+971") {
      errors.phone = "Phone number is required";
    } else if (!isValidUaePhone(form.phone)) {
      errors.phone = "Invalid phone. Must be 9 digits after +971";
    }

    if (!form.relationship) {
      errors.relationship = "Relationship is required";
    } else if (
      form.relationship === "other" &&
      !form.customRelationship.trim()
    ) {
      errors.customRelationship = "Please specify the relationship";
    }

    if (!form.dob) {
      errors.dob = "Date of birth is required";
    } else {
      const selected = new Date(form.dob + "T00:00:00");
      const now = new Date();
      if (
        selected.getTime() >
        new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
      ) {
        errors.dob = "D.O.B cannot be in the future";
      }
    }

    const addressValidation = validateAddress(form.address);
    Object.entries(addressValidation.errors).forEach(([key, message]) => {
      if (message) errors[`address.${key}`] = message;
    });

    setFieldErrors(errors);
    const firstKey = Object.keys(errors).find((key) => Boolean(errors[key]));
    return {
      isValid: Object.keys(errors).length === 0,
      firstError: firstKey ? errors[firstKey] : undefined,
      firstKey,
    };
  };

  const scrollToField = (fieldKey?: string) => {
    if (!fieldKey || typeof document === "undefined") return;
    requestAnimationFrame(() => {
      const byData = document.querySelector(
        `[data-field="${CSS.escape(fieldKey)}"]`,
      ) as HTMLElement | null;
      const byName = document.querySelector(
        `[name="${CSS.escape(fieldKey)}"]`,
      ) as HTMLElement | null;
      const target = byData || byName;
      if (!target) return;
      target.scrollIntoView({ behavior: "smooth", block: "center" });
      const focusable = (byName ||
        target.querySelector("input, button, select, textarea")) as
        | HTMLElement
        | null;
      focusable?.focus?.({ preventScroll: true });
    });
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

    const { isValid, firstError, firstKey } = validate();
    if (!isValid) {
      toast.error(
        firstError || "Please fill all required fields before saving.",
        ERROR_TOAST,
      );
      scrollToField(firstKey);
      return;
    }

    setSubmitting(true);
    try {
      const normalizedPhone = normalizeUaePhone(form.phone);
      const normalizedAddrPhone = normalizeUaePhone(form.address.phone);

      const relationshipValue =
        form.relationship === "other"
          ? form.customRelationship.trim()
          : form.relationship;

      const payload = {
        name: form.name.trim(),
        phone: normalizedPhone,
        relationship: relationshipValue,
        dob: form.dob,
        address: {
          fullName: form.address.fullName.trim(),
          phone: normalizedAddrPhone,
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
    <div className="relative" data-field={name}>
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
    <div>
      <div className="border-b border-gray-100 pb-3 sm:pb-4 mb-1">
        <h1 className="font-display text-xl sm:text-2xl font-medium text-black">
          {isEdit ? "Edit Family Member" : "Add Family Member"}
        </h1>
        <p className="mt-1 font-body text-xs sm:text-sm text-gray-500">
          {isEdit
            ? "Update family member details."
            : "Add a family member who can receive deliveries on your behalf."}
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="pt-4 sm:pt-6 space-y-5 sm:space-y-8"
        noValidate
      >
        <section>
          <h2 className="text-sm sm:text-base font-medium text-black mb-4 sm:mb-6">
            Personal Information
          </h2>
          <div className="grid grid-cols-2 gap-x-3 gap-y-4 sm:gap-4">
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
                data-field="name"
                className="w-full h-11 md:h-12 bg-transparent border-b border-black/15 text-[15px] md:text-[16px] font-body rounded-none px-0 transition-all focus:border-black focus:outline-none placeholder:text-black/40 text-black"
                placeholder="Fatima Ahmed"
              />
            </FormField>

            <FormField
              label="Phone"
              name="phone"
              required
              error={fieldErrors.phone}
            >
              {renderPhoneInput(
                form.phone,
                handleChange,
                () => handlePhoneBlur("phone"),
                "XXXXXXXXX",
                "phone",
              )}
            </FormField>

            <FormField
              label="Relationship"
              name="relationship"
              required
              error={
                fieldErrors.relationship || fieldErrors.customRelationship
              }
            >
              <div
                className="relative"
                ref={relationshipRef}
                data-field="relationship"
              >
                <button
                  type="button"
                  onClick={() => setRelationshipOpen(!relationshipOpen)}
                  className="w-full h-11 md:h-12 bg-transparent border-b border-black/15 text-[15px] md:text-[16px] font-body rounded-none px-0 transition-all focus:border-black focus:outline-none text-black flex items-center justify-between hover:cursor-pointer"
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
                                customRelationship:
                                  option.value === "other"
                                    ? prev.customRelationship
                                    : "",
                              }));
                              clearFieldError("relationship");
                              clearFieldError("customRelationship");
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
                    data-field="customRelationship"
                    placeholder="Please specify relationship..."
                    className="w-full h-11 md:h-12 bg-transparent border-b border-black/15 text-[15px] md:text-[16px] font-body rounded-none px-0 transition-all focus:border-black focus:outline-none placeholder:text-black/40 text-black"
                  />
                </div>
              )}
            </FormField>

            <FormField
              label="D.O.B"
              name="dob"
              required
              error={fieldErrors.dob}
            >
              <input
                type="date"
                name="dob"
                value={form.dob}
                onChange={handleChange}
                max={new Date().toISOString().slice(0, 10)}
                data-field="dob"
                className="w-full h-11 md:h-12 bg-transparent border-b border-black/15 text-[15px] md:text-[16px] font-body rounded-none px-0 transition-all focus:border-black focus:outline-none placeholder:text-black/40 text-black"
              />
            </FormField>
          </div>
        </section>

        <section>
          <h2 className="text-sm sm:text-base font-medium text-black mb-4 sm:mb-6">
            Delivery Address
          </h2>
          <p className="text-xs text-gray-500 mb-4 sm:mb-6 -mt-2 sm:-mt-3">
            All fields are required except postal code.
          </p>
          <div className="grid grid-cols-2 gap-x-3 gap-y-4 sm:gap-4">
            <FormField
              label="Full Name"
              name="address.fullName"
              required
              error={fieldErrors["address.fullName"]}
            >
              <input
                type="text"
                name="address.fullName"
                value={form.address.fullName}
                onChange={handleChange}
                data-field="address.fullName"
                placeholder="Full name"
                className="w-full h-11 md:h-12 bg-transparent border-b border-black/15 text-[15px] md:text-[16px] font-body rounded-none px-0 transition-all focus:border-black focus:outline-none placeholder:text-black/40 text-black"
              />
            </FormField>

            <FormField
              label="Phone"
              name="address.phone"
              required
              error={fieldErrors["address.phone"]}
            >
              {renderPhoneInput(
                form.address.phone,
                handleChange,
                () => handlePhoneBlur("address.phone"),
                "XXXXXXXXX",
                "address.phone",
              )}
            </FormField>

            <FormField
              label="Emirate"
              name="address.emirate"
              required
              error={fieldErrors["address.emirate"]}
            >
              <div
                className="relative"
                ref={emirateRef}
                data-field="address.emirate"
              >
                <button
                  type="button"
                  onClick={() => setEmirateOpen(!emirateOpen)}
                  className="w-full h-11 md:h-12 bg-transparent border-b border-black/15 text-[15px] md:text-[16px] font-body rounded-none px-0 transition-all focus:border-black focus:outline-none text-black flex items-center justify-between hover:cursor-pointer"
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
                              clearFieldError("address.emirate");
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
                data-field="address.city"
                placeholder="Dubai"
                className="w-full h-11 md:h-12 bg-transparent border-b border-black/15 text-[15px] md:text-[16px] font-body rounded-none px-0 transition-all focus:border-black focus:outline-none placeholder:text-black/40 text-black"
              />
            </FormField>

            <FormField
              label="Street"
              name="address.street"
              required
              error={fieldErrors["address.street"]}
            >
              <input
                type="text"
                name="address.street"
                value={form.address.street}
                onChange={handleChange}
                data-field="address.street"
                placeholder="Sheikh Zayed Road"
                className="w-full h-11 md:h-12 bg-transparent border-b border-black/15 text-[15px] md:text-[16px] font-body rounded-none px-0 transition-all focus:border-black focus:outline-none placeholder:text-black/40 text-black"
              />
            </FormField>

            <FormField
              label="Building"
              name="address.building"
              required
              error={fieldErrors["address.building"]}
            >
              <input
                type="text"
                name="address.building"
                value={form.address.building}
                onChange={handleChange}
                data-field="address.building"
                placeholder="Burj Khalifa"
                className="w-full h-11 md:h-12 bg-transparent border-b border-black/15 text-[15px] md:text-[16px] font-body rounded-none px-0 transition-all focus:border-black focus:outline-none placeholder:text-black/40 text-black"
              />
            </FormField>

            <FormField label="Postal Code" name="address.postalCode">
              <input
                type="text"
                name="address.postalCode"
                value={form.address.postalCode}
                onChange={handleChange}
                placeholder="12345"
                className="w-full h-11 md:h-12 bg-transparent border-b border-black/15 text-[15px] md:text-[16px] font-body rounded-none px-0 transition-all focus:border-black focus:outline-none placeholder:text-black/40 text-black"
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
