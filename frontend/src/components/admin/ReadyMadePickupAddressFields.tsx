"use client";

import { useState } from "react";
import FormField from "@/components/admin/FormField";
import { type ShopPickupAddress } from "@/lib/fabricShop";
import { extractDigits } from "@/lib/uaePhone";
import { UAE_EMIRATES, getEmirateEn, getEmirateAr } from "@/lib/uaeAddress";
import AnimatedDropdown from "@/components/shared/AnimatedDropdown";

const INPUT_CLASS =
  "w-full py-1 border-b border-gray-300 focus:border-black outline-none text-xs sm:text-sm";

type Props = {
  value: ShopPickupAddress;
  onChange: (next: ShopPickupAddress) => void;
  fieldErrors?: Record<string, string>;
  title?: string;
  description?: string;
};

export default function ReadyMadePickupAddressFields({
  value,
  onChange,
  fieldErrors = {},
  title = "Pickup address",
  description = "Shipa collects this listing from this address. For MOTD returns, use the warehouse the admin decides.",
}: Props) {
  const [emirateOpen, setEmirateOpen] = useState(false);

  const handleChange = (field: keyof ShopPickupAddress, raw: string) => {
    let nextValue = raw;
    if (field === "phone") {
      let digits = extractDigits(raw);
      if (digits.startsWith("971")) digits = digits.slice(3);
      nextValue = digits.slice(0, 9);
    }
    onChange({ ...value, [field]: nextValue });
  };

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-[10px] uppercase tracking-[0.24em] text-black">
          {title}
        </h2>
        <p className="text-[12px] text-gray-500 mt-1">{description}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <FormField
          label="Contact name"
          name="pickupAddress.fullName"
          required
          error={fieldErrors["pickupAddress.fullName"]}
        >
          <input
            value={value.fullName}
            onChange={(e) => handleChange("fullName", e.target.value)}
            placeholder="MOTD warehouse / contact"
            className={INPUT_CLASS}
          />
        </FormField>

        <FormField
          label="Phone"
          name="pickupAddress.phone"
          required
          error={fieldErrors["pickupAddress.phone"]}
        >
          <div className="flex items-center border-b border-gray-300 focus-within:border-black">
            <span className="pr-2 text-xs text-gray-400 select-none">+971</span>
            <input
              type="tel"
              inputMode="numeric"
              maxLength={9}
              value={value.phone}
              onChange={(e) => handleChange("phone", e.target.value)}
              placeholder="501234567"
              className="w-full py-1 outline-none text-xs sm:text-sm font-mono"
            />
          </div>
        </FormField>

        <FormField
          label="Emirate"
          name="pickupAddress.emirate"
          required
          error={fieldErrors["pickupAddress.emirate"]}
        >
          <AnimatedDropdown
            isOpen={emirateOpen}
            onClose={() => setEmirateOpen(false)}
            trigger={
              <button
                type="button"
                onClick={() => setEmirateOpen(!emirateOpen)}
                className="w-full py-1 border-b border-gray-300 focus:border-black text-left bg-transparent text-xs sm:text-sm flex items-center justify-between hover:cursor-pointer"
              >
                <span className={value.emirate ? "text-black" : "text-gray-400"}>
                  {value.emirate
                    ? `${getEmirateEn(value.emirate)} / ${getEmirateAr(value.emirate)}`
                    : "Select emirate"}
                </span>
                <span className="text-gray-400">▾</span>
              </button>
            }
            dropdownClassName="w-full bg-white rounded-xl shadow-lg border border-gray-200 max-h-60 overflow-y-auto py-1"
            position="bottom-left"
          >
            <button
              type="button"
              onClick={() => {
                handleChange("emirate", "");
                setEmirateOpen(false);
              }}
              className="w-full px-3 sm:px-4 py-1.5 sm:py-2 text-left text-xs sm:text-sm hover:bg-gray-100 hover:cursor-pointer text-gray-400"
            >
              Select emirate
            </button>
            {UAE_EMIRATES.map((emirate) => (
              <button
                key={emirate.value}
                type="button"
                onClick={() => {
                  handleChange("emirate", emirate.value);
                  setEmirateOpen(false);
                }}
                className="w-full px-3 sm:px-4 py-1.5 sm:py-2 text-left text-xs sm:text-sm hover:bg-gray-100 hover:cursor-pointer flex items-center gap-2"
              >
                <span>{emirate.en}</span>
                <span className="text-gray-400 shrink-0">/</span>
                <span>{emirate.ar}</span>
              </button>
            ))}
          </AnimatedDropdown>
        </FormField>

        <FormField
          label="City"
          name="pickupAddress.city"
          required
          error={fieldErrors["pickupAddress.city"]}
        >
          <input
            value={value.city}
            onChange={(e) => handleChange("city", e.target.value)}
            placeholder="City"
            className={INPUT_CLASS}
          />
        </FormField>

        <FormField
          label="Street / line 1"
          name="pickupAddress.line1"
          required
          error={fieldErrors["pickupAddress.line1"]}
        >
          <input
            value={value.line1}
            onChange={(e) => handleChange("line1", e.target.value)}
            placeholder="Street, building"
            className={INPUT_CLASS}
          />
        </FormField>

        <FormField
          label="Line 2"
          name="pickupAddress.line2"
          error={fieldErrors["pickupAddress.line2"]}
        >
          <input
            value={value.line2}
            onChange={(e) => handleChange("line2", e.target.value)}
            placeholder="Unit, notes (optional)"
            className={INPUT_CLASS}
          />
        </FormField>
      </div>
    </section>
  );
}
