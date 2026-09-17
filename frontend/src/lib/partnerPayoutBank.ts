export type PayoutBankDetails = {
  accountHolderName: string;
  iban: string;
  bankName: string;
};

export function emptyPayoutBank(): PayoutBankDetails {
  return { accountHolderName: "", iban: "", bankName: "" };
}

export function normalizeIban(value: string): string {
  return String(value || "")
    .replace(/[\s-]/g, "")
    .toUpperCase();
}

export function formatIbanDisplay(value: string): string {
  const iban = normalizeIban(value);
  return iban.replace(/(.{4})/g, "$1 ").trim();
}

function ibanMod97(iban: string): boolean {
  const rearranged = iban.slice(4) + iban.slice(0, 4);
  let expanded = "";
  for (const ch of rearranged) {
    const code = ch.charCodeAt(0);
    if (code >= 65 && code <= 90) expanded += String(code - 55);
    else expanded += ch;
  }
  let rest = 0;
  for (let i = 0; i < expanded.length; i += 7) {
    rest = Number(String(rest) + expanded.slice(i, i + 7)) % 97;
  }
  return rest === 1;
}

export function isValidUaeIban(value: string): boolean {
  const iban = normalizeIban(value);
  if (!/^AE\d{21}$/.test(iban)) return false;
  return ibanMod97(iban);
}

export function normalizePayoutBank(
  bank?: Partial<PayoutBankDetails> | null,
): PayoutBankDetails {
  return {
    accountHolderName: String(bank?.accountHolderName || "")
      .trim()
      .replace(/\s+/g, " ")
      .slice(0, 80),
    iban: normalizeIban(bank?.iban || "").slice(0, 23),
    bankName: String(bank?.bankName || "")
      .trim()
      .replace(/\s+/g, " ")
      .slice(0, 80),
  };
}

export function isPayoutBankComplete(
  bank?: Partial<PayoutBankDetails> | null,
): boolean {
  const next = normalizePayoutBank(bank);
  return next.accountHolderName.length >= 2 && isValidUaeIban(next.iban);
}

export function payoutBankTouched(
  bank?: Partial<PayoutBankDetails> | null,
): boolean {
  const next = normalizePayoutBank(bank);
  return Boolean(next.accountHolderName || next.iban || next.bankName);
}

export type PayoutBankField = keyof PayoutBankDetails;

export function payoutBankFieldErrors(
  bank?: Partial<PayoutBankDetails> | null,
): Partial<Record<PayoutBankField, true>> {
  if (!payoutBankTouched(bank)) return {};
  const next = normalizePayoutBank(bank);
  const errors: Partial<Record<PayoutBankField, true>> = {};
  if (next.accountHolderName.length < 2) errors.accountHolderName = true;
  if (!isValidUaeIban(next.iban)) errors.iban = true;
  return errors;
}
