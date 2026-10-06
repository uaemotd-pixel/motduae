"use client";

import {
  payoutReleaseBadgeClass,
  payoutReleaseStatusLabel,
} from "@/lib/partnerPayoutDisplay";
import { displayOrderId } from "@/lib/customOrders";

export type PortalPayoutReleaseItem = {
  _id: string;
  amount: number;
  orderCount: number;
  orders?: Array<{
    orderId: string;
    publicOrderId?: string | null;
    orderType: string;
    amount: number;
  }>;
  releasedAt?: string;
  status?: string;
  bankRef?: string;
};

export default function PayoutReleasesList({
  releases,
  t,
  formatDate,
  formatAmount,
}: {
  releases: PortalPayoutReleaseItem[];
  t: (key: string, values?: Record<string, unknown>) => string;
  formatDate: (value: string) => string;
  formatAmount: (value: number) => string;
}) {
  if (releases.length === 0) return null;

  const orderLine = (release: PortalPayoutReleaseItem) => (
    <>
      {t("releasesOrderCount", {
        count: Number(release.orderCount) || 0,
      })}
      {(release.orders || []).length > 0 ? (
        <span className="mt-1 block text-[10px] break-words">
          {(release.orders || [])
            .map(
              (o) =>
                `#${displayOrderId({
                  publicOrderId: o.publicOrderId,
                  id: o.orderId,
                })}`,
            )
            .join(", ")}
        </span>
      ) : null}
    </>
  );

  const transferBlock = (release: PortalPayoutReleaseItem) => {
    const ref = String(release.bankRef || "").trim();
    if (release.status !== "completed" || !ref) return null;
    return (
      <div className="min-w-0 rounded-lg border border-(--dash-border) bg-(--dash-bg) px-3 py-2">
        <p className="text-[10px] uppercase tracking-[0.16em] text-(--dash-muted)">
          {t("releasesTransferNumber")}
        </p>
        <p className="mt-1 break-all text-sm font-medium text-(--dash-ink)">
          {ref}
        </p>
      </div>
    );
  };

  return (
    <div className="rounded-(--dash-radius) border border-(--dash-border) bg-(--dash-surface) p-4 shadow-sm sm:p-6">
      <div className="mb-4">
        <h3 className="[font-family:var(--font-display)] text-lg text-(--dash-ink)">
          {t("releasesTitle")}
        </h3>
        <p className="mt-1 text-xs text-(--dash-muted)">{t("releasesDesc")}</p>
      </div>

      <div className="space-y-3 md:hidden">
        {releases.map((release) => (
          <div
            key={release._id}
            className="space-y-3 rounded-xl border border-(--dash-border) bg-white p-4"
          >
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-xs text-(--dash-muted)">
                  {release.releasedAt ? formatDate(release.releasedAt) : "—"}
                </p>
                <p className="mt-1 text-sm font-medium text-(--dash-ink)">
                  {formatAmount(Number(release.amount) || 0)}
                </p>
              </div>
              <span
                className={`rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide ${payoutReleaseBadgeClass(release.status)}`}
              >
                {payoutReleaseStatusLabel(release.status, t)}
              </span>
            </div>
            <p className="text-xs text-(--dash-muted)">{orderLine(release)}</p>
            {transferBlock(release)}
          </div>
        ))}
      </div>

      <div className="hidden overflow-x-auto rounded-xl border border-(--dash-border) md:block">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-(--dash-bg) text-[10px] uppercase tracking-[0.16em] text-(--dash-muted)">
            <tr>
              <th className="px-4 py-3 font-medium">{t("colDate")}</th>
              <th className="px-4 py-3 font-medium">{t("colYourPayout")}</th>
              <th className="px-4 py-3 font-medium">{t("releasesOrders")}</th>
              <th className="px-4 py-3 font-medium">
                {t("releasesTransferNumber")}
              </th>
              <th className="px-4 py-3 font-medium">{t("colStatus")}</th>
            </tr>
          </thead>
          <tbody>
            {releases.map((release) => {
              const ref = String(release.bankRef || "").trim();
              return (
                <tr
                  key={release._id}
                  className="border-t border-(--dash-border) bg-white"
                >
                  <td className="px-4 py-3 text-xs text-(--dash-ink)">
                    {release.releasedAt ? formatDate(release.releasedAt) : "—"}
                  </td>
                  <td className="px-4 py-3 text-xs font-medium text-(--dash-ink)">
                    {formatAmount(Number(release.amount) || 0)}
                  </td>
                  <td className="px-4 py-3 text-xs text-(--dash-muted)">
                    {orderLine(release)}
                  </td>
                  <td className="px-4 py-3">
                    {release.status === "completed" && ref ? (
                      <div className="min-w-0 max-w-56 rounded-lg border border-(--dash-border) bg-(--dash-bg) px-3 py-2">
                        <p className="text-[10px] uppercase tracking-[0.16em] text-(--dash-muted)">
                          {t("releasesTransferNumber")}
                        </p>
                        <p className="mt-1 break-all text-xs font-medium text-(--dash-ink)">
                          {ref}
                        </p>
                      </div>
                    ) : (
                      <span className="text-xs text-(--dash-muted)">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide ${payoutReleaseBadgeClass(release.status)}`}
                    >
                      {payoutReleaseStatusLabel(release.status, t)}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
