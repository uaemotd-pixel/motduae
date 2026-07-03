"use client";

import { useMemo } from "react";
import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { motion, AnimatePresence } from "framer-motion";
import { useCustomOrder } from "@/context/CustomOrderContext";
import {
    type CustomOrderDraft,
    type CustomOrderFabricSelection,
    type CustomOrderLineItem,
    type CustomOrderSelectedDesign,
    useOwnFabric,
} from "@/lib/customOrder";
import { resolveMediaUrl } from "@/lib/media";

type JourneySide = {
    name: string;
    image?: string;
    subtitle?: string;
    isOwnFabric?: boolean;
    isPlaceholder?: boolean;
};

type JourneyPair = {
    id: string;
    fabric: JourneySide | null;
    design: JourneySide | null;
};

function getDisplayName(
    name: string,
    nameAr: string | undefined,
    locale: "en" | "ar",
): string {
    return locale === "ar" ? nameAr || name : name;
}

function fabricToSide(
    fabric: CustomOrderFabricSelection,
    locale: "en" | "ar",
): JourneySide {
    return {
        name: getDisplayName(fabric.name, fabric.nameAr, locale),
        image: fabric.image ? resolveMediaUrl(fabric.image) : undefined,
    };
}

function designToSide(
    design: CustomOrderSelectedDesign,
    locale: "en" | "ar",
): JourneySide {
    return {
        name: getDisplayName(design.name, design.nameAr, locale),
        image: design.image ? resolveMediaUrl(design.image) : undefined,
        subtitle: getDisplayName(design.tailor.name, design.tailor.nameAr, locale),
    };
}

function lineItemToPair(
    item: CustomOrderLineItem,
    locale: "en" | "ar",
    ownFabricLabel: string,
): JourneyPair {
    return {
        id: item.id,
        fabric: item.fabric
            ? fabricToSide(item.fabric, locale)
            : {
                  name: ownFabricLabel,
                  isOwnFabric: true,
              },
        design: designToSide(
            { ...item.design, tailor: item.tailor },
            locale,
        ),
    };
}

function buildJourneyPairs(
    draft: CustomOrderDraft,
    locale: "en" | "ar",
    ownFabricLabel: string,
): JourneyPair[] {
    if (draft.lineItems.length > 0) {
        return draft.lineItems.map((item) =>
            lineItemToPair(item, locale, ownFabricLabel),
        );
    }

    const usingOwn = useOwnFabric(draft);
    const fabrics = draft.selectedFabrics;
    const designs = draft.selectedDesigns;

    if (fabrics.length === 0 && designs.length === 0 && !usingOwn) {
        return [];
    }

    const count = Math.max(
        fabrics.length,
        designs.length,
        usingOwn && fabrics.length === 0 ? 1 : 0,
        1,
    );

    const pairs: JourneyPair[] = [];

    for (let i = 0; i < count; i += 1) {
        const fabric = fabrics[i]
            ? fabricToSide(fabrics[i], locale)
            : usingOwn && i === 0
              ? { name: ownFabricLabel, isOwnFabric: true }
              : null;

        const design = designs[i] ? designToSide(designs[i], locale) : null;

        if (fabric || design) {
            pairs.push({ id: `selection-${i}`, fabric, design });
        }
    }

    return pairs;
}

