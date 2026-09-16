export type PayoutBankDetails = {
  accountHolderName: string;
  iban: string;
  bankName: string;
};

export function emptyPayoutBank(): PayoutBankDetails {
  return { accountHolderName: "", iban: "", bankName: "" };
}

/** Map Arabic-Indic / Eastern Arabic digits to ASCII 0-9. */
function toAsciiDigits(value: string): string {
  return value.replace(/[\u0660-\u0669\u06F0-\u06F9]/g, (ch) => {
    const code = ch.charCodeAt(0);
    if (code >= 0x0660 && code <= 0x0669) return String(code - 0x0660);
    return String(code - 0x06f0);
  });
}

export function normalizeIban(value: string): string {
  let iban = toAsciiDigits(String(value || ""))
    .replace(/[^a-zA-Z0-9]/g, "")
    .toUpperCase();
  // Bank apps sometimes copy the 21 digits without the AE country code.
  if (/^\d{21}$/.test(iban)) iban = `AE${iban}`;
  return iban.slice(0, 23);
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

export type UaeIbanIssue = "empty" | "format" | "checksum" | null;

export function getUaeIbanIssue(value: string): UaeIbanIssue {
  const iban = normalizeIban(value);
  if (!iban) return "empty";
  if (!/^AE\d{21}$/.test(iban)) return "format";
  if (!ibanMod97(iban)) return "checksum";
  return null;
}

export function isValidUaeIban(value: string): boolean {
  return getUaeIbanIssue(value) === null;
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
): Partial<Record<PayoutBankField, true | UaeIbanIssue>> {
  if (!payoutBankTouched(bank)) return {};
  const next = normalizePayoutBank(bank);
  const errors: Partial<Record<PayoutBankField, true | UaeIbanIssue>> = {};
  if (next.accountHolderName.length < 2) errors.accountHolderName = true;
  const ibanIssue = getUaeIbanIssue(next.iban);
  if (ibanIssue) errors.iban = ibanIssue;
  return errors;
}
