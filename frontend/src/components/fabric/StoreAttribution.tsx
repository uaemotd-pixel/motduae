"use client";

import type { Locale } from "@/i18n/routing";
import {
    type FabricPickupAddress,
    type FabricStoreInfo,
    formatPickupAddress,
} from "@/lib/fabrics";

type StoreAttributionProps = {
    store: FabricStoreInfo | null;
    pickupAddress: FabricPickupAddress;
    locale: Locale;
    labels: {
        title: string;
        pickupLabel: string;
        partnerNote: string;
    };
};

export default function StoreAttribution({
    store,
    pickupAddress,
    locale,
    labels,
}: StoreAttributionProps) {
    if (!store) return null;

    const pickupLine = formatPickupAddress(pickupAddress, locale);

    return (
        <div className="rounded-sm border border-(--color-border) bg-[#FAFAF8] p-4 sm:p-5 space-y-3">
            <p className="[font-family:var(--font-ui)] text-[10px] uppercase tracking-[0.24em] text-(--color-grey-muted)">
                {labels.title}
            </p>
            <div>
                <p className="[font-family:var(--font-display)] text-lg text-black">
                    {store.name}
                </p>
                <p className="[font-family:var(--font-body)] text-sm text-(--color-grey-muted) mt-1">
                    {labels.partnerNote}
                </p>
            </div>
            <div>
                <p className="[font-family:var(--font-ui)] text-[10px] uppercase tracking-[0.2em] text-(--color-grey-muted) mb-1">
                    {labels.pickupLabel}
                </p>
                <p className="[font-family:var(--font-body)] text-sm text-black leading-relaxed">
                    {pickupLine}
                </p>
                {pickupAddress.phone?.trim() && (
                    <p className="[font-family:var(--font-body)] text-sm text-(--color-grey-muted) mt-1">
                        {pickupAddress.phone}
                    </p>
                )}
            </div>
        </div>
    );
}