function ThreadDoodle({ connected }: { connected: boolean }) {
    // One continuous thread: flows in from the fabric side, rises through the
    // needle's eye, loops once around the shaft, then flows out to the design.
    const threadPath =
        "M 2 46 C 22 36, 44 54, 66 45 C 84 38, 100 30, 112 30.5 C 114.5 30.7, 116 31, 117.5 31.6 C 133 37, 141 52, 125 58.5 C 109 64.5, 97 51, 109 43.5 C 118 38.5, 134 40.5, 149 44.5 C 166 49, 178 37.5, 195 41.5 C 205 43.8, 212 42, 218 44";

    return (
        <div
            className="relative flex shrink-0 w-24 sm:w-44 items-center justify-center"
            aria-hidden
        >
            <svg
                viewBox="0 0 220 80"
                className="w-full h-auto overflow-visible"
                fill="none"
            >
                {/* needle: diagonal, point resting bottom-left, eye top-right */}
                <g
                    transform="translate(110 40) rotate(40)"
                    className={connected ? "opacity-100" : "opacity-40"}
                >
                    <path
                        fillRule="evenodd"
                        clipRule="evenodd"
                        d="M 0 27 L 2.1 6 L 2.2 -9 C 2.2 -14.5 1.5 -18 0 -19.2 C -1.5 -18 -2.2 -14.5 -2.2 -9 L -2.1 6 Z M 0 -11.5 m -1.15 0 a 1.15 3.1 0 1 0 2.3 0 a 1.15 3.1 0 1 0 -2.3 0"
                        className={
                            connected ? "fill-black" : "fill-(--color-grey-muted)"
                        }
                    />
                </g>

                {/* soft shadow under the needle tip */}
                <ellipse
                    cx="90"
                    cy="63"
                    rx="7"
                    ry="1.2"
                    className={connected ? "fill-black/10" : "fill-black/5"}
                />

                {/* small trailing curl near the start, like a loose thread end */}
                {connected && (
                    <motion.path
                        d="M 14 32 C 18 25, 27 24, 30 30 C 32 34, 27 37, 24 34"
                        stroke="#B8926A"
                        strokeOpacity="0.55"
                        strokeWidth="1.2"
                        strokeLinecap="round"
                        initial={{ pathLength: 0, opacity: 0 }}
                        animate={{ pathLength: 1, opacity: 1 }}
                        transition={{ duration: 0.8, delay: 1.1, ease: "easeOut" }}
                    />
                )}

                {connected ? (
                    <motion.path
                        key="thread-connected"
                        d={threadPath}
                        stroke="#B8926A"
                        strokeWidth="1.6"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        initial={{ pathLength: 0 }}
                        animate={{ pathLength: 1 }}
                        transition={{ duration: 1.4, ease: [0.65, 0, 0.35, 1] }}
                    />
                ) : (
                    <path
                        d={threadPath}
                        stroke="currentColor"
                        strokeWidth="1.2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeDasharray="5 5"
                        className="text-(--color-grey-muted)/40"
                    />
                )}
            </svg>
        </div>
    );
}

function SelectionFrameCard({
    side,
    placeholder,
    tilt,
}: {
    side: JourneySide | null;
    placeholder: string;
    tilt: "left" | "right";
}) {
    const isPlaceholder = !side || side.isPlaceholder;
    const rotation = tilt === "left" ? "-rotate-2" : "rotate-2";

    return (
        <div
            className={`relative mx-auto w-[120px] sm:w-[140px] aspect-[4/5] border bg-white shadow-[0_8px_24px_rgba(0,0,0,0.06)] transition-transform duration-500 ${rotation} ${
                isPlaceholder
                    ? "border-dashed border-(--color-grey-muted)/40 bg-[#FAF7F2]"
                    : "border-black/15"
            }`}
        >
            {!isPlaceholder && side?.image ? (
                <img
                    src={side.image}
                    alt=""
                    className="absolute inset-0 w-full h-full object-cover object-top"
                />
            ) : !isPlaceholder && side?.isOwnFabric ? (
                <div className="absolute inset-0 flex items-center justify-center bg-[#F0EBE3] p-3">
                    <svg
                        viewBox="0 0 48 48"
                        className="w-10 h-10 text-black/35"
                        fill="none"
                        aria-hidden
                    >
                        <path
                            d="M8 12h32M8 24h32M8 36h32"
                            stroke="currentColor"
                            strokeWidth="1.5"
                            strokeLinecap="round"
                        />
                        <path
                            d="M12 8v32M24 8v32M36 8v32"
                            stroke="currentColor"
                            strokeWidth="1.5"
                            strokeLinecap="round"
                            opacity="0.5"
                        />
                    </svg>
                </div>
            ) : (
                <div className="absolute inset-0 flex items-center justify-center p-2 text-center">
                    <p className="[font-family:var(--font-ui)] text-[8px] uppercase tracking-[0.16em] text-(--color-grey-muted)/70 leading-relaxed">
                        {placeholder}
                    </p>
                </div>
            )}
            {!isPlaceholder && (
                <span className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-black text-white flex items-center justify-center text-[9px]">
                    ✓
                </span>
            )}
        </div>
    );
}

