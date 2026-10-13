"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { AnimatePresence, motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import {
  ArrowRight,
  BookOpen,
  Globe2,
  Handshake,
  Heart,
  LayoutGrid,
  MapPin,
  Package,
  Ruler,
  Scissors,
  ShieldCheck,
  Shirt,
  Sparkles,
  Store,
  Truck,
} from "lucide-react";
import MainLayout from "../main/layout";
import { Link } from "@/i18n/navigation";

const EASE = [0.22, 1, 0.36, 1] as const;

const STEP_KEYS = ["1", "2", "3", "4"] as const;
const WHY_KEYS = ["1", "2", "3", "4", "5", "6"] as const;

const STEP_ICONS: Record<(typeof STEP_KEYS)[number], LucideIcon> = {
  "1": Shirt,
  "2": Scissors,
  "3": Ruler,
  "4": Truck,
};

const WHY_ICONS: Record<(typeof WHY_KEYS)[number], LucideIcon> = {
  "1": LayoutGrid,
  "2": Sparkles,
  "3": Handshake,
  "4": Heart,
  "5": Package,
  "6": ShieldCheck,
};

/** Side margins + a wide content rail (open page, not a tight card column) */
const PAGE_PAD =
  "w-full max-w-6xl xl:max-w-7xl mx-auto px-5 xs:px-6 sm:px-8 md:px-10 lg:px-12";

const fadeUp = {
  hidden: { opacity: 0, y: 22 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.55, ease: EASE },
  },
};

const stagger = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.08, delayChildren: 0.06 },
  },
};

function stepAngle(index: number) {
  // Start at top, go clockwise
  return (index / STEP_KEYS.length) * 360 - 90;
}

function stepPosition(index: number, radiusPercent: number) {
  const rad = (stepAngle(index) * Math.PI) / 180;
  return {
    left: `${50 + Math.cos(rad) * radiusPercent}%`,
    top: `${50 + Math.sin(rad) * radiusPercent}%`,
  };
}

function SectionReveal({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <motion.section
      className={className}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: "0px 0px -60px 0px", amount: 0.12 }}
      variants={stagger}
    >
      {children}
    </motion.section>
  );
}

const STEP_CYCLE_MS = 3000;
const CIRCLE_LEN = 2 * Math.PI * 46;

