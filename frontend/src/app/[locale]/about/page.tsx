"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import {
  AnimatePresence,
  animate,
  motion,
  useMotionValue,
} from "framer-motion";
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
import Image from "next/image";
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
  const arcOffset = useMotionValue(CIRCLE_LEN);

  const segmentStart = CIRCLE_LEN * (1 - active / STEP_KEYS.length);
  const segmentEnd = CIRCLE_LEN * (1 - (active + 1) / STEP_KEYS.length);

  useEffect(() => {
    if (paused) return;
    const id = window.setInterval(() => {
      setActive((prev) => (prev + 1) % STEP_KEYS.length);
    }, STEP_CYCLE_MS);
    return () => window.clearInterval(id);
  }, [paused]);

  useEffect(() => {
    arcOffset.set(segmentStart);
  }, [active, segmentStart, arcOffset]);

  useEffect(() => {
    if (paused) return;
    const current = arcOffset.get();
    const span = segmentStart - segmentEnd;
    const remaining = Math.max(0, current - segmentEnd);
    const durationSec =
      span <= 0
        ? STEP_CYCLE_MS / 1000
        : (STEP_CYCLE_MS / 1000) * (remaining / span);
    const controls = animate(arcOffset, segmentEnd, {
      duration: Math.max(0.05, durationSec),
      ease: "linear",
    });
    return () => controls.stop();
  }, [active, paused, segmentStart, segmentEnd, arcOffset]);

  const activeKey = STEP_KEYS[active];
  const ActiveIcon = STEP_ICONS[activeKey];

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
          animate={
            paused
              ? { scale: 1, opacity: 0.7 }
              : { scale: [1, 1.03, 1], opacity: [0.55, 0.8, 0.55] }
          }
          transition={
            paused
              ? { duration: 0.3 }
              : { duration: 5.5, repeat: Infinity, ease: "easeInOut" }
          }
        />

        {/* Outer rotating ring */}
        <motion.div
          className="pointer-events-none absolute inset-0 rounded-full border border-dashed border-black/15"
          aria-hidden
          animate={paused ? undefined : { rotate: 360 }}
          transition={
            paused
              ? { duration: 0 }
              : { duration: 72, repeat: Infinity, ease: "linear" }
          }
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
            cx="50"
            cy="50"
            r="46"
            fill="none"
            stroke="black"
            strokeWidth="1.1"
            strokeLinecap="round"
            strokeDasharray={CIRCLE_LEN}
            style={{ strokeDashoffset: arcOffset }}
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
                  isActive && !paused
                    ? {
                        boxShadow: [
                          "0 0 0 0 rgba(0,0,0,0.18)",
                          "0 0 0 12px rgba(0,0,0,0)",
                          "0 0 0 0 rgba(0,0,0,0)",
                        ],
                      }
                    : {
                        boxShadow: isActive
                          ? "0 0 0 4px rgba(0,0,0,0.08)"
                          : "0 0 0 0 rgba(0,0,0,0)",
                      }
                }
                transition={
                  isActive && !paused
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
            className="[font-family:var(--font-body)] text-sm sm:text-base text-[#5A5A56] leading-relaxed text-justify"
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

const WHY_CYCLE_MS = 4000;
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
  const pathOffset = useMotionValue(HEX_PERIMETER);
  const barProgress = useMotionValue(0);

  const segmentStart = HEX_PERIMETER * (1 - active / WHY_KEYS.length);
  const segmentEnd = HEX_PERIMETER * (1 - (active + 1) / WHY_KEYS.length);
  /** Solid completed perimeter up to the start of the current side */
  const completedOffset = HEX_PERIMETER * (1 - active / WHY_KEYS.length);

  useEffect(() => {
    if (paused) return;
    const id = window.setInterval(() => {
      setActive((prev) => (prev + 1) % WHY_KEYS.length);
    }, WHY_CYCLE_MS);
    return () => window.clearInterval(id);
  }, [paused]);

  useEffect(() => {
    pathOffset.set(segmentStart);
    barProgress.set(0);
  }, [active, segmentStart, pathOffset, barProgress]);

  useEffect(() => {
    if (paused) return;

    const pathCurrent = pathOffset.get();
    const pathSpan = segmentStart - segmentEnd;
    const pathRemaining = Math.max(0, pathCurrent - segmentEnd);
    const pathDurationSec =
      pathSpan <= 0
        ? WHY_CYCLE_MS / 1000
        : (WHY_CYCLE_MS / 1000) * (pathRemaining / pathSpan);

    const barCurrent = barProgress.get();
    const barDurationSec = (WHY_CYCLE_MS / 1000) * Math.max(0, 1 - barCurrent);

    const pathControls = animate(pathOffset, segmentEnd, {
      duration: Math.max(0.05, pathDurationSec),
      ease: "linear",
    });
    const barControls = animate(barProgress, 1, {
      duration: Math.max(0.05, barDurationSec),
      ease: "linear",
    });

    return () => {
      pathControls.stop();
      barControls.stop();
    };
  }, [active, paused, segmentStart, segmentEnd, pathOffset, barProgress]);

  const activeKey = WHY_KEYS[active];
  const ActiveIcon = WHY_ICONS[activeKey];
  const filledPath = hexPath(HEX_R);
  const midPath = hexPath(HEX_R * 0.72);

  return (
    <div
      className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 xl:gap-16 items-center"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
          setPaused(false);
        }
      }}
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
            animate={
              paused
                ? { opacity: 0.92 }
                : { opacity: [0.85, 1, 0.85] }
            }
            transition={
              paused
                ? { duration: 0.3 }
                : { duration: 7, repeat: Infinity, ease: "easeInOut" }
            }
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
              d={filledPath}
              fill="none"
              stroke="black"
              strokeWidth="1.4"
              strokeLinejoin="round"
              strokeLinecap="round"
              strokeDasharray={HEX_PERIMETER}
              style={{ strokeDashoffset: pathOffset }}
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
              animate={paused ? undefined : { strokeDashoffset: [0, -28] }}
              transition={
                paused
                  ? { duration: 0 }
                  : { duration: 22, repeat: Infinity, ease: "linear" }
              }
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
                    isActive && !paused
                      ? {
                          boxShadow: [
                            "0 0 0 0 rgba(0,0,0,0.14)",
                            "0 0 0 11px rgba(0,0,0,0)",
                            "0 0 0 0 rgba(0,0,0,0)",
                          ],
                        }
                      : {
                          boxShadow: isActive
                            ? "0 0 0 4px rgba(0,0,0,0.08)"
                            : "0 8px 18px rgba(0,0,0,0.05)",
                        }
                  }
                  transition={
                    isActive && !paused
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
            className="h-full bg-black origin-left"
            style={{ scaleX: barProgress }}
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

function PartnersNetworkVisual() {
  return (
    <div
      className="relative aspect-square w-full max-w-[280px] sm:max-w-[320px]"
      aria-hidden
    >
      <motion.div
        className="absolute inset-[10%] rounded-full bg-white/80 border border-[#E4E0D8]"
        animate={{ scale: [1, 1.03, 1], opacity: [0.7, 1, 0.7] }}
        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute inset-[2%] rounded-full border border-dashed border-black/12"
        animate={{ rotate: 360 }}
        transition={{ duration: 60, repeat: Infinity, ease: "linear" }}
      />
      <svg
        className="absolute inset-0 h-full w-full"
        viewBox="0 0 100 100"
      >
        <motion.path
          d="M 28 58 Q 50 28 72 58"
          fill="none"
          stroke="rgba(0,0,0,0.14)"
          strokeWidth="0.7"
          initial={{ pathLength: 0 }}
          whileInView={{ pathLength: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 1, ease: EASE }}
        />
        <motion.path
          d="M 28 58 L 50 72 L 72 58"
          fill="none"
          stroke="rgba(0,0,0,0.1)"
          strokeWidth="0.55"
          initial={{ pathLength: 0 }}
          whileInView={{ pathLength: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.9, ease: EASE, delay: 0.15 }}
        />
      </svg>

      {/* MOTD hub */}
      <motion.div
        className="absolute left-1/2 top-[58%] z-10 flex h-16 w-16 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-black bg-black text-white shadow-[0_12px_28px_rgba(0,0,0,0.14)]"
        initial={{ opacity: 0, scale: 0.8 }}
        whileInView={{ opacity: 1, scale: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5, ease: EASE }}
      >
        <Store className="h-5 w-5" strokeWidth={1.5} />
        <motion.span
          className="absolute inset-[-7px] rounded-full border border-dashed border-black/20"
          animate={{ rotate: -360 }}
          transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
        />
      </motion.div>

      {/* Tailor node */}
      <motion.div
        className="absolute start-[8%] top-[28%] z-20 flex h-12 w-12 items-center justify-center rounded-full border border-[#E4E0D8] bg-white text-black shadow-[0_8px_20px_rgba(0,0,0,0.05)]"
        initial={{ opacity: 0, y: 10 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ delay: 0.15, duration: 0.45, ease: EASE }}
      >
        <motion.span
          className="flex"
          animate={{ y: [0, -4, 0] }}
          transition={{ duration: 3.4, repeat: Infinity, ease: "easeInOut" }}
        >
          <Scissors className="h-4 w-4" strokeWidth={1.5} />
        </motion.span>
      </motion.div>

      {/* Fabric node */}
      <motion.div
        className="absolute end-[8%] top-[28%] z-20 flex h-12 w-12 items-center justify-center rounded-full border border-[#E4E0D8] bg-white text-black shadow-[0_8px_20px_rgba(0,0,0,0.05)]"
        initial={{ opacity: 0, y: 10 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ delay: 0.25, duration: 0.45, ease: EASE }}
      >
        <motion.span
          className="flex"
          animate={{ y: [0, -4, 0] }}
          transition={{ duration: 3.8, repeat: Infinity, ease: "easeInOut", delay: 0.3 }}
        >
          <Package className="h-4 w-4" strokeWidth={1.5} />
        </motion.span>
      </motion.div>

      {/* Quality node */}
      <motion.div
        className="absolute left-1/2 bottom-[8%] z-20 flex h-11 w-11 -translate-x-1/2 items-center justify-center border border-[#E4E0D8] bg-white text-black shadow-[0_8px_18px_rgba(0,0,0,0.05)]"
        style={{ clipPath: HEX_CLIP }}
        initial={{ opacity: 0, scale: 0.8 }}
        whileInView={{ opacity: 1, scale: 1 }}
        viewport={{ once: true }}
        transition={{ delay: 0.3, duration: 0.45, ease: EASE }}
      >
        <ShieldCheck className="h-3.5 w-3.5" strokeWidth={1.5} />
      </motion.div>
    </div>
  );
}

function AboutHeroBrandVisual() {
  return (
    <div
      className="relative aspect-square w-full max-w-[300px] sm:max-w-[360px] md:max-w-[400px] lg:max-w-[420px]"
      aria-hidden
    >
      {/* Soft ground + orbits */}
      <motion.div
        className="absolute inset-[10%] rounded-full bg-[#F5F1EA]/75"
        animate={{ scale: [1, 1.04, 1], opacity: [0.55, 0.85, 0.55] }}
        transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute inset-0 rounded-full border border-dashed border-black/12"
        animate={{ rotate: 360 }}
        transition={{ duration: 70, repeat: Infinity, ease: "linear" }}
      />
      <motion.div
        className="absolute inset-[16%] rounded-full border border-[#E4E0D8]"
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.8, ease: EASE, delay: 0.15 }}
      />
      <motion.div
        className="absolute inset-[16%] rounded-full border border-dashed border-black/10"
        animate={{ rotate: -360 }}
        transition={{ duration: 52, repeat: Infinity, ease: "linear" }}
      />

      {/* Primary brandmark — hex frame */}
      <motion.div
        className="absolute left-1/2 top-[46%] z-10 flex h-[46%] w-[46%] -translate-x-1/2 -translate-y-1/2 items-center justify-center bg-white border border-[#E4E0D8] shadow-[0_16px_40px_rgba(0,0,0,0.07)] p-4 sm:p-5"
        style={{ clipPath: HEX_CLIP }}
        initial={{ opacity: 0, scale: 0.82 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.7, ease: EASE, delay: 0.2 }}
      >
        <Image
          src="/PNG/Black/MOTD_Brandmark-One_Black.png"
          alt=""
          width={180}
          height={118}
          className="h-auto w-[78%] object-contain"
          priority
        />
      </motion.div>

      {/* Floating alt mark */}
      <motion.div
        className="absolute end-[2%] top-[8%] z-20 flex h-16 w-16 sm:h-20 sm:w-20 items-center justify-center rounded-full border border-[#E4E0D8] bg-white p-2.5 shadow-[0_10px_24px_rgba(0,0,0,0.06)]"
        initial={{ opacity: 0, y: 12, scale: 0.85 }}
        animate={{ opacity: 1, y: [0, -8, 0], scale: 1 }}
        transition={{
          opacity: { duration: 0.55, ease: EASE, delay: 0.35 },
          scale: { duration: 0.55, ease: EASE, delay: 0.35 },
          y: { duration: 5.5, repeat: Infinity, ease: "easeInOut", delay: 0.8 },
        }}
      >
        <Image
          src="/PNG/Black/MOTD_Alt-Logo-One_Black.png"
          alt=""
          width={80}
          height={50}
          className="h-auto w-full object-contain"
        />
      </motion.div>

      {/* Floating brandmark two */}
      <motion.div
        className="absolute start-[0%] bottom-[12%] z-20 flex h-14 w-14 sm:h-[4.5rem] sm:w-[4.5rem] items-center justify-center rounded-full border border-[#E4E0D8] bg-white p-2 shadow-[0_10px_24px_rgba(0,0,0,0.06)]"
        initial={{ opacity: 0, y: 12, scale: 0.85 }}
        animate={{ opacity: 1, y: [0, 7, 0], scale: 1 }}
        transition={{
          opacity: { duration: 0.55, ease: EASE, delay: 0.45 },
          scale: { duration: 0.55, ease: EASE, delay: 0.45 },
          y: { duration: 6.2, repeat: Infinity, ease: "easeInOut", delay: 1 },
        }}
      >
        <Image
          src="/PNG/Black/MOTD_Brandmark-Two_Black.png"
          alt=""
          width={70}
          height={52}
          className="h-auto w-full object-contain"
        />
      </motion.div>

      {/* Lockup chip */}
      <motion.div
        className="absolute end-[6%] bottom-[6%] z-20 flex h-11 sm:h-12 items-center justify-center border border-[#E4E0D8] bg-white px-3 py-2 shadow-[0_8px_20px_rgba(0,0,0,0.05)]"
        initial={{ opacity: 0, x: 10 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.55, ease: EASE, delay: 0.55 }}
      >
        <Image
          src="/PNG/Black/MOTD_Lockup-One_Black.png"
          alt=""
          width={110}
          height={70}
          className="h-6 sm:h-7 w-auto object-contain"
        />
      </motion.div>

      {/* Pulse under hex */}
      <motion.span
        className="absolute left-1/2 top-[46%] z-[5] h-[46%] w-[46%] -translate-x-1/2 -translate-y-1/2 border border-black/15"
        style={{ clipPath: HEX_CLIP }}
        animate={{ scale: [1, 1.12], opacity: [0.28, 0] }}
        transition={{ duration: 2.8, repeat: Infinity, ease: "easeOut" }}
      />
    </div>
  );
}