function SelectionFrameCaption({ side }: { side: JourneySide | null }) {
    const isPlaceholder = !side || side.isPlaceholder;

    if (isPlaceholder || !side) {
        return <div className="min-h-8" />;
    }

    return (
        <div className="text-center min-h-8 px-1">
            <p className="[font-family:var(--font-body)] text-[11px] sm:text-[12px] text-black leading-snug line-clamp-2">
                {side.name}
            </p>
            {side.subtitle && (
                <p className="[font-family:var(--font-ui)] text-[8px] uppercase tracking-[0.14em] text-(--color-grey-muted) mt-0.5 line-clamp-1">
                    {side.subtitle}
                </p>
            )}
        </div>
    );
}

function JourneyPairRow({
    pair,
    t,
}: {
    pair: JourneyPair;
    t: ReturnType<typeof useTranslations<"CustomOrderJourney">>;
}) {
    const connected = Boolean(pair.fabric && pair.design);

    return (
        <div className="mx-auto grid w-full max-w-xl grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-x-3 sm:gap-x-4 gap-y-1.5">
            <p className="[font-family:var(--font-ui)] text-[9px] uppercase tracking-[0.22em] text-(--color-grey-muted) text-center">
                {t("fabricLabel")}
            </p>
            <div aria-hidden />
            <p className="[font-family:var(--font-ui)] text-[9px] uppercase tracking-[0.22em] text-(--color-grey-muted) text-center">
                {t("designLabel")}
            </p>

            <SelectionFrameCard
                side={pair.fabric}
                placeholder={t("awaitingFabric")}
                tilt="left"
            />
            <ThreadDoodle connected={connected} />
            <SelectionFrameCard
                side={pair.design}
                placeholder={t("awaitingDesign")}
                tilt="right"
            />

            <SelectionFrameCaption side={pair.fabric} />
            <div aria-hidden />
            <SelectionFrameCaption side={pair.design} />
        </div>
    );
}

export default function CustomOrderJourneyRibbon() {
    const { draft, isHydrated } = useCustomOrder();
    const t = useTranslations("CustomOrderJourney");
    const params = useParams();
    const locale = params.locale === "ar" ? "ar" : "en";

    const ownFabricLabel = t("ownFabric");
    const pairs = useMemo(
        () => buildJourneyPairs(draft, locale, ownFabricLabel),
        [draft, locale, ownFabricLabel],
    );

    if (!isHydrated || pairs.length === 0) {
        return null;
    }

    const extraCount = pairs.length - 1;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0, y: -12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.45, ease: [0.25, 0.1, 0.25, 1] }}
                className="mb-6 border border-(--color-border) bg-[#FDFAF5] overflow-hidden"
            >
                <div className="flex items-center justify-between gap-3 px-3 sm:px-5 py-2 border-b border-(--color-border)/60 bg-white/50">
                    <p className="[font-family:var(--font-ui)] text-[10px] uppercase tracking-[0.28em] text-black">
                        {t("ribbonLabel")}
                    </p>
                    {extraCount > 0 && (
                        <span className="[font-family:var(--font-ui)] text-[9px] uppercase tracking-[0.2em] text-(--color-grey-muted) border border-(--color-border) px-2 py-1 bg-white">
                            {t("moreItems", { count: extraCount })}
                        </span>
                    )}
                </div>

                <div className="px-3 sm:px-5 py-3 sm:py-4">
                    {pairs.length === 1 ? (
                        <JourneyPairRow pair={pairs[0]} t={t} />
                    ) : (
                        <div
                            data-lenis-prevent
                            className="h-[248px] sm:h-[268px] overflow-y-auto overscroll-y-contain snap-y snap-mandatory [scrollbar-width:thin]"
                        >
                            {pairs.map((pair) => (
                                <div
                                    key={pair.id}
                                    className="flex h-full min-h-full snap-start snap-always items-center justify-center shrink-0"
                                >
                                    <JourneyPairRow pair={pair} t={t} />
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </motion.div>
        </AnimatePresence>
    );
}
