"use client";

import { getTranslation } from "@/lib/getTranslation";
import { useParams } from "next/navigation";

interface Props {
    condition?: string;
    returnReason?: string;
    originalDesign?: string;
}

export default function ReadyMadeItemInfo({
    condition,
    returnReason,
    originalDesign,
}: Props) {
    const params = useParams();
    const locale = params.locale as string;
    const t = getTranslation(locale);

    return (
        <div className="border border-(--color-border) bg-(--bg-page) my-2 p-4 xs:p-5 sm:p-6 md:p-8 rounded-lg transition-all duration-300 hover:shadow-md">
            {/* Title */}
            <h3 className="[font-family:var(--font-ui)] text-[12px] xs:text-[11px] sm:text-[12px] uppercase tracking-[0.24em] text-black mb-3 xs:mb-4">
                {t.readyMade.info.title}
            </h3>

            {/* Main explanation */}
            <p className="[font-family:var(--font-body)] text-[14px] xs:text-[13px] sm:text-[14px] md:text-[15px] text-(--color-grey-muted) leading-relaxed mb-4 xs:mb-5">
                {t.readyMade.info.description}
            </p>

            {/* Condition */}
            {condition && (
                <p className="text-[12px] xs:text-[13px] sm:text-[14px] md:text-[15px] text-black mb-2 xs:mb-3">
                    <span className="[font-family:var(--font-ui)] text-[10px] xs:text-[11px] uppercase tracking-[0.24em] text-(--color-grey-muted) mr-2">
                        {t.readyMade.info.condition}
                    </span>
                    <span className="[font-family:var(--font-body)]">{condition}</span>
                </p>
            )}

            {/* Return reason */}
            {returnReason && (
                <p className="text-[12px] xs:text-[13px] sm:text-[14px] md:text-[15px] text-black mb-2 xs:mb-3">
                    <span className="[font-family:var(--font-ui)] text-[10px] xs:text-[11px] uppercase tracking-[0.24em] text-(--color-grey-muted) mr-2">
                        {t.readyMade.info.returnReason}
                    </span>
                    <span className="[font-family:var(--font-body)]">{returnReason}</span>
                </p>
            )}

            {/* Original design */}
            {originalDesign && (
                <p className="text-[12px] xs:text-[13px] sm:text-[14px] md:text-[15px] text-black mb-2 xs:mb-3">
                    <span className="[font-family:var(--font-ui)] text-[10px] xs:text-[11px] uppercase tracking-[0.24em] text-(--color-grey-muted) mr-2">
                        {t.readyMade.info.originalDesign}
                    </span>
                    <span className="[font-family:var(--font-body)]">{originalDesign}</span>
                </p>
            )}
        </div>
    );
}