function WhoWeAreVisual() {
  const nodes: { Icon: LucideIcon; x: string; y: string; delay: number }[] = [
    { Icon: Sparkles, x: "18%", y: "28%", delay: 0 },
    { Icon: Scissors, x: "68%", y: "22%", delay: 0.12 },
    { Icon: Shirt, x: "42%", y: "68%", delay: 0.24 },
  ];

  return (
    <div className="relative aspect-square w-full max-w-[280px] sm:max-w-[320px]">
      <motion.div
        className="pointer-events-none absolute inset-[8%] rounded-full bg-[#F5F1EA]/80"
        aria-hidden
        animate={{ scale: [1, 1.05, 1], opacity: [0.5, 0.85, 0.5] }}
        transition={{ duration: 6.5, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="pointer-events-none absolute inset-[4%] rounded-full border border-dashed border-black/12"
        aria-hidden
        animate={{ rotate: 360 }}
        transition={{ duration: 56, repeat: Infinity, ease: "linear" }}
      />
      <svg
        className="pointer-events-none absolute inset-0 h-full w-full"
        viewBox="0 0 100 100"
        aria-hidden
      >
        <motion.path
          d="M 28 36 L 62 32 L 48 68 Z"
          fill="none"
          stroke="rgba(0,0,0,0.14)"
          strokeWidth="0.7"
          strokeLinejoin="round"
          initial={{ pathLength: 0, opacity: 0 }}
          whileInView={{ pathLength: 1, opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 1.1, ease: EASE }}
        />
        <motion.circle
          cx="46"
          cy="45"
          r="18"
          fill="none"
          stroke="rgba(0,0,0,0.08)"
          strokeWidth="0.6"
          strokeDasharray="1.6 2.2"
          animate={{ strokeDashoffset: [0, -20] }}
          transition={{ duration: 16, repeat: Infinity, ease: "linear" }}
        />
      </svg>
      <div className="absolute left-1/2 top-[42%] z-10 flex h-14 w-14 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-[#E4E0D8] bg-white shadow-[0_10px_28px_rgba(0,0,0,0.06)]">
        <Heart className="h-5 w-5 text-black" strokeWidth={1.5} />
      </div>
      {nodes.map(({ Icon, x, y, delay }, i) => (
        <motion.span
          key={x + y}
          className="absolute z-20 flex h-11 w-11 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-[#E4E0D8] bg-white text-black shadow-[0_8px_18px_rgba(0,0,0,0.05)]"
          style={{ left: x, top: y }}
          initial={{ opacity: 0, scale: 0.6 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ delay, duration: 0.5, ease: EASE }}
        >
          <motion.span
            className="flex items-center justify-center"
            animate={{ y: [0, -4, 0] }}
            transition={{
              duration: 3.2 + i * 0.4,
              repeat: Infinity,
              ease: "easeInOut",
              delay: i * 0.2,
            }}
          >
            <Icon className="h-4 w-4" strokeWidth={1.5} />
          </motion.span>
        </motion.span>
      ))}
    </div>
  );
}

function PlatformBridgeVisual() {
  const steps: LucideIcon[] = [Heart, LayoutGrid, Handshake];

  return (
    <div className="relative w-full max-w-[340px] py-6" aria-hidden>
      <motion.div
        className="pointer-events-none absolute inset-x-8 top-[calc(50%-0.75rem)] h-px -translate-y-1/2 bg-[#E4E0D8]"
        initial={{ scaleX: 0 }}
        whileInView={{ scaleX: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.8, ease: EASE }}
      />
      <motion.div
        className="pointer-events-none absolute inset-x-8 top-[calc(50%-0.75rem)] h-px -translate-y-1/2 origin-left bg-black"
        initial={{ scaleX: 0 }}
        whileInView={{ scaleX: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 1.2, ease: EASE, delay: 0.15 }}
      />
      <div className="relative flex items-center justify-between gap-2">
        {steps.map((Icon, index) => {
          const isHub = index === 1;
          return (
            <motion.div
              key={index}
              className="flex flex-col items-center gap-2"
              initial={{ opacity: 0, y: 14 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.12 * index, duration: 0.45, ease: EASE }}
            >
              <motion.span
                className={`relative flex h-14 w-14 items-center justify-center rounded-full border ${
                  isHub
                    ? "border-black bg-black text-white"
                    : "border-[#E4E0D8] bg-white text-black"
                }`}
                animate={
                  isHub
                    ? {
                        boxShadow: [
                          "0 0 0 0 rgba(0,0,0,0.16)",
                          "0 0 0 12px rgba(0,0,0,0)",
                          "0 0 0 0 rgba(0,0,0,0)",
                        ],
                      }
                    : { boxShadow: "0 8px 18px rgba(0,0,0,0.05)" }
                }
                transition={
                  isHub
                    ? { duration: 2.8, repeat: Infinity, ease: "easeOut" }
                    : { duration: 0.3 }
                }
              >
                <Icon className="h-4 w-4" strokeWidth={1.5} />
                {isHub ? (
                  <motion.span
                    className="pointer-events-none absolute inset-[-6px] rounded-full border border-dashed border-black/20"
                    animate={{ rotate: 360 }}
                    transition={{ duration: 18, repeat: Infinity, ease: "linear" }}
                  />
                ) : null}
              </motion.span>
              <span className="[font-family:var(--font-ui)] text-[9px] tracking-[0.18em] text-[#8A8A80]">
                {String(index + 1).padStart(2, "0")}
              </span>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

function MukhawarEmblemVisual() {
  return (
    <div className="relative aspect-square w-full max-w-[280px] sm:max-w-[320px]">
      <motion.div
        className="pointer-events-none absolute inset-[6%] bg-[#FAF8F3] border border-[#E4E0D8]"
        style={{ clipPath: HEX_CLIP }}
        aria-hidden
        initial={{ opacity: 0, scale: 0.88 }}
        whileInView={{ opacity: 1, scale: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.65, ease: EASE }}
      />
      <motion.div
        className="pointer-events-none absolute inset-[16%] bg-white border border-[#E8E8E4] shadow-[0_14px_36px_rgba(0,0,0,0.05)]"
        style={{ clipPath: HEX_CLIP }}
        aria-hidden
        animate={{ opacity: [0.9, 1, 0.9] }}
        transition={{ duration: 5.5, repeat: Infinity, ease: "easeInOut" }}
      />
      <svg
        className="pointer-events-none absolute inset-0 h-full w-full overflow-visible"
        viewBox="0 0 100 100"
        aria-hidden
      >
        <motion.path
          d={hexPath(HEX_R * 0.95)}
          fill="none"
          stroke="rgba(0,0,0,0.1)"
          strokeWidth="0.55"
          strokeLinejoin="round"
        />
        <motion.path
          d={hexPath(HEX_R * 0.72)}
          fill="none"
          stroke="rgba(0,0,0,0.16)"
          strokeWidth="0.5"
          strokeDasharray="1.5 2.2"
          strokeLinejoin="round"
          animate={{ strokeDashoffset: [0, -26] }}
          transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
        />
      </svg>
      <div
        className="absolute left-1/2 top-1/2 z-10 flex h-[38%] w-[38%] -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center bg-black text-white"
        style={{ clipPath: HEX_CLIP }}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.85 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, ease: EASE, delay: 0.15 }}
          className="flex flex-col items-center gap-1.5"
        >
          <Shirt className="h-5 w-5" strokeWidth={1.5} />
          <span className="[font-family:var(--font-ui)] text-[8px] uppercase tracking-[0.2em] text-white/70">
            01
          </span>
        </motion.div>
      </div>
      {[0, 1, 2, 3, 4, 5].map((i) => {
        const v = hexVertex(i, 41);
        return (
          <motion.span
            key={i}
            className="absolute z-20 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-black/30"
            style={{ left: `${v.x}%`, top: `${v.y}%` }}
            initial={{ opacity: 0, scale: 0 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.08 * i, duration: 0.35, ease: EASE }}
            animate={{ opacity: [0.25, 0.7, 0.25] }}
          />
        );
      })}
    </div>
  );
}

const WHERE_KEYS = ["office", "delivery", "online"] as const;
type WhereKey = (typeof WHERE_KEYS)[number];

const WHERE_ICONS: Record<WhereKey, LucideIcon> = {
  office: MapPin,
  delivery: Truck,
  online: Globe2,
};

/** Positions for the three reach nodes on the map diagram (percent). */
const WHERE_NODE_POS: Record<WhereKey, { left: string; top: string }> = {
  office: { left: "50%", top: "28%" },
  delivery: { left: "78%", top: "62%" },
  online: { left: "22%", top: "64%" },
};

function WhereWeAre({
  t,
}: {
  t: ReturnType<typeof useTranslations<"AboutPage">>;
}) {
  const [active, setActive] = useState<WhereKey>("office");

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 xl:gap-16 items-center">
      {/* Abstract reach map */}
      <div className="lg:col-span-5 flex justify-center">
        <div className="relative aspect-square w-full max-w-[340px] sm:max-w-[400px] md:max-w-[440px]">
          {/* Soft ground */}
          <motion.div
            className="pointer-events-none absolute inset-[10%] rounded-full bg-[#F5F1EA]/70"
            aria-hidden
            animate={{ scale: [1, 1.04, 1], opacity: [0.55, 0.85, 0.55] }}
            transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
          />

          {/* Outer orbit — online reach */}
          <motion.div
            className="pointer-events-none absolute inset-0 rounded-full border border-dashed border-black/12"
            aria-hidden
            animate={{ rotate: 360 }}
            transition={{ duration: 64, repeat: Infinity, ease: "linear" }}
          />

          {/* Mid orbit — UAE delivery */}
          <motion.div
            className="pointer-events-none absolute inset-[14%] rounded-full border border-[#E4E0D8]"
            aria-hidden
            initial={{ scale: 0.88, opacity: 0 }}
            whileInView={{ scale: 1, opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7, ease: EASE }}
          />
          <motion.div
            className="pointer-events-none absolute inset-[14%] rounded-full border border-dashed border-black/10"
            aria-hidden
            animate={{ rotate: -360 }}
            transition={{ duration: 48, repeat: Infinity, ease: "linear" }}
          />

          {/* Inner hub — Dubai */}
          <motion.div
            className="pointer-events-none absolute inset-[32%] rounded-full border border-[#E8E8E4] bg-white shadow-[0_12px_36px_rgba(0,0,0,0.06)]"
            aria-hidden
            initial={{ scale: 0.8, opacity: 0 }}
            whileInView={{ scale: 1, opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.65, ease: EASE, delay: 0.1 }}
          />

          {/* Connecting arcs */}
          <svg
            className="pointer-events-none absolute inset-0 h-full w-full"
            viewBox="0 0 100 100"
            aria-hidden
          >
            <motion.circle
              cx="50"
              cy="50"
              r="38"
              fill="none"
              stroke="rgba(0,0,0,0.06)"
              strokeWidth="0.6"
            />
            <motion.circle
              cx="50"
              cy="50"
              r="26"
              fill="none"
              stroke="rgba(0,0,0,0.08)"
              strokeWidth="0.7"
              strokeDasharray="2 2.5"
              animate={{ strokeDashoffset: [0, -24] }}
              transition={{ duration: 18, repeat: Infinity, ease: "linear" }}
            />
            {/* Soft radial ticks */}
            {Array.from({ length: 12 }).map((_, i) => {
              const a = ((i * 30 - 90) * Math.PI) / 180;
              const x1 = 50 + Math.cos(a) * 41;
              const y1 = 50 + Math.sin(a) * 41;
              const x2 = 50 + Math.cos(a) * 44;
              const y2 = 50 + Math.sin(a) * 44;
              return (
                <line
                  key={i}
                  x1={x1}
                  y1={y1}
                  x2={x2}
                  y2={y2}
                  stroke="rgba(0,0,0,0.14)"
                  strokeWidth="0.5"
                  strokeLinecap="round"
                />
              );
            })}
          </svg>

          {/* Center pin */}
          <div className="absolute left-1/2 top-1/2 z-10 flex h-[26%] w-[26%] -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center rounded-full bg-black text-white shadow-[0_10px_28px_rgba(0,0,0,0.18)]">
            <AnimatePresence mode="wait">
              <motion.div
                key={active}
                initial={{ opacity: 0, scale: 0.86, y: 4 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.92, y: -4 }}
                transition={{ duration: 0.3, ease: EASE }}
                className="flex flex-col items-center gap-1"
              >
                {(() => {
                  const Icon = WHERE_ICONS[active];
                  return <Icon className="h-4 w-4 sm:h-5 sm:w-5" strokeWidth={1.5} />;
                })()}
                <span className="[font-family:var(--font-ui)] text-[8px] sm:text-[9px] uppercase tracking-[0.18em] text-white/70">
                  UAE
                </span>
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Pulse ring under center */}
          <motion.span
            className="pointer-events-none absolute left-1/2 top-1/2 z-[5] h-[26%] w-[26%] -translate-x-1/2 -translate-y-1/2 rounded-full border border-black/25"
            aria-hidden
            animate={{ scale: [1, 1.55], opacity: [0.35, 0] }}
            transition={{ duration: 2.4, repeat: Infinity, ease: "easeOut" }}
          />

          {/* Reach nodes */}
          {WHERE_KEYS.map((key, index) => {
            const Icon = WHERE_ICONS[key];
            const isActive = active === key;
            const pos = WHERE_NODE_POS[key];

            return (
              <motion.button
                key={key}
                type="button"
                aria-label={t(
                  key === "office"
                    ? "whereOfficeLabel"
                    : key === "delivery"
                      ? "whereDeliveryLabel"
                      : "whereOnlineLabel",
                )}
                aria-pressed={isActive}
                onMouseEnter={() => setActive(key)}
                onFocus={() => setActive(key)}
                onClick={() => setActive(key)}
                className="absolute z-20 -translate-x-1/2 -translate-y-1/2 touch-manipulation focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/25 focus-visible:ring-offset-2"
                style={pos}
                initial={{ opacity: 0, scale: 0.6 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: 0.1 * index, duration: 0.45, ease: EASE }}
                whileHover={{ scale: 1.08 }}
                whileTap={{ scale: 0.96 }}
              >
                <motion.span
                  className={`relative flex h-12 w-12 sm:h-14 sm:w-14 items-center justify-center rounded-full border transition-colors ${
                    isActive
                      ? "border-black bg-black text-white"
                      : "border-[#E4E0D8] bg-white text-black"
                  }`}
                  animate={
                    isActive
                      ? {
                          boxShadow: [
                            "0 0 0 0 rgba(0,0,0,0.16)",
                            "0 0 0 12px rgba(0,0,0,0)",
                            "0 0 0 0 rgba(0,0,0,0)",
                          ],
                        }
                      : { boxShadow: "0 8px 20px rgba(0,0,0,0.05)" }
                  }
                  transition={
                    isActive
                      ? { duration: 2.8, repeat: Infinity, ease: "easeOut" }
                      : { duration: 0.3 }
                  }
                >
                  <Icon className="h-4 w-4 sm:h-5 sm:w-5" strokeWidth={1.5} />
                </motion.span>
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* Copy + cards */}
      <div className="lg:col-span-7 space-y-6 sm:space-y-8">
        <motion.p
          variants={fadeUp}
          className="[font-family:var(--font-body)] text-[#5A5A56] text-sm sm:text-base leading-relaxed text-justify max-w-xl"
        >
          {t("whereBody")}
        </motion.p>

        <ul className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4" role="list">
          {WHERE_KEYS.map((key, index) => {
            const Icon = WHERE_ICONS[key];
            const isActive = active === key;
            const labelKey =
              key === "office"
                ? "whereOfficeLabel"
                : key === "delivery"
                  ? "whereDeliveryLabel"
                  : "whereOnlineLabel";
            const bodyKey =
              key === "office"
                ? "whereOffice"
                : key === "delivery"
                  ? "whereDelivery"
                  : "whereOnline";

            return (
              <motion.li
                key={key}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.08 * index, duration: 0.45, ease: EASE }}
              >
                <button
                  type="button"
                  onMouseEnter={() => setActive(key)}
                  onFocus={() => setActive(key)}
                  onClick={() => setActive(key)}
                  className={`group relative flex h-full w-full flex-col gap-3 overflow-hidden border px-4 py-4 sm:px-5 sm:py-5 text-start transition-all touch-manipulation ${
                    isActive
                      ? "border-black bg-white shadow-[0_12px_32px_rgba(0,0,0,0.06)]"
                      : "border-[#E8E8E4] bg-[#FAF9F6] hover:border-black/30 hover:bg-white"
                  }`}
                >
                  {/* Corner shape accent */}
                  <span
                    className={`pointer-events-none absolute -end-6 -top-6 h-16 w-16 rounded-full transition-opacity ${
                      isActive ? "bg-black/[0.04] opacity-100" : "bg-black/[0.03] opacity-0 group-hover:opacity-100"
                    }`}
                    aria-hidden
                  />
                  <span
                    className={`inline-flex h-9 w-9 items-center justify-center rounded-full transition-colors ${
                      isActive
                        ? "bg-black text-white"
                        : "bg-white text-black border border-[#E4E0D8] group-hover:border-black/25"
                    }`}
                  >
                    <Icon className="h-4 w-4" strokeWidth={1.5} />
                  </span>
                  <span className="relative space-y-1.5">
                    <span className="block [font-family:var(--font-ui)] text-[10px] uppercase tracking-[0.2em] text-[#8A8A80]">
                      {t(labelKey)}
                    </span>
                    <AnimatePresence mode="wait">
                      <motion.span
                        key={isActive ? `${key}-on` : `${key}-off`}
                        initial={isActive ? { opacity: 0, y: 4 } : false}
                        animate={{ opacity: 1, y: 0 }}
                        className={`block [font-family:var(--font-body)] text-[13px] sm:text-sm leading-relaxed ${
                          isActive ? "text-black" : "text-[#5A5A56]"
                        }`}
                      >
                        {t(bodyKey)}
                      </motion.span>
                    </AnimatePresence>
                  </span>
                  <motion.span
                    className="mt-auto h-px w-full origin-left bg-black"
                    initial={false}
                    animate={{ scaleX: isActive ? 1 : 0 }}
                    transition={{ duration: 0.35, ease: EASE }}
                  />
                </button>
              </motion.li>
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
            className={`relative ${PAGE_PAD} pt-16 sm:pt-24 lg:pt-28 pb-16 sm:pb-24 grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-8 xl:gap-12 items-center`}
            initial="hidden"
            animate="show"
            variants={stagger}
          >
            <div className="lg:col-span-6 xl:col-span-7 min-w-0">
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
                className="[font-family:var(--font-display)] text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-light tracking-tight text-black leading-[1.05] mb-6 max-w-3xl"
              >
                <span className="block">{t("headlineLine1")}</span>
                <span className="block italic text-black/75">
                  {t("headlineLine2")}
                </span>
              </motion.h1>
              <motion.p
                variants={fadeUp}
                className="[font-family:var(--font-body)] text-[#5A5A56] text-sm sm:text-base md:text-lg leading-relaxed text-justify max-w-xl"
              >
                {t("intro")}
              </motion.p>
            </div>

            <motion.div
              variants={fadeUp}
              className="lg:col-span-6 xl:col-span-5 flex justify-center lg:justify-end"
            >
              <AboutHeroBrandVisual />
            </motion.div>
          </motion.div>
        </section>

        {/* Who we are */}
        <SectionReveal className="relative w-full border-b border-[#E8E8E4] overflow-hidden">
          <motion.div
            className="pointer-events-none absolute -start-16 top-10 h-48 w-48 rounded-full border border-black/[0.04]"
            aria-hidden
            animate={{ y: [0, 14, 0], x: [0, 6, 0] }}
            transition={{ duration: 11, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.div
            className="pointer-events-none absolute -end-10 bottom-6 h-36 w-36 rotate-12 border border-black/[0.05]"
            style={{ clipPath: HEX_CLIP }}
            aria-hidden
            animate={{ rotate: [12, 20, 12], y: [0, -10, 0] }}
            transition={{ duration: 13, repeat: Infinity, ease: "easeInOut" }}
          />
          <div className={`${PAGE_PAD} py-16 sm:py-20 lg:py-24 grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 xl:gap-16 items-center`}>
            <motion.div variants={fadeUp} className="lg:col-span-5 flex justify-center lg:justify-start">
              <WhoWeAreVisual />
            </motion.div>
            <motion.div variants={fadeUp} className="lg:col-span-7 space-y-5">
              <div className="flex items-center gap-3">
                <Heart className="h-4 w-4 text-black" strokeWidth={1.5} aria-hidden />
                <h2 className="[font-family:var(--font-display)] text-2xl sm:text-3xl lg:text-4xl font-light tracking-tight text-black">
                  {t("whoTitle")}
                </h2>
              </div>
              <div className="[font-family:var(--font-body)] text-[#5A5A56] text-sm sm:text-base leading-relaxed text-justify space-y-4 max-w-xl">
                <p>{t("whoBody")}</p>
                <p>{t("whoBody2")}</p>
              </div>
              <motion.div
                className="h-px w-24 bg-black origin-left"
                initial={{ scaleX: 0 }}
                whileInView={{ scaleX: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.7, ease: EASE, delay: 0.2 }}
              />
            </motion.div>
          </div>
        </SectionReveal>

        {/* Platform — not a tailor */}
        <SectionReveal className="relative w-full border-b border-[#E8E8E4] bg-[#FAF9F6] overflow-hidden">
          <motion.div
            className="pointer-events-none absolute inset-y-0 end-0 w-1/3 opacity-40"
            aria-hidden
            style={{
              background:
                "radial-gradient(ellipse 80% 60% at 100% 50%, #EDE8DF 0%, transparent 70%)",
            }}
            animate={{ opacity: [0.25, 0.45, 0.25] }}
            transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
          />
          <div className={`${PAGE_PAD} py-14 sm:py-16 lg:py-20 grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-center`}>
            <motion.div variants={fadeUp} className="lg:col-span-7 space-y-5 order-2 lg:order-1">
              <div className="flex items-start gap-3">
                <Handshake className="mt-1 h-4 w-4 shrink-0 text-black" strokeWidth={1.5} aria-hidden />
                <h2 className="[font-family:var(--font-display)] text-xl sm:text-2xl lg:text-3xl font-light tracking-tight text-black">
                  {t("notTailorTitle")}
                </h2>
              </div>
              <p className="[font-family:var(--font-body)] text-[#5A5A56] text-sm sm:text-base leading-relaxed text-justify max-w-xl">
                {t("notTailorBody")}
              </p>
            </motion.div>
            <motion.div variants={fadeUp} className="lg:col-span-5 flex justify-center order-1 lg:order-2">
              <PlatformBridgeVisual />
            </motion.div>
          </div>
        </SectionReveal>

        {/* Mukhawar */}
        <SectionReveal className="relative w-full border-b border-[#E8E8E4] overflow-hidden">
          <motion.div
            className="pointer-events-none absolute start-1/2 top-0 h-px w-[min(70%,28rem)] -translate-x-1/2 bg-gradient-to-r from-transparent via-black/10 to-transparent"
            aria-hidden
            initial={{ scaleX: 0 }}
            whileInView={{ scaleX: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 1, ease: EASE }}
          />
          <div className={`${PAGE_PAD} py-16 sm:py-20 lg:py-24 grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 xl:gap-16 items-center`}>
            <motion.div variants={fadeUp} className="lg:col-span-5 flex justify-center lg:justify-start">
              <MukhawarEmblemVisual />
            </motion.div>
            <motion.div variants={fadeUp} className="lg:col-span-7 space-y-5">
              <div className="flex items-center gap-3">
                <Shirt className="h-4 w-4 text-black" strokeWidth={1.5} aria-hidden />
                <h2 className="[font-family:var(--font-display)] text-2xl sm:text-3xl lg:text-4xl font-light tracking-tight text-black">
                  {t("mukhawarTitle")}
                </h2>
              </div>
              <p className="[font-family:var(--font-body)] text-[#5A5A56] text-sm sm:text-base leading-relaxed text-justify max-w-xl">
                {t("mukhawarBody")}
              </p>
              <motion.div
                className="flex items-center gap-2"
                initial={{ opacity: 0, y: 8 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.25, duration: 0.45, ease: EASE }}
              >
                {[0, 1, 2].map((i) => (
                  <motion.span
                    key={i}
                    className="h-1.5 w-1.5 rounded-full bg-black/25"
                    animate={{ opacity: [0.25, 1, 0.25], scale: [1, 1.25, 1] }}
                    transition={{
                      duration: 2.4,
                      repeat: Infinity,
                      ease: "easeInOut",
                      delay: i * 0.35,
                    }}
                  />
                ))}
              </motion.div>
            </motion.div>
          </div>
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
            <p className="[font-family:var(--font-body)] text-[#5A5A56] text-sm sm:text-base leading-relaxed text-justify">
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
              <p className="[font-family:var(--font-body)] text-[#5A5A56] text-sm sm:text-base leading-relaxed text-justify">
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
          className={`${PAGE_PAD} py-16 sm:py-20 lg:py-24 border-b border-[#E8E8E4] space-y-10 lg:space-y-12`}
        >
          <motion.div variants={fadeUp} className="max-w-2xl space-y-3">
            <div className="flex items-center gap-3">
              <MapPin className="h-4 w-4 text-black" strokeWidth={1.5} aria-hidden />
              <h2 className="[font-family:var(--font-display)] text-2xl sm:text-3xl lg:text-4xl font-light tracking-tight text-black">
                {t("whereTitle")}
              </h2>
            </div>
          </motion.div>
          <motion.div variants={fadeUp}>
            <WhereWeAre t={t} />
          </motion.div>
        </SectionReveal>

        {/* Partners */}
        <SectionReveal className="relative w-full border-b border-[#E8E8E4] bg-[#FAF9F6] overflow-hidden">
          <motion.div
            className="pointer-events-none absolute -start-12 top-8 h-40 w-40 rounded-full border border-black/[0.04]"
            aria-hidden
            animate={{ y: [0, 10, 0], x: [0, 4, 0] }}
            transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.div
            className="pointer-events-none absolute -end-8 bottom-4 h-28 w-28 border border-black/[0.05]"
            style={{ clipPath: HEX_CLIP }}
            aria-hidden
            animate={{ rotate: [8, 16, 8], y: [0, -8, 0] }}
            transition={{ duration: 14, repeat: Infinity, ease: "easeInOut" }}
          />
          <div className={`${PAGE_PAD} py-16 sm:py-20 lg:py-24 grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 xl:gap-16 items-center`}>
            <motion.div variants={fadeUp} className="lg:col-span-5 flex justify-center lg:justify-start">
              <PartnersNetworkVisual />
            </motion.div>
            <motion.div variants={fadeUp} className="lg:col-span-7 space-y-6">
              <div className="space-y-5">
                <div className="flex items-center gap-3">
                  <Store className="h-4 w-4 text-black" strokeWidth={1.5} aria-hidden />
                  <h2 className="[font-family:var(--font-display)] text-2xl sm:text-3xl lg:text-4xl font-light tracking-tight text-black">
                    {t("partnersTitle")}
                  </h2>
                </div>
                <p className="[font-family:var(--font-body)] text-[#5A5A56] text-sm sm:text-base leading-relaxed text-justify max-w-xl">
                  {t("partnersBody")}
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                <motion.div
                  className="inline-flex items-center gap-2 border border-[#E4E0D8] bg-white px-3.5 py-2"
                  initial={{ opacity: 0, y: 8 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.1, duration: 0.4, ease: EASE }}
                >
                  <Scissors className="h-3.5 w-3.5 text-black" strokeWidth={1.5} aria-hidden />
                  <span className="[font-family:var(--font-ui)] text-[10px] uppercase tracking-[0.18em] text-[#5A5A56]">
                    {t("partnersTailorLabel")}
                  </span>
                </motion.div>
                <motion.div
                  className="inline-flex items-center gap-2 border border-[#E4E0D8] bg-white px-3.5 py-2"
                  initial={{ opacity: 0, y: 8 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.18, duration: 0.4, ease: EASE }}
                >
                  <Package className="h-3.5 w-3.5 text-black" strokeWidth={1.5} aria-hidden />
                  <span className="[font-family:var(--font-ui)] text-[10px] uppercase tracking-[0.18em] text-[#5A5A56]">
                    {t("partnersFabricLabel")}
                  </span>
                </motion.div>
              </div>

              <motion.div
                initial={{ opacity: 0, y: 8 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.22, duration: 0.45, ease: EASE }}
              >
                <Link
                  href="/partners"
                  className="group inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-black text-white [font-family:var(--font-ui)] text-[10px] uppercase tracking-[0.22em] hover:bg-black/85 transition-colors"
                >
                  {t("ctaPartners")}
                  <ArrowRight
                    className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5 rtl:rotate-180 rtl:group-hover:-translate-x-0.5"
                    strokeWidth={1.5}
                  />
                </Link>
              </motion.div>
            </motion.div>
          </div>
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
