"use client";

import FormField from "@/components/admin/FormField";
import {
  normalizeIban,
  type PayoutBankDetails,
  type PayoutBankField,
} from "@/lib/partnerPayoutBank";

const DEFAULT_INPUT_CLASS =
  "w-full border border-(--color-border) bg-white px-4 py-3 text-[14px] [font-family:var(--font-body)] text-black focus:border-black focus:outline-none";

export default function PartnerPayoutBankFields({
  value,
  errors,
  onChange,
  t,
  inputClass = DEFAULT_INPUT_CLASS,
}: {
  value: PayoutBankDetails;
  errors: Partial<Record<`payoutBank.${PayoutBankField}`, string>>;
  onChange: (field: PayoutBankField, value: string) => void;
  t: (key: string) => string;
  inputClass?: string;
}) {
  return (
    <section className="space-y-5">
      <h2 className="[font-family:var(--font-ui)] text-[10px] uppercase tracking-[0.24em] text-black">
        {t("sections.payoutBank")}
      </h2>
      <p className="[font-family:var(--font-body)] text-[13px] text-(--color-grey-muted)">
        {t("hints.payoutBank")}
      </p>

      <div className="grid grid-cols-1 gap-x-3 gap-y-4 sm:grid-cols-2 sm:gap-5">
        <FormField
          label={t("fields.accountHolderName")}
          name="payoutBankAccountHolder"
          error={errors["payoutBank.accountHolderName"]}
        >
          <input
            id="payoutBankAccountHolder"
            type="text"
            autoComplete="off"
            value={value.accountHolderName}
            onChange={(e) =>
              onChange("accountHolderName", e.target.value.slice(0, 80))
            }
            placeholder={t("placeholders.accountHolderName")}
            className={inputClass}
          />
        </FormField>

        <FormField
          label={t("fields.bankName")}
          name="payoutBankName"
          error={errors["payoutBank.bankName"]}
        >
          <input
            id="payoutBankName"
            type="text"
            autoComplete="off"
            value={value.bankName}
            onChange={(e) => onChange("bankName", e.target.value.slice(0, 80))}
            placeholder={t("placeholders.bankName")}
            className={inputClass}
          />
        </FormField>

        <div className="sm:col-span-2">
          <FormField
            label={t("fields.iban")}
            name="payoutBankIban"
            error={errors["payoutBank.iban"]}
            hint={t("hints.iban")}
          >
            <input
              id="payoutBankIban"
              type="text"
              inputMode="text"
              autoComplete="off"
              spellCheck={false}
              value={value.iban}
              onChange={(e) => onChange("iban", normalizeIban(e.target.value))}
              placeholder={t("placeholders.iban")}
              maxLength={34}
              className={`${inputClass} uppercase tracking-[0.08em]`}
            />
          </FormField>
        </div>
      </div>
    </section>
  );
}
