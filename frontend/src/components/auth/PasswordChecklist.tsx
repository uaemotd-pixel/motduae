"use client";

import { getPasswordChecks } from "@/lib/auth/passwordValidation";

type PasswordChecklistProps = {
  password: string;
  labels?: {
    minLength?: string;
    uppercase?: string;
    number?: string;
    special?: string;
  };
};

const defaultLabels = {
  minLength: "At least 8 characters",
  uppercase: "One uppercase letter",
  number: "One number",
  special: "One special character",
};

export default function PasswordChecklist({
  password,
  labels = defaultLabels,
}: PasswordChecklistProps) {
  const checks = getPasswordChecks(password);
  const items = [
    { key: "minLength", met: checks.minLength, label: labels.minLength ?? defaultLabels.minLength },
    { key: "uppercase", met: checks.uppercase, label: labels.uppercase ?? defaultLabels.uppercase },
    { key: "number", met: checks.number, label: labels.number ?? defaultLabels.number },
    { key: "special", met: checks.special, label: labels.special ?? defaultLabels.special },
  ] as const;

  return (
    <ul className="space-y-1.5 mt-2">
      {items.map((item) => (
        <li
          key={item.key}
          className={`flex items-center gap-2 text-[11px] md:text-[12px] tracking-wide ${
            item.met ? "text-green-700" : "text-black/40"
          }`}
        >
          <span
            className={`inline-flex h-4 w-4 items-center justify-center rounded-full border text-[10px] ${
              item.met
                ? "border-green-600 bg-green-50 text-green-700"
                : "border-black/15 bg-transparent text-black/30"
            }`}
            aria-hidden="true"
          >
            {item.met ? "✓" : "•"}
          </span>
          <span>{item.label}</span>
        </li>
      ))}
    </ul>
  );
}
