export function partnerPaymentStatusLabel(
  status: string | undefined,
  t: (key: string) => string,
) {
  switch (status) {
    case "processing":
      return t("paymentStatusProcessing");
    case "paid":
      return t("paymentStatusPaid");
    case "partially_paid":
      return t("paymentStatusPartial");
    case "pending_payment":
      return t("paymentStatusPending");
    default:
      return String(status || "").replace(/_/g, " ");
  }
}

export function payoutReleaseBadgeClass(status?: string) {
  if (status === "processing") {
    return "border-amber-200 bg-amber-50 text-amber-800";
  }
  if (status === "completed") {
    return "border-emerald-200 bg-emerald-50 text-emerald-800";
  }
  return "border-(--dash-border) bg-(--dash-bg) text-(--dash-ink)";
}

export function payoutReleaseStatusLabel(
  status: string | undefined,
  t: (key: string) => string,
) {
  if (status === "processing") return t("releasesInProgress");
  if (status === "completed") return t("releasesPaid");
  return String(status || "").replace(/_/g, " ");
}