function HowMotdWorksCircle({
  t,
}: {
  t: ReturnType<typeof useTranslations<"AboutPage">>;
}) {
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused) return;
    const id = window.setInterval(() => {
      setActive((prev) => (prev + 1) % STEP_KEYS.length);
    }, STEP_CYCLE_MS);
    return () => window.clearInterval(id);
  }, [paused]);

  const activeKey = STEP_KEYS[active];
  const ActiveIcon = STEP_ICONS[activeKey];
  const segmentStart = CIRCLE_LEN * (1 - active / STEP_KEYS.length);
  const segmentEnd = CIRCLE_LEN * (1 - (active + 1) / STEP_KEYS.length);

  return (
    <div className="flex flex-col items-center gap-10 lg:gap-12">
      <div
        className="relative mx-auto aspect-square w-full max-w-[320px] sm:max-w-[400px] md:max-w-[460px]"
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
        onFocusCapture={() => setPaused(true)}
        onBlurCapture={(e) => {
          if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
            setPaused(false);
          }
        }}
      >
        {/* Soft orbit glow */}
        <motion.div
          className="pointer-events-none absolute inset-[8%] rounded-full bg-[#F5F1EA]/60"
          aria-hidden
          animate={{ scale: [1, 1.03, 1], opacity: [0.55, 0.8, 0.55] }}
          transition={{ duration: 5.5, repeat: Infinity, ease: "easeInOut" }}
        />

        {/* Outer rotating ring */}
        <motion.div
          className="pointer-events-none absolute inset-0 rounded-full border border-dashed border-black/15"
          aria-hidden
          animate={{ rotate: 360 }}
          transition={{ duration: 72, repeat: Infinity, ease: "linear" }}
        />

        {/* Inner solid ring */}
        <motion.div
          className="pointer-events-none absolute inset-[14%] rounded-full border border-[#E8E8E4]"
          aria-hidden
          initial={{ scale: 0.85, opacity: 0 }}
          whileInView={{ scale: 1, opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, ease: EASE }}
        />

        {/* Progress arc (SVG) */}
        <svg
          className="pointer-events-none absolute inset-[7%] h-[86%] w-[86%] -rotate-90"
          viewBox="0 0 100 100"
          aria-hidden
        >
          <circle
            cx="50"
            cy="50"
            r="46"
            fill="none"
            stroke="rgba(0,0,0,0.06)"
            strokeWidth="0.8"
          />
          <motion.circle
            key={active}
            cx="50"
            cy="50"
            r="46"
            fill="none"
            stroke="black"
            strokeWidth="1.1"
            strokeLinecap="round"
            strokeDasharray={CIRCLE_LEN}
            initial={{ strokeDashoffset: segmentStart }}
            animate={{ strokeDashoffset: segmentEnd }}
            transition={{
              // Fill each segment slowly across the full step cycle (not a quick jump)
              duration: STEP_CYCLE_MS / 1000,
              ease: "linear",
            }}
          />
        </svg>

        {/* Center hub */}
        <motion.div
          className="absolute left-1/2 top-1/2 z-10 flex h-[42%] w-[42%] -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center rounded-full border border-[#E8E8E4] bg-white text-center shadow-[0_12px_40px_rgba(0,0,0,0.06)]"
          layout
        >
          <AnimatePresence mode="wait">
            <motion.div
              key={activeKey}
              initial={{ opacity: 0, scale: 0.88, y: 6 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: -6 }}
              transition={{ duration: 0.35, ease: EASE }}
              className="flex flex-col items-center gap-2 px-3"
            >
              <span className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-black text-white sm:h-12 sm:w-12">
                <ActiveIcon className="h-4 w-4 sm:h-5 sm:w-5" strokeWidth={1.5} />
              </span>
              <span className="[font-family:var(--font-ui)] text-[10px] uppercase tracking-[0.22em] text-[#8A8A80]">
                {String(activeKey).padStart(2, "0")} / 04
              </span>
              <p className="[font-family:var(--font-display)] text-sm sm:text-base font-normal text-black leading-snug max-w-[9.5rem]">
                {t(`steps.${activeKey}.title`)}
              </p>
            </motion.div>
          </AnimatePresence>
        </motion.div>

        {/* Step nodes around the circle */}
        {STEP_KEYS.map((key, index) => {
          const Icon = STEP_ICONS[key];
          const isActive = index === active;
          const pos = stepPosition(index, 42);

          return (
            <motion.button
              key={key}
              type="button"
              aria-label={t(`steps.${key}.title`)}
              aria-pressed={isActive}
              onClick={() => setActive(index)}
              className="absolute z-20 -translate-x-1/2 -translate-y-1/2 touch-manipulation focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/30 focus-visible:ring-offset-2"
              style={pos}
              initial={{ opacity: 0, scale: 0.6 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.12 * index, duration: 0.45, ease: EASE }}
              whileHover={{ scale: 1.08 }}
              whileTap={{ scale: 0.96 }}
            >
              <motion.span
                className={`relative flex h-12 w-12 sm:h-14 sm:w-14 items-center justify-center rounded-full border transition-colors ${
                  isActive
                    ? "border-black bg-black text-white"
                    : "border-[#E8E8E4] bg-white text-black hover:border-black/40"
                }`}
                animate={
                  isActive
                    ? {
                        boxShadow: [
                          "0 0 0 0 rgba(0,0,0,0.18)",
                          "0 0 0 12px rgba(0,0,0,0)",
                          "0 0 0 0 rgba(0,0,0,0)",
                        ],
                      }
                    : { boxShadow: "0 0 0 0 rgba(0,0,0,0)" }
                }
                transition={
                  isActive
                    ? { duration: 3.2, repeat: Infinity, ease: "easeOut" }
                    : { duration: 0.3 }
                }
              >
                <Icon className="h-4 w-4 sm:h-5 sm:w-5" strokeWidth={1.5} />
                <span
                  className={`absolute -bottom-1 -end-1 flex h-5 min-w-5 items-center justify-center rounded-full px-1 [font-family:var(--font-ui)] text-[9px] tracking-wide ${
                    isActive
                      ? "bg-white text-black border border-black/10"
                      : "bg-[#FAF9F6] text-black border border-[#E8E8E4]"
                  }`}
                >
                  {key}
                </span>
              </motion.span>
            </motion.button>
          );
        })}
      </div>

      {/* Active step detail */}
      <div className="min-h-[4.5rem] w-full max-w-xl text-center px-2">
        <AnimatePresence mode="wait">
          <motion.p
            key={activeKey}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.35, ease: EASE }}
            className="[font-family:var(--font-body)] text-sm sm:text-base text-[#5A5A56] leading-relaxed"
          >
            {t(`steps.${activeKey}.body`)}
          </motion.p>
        </AnimatePresence>
      </div>

      {/* Dot indicators */}
      <div className="flex items-center gap-2" role="tablist" aria-label={t("howTitle")}>
        {STEP_KEYS.map((key, index) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={index === active}
            aria-label={t(`steps.${key}.title`)}
            onClick={() => setActive(index)}
            className={`h-1.5 rounded-full transition-all touch-manipulation ${
              index === active ? "w-6 bg-black" : "w-1.5 bg-black/20 hover:bg-black/40"
            }`}
          />
        ))}
      </div>
    </div>
  );
}

const WHY_CYCLE_MS = 5500;
/** Pointy-top hex; side = R → perimeter = 6R (viewBox units) */
const HEX_R = 34;
const HEX_PERIMETER = 6 * HEX_R;
const HEX_CLIP =
  "polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)";

function hexVertex(index: number, radius = HEX_R, cx = 50, cy = 50) {
  const rad = ((index * 60 - 90) * Math.PI) / 180;
  return {
    x: cx + radius * Math.cos(rad),
    y: cy + radius * Math.sin(rad),
  };
}

function hexPath(radius = HEX_R) {
  return (
    WHY_KEYS.map((_, i) => {
      const { x, y } = hexVertex(i, radius);
      return `${i === 0 ? "M" : "L"} ${x.toFixed(2)} ${y.toFixed(2)}`;
    }).join(" ") + " Z"
  );
}

function WhyMotdHexagon({
  t,
}: {
  t: ReturnType<typeof useTranslations<"AboutPage">>;
}) {
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused) return;
    const id = window.setInterval(() => {
      setActive((prev) => (prev + 1) % WHY_KEYS.length);
    }, WHY_CYCLE_MS);
    return () => window.clearInterval(id);
  }, [paused]);

  const activeKey = WHY_KEYS[active];
  const ActiveIcon = WHY_ICONS[activeKey];
  const filledPath = hexPath(HEX_R);
  const midPath = hexPath(HEX_R * 0.72);
  const segmentStart = HEX_PERIMETER * (1 - active / WHY_KEYS.length);
  const segmentEnd = HEX_PERIMETER * (1 - (active + 1) / WHY_KEYS.length);
  /** Solid completed perimeter up to the start of the current side */
  const completedOffset = HEX_PERIMETER * (1 - active / WHY_KEYS.length);

  return (
    <div
      className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 xl:gap-16 items-center"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {/* Hex diagram */}
      <div className="lg:col-span-6 xl:col-span-5 flex justify-center">
        <div className="relative aspect-square w-full max-w-[360px] sm:max-w-[420px] md:max-w-[460px]">
          {/* Layered hex body — solid, complete shape */}
          <div
            className="pointer-events-none absolute inset-[8%] bg-white border border-[#E4E0D8] shadow-[0_20px_50px_rgba(0,0,0,0.06)]"
            style={{ clipPath: HEX_CLIP }}
            aria-hidden
          />
          <div
            className="pointer-events-none absolute inset-[14%] bg-[#FAF8F3]"
            style={{ clipPath: HEX_CLIP }}
            aria-hidden
          />
          <motion.div
            className="pointer-events-none absolute inset-[20%] bg-gradient-to-b from-white to-[#F3EFE7]"
            style={{ clipPath: HEX_CLIP }}
            aria-hidden
            animate={{ opacity: [0.85, 1, 0.85] }}
            transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
          />

          <svg
            className="pointer-events-none absolute inset-0 h-full w-full overflow-visible"
            viewBox="0 0 100 100"
            aria-hidden
          >
            {/* Outer ornamental hex */}
            <path
              d={hexPath(HEX_R + 3.5)}
              fill="none"
              stroke="rgba(0,0,0,0.06)"
              strokeWidth="0.4"
              strokeLinejoin="round"
            />

            {/* Main track */}
            <path
              d={filledPath}
              fill="none"
              stroke="rgba(0,0,0,0.1)"
              strokeWidth="1.4"
              strokeLinejoin="round"
            />

            {/* Already completed sides (solid) */}
            {active > 0 && (
              <path
                d={filledPath}
                fill="none"
                stroke="black"
                strokeWidth="1.4"
                strokeLinejoin="round"
                strokeLinecap="round"
                strokeDasharray={HEX_PERIMETER}
                strokeDashoffset={completedOffset}
              />
            )}

            {/* Current side filling */}
            <motion.path
              key={active}
              d={filledPath}
              fill="none"
              stroke="black"
              strokeWidth="1.4"
              strokeLinejoin="round"
              strokeLinecap="round"
              strokeDasharray={HEX_PERIMETER}
              initial={{ strokeDashoffset: segmentStart }}
              animate={{ strokeDashoffset: segmentEnd }}
              transition={{
                duration: WHY_CYCLE_MS / 1000,
                ease: "linear",
              }}
            />

            {/* Inner refined hex */}
            <path
              d={midPath}
              fill="none"
              stroke="rgba(0,0,0,0.08)"
              strokeWidth="0.5"
              strokeLinejoin="round"
            />
            <motion.path
              d={midPath}
              fill="none"
              stroke="rgba(0,0,0,0.16)"
              strokeWidth="0.45"
              strokeDasharray="1.8 2.4"
              strokeLinejoin="round"
              animate={{ strokeDashoffset: [0, -28] }}
              transition={{ duration: 22, repeat: Infinity, ease: "linear" }}
            />

            {/* Vertex ticks on the main hex */}
            {WHY_KEYS.map((_, index) => {
              const outer = hexVertex(index, HEX_R + 1.2);
              const inner = hexVertex(index, HEX_R - 2.2);
              const lit = index <= active;
              return (
                <line
                  key={`tick-${index}`}
                  x1={inner.x}
                  y1={inner.y}
                  x2={outer.x}
                  y2={outer.y}
                  stroke={lit ? "black" : "rgba(0,0,0,0.18)"}
                  strokeWidth="0.55"
                  strokeLinecap="round"
                />
              );
            })}
          </svg>

          {/* Center emblem */}
          <div
            className="absolute left-1/2 top-1/2 z-10 flex h-[34%] w-[34%] -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center bg-white text-center shadow-[0_10px_28px_rgba(0,0,0,0.07)] border border-[#E8E8E4]"
            style={{ clipPath: HEX_CLIP }}
          >
            <AnimatePresence mode="wait">
              <motion.div
                key={activeKey}
                initial={{ opacity: 0, scale: 0.9, y: 6 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.94, y: -6 }}
                transition={{ duration: 0.35, ease: EASE }}
                className="flex flex-col items-center gap-1.5 px-2"
              >
                <span
                  className="inline-flex h-10 w-10 items-center justify-center bg-black text-white sm:h-11 sm:w-11"
                  style={{ clipPath: HEX_CLIP }}
                >
                  <ActiveIcon className="h-4 w-4 sm:h-5 sm:w-5" strokeWidth={1.5} />
                </span>
                <span className="[font-family:var(--font-ui)] text-[9px] sm:text-[10px] uppercase tracking-[0.2em] text-[#8A8A80]">
                  {String(activeKey).padStart(2, "0")} / 06
                </span>
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Vertex nodes */}
          {WHY_KEYS.map((key, index) => {
            const Icon = WHY_ICONS[key];
            const isActive = index === active;
            const isDone = index < active;
            const v = hexVertex(index, 41.5);

            return (
              <motion.button
                key={key}
                type="button"
                aria-label={t(`whyItems.${key}`)}
                aria-pressed={isActive}
                onClick={() => setActive(index)}
                className="absolute z-20 -translate-x-1/2 -translate-y-1/2 touch-manipulation focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/25 focus-visible:ring-offset-2"
                style={{ left: `${v.x}%`, top: `${v.y}%` }}
                initial={{ opacity: 0, scale: 0.7 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: 0.08 * index, duration: 0.45, ease: EASE }}
                whileHover={{ scale: 1.07 }}
                whileTap={{ scale: 0.96 }}
              >
                <motion.span
                  className={`relative flex h-11 w-11 sm:h-12 sm:w-12 items-center justify-center border transition-colors ${
                    isActive
                      ? "border-black bg-black text-white"
                      : isDone
                        ? "border-black/40 bg-white text-black"
                        : "border-[#DCD7CE] bg-white text-black hover:border-black/35"
                  }`}
                  style={{ clipPath: HEX_CLIP }}
                  animate={
                    isActive
                      ? {
                          boxShadow: [
                            "0 0 0 0 rgba(0,0,0,0.14)",
                            "0 0 0 11px rgba(0,0,0,0)",
                            "0 0 0 0 rgba(0,0,0,0)",
                          ],
                        }
                      : { boxShadow: "0 8px 18px rgba(0,0,0,0.05)" }
                  }
                  transition={
                    isActive
                      ? { duration: 3.2, repeat: Infinity, ease: "easeOut" }
                      : { duration: 0.3 }
                  }
                >
                  <Icon className="h-4 w-4" strokeWidth={1.5} />
                  <span
                    className={`absolute -bottom-0.5 -end-0.5 flex h-4 min-w-4 items-center justify-center px-1 [font-family:var(--font-ui)] text-[8px] tracking-wide ${
                      isActive
                        ? "bg-white text-black"
                        : "bg-[#1A1A1A] text-white"
                    }`}
                    style={{ clipPath: HEX_CLIP }}
                  >
                    {key}
                  </span>
                </motion.span>
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* Complete reason list — makes the section feel finished */}
      <div className="lg:col-span-6 xl:col-span-7 space-y-5">
        <div className="min-h-[3.25rem]">
          <AnimatePresence mode="wait">
            <motion.p
              key={activeKey}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.35, ease: EASE }}
              className="[font-family:var(--font-display)] text-xl sm:text-2xl text-black font-light leading-snug"
            >
              {t(`whyItems.${activeKey}`)}
            </motion.p>
          </AnimatePresence>
        </div>

        {/* Segment progress bar for active item */}
        <div className="h-px w-full bg-[#E4E0D8] overflow-hidden">
          <motion.div
            key={active}
            className="h-full bg-black origin-left"
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ duration: WHY_CYCLE_MS / 1000, ease: "linear" }}
          />
        </div>

        <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3" role="list">
          {WHY_KEYS.map((key, index) => {
            const Icon = WHY_ICONS[key];
            const isActive = index === active;
            const isDone = index < active;

            return (
              <li key={key}>
                <button
                  type="button"
                  onClick={() => setActive(index)}
                  className={`group flex w-full items-start gap-3 rounded-xl border px-3.5 py-3 text-start transition-all touch-manipulation ${
                    isActive
                      ? "border-black bg-white shadow-[0_8px_24px_rgba(0,0,0,0.05)]"
                      : "border-transparent bg-white/50 hover:border-[#E4E0D8] hover:bg-white"
                  }`}
                >
                  <span
                    className={`mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center transition-colors ${
                      isActive
                        ? "bg-black text-white"
                        : isDone
                          ? "bg-black/10 text-black"
                          : "bg-[#F0EBE3] text-black/70 group-hover:bg-[#E8E2D8]"
                    }`}
                    style={{ clipPath: HEX_CLIP }}
                  >
                    <Icon className="h-3.5 w-3.5" strokeWidth={1.5} />
                  </span>
                  <span className="min-w-0 pt-0.5">
                    <span className="block [font-family:var(--font-ui)] text-[9px] uppercase tracking-[0.18em] text-[#8A8A80] mb-0.5">
                      {String(key).padStart(2, "0")}
                    </span>
                    <span
                      className={`block [font-family:var(--font-body)] text-[13px] sm:text-sm leading-snug ${
                        isActive ? "text-black" : "text-[#5A5A56]"
                      }`}
                    >
                      {t(`whyItems.${key}`)}
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}

export default function AboutPage() {
  const t = useTranslations("AboutPage");

  return (
    <MainLayout>
      <div className="bg-white min-h-screen w-full overflow-x-clip">
        {/* Hero — edge to edge */}
        <section className="relative w-full overflow-hidden border-b border-[#E8E8E4]">
          <motion.div
            className="pointer-events-none absolute inset-0"
            aria-hidden
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1.1, ease: EASE }}
            style={{
              background:
                "radial-gradient(ellipse 70% 80% at 0% 0%, #F5F1EA 0%, transparent 55%), radial-gradient(ellipse 55% 60% at 100% 0%, #EEEAE2 0%, transparent 50%)",
            }}
          />
          <motion.div
            className="pointer-events-none absolute -end-20 top-8 h-64 w-64 rounded-full border border-black/[0.04]"
            aria-hidden
            animate={{ y: [0, 12, 0], rotate: [0, 4, 0] }}
            transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
          />

          <motion.div
            className={`relative ${PAGE_PAD} pt-16 sm:pt-24 lg:pt-28 pb-16 sm:pb-24`}
            initial="hidden"
            animate="show"
            variants={stagger}
          >
            <motion.span
              variants={fadeUp}
              className="[font-family:var(--font-ui)] text-[11px] uppercase tracking-[0.28em] text-[#8A8A80] mb-5 inline-flex items-center gap-2"
            >
              <Sparkles className="h-3.5 w-3.5" strokeWidth={1.5} aria-hidden />
              {t("eyebrow")}
            </motion.span>
            <motion.p
              variants={fadeUp}
              className="[font-family:var(--font-ui)] text-[11px] uppercase tracking-[0.22em] text-black/50 mb-4"
            >
              MOTD — Mukhawar of the Day
            </motion.p>
            <motion.h1
              variants={fadeUp}
              className="[font-family:var(--font-display)] text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-light tracking-tight text-black leading-[1.05] mb-6 max-w-4xl"
            >
              <span className="block">{t("headlineLine1")}</span>
              <span className="block italic text-black/75">
                {t("headlineLine2")}
              </span>
            </motion.h1>
            <motion.p
              variants={fadeUp}
              className="[font-family:var(--font-body)] text-[#5A5A56] text-sm sm:text-base md:text-lg leading-relaxed max-w-2xl"
            >
              {t("intro")}
            </motion.p>
          </motion.div>
        </section>

        {/* Who + platform — open two-column on large screens */}
        <SectionReveal
          className={`${PAGE_PAD} py-16 sm:py-20 lg:py-24 grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-16 border-b border-[#E8E8E4]`}
        >
          <motion.div variants={fadeUp} className="lg:col-span-5 space-y-4">
            <div className="flex items-center gap-3">
              <Heart className="h-4 w-4 text-black" strokeWidth={1.5} aria-hidden />
              <h2 className="[font-family:var(--font-display)] text-2xl sm:text-3xl lg:text-4xl font-light tracking-tight text-black">
                {t("whoTitle")}
              </h2>
            </div>
          </motion.div>
          <motion.div
            variants={fadeUp}
            className="lg:col-span-7 [font-family:var(--font-body)] text-[#5A5A56] text-sm sm:text-base leading-relaxed space-y-4"
          >
            <p>{t("whoBody")}</p>
            <p>{t("whoBody2")}</p>
          </motion.div>
        </SectionReveal>

        <SectionReveal
          className={`${PAGE_PAD} py-14 sm:py-16 lg:py-20 grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-16 border-b border-[#E8E8E4] bg-[#FAF9F6]`}
        >
          <motion.div variants={fadeUp} className="lg:col-span-5 flex items-start gap-3">
            <Handshake className="mt-1 h-4 w-4 shrink-0 text-black" strokeWidth={1.5} aria-hidden />
            <h2 className="[font-family:var(--font-display)] text-xl sm:text-2xl lg:text-3xl font-light tracking-tight text-black">
              {t("notTailorTitle")}
            </h2>
          </motion.div>
          <motion.p
            variants={fadeUp}
            className="lg:col-span-7 [font-family:var(--font-body)] text-[#5A5A56] text-sm sm:text-base leading-relaxed"
          >
            {t("notTailorBody")}
          </motion.p>
        </SectionReveal>

        {/* Mukhawar */}
        <SectionReveal
          className={`${PAGE_PAD} py-16 sm:py-20 lg:py-24 grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-16 border-b border-[#E8E8E4]`}
        >
          <motion.div variants={fadeUp} className="lg:col-span-5 flex items-center gap-3">
            <Shirt className="h-4 w-4 text-black" strokeWidth={1.5} aria-hidden />
            <h2 className="[font-family:var(--font-display)] text-2xl sm:text-3xl lg:text-4xl font-light tracking-tight text-black">
              {t("mukhawarTitle")}
            </h2>
          </motion.div>
          <motion.p
            variants={fadeUp}
            className="lg:col-span-7 [font-family:var(--font-body)] text-[#5A5A56] text-sm sm:text-base leading-relaxed"
          >
            {t("mukhawarBody")}
          </motion.p>
        </SectionReveal>

        {/* How it works — circular journey */}
        <SectionReveal className={`${PAGE_PAD} py-16 sm:py-20 lg:py-24 border-b border-[#E8E8E4] space-y-12`}>
          <motion.div variants={fadeUp} className="mx-auto max-w-2xl space-y-3 text-center">
            <div className="flex items-center justify-center gap-3">
              <Sparkles className="h-4 w-4 text-black" strokeWidth={1.5} aria-hidden />
              <h2 className="[font-family:var(--font-display)] text-2xl sm:text-3xl lg:text-4xl font-light tracking-tight text-black">
                {t("howTitle")}
              </h2>
            </div>
            <p className="[font-family:var(--font-body)] text-[#5A5A56] text-sm sm:text-base leading-relaxed">
              {t("howIntro")}
            </p>
          </motion.div>

          <motion.div variants={fadeUp}>
            <HowMotdWorksCircle t={t} />
          </motion.div>
        </SectionReveal>

        {/* Why — completed hexagonal system + full reason list */}
        <SectionReveal className="w-full border-b border-[#E8E8E4] bg-[#FAF9F6]">
          <div className={`${PAGE_PAD} py-16 sm:py-20 lg:py-24 space-y-10 lg:space-y-12`}>
            <motion.div variants={fadeUp} className="max-w-2xl space-y-3">
              <div className="flex items-center gap-3">
                <ShieldCheck className="h-4 w-4 text-black" strokeWidth={1.5} aria-hidden />
                <h2 className="[font-family:var(--font-display)] text-2xl sm:text-3xl lg:text-4xl font-light tracking-tight text-black">
                  {t("whyTitle")}
                </h2>
              </div>
              <p className="[font-family:var(--font-body)] text-[#5A5A56] text-sm sm:text-base leading-relaxed">
                {t("whyIntro")}
              </p>
            </motion.div>

            <motion.div variants={fadeUp}>
              <WhyMotdHexagon t={t} />
            </motion.div>
          </div>
        </SectionReveal>

        {/* Where */}
        <SectionReveal
          className={`${PAGE_PAD} py-16 sm:py-20 lg:py-24 border-b border-[#E8E8E4] space-y-10`}
        >
          <motion.div variants={fadeUp} className="flex items-center gap-3">
            <MapPin className="h-4 w-4 text-black" strokeWidth={1.5} aria-hidden />
            <h2 className="[font-family:var(--font-display)] text-2xl sm:text-3xl lg:text-4xl font-light tracking-tight text-black">
              {t("whereTitle")}
            </h2>
          </motion.div>
          <motion.div
            variants={fadeUp}
            className="[font-family:var(--font-body)] text-[#5A5A56] text-sm sm:text-base leading-relaxed max-w-3xl space-y-4"
          >
            <p>{t("whereBody")}</p>
          </motion.div>
          <motion.ul
            variants={stagger}
            className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-10"
          >
            <motion.li variants={fadeUp} className="space-y-3">
              <MapPin className="h-4 w-4 text-black" strokeWidth={1.5} aria-hidden />
              <p className="[font-family:var(--font-body)] text-sm text-[#5A5A56] leading-relaxed">
                {t("whereOffice")}
              </p>
            </motion.li>
            <motion.li variants={fadeUp} className="space-y-3">
              <Truck className="h-4 w-4 text-black" strokeWidth={1.5} aria-hidden />
              <p className="[font-family:var(--font-body)] text-sm text-[#5A5A56] leading-relaxed">
                {t("whereDelivery")}
              </p>
            </motion.li>
            <motion.li variants={fadeUp} className="space-y-3">
              <Globe2 className="h-4 w-4 text-black" strokeWidth={1.5} aria-hidden />
              <p className="[font-family:var(--font-body)] text-sm text-[#5A5A56] leading-relaxed">
                {t("whereOnline")}
              </p>
            </motion.li>
          </motion.ul>
        </SectionReveal>

        {/* Partners + CTAs */}
        <SectionReveal
          className={`${PAGE_PAD} py-16 sm:py-20 lg:py-24 space-y-10 border-b border-[#E8E8E4]`}
        >
          <motion.div variants={fadeUp} className="flex items-center gap-3">
            <Store className="h-4 w-4 text-black" strokeWidth={1.5} aria-hidden />
            <h2 className="[font-family:var(--font-display)] text-2xl sm:text-3xl lg:text-4xl font-light tracking-tight text-black">
              {t("partnersTitle")}
            </h2>
          </motion.div>
          <motion.p
            variants={fadeUp}
            className="[font-family:var(--font-body)] text-[#5A5A56] text-sm sm:text-base leading-relaxed max-w-2xl"
          >
            {t("partnersBody")}
          </motion.p>
          <motion.div variants={fadeUp}>
            <Link
              href="/partners"
              className="group inline-flex items-center gap-2 [font-family:var(--font-ui)] text-[11px] uppercase tracking-[0.22em] text-black border-b border-black/30 pb-0.5 hover:border-black transition-colors"
            >
              {t("ctaPartners")}
              <ArrowRight
                className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5 rtl:rotate-180 rtl:group-hover:-translate-x-0.5"
                strokeWidth={1.5}
              />
            </Link>
          </motion.div>
        </SectionReveal>

        <SectionReveal className={`${PAGE_PAD} py-14 sm:py-16 lg:py-20`}>
          <motion.div variants={stagger} className="flex flex-wrap gap-3 sm:gap-4">
            <motion.div variants={fadeUp}>
              <Link
                href="/designs/designShop"
                className="group inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-black text-white [font-family:var(--font-ui)] text-[10px] uppercase tracking-[0.22em] hover:bg-black/85 transition-colors"
              >
                {t("ctaBrowseDesigns")}
                <ArrowRight
                  className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5 rtl:rotate-180"
                  strokeWidth={1.5}
                />
              </Link>
            </motion.div>
            <motion.div variants={fadeUp}>
              <Link
                href="/fabrics/fabricStore"
                className="inline-flex items-center justify-center gap-2 px-6 py-3.5 border border-black text-black [font-family:var(--font-ui)] text-[10px] uppercase tracking-[0.22em] hover:bg-black hover:text-white transition-colors"
              >
                <Scissors className="h-3.5 w-3.5" strokeWidth={1.5} aria-hidden />
                {t("ctaBrowseFabrics")}
              </Link>
            </motion.div>
            <motion.div variants={fadeUp}>
              <Link
                href="/motd-guide"
                className="inline-flex items-center justify-center gap-2 px-6 py-3.5 border border-[#E8E8E4] text-[#5A5A56] [font-family:var(--font-ui)] text-[10px] uppercase tracking-[0.22em] hover:border-black hover:text-black transition-colors"
              >
                <BookOpen className="h-3.5 w-3.5" strokeWidth={1.5} aria-hidden />
                {t("ctaGuide")}
              </Link>
            </motion.div>
            <motion.div variants={fadeUp}>
              <Link
                href="/contact-us"
                className="inline-flex items-center justify-center gap-2 px-6 py-3.5 border border-[#E8E8E4] text-[#5A5A56] [font-family:var(--font-ui)] text-[10px] uppercase tracking-[0.22em] hover:border-black hover:text-black transition-colors"
              >
                {t("ctaContact")}
              </Link>
            </motion.div>
          </motion.div>
        </SectionReveal>
      </div>
    </MainLayout>
  );
}
