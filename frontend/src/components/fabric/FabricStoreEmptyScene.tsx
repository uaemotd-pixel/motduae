"use client";

import { motion, useReducedMotion } from "framer-motion";

/** Full story loop length (seconds) — long enough for a readable reply. */
const LOOP = 14.5;

/** Soft story ease (ease-out feel for door / settle). */
const easeOutCubic = [0.22, 1, 0.36, 1] as const;

/**
 * Shared storyboard (normalized 0–1).
 * door → threshold pause → walk → customer → typing → reply (≥~2s) → leave → close.
 *
 * Timing changes vs prior loop:
 * - LOOP 13 → 14.5 for longer reply hold
 * - Added threshold pause before approach (T.pause)
 * - Door opens earlier with hinge overshoot key (T.doorPeak)
 * - replyShown→replyHold ≈ 2.2s real time; leave only after replyOut
 */
const T = {
  doorOpen: 0.07,
  doorPeak: 0.12,
  doorOpenDone: 0.15,
  /** Customer appears at the threshold */
  threshold: 0.16,
  /** Brief pause before approaching the counter */
  pause: 0.2,
  walkStart: 0.2,
  arrive: 0.36,
  // Customer bubble
  custIn: 0.39,
  custShown: 0.41,
  custHold: 0.5,
  custOut: 0.53,
  // Typing (only after customer finishes)
  typeIn: 0.55,
  typeShown: 0.57,
  typeHold: 0.63,
  typeOut: 0.65,
  // Tailor reply — held ~2.2s to read
  replyIn: 0.67,
  replyShown: 0.69,
  replyHold: 0.84,
  replyOut: 0.88,
  // Leave only after reply fully fades; door closes with exit
  leave: 0.9,
  leaveGone: 0.97,
  reset: 1,
} as const;

/**
 * Boutique storefront scene:
 * shop owner waits → door opens → customer walks in → they chat.
 */
export default function FabricStoreEmptyScene({
  storeName = "",
}: {
  storeName?: string;
}) {
  const reduceMotion = useReducedMotion();
  const fasciaName = formatStoreFasciaName(storeName);

  return (
    <div
      aria-hidden
      className="relative mx-auto w-full max-w-[24.5rem] select-none"
    >
      <motion.div
        className="relative overflow-hidden rounded-[1.55rem] border border-[#E8E8E4] bg-[#FFFDF9] shadow-[0_28px_64px_rgba(0,0,0,0.11)]"
        initial={reduceMotion ? false : { opacity: 0, y: 22, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.7, ease: easeOutCubic }}
      >
        <div className="pointer-events-none absolute -top-6 left-1/2 h-16 w-3/4 -translate-x-1/2 rounded-full bg-[radial-gradient(ellipse,rgba(0,0,0,0.06),transparent_70%)] blur-md" />

        {/* Zebra awning */}
        <div className="relative px-3 pt-3">
          <div className="relative">
            <div
              className="relative h-7 overflow-hidden rounded-t-lg shadow-[0_8px_18px_rgba(0,0,0,0.12)]"
              style={{
                backgroundImage:
                  "repeating-linear-gradient(90deg, #111 0 18px, #F3EEE4 18px 36px)",
              }}
            >
              <div className="absolute inset-0 bg-gradient-to-b from-white/20 via-transparent to-black/15" />
            </div>
            <div className="absolute inset-x-1 -bottom-0.5 h-[3px] rounded-full bg-[#1a1a18]/35" />
          </div>
          <div className="relative z-[1] flex h-3 w-full overflow-hidden">
            {Array.from({ length: 18 }).map((_, i) => (
              <motion.span
                key={i}
                className="block h-3 flex-1 rounded-b-full"
                style={{
                  background: i % 2 === 0 ? "#111" : "#F3EEE4",
                  marginInline: 0.5,
                  transformOrigin: "top",
                  boxShadow:
                    i % 2 === 0
                      ? "inset 0 -2px 0 rgba(255,255,255,0.08)"
                      : "inset 0 -2px 0 rgba(0,0,0,0.06)",
                }}
                animate={
                  reduceMotion
                    ? undefined
                    : { y: [0, i % 2 === 0 ? 0.35 : -0.25, 0] }
                }
                transition={{
                  duration: 3.6 + (i % 4) * 0.2,
                  repeat: Infinity,
                  ease: "easeInOut",
                  delay: i * 0.03,
                }}
              />
            ))}
          </div>

          {fasciaName ? (
            <motion.div
              className="relative z-[2] mx-auto mt-1.5 flex max-w-[94%] items-center justify-center gap-2 bg-transparent px-1 py-1"
              initial={reduceMotion ? false : { opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.28, duration: 0.5, ease: easeOutCubic }}
            >
              <StoreNameOrnament />
              <p
                className="truncate text-center text-[10px] font-medium uppercase leading-none tracking-[0.24em] text-black [font-family:var(--font-ui)] sm:text-[11px] sm:tracking-[0.28em]"
                title={fasciaName}
              >
                {fasciaName}
              </p>
              <StoreNameOrnament mirror />
            </motion.div>
          ) : null}
        </div>

        {/* Interior stage — depth layers: back → floor → props → door → people → bubbles */}
        <div className="relative mx-3 mb-3 mt-1 h-[14.5rem] overflow-hidden rounded-xl border border-[#E4E0D8] bg-gradient-to-b from-[#FCFAF6] via-[#F5F0E8] to-[#E8E0D2]">
          {/* Ambient warm pulse */}
          <motion.div
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_68%_32%,rgba(236,214,172,0.5),transparent_62%)]"
            animate={
              reduceMotion ? { opacity: 0.7 } : { opacity: [0.55, 0.85, 0.55] }
            }
            transition={{ duration: 5.2, repeat: Infinity, ease: "easeInOut" }}
          />

          {/* Door bell */}
          <motion.div
            className="absolute left-[1.15rem] top-[18%] z-20 sm:left-3 sm:top-[2.35rem]"
            animate={
              reduceMotion
                ? undefined
                : {
                    rotate: [0, 0, -16, 14, -10, 6, 0, 0],
                    y: [0, 0, 1, -1, 0.5, 0, 0, 0],
                  }
            }
            transition={{
              duration: LOOP,
              repeat: Infinity,
              ease: "easeInOut",
              times: [0, T.doorOpen, 0.1, 0.12, 0.14, 0.17, 0.22, T.reset],
            }}
            style={{ transformOrigin: "top center" }}
          >
            <svg width="12" height="14" viewBox="0 0 14 16" fill="none">
              <path
                d="M7 1.5v1.2M3.2 5.2a3.8 3.8 0 0 1 7.6 0c0 2.4 1 3.8 1 3.8H2.2S3.2 7.6 3.2 5.2Z"
                fill="#1A1A18"
              />
              <path
                d="M5.2 13a1.8 1.8 0 0 0 3.6 0"
                stroke="#1A1A18"
                strokeWidth="1.2"
              />
            </svg>
          </motion.div>

          {/* Floor */}
          <div className="absolute inset-x-0 bottom-0 h-12 bg-[linear-gradient(to_top,#C9C0AE_0%,#DCD3C3_45%,#E8E1D4_100%)]" />
          <div className="absolute inset-x-0 bottom-[2.85rem] h-px bg-[#BDB4A2]/70" />
          <div className="absolute inset-x-4 bottom-2 flex gap-6 opacity-20">
            {[0, 1, 2, 3, 4].map((i) => (
              <div key={i} className="h-px flex-1 bg-[#8A8070]" />
            ))}
          </div>

          {/* Rear glass window + Dubai skyline (behind mannequins) */}
          <div className="absolute bottom-[3.05rem] left-[34%] z-[1] h-[8.6rem] w-[8.4rem] sm:left-[36%] sm:h-[9rem] sm:w-[9rem]">
            {/* Outer metal frame */}
            <div className="absolute inset-0 rounded-t-md bg-gradient-to-b from-[#3a3a38] to-[#1a1a18] p-[3px] shadow-[0_8px_20px_rgba(0,0,0,0.14)]">
              <div className="relative h-full w-full overflow-hidden rounded-t-[3px] bg-[#87B5D4]">
                {/* Sky gradient — soft Dubai daylight */}
                <div className="absolute inset-0 bg-gradient-to-b from-[#9EC8E8] via-[#C5DDF0] to-[#E8D9B8]" />
                {/* Distant haze */}
                <div className="absolute inset-x-0 bottom-0 h-[45%] bg-gradient-to-t from-[#E6D5B5]/90 via-[#E6D5B5]/35 to-transparent" />

                {/* Dubai skyline silhouette */}
                <DubaiSkyline reduceMotion={Boolean(reduceMotion)} />

                {/* Glass pane overlays */}
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/35 via-transparent to-sky-100/15" />
                <div className="pointer-events-none absolute inset-y-0 left-[8%] w-[28%] -skew-x-12 bg-gradient-to-r from-white/40 via-white/10 to-transparent" />
                <div className="pointer-events-none absolute inset-y-2 left-1/2 w-px -translate-x-1/2 bg-white/35" />
                <div className="pointer-events-none absolute inset-x-2 top-[38%] h-px bg-white/25" />
                {!reduceMotion ? (
                  <motion.div
                    className="pointer-events-none absolute inset-y-0 w-8 bg-gradient-to-r from-transparent via-white/30 to-transparent"
                    animate={{ x: ["-40%", "160%"] }}
                    transition={{
                      duration: 5.8,
                      repeat: Infinity,
                      ease: "easeInOut",
                      repeatDelay: 4.5,
                    }}
                  />
                ) : null}
                {/* Soft inner glass edge */}
                <div className="pointer-events-none absolute inset-0 rounded-t-[2px] ring-1 ring-inset ring-white/40" />
              </div>
            </div>
            {/* Window sill */}
            <div className="absolute -bottom-1 inset-x-[-2px] h-2 rounded-sm border border-[#D0C6B4] bg-gradient-to-b from-[#F7F2E9] to-[#E4D9C8] shadow-[0_3px_8px_rgba(0,0,0,0.1)]" />
          </div>

          {/* Soft dust (quieter) */}
          {!reduceMotion
            ? [
                { left: "22%", top: "26%", d: 0 },
                { left: "52%", top: "18%", d: 1.2 },
                { left: "74%", top: "40%", d: 2.4 },
              ].map((mote, i) => (
                <motion.span
                  key={i}
                  className="pointer-events-none absolute z-[3] h-1 w-1 rounded-full bg-[#C4A882]/4"
                  style={{ left: mote.left, top: mote.top }}
                  animate={{
                    y: [0, -8, 2, 0],
                    opacity: [0.1, 0.4, 0.15, 0.1],
                  }}
                  transition={{
                    duration: 7 + i,
                    repeat: Infinity,
                    ease: "easeInOut",
                    delay: mote.d,
                  }}
                />
              ))
            : null}

          {/* Mukhawar mannequins on display — in front of the glass window */}
          <div className="absolute bottom-[3.15rem] left-[36%] z-[2] flex items-end gap-1.5 sm:left-[38%] sm:gap-2">
            {/* Low display plinth */}
            <div className="pointer-events-none absolute -bottom-1 left-1/2 h-2 w-[7.5rem] -translate-x-1/2 rounded-[100%] bg-black/12 blur-[1.5px]" />
            <div className="pointer-events-none absolute -bottom-0.5 left-1/2 h-1.5 w-[6.75rem] -translate-x-1/2 rounded-sm border border-[#D0C6B4]/80 bg-gradient-to-b from-[#F3EEE4] to-[#E4D9C8] shadow-[0_2px_6px_rgba(0,0,0,0.1)]" />

            {(
              [
                { variant: "ink" as const, delay: 0, scale: 0.92 },
                { variant: "gold" as const, delay: 0.35, scale: 1 },
                { variant: "sage" as const, delay: 0.7, scale: 0.9 },
              ] as const
            ).map((m, i) => (
              <motion.div
                key={m.variant}
                className="relative origin-bottom"
                style={{ scale: m.scale }}
                animate={
                  reduceMotion
                    ? undefined
                    : { y: [0, -1.4, 0], rotate: [0, i % 2 === 0 ? 0.8 : -0.8, 0] }
                }
                transition={{
                  duration: 4.6 + i * 0.35,
                  repeat: Infinity,
                  ease: "easeInOut",
                  delay: m.delay,
                }}
              >
                <MukhawarMannequin variant={m.variant} />
              </motion.div>
            ))}
          </div>

          {/* Fabric bolts — tucked beside the display */}
          <div className="absolute bottom-12 left-[62%] z-[2] hidden items-end gap-1 sm:flex">
            {[
              { c: "#1F1F1C", h: 28 },
              { c: "#8B6F4E", h: 36 },
              { c: "#C4A882", h: 30 },
            ].map((bolt, i) => (
              <motion.div
                key={i}
                className="relative w-[0.7rem] overflow-hidden rounded-t-[2px] shadow-[0_2px_6px_rgba(0,0,0,0.12)]"
                style={{ height: bolt.h, backgroundColor: bolt.c }}
                animate={reduceMotion ? undefined : { y: [0, -1, 0] }}
                transition={{
                  duration: 4.2 + i * 0.3,
                  repeat: Infinity,
                  ease: "easeInOut",
                  delay: i * 0.2,
                }}
              >
                <span className="absolute inset-y-0 left-0 w-[45%] bg-gradient-to-r from-white/25 to-transparent" />
                <span className="absolute inset-x-0 bottom-0 h-1 bg-black/20" />
              </motion.div>
            ))}
          </div>

          {/* Counter */}
          <div className="absolute bottom-[2.85rem] right-2.5 z-[4] h-9 w-[8rem]">
            <div className="absolute inset-0 rounded-md border border-[#D0C6B4] bg-gradient-to-b from-[#F7F2E9] to-[#EDE4D6] shadow-[0_6px_14px_rgba(0,0,0,0.08)]" />
            <div className="absolute inset-x-0 top-0 h-2 rounded-t-md bg-gradient-to-b from-white/50 to-transparent" />
            <div className="absolute inset-x-2.5 top-2 h-1 rounded-full bg-[#DDD4C4]" />
            <div
              className="absolute -top-1.5 right-3 h-2.5 w-7 overflow-hidden rounded-[2px] border border-[#B8976E]/40"
              style={{
                background:
                  "repeating-linear-gradient(90deg, #C4A882 0 3px, #8B6F4E 3px 5px)",
              }}
            />
            <div className="absolute -bottom-1 inset-x-1 h-1.5 rounded-b-full bg-black/10 blur-[2px]" />
          </div>

          {/* Daylight through open door */}
          <motion.div
            className="pointer-events-none absolute bottom-[18%] left-[18%] z-[3] h-[58%] w-[14%] origin-left bg-gradient-to-r from-white/50 via-sky-50/20 to-transparent sm:bottom-[2.85rem] sm:left-[3.6rem] sm:h-[7.4rem] sm:w-11"
            animate={
              reduceMotion
                ? { opacity: 0.55, scaleX: 1 }
                : {
                    opacity: [0, 0, 0.75, 0.85, 0.75, 0, 0],
                    scaleX: [0.15, 0.15, 1.02, 1, 1, 0.2, 0.15],
                  }
            }
            transition={{
              duration: LOOP,
              repeat: Infinity,
              ease: easeOutCubic,
              times: [
                0,
                T.doorOpen,
                T.doorPeak,
                T.doorOpenDone,
                T.leave,
                T.leaveGone,
                T.reset,
              ],
            }}
          />

          {/* Glass door — hinge open with slight overshoot, slow close on exit */}
          <div
            className="absolute bottom-[18%] left-[3%] z-10 h-[60%] w-[14%] min-w-[2.75rem] max-w-[3.75rem] sm:bottom-[2.85rem] sm:left-2 sm:h-[7.6rem] sm:w-[3.55rem] sm:min-w-0 sm:max-w-none"
            style={{ perspective: 720 }}
          >
            <div className="absolute -inset-[2px] rounded-t-md bg-gradient-to-b from-[#3a3a38] to-[#1a1a18]" />
            <div className="absolute inset-0 rounded-t-[4px] bg-[#EDE6DA]/45" />
            <motion.div
              className="absolute inset-[2px] origin-left overflow-visible rounded-t-[3px] border border-white/60 bg-gradient-to-br from-white/55 via-white/15 to-sky-100/20"
              style={{
                transformStyle: "preserve-3d",
                backfaceVisibility: "hidden",
                boxShadow:
                  "inset 0 0 24px rgba(255,255,255,0.35), 6px 0 18px rgba(0,0,0,0.1)",
                backdropFilter: "blur(1.5px)",
              }}
              animate={
                reduceMotion
                  ? { rotateY: -68 }
                  : {
                      // Closed → ease open → overshoot → settle → hold → slow close → closed
                      rotateY: [0, 0, -78, -70, -70, 0, 0],
                    }
              }
              transition={{
                duration: LOOP,
                repeat: Infinity,
                ease: easeOutCubic,
                times: [
                  0,
                  T.doorOpen,
                  T.doorPeak,
                  T.doorOpenDone,
                  T.leave,
                  T.leaveGone,
                  T.reset,
                ],
              }}
            >
              <div className="pointer-events-none absolute inset-y-1 left-[8%] w-[38%] -skew-x-12 bg-gradient-to-r from-white/55 via-white/15 to-transparent" />
              <div className="pointer-events-none absolute inset-y-3 right-[18%] w-px bg-white/45" />
              {!reduceMotion ? (
                <motion.div
                  className="pointer-events-none absolute inset-y-0 w-6 bg-gradient-to-r from-transparent via-white/28 to-transparent"
                  animate={{ x: ["-50%", "160%"] }}
                  transition={{
                    duration: 4.8,
                    repeat: Infinity,
                    ease: "easeInOut",
                    repeatDelay: 5,
                  }}
                />
              ) : null}
              <div className="absolute right-[10%] top-1/2 h-[28%] w-[3px] -translate-y-1/2 rounded-full bg-gradient-to-b from-[#ecece8] via-[#8f8f8a] to-[#ecece8] shadow-[0_1px_3px_rgba(0,0,0,0.25)]" />

              <div className="absolute left-1/2 top-[6%] z-[2] flex -translate-x-1/2 flex-col items-center">
                <span className="h-2 w-px bg-[#1a1a18]/55 sm:h-2.5" />
                <motion.div
                  className="flex items-center gap-1 rounded-[3px] border border-black/80 bg-black px-1.5 py-[3px] text-white shadow-[0_3px_8px_rgba(0,0,0,0.28)]"
                  animate={
                    reduceMotion
                      ? undefined
                      : { rotate: [-2.5, 2.5, -2.5] }
                  }
                  transition={{
                    duration: 3.4,
                    repeat: Infinity,
                    ease: "easeInOut",
                  }}
                  style={{ transformOrigin: "top center" }}
                >
                  <motion.span
                    className="h-1 w-1 shrink-0 rounded-full bg-[#7CFFB2]"
                    animate={
                      reduceMotion
                        ? { opacity: 1 }
                        : { opacity: [1, 0.4, 1] }
                    }
                    transition={{ duration: 1.4, repeat: Infinity }}
                  />
                  <span className="text-[7px] font-semibold uppercase leading-none tracking-[0.16em] [font-family:var(--font-ui)] sm:text-[8px] sm:tracking-[0.18em]">
                    Open
                  </span>
                </motion.div>
              </div>
            </motion.div>
          </div>

          {/* Owner ground shadow */}
          <motion.div
            className="absolute bottom-[2.55rem] right-[2.35rem] z-[15] h-2 w-10 rounded-[100%] bg-black/15 blur-[2px]"
            animate={
              reduceMotion
                ? { opacity: 0.4 }
                : {
                    scaleX: [1, 1.02, 1, 0.94, 0.94, 1],
                    x: [0, 0, 0, -5, -5, 0],
                    opacity: [0.32, 0.36, 0.32, 0.42, 0.42, 0.32],
                  }
            }
            transition={{
              duration: LOOP,
              repeat: Infinity,
              ease: "easeInOut",
              times: [0, 0.12, 0.28, T.arrive, T.replyHold, T.reset],
            }}
          />

          {/* Shop owner — idle breath + lean/wave on arrive */}
          <motion.div
            className="absolute bottom-[2.85rem] right-[1.45rem] z-[16]"
            animate={
              reduceMotion
                ? undefined
                : {
                    // Idle breathing + lean toward customer when she arrives
                    y: [0, -1.2, 0, -1.2, 0, -0.8, 0],
                    x: [0, 0, 0, -6, -6, -6, 0],
                  }
            }
            transition={{
              duration: LOOP,
              repeat: Infinity,
              ease: "easeInOut",
              times: [
                0,
                0.1,
                0.2,
                T.arrive,
                T.replyHold,
                T.leave,
                T.reset,
              ],
            }}
          >
            <motion.div
              animate={
                reduceMotion
                  ? undefined
                  : {
                      rotate: [0, 0.8, 0, -3.5, -3.5, 0, 0],
                    }
              }
              transition={{
                duration: LOOP,
                repeat: Infinity,
                times: [
                  0,
                  0.15,
                  0.3,
                  T.arrive,
                  T.replyOut,
                  T.leave,
                  T.reset,
                ],
              }}
              style={{ transformOrigin: "bottom center" }}
            >
              <TailorFigure />
            </motion.div>
            {/* Glance / wave cue with scissors */}
            <motion.div
              className="absolute -left-3 top-9"
              animate={
                reduceMotion
                  ? undefined
                  : {
                      rotate: [6, 10, 6, -8, 18, 6, 6],
                      x: [0, 0, 0, -2, -2, 0, 0],
                    }
              }
              transition={{
                duration: LOOP,
                repeat: Infinity,
                ease: "easeInOut",
                times: [
                  0,
                  0.18,
                  0.32,
                  T.arrive,
                  0.42,
                  T.custHold,
                  T.reset,
                ],
              }}
            >
              <svg viewBox="0 0 20 20" className="h-5 w-5 drop-shadow-sm">
                <path
                  d="M3 14c4-1 6-6 10-7 2-.5 4 1 4 3"
                  fill="none"
                  stroke="#1A1A18"
                  strokeWidth="1.45"
                  strokeLinecap="round"
                />
                <circle cx="16.5" cy="10" r="1.5" fill="#1A1A18" />
                <circle cx="16.5" cy="10" r="0.55" fill="#F3EEE4" />
              </svg>
            </motion.div>
          </motion.div>

          {/* Customer shadow — follows feet */}
          <motion.div
            className="absolute bottom-[2.55rem] z-[5] h-2 w-9 rounded-[100%] bg-black/18 blur-[2px]"
            animate={
              reduceMotion
                ? { x: 118, opacity: 0.45, scaleX: 1 }
                : {
                    // Door → threshold pause → accelerate → settle at counter → exit
                    x: [12, 12, 28, 28, 55, 118, 118, 118, 12],
                    opacity: [0, 0, 0.4, 0.4, 0.48, 0.5, 0.5, 0, 0],
                    scaleX: [0.75, 0.75, 0.9, 0.9, 0.85, 1, 1, 0.8, 0.75],
                  }
            }
            transition={{
              duration: LOOP,
              repeat: Infinity,
              ease: "linear",
              times: [
                0,
                T.threshold,
                T.pause,
                T.walkStart,
                0.28,
                T.arrive,
                T.leave,
                T.leaveGone,
                T.reset,
              ],
            }}
          />

          {/* Customer walk-in — pause at door, step bob, head tilt while talking */}
          <motion.div
            className="absolute bottom-[2.85rem] z-[17]"
            animate={
              reduceMotion
                ? { x: 118, opacity: 1 }
                : {
                    x: [8, 8, 26, 26, 52, 118, 118, 118, 8],
                    opacity: [0, 0, 1, 1, 1, 1, 1, 0, 0],
                  }
            }
            transition={{
              duration: LOOP,
              repeat: Infinity,
              // Linear times keep beats locked; path eases via key density
              ease: "linear",
              times: [
                0,
                T.threshold,
                T.pause,
                T.walkStart,
                0.28,
                T.arrive,
                T.leave,
                T.leaveGone,
                T.reset,
              ],
            }}
          >
            {/* Step bob during approach only */}
            <motion.div
              animate={
                reduceMotion
                  ? undefined
                  : {
                      y: [0, 0, 0, 0, -2.8, 0, -2.6, 0, -1.2, 0, 0, 0, 0],
                    }
              }
              transition={{
                duration: LOOP,
                repeat: Infinity,
                ease: "easeInOut",
                times: [
                  0,
                  T.threshold,
                  T.pause,
                  T.walkStart,
                  0.24,
                  0.27,
                  0.3,
                  0.33,
                  0.35,
                  T.arrive,
                  T.leave,
                  T.leaveGone,
                  T.reset,
                ],
              }}
            >
              {/* Subtle head/body tilt while speaking */}
              <motion.div
                animate={
                  reduceMotion
                    ? undefined
                    : {
                        rotate: [0, 0, 0, 0, 1.5, 0, -2, 0, 0, 0],
                      }
                }
                transition={{
                  duration: LOOP,
                  repeat: Infinity,
                  ease: "easeInOut",
                  times: [
                    0,
                    T.arrive,
                    T.custIn,
                    T.custShown,
                    T.custHold,
                    T.custOut,
                    T.typeHold,
                    T.replyHold,
                    T.leave,
                    T.reset,
                  ],
                }}
                style={{ transformOrigin: "50% 20%" }}
              >
                <motion.div
                  animate={
                    reduceMotion
                      ? undefined
                      : {
                          // Soft bag swing while walking
                          rotate: [0, 0, 0, 6, -8, 5, 0, 0, 0],
                        }
                  }
                  transition={{
                    duration: LOOP,
                    repeat: Infinity,
                    ease: "easeInOut",
                    times: [
                      0,
                      T.walkStart,
                      0.24,
                      0.28,
                      0.32,
                      T.arrive,
                      T.leave,
                      T.leaveGone,
                      T.reset,
                    ],
                  }}
                  style={{ transformOrigin: "30% 55%" }}
                >
                  <CustomerFigure />
                </motion.div>
              </motion.div>
            </motion.div>
          </motion.div>

          {/* 1) Customer speaks — soft pop after arrive */}
          <SpeechBubble
            side="left"
            className="absolute left-[6.5rem] top-6 z-20 max-w-[7.25rem]"
            reduceMotion={Boolean(reduceMotion)}
            animate={{
              opacity: [0, 0, 1, 1, 0, 0],
              y: [8, 8, 0, 0, 4, 4],
              scale: [0.86, 0.86, 1.03, 1, 0.94, 0.94],
            }}
            times={[0, T.custIn, T.custShown, T.custHold, T.custOut, T.reset]}
          >
            Hi, can I chat with the store?
          </SpeechBubble>

          {/* 2) Typing — only after customer bubble is gone */}
          <motion.div
            className="absolute right-4 top-5 z-20 flex items-center gap-1 rounded-full border border-[#E8E8E4] bg-white/95 px-2.5 py-1.5 shadow-[0_6px_16px_rgba(0,0,0,0.08)] backdrop-blur-sm"
            animate={
              reduceMotion
                ? { opacity: 0 }
                : {
                    opacity: [0, 0, 1, 1, 0, 0],
                    scale: [0.88, 0.88, 1.04, 1, 0.92, 0.92],
                    y: [5, 5, 0, 0, 3, 3],
                  }
            }
            transition={{
              duration: LOOP,
              repeat: Infinity,
              ease: "linear",
              times: [
                0,
                T.typeIn,
                T.typeShown,
                T.typeHold,
                T.typeOut,
                T.reset,
              ],
            }}
          >
            {[0, 1, 2].map((i) => (
              <motion.span
                key={i}
                className="h-1.5 w-1.5 rounded-full bg-black/40"
                animate={
                  reduceMotion
                    ? undefined
                    : { y: [0, -2.2, 0], opacity: [0.35, 1, 0.35] }
                }
                transition={{
                  duration: 0.5,
                  repeat: Infinity,
                  delay: i * 0.11,
                  ease: "easeInOut",
                }}
              />
            ))}
          </motion.div>

          {/* 3) Owner reply — held long enough to read */}
          <SpeechBubble
            side="right"
            dark
            className="absolute right-2.5 top-3.5 z-20 max-w-[7.25rem]"
            reduceMotion={Boolean(reduceMotion)}
            animate={{
              opacity: [0, 0, 1, 1, 0, 0],
              y: [8, 8, 0, 0, 4, 4],
              scale: [0.86, 0.86, 1.03, 1, 0.94, 0.94],
            }}
            times={[
              0,
              T.replyIn,
              T.replyShown,
              T.replyHold,
              T.replyOut,
              T.reset,
            ]}
          >
            Yes — how can we help?
          </SpeechBubble>

          {/* Window sheen — below people (z-8), restrained */}
          {!reduceMotion ? (
            <motion.div
              className="pointer-events-none absolute inset-y-0 z-[8] w-[3.5rem] bg-gradient-to-r from-transparent via-white/22 to-transparent"
              animate={{ x: ["-30%", "220%"] }}
              transition={{
                duration: 5.5,
                repeat: Infinity,
                ease: "easeInOut",
                repeatDelay: 6,
              }}
            />
          ) : null}

          <div className="pointer-events-none absolute inset-0 rounded-xl shadow-[inset_0_0_40px_rgba(120,100,70,0.08)]" />
        </div>
      </motion.div>

      <div className="mx-auto h-2.5 w-[92%] rounded-b-full bg-gradient-to-b from-[#DFD6C6] via-[#E8E1D4]/50 to-transparent" />
    </div>
  );
}

function formatStoreFasciaName(name: string) {
  const trimmed = name.trim();
  if (!trimmed) return "";
  const hasLatin = /[A-Za-z]/.test(trimmed);
  return hasLatin ? trimmed.toUpperCase() : trimmed;
}

function StoreNameOrnament({ mirror = false }: { mirror?: boolean }) {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 12 12"
      fill="none"
      className={`relative z-[1] shrink-0 text-[#C4A882] ${mirror ? "-scale-x-100" : ""}`}
    >
      <path
        d="M1 6h3.2M7.8 6H11M6 1v3.2M6 7.8V11"
        stroke="currentColor"
        strokeWidth="1"
        strokeLinecap="round"
      />
      <path
        d="M6 3.2 8.8 6 6 8.8 3.2 6 6 3.2Z"
        fill="currentColor"
        fillOpacity="0.85"
      />
    </svg>
  );
}

function SpeechBubble({
  children,
  side,
  dark,
  className,
  animate,
  times,
  reduceMotion,
}: {
  children: string;
  side: "left" | "right";
  dark?: boolean;
  className?: string;
  animate: Record<string, number[]>;
  times: number[];
  reduceMotion?: boolean;
}) {
  return (
    <motion.div
      className={`${className} rounded-2xl px-2.5 py-1.5 text-left ${
        dark
          ? "rounded-br-md border border-black bg-black text-white shadow-[0_10px_24px_rgba(0,0,0,0.2)]"
          : "rounded-bl-md border border-[#E8E8E4] bg-white text-black shadow-[0_10px_24px_rgba(0,0,0,0.1)]"
      }`}
      animate={reduceMotion ? { opacity: 0 } : animate}
      transition={{
        duration: LOOP,
        repeat: Infinity,
        ease: "linear",
        times,
      }}
    >
      <p className="text-[10px] leading-snug [font-family:var(--font-body)]">
        {children}
      </p>
      <span
        className={`absolute -bottom-1.5 h-2.5 w-2.5 rotate-45 ${
          side === "left"
            ? "left-3 border-b border-r"
            : "right-3 border-b border-l"
        } ${
          dark ? "border-black bg-black" : "border-[#E8E8E4] bg-white"
        }`}
      />
    </motion.div>
  );
}

/** Stylized Dubai skyline outside the boutique rear window. */
function DubaiSkyline({ reduceMotion }: { reduceMotion?: boolean }) {
  return (
    <div className="absolute inset-x-0 bottom-0 h-[78%]">
      {/* Soft sun glow */}
      <motion.div
        className="absolute right-[18%] top-[8%] h-5 w-5 rounded-full bg-[#FFE6B0] blur-[1px]"
        animate={
          reduceMotion
            ? { opacity: 0.85 }
            : { opacity: [0.65, 0.95, 0.65], scale: [1, 1.06, 1] }
        }
        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
      />
      <div className="absolute right-[18%] top-[8%] h-3.5 w-3.5 rounded-full bg-[#FFF1C9]/90" />

      <svg
        viewBox="0 0 120 90"
        className="absolute inset-x-0 bottom-0 h-full w-full"
        preserveAspectRatio="xMidYMax meet"
        fill="none"
      >
        {/* Far haze band */}
        <rect x="0" y="72" width="120" height="18" fill="#DCC9A4" fillOpacity="0.55" />

        {/* Distant low towers */}
        <path
          d="M2 78h8v12H2zm10-6h6v18h-6zm8-4h5v22h-5zm7-2h7v24H27zm9-8h5v32h-5zm7-3h6v35h-6z"
          fill="#7A8FA3"
          fillOpacity="0.45"
        />

        {/* Mid cluster — Marina / Downtown feel */}
        <rect x="14" y="48" width="7" height="42" fill="#5A6F82" />
        <rect x="15.2" y="50" width="1.2" height="36" fill="white" fillOpacity="0.12" />
        <rect x="22" y="42" width="8" height="48" fill="#4A5F72" />
        <rect x="23.5" y="44" width="1.4" height="40" fill="white" fillOpacity="0.14" />
        <rect x="31" y="52" width="6" height="38" fill="#5C7184" />

        {/* Burj Khalifa — iconic needle */}
        <path
          d="M58 88V18l2.2-8 2.2 8v70H58Z"
          fill="#3D5164"
        />
        <path
          d="M59.1 88V22l1.1-5 1.1 5v66H59.1Z"
          fill="#6B8498"
        />
        {/* Tier steps */}
        <rect x="56.2" y="34" width="7.6" height="2.2" fill="#3D5164" />
        <rect x="55.4" y="48" width="9.2" height="2.2" fill="#3D5164" />
        <rect x="54.6" y="62" width="10.8" height="2.2" fill="#3D5164" />
        <rect x="53.8" y="74" width="12.4" height="2" fill="#3D5164" />
        {/* Spire tip gleam */}
        <circle cx="60.2" cy="9.5" r="1.1" fill="#FFE9B8" fillOpacity="0.9" />

        {/* Neighbor tower */}
        <rect x="68" y="40" width="7" height="48" fill="#4E6478" />
        <rect x="69.2" y="42" width="1.3" height="42" fill="white" fillOpacity="0.12" />
        <rect x="76" y="50" width="6" height="38" fill="#5A7084" />

        {/* Sail-inspired tower (Burj Al Arab hint) */}
        <path
          d="M92 88c0-22 3.5-40 8-52 1.2 2.5 2.4 12 2.4 52H92Z"
          fill="#4A6074"
        />
        <path
          d="M94 88c0-18 2.2-34 5.2-44"
          stroke="#C4A882"
          strokeWidth="0.7"
          strokeOpacity="0.55"
          fill="none"
        />
        {/* Cross spars suggestion */}
        <path
          d="M93.5 48h6.5M93 58h7M92.5 68h7.5"
          stroke="white"
          strokeOpacity="0.15"
          strokeWidth="0.6"
        />

        {/* Foreground low buildings */}
        <path
          d="M0 78h18v12H0zm20-4h14v16H20zm16-2h12v18H36zm48 1h14v17H84zm16-3h20v20H100z"
          fill="#3A4B5C"
          fillOpacity="0.85"
        />
        {/* Tiny window lights on near buildings */}
        {[
          [4, 82],
          [8, 84],
          [24, 80],
          [28, 83],
          [40, 81],
          [88, 82],
          [106, 80],
          [112, 84],
        ].map(([x, y], i) => (
          <rect
            key={i}
            x={x}
            y={y}
            width="1.2"
            height="1.4"
            fill="#FFE6B0"
            fillOpacity="0.55"
          />
        ))}
      </svg>
    </div>
  );
}

type MukhawarVariant = "ink" | "gold" | "sage";

/** Display mannequin in a traditional Emirati Mukhawar. */
function MukhawarMannequin({ variant }: { variant: MukhawarVariant }) {
  const palette = {
    ink: {
      dress: ["#1A1A18", "#0D0D0C"],
      embroidery: "#C4A882",
      trim: "#E8D5B0",
      head: "#E8E0D2",
    },
    gold: {
      dress: ["#E8D9B8", "#D4C09A"],
      embroidery: "#8B6F4E",
      trim: "#C4A882",
      head: "#F0E6D6",
    },
    sage: {
      dress: ["#5A6B5D", "#3F4D42"],
      embroidery: "#C4A882",
      trim: "#D4BC98",
      head: "#E8E0D2",
    },
  }[variant];

  const gid = `mkh-${variant}`;

  return (
    <svg
      width="36"
      height="78"
      viewBox="0 0 36 78"
      fill="none"
      className="drop-shadow-[0_3px_8px_rgba(0,0,0,0.16)]"
    >
      <defs>
        <linearGradient
          id={`${gid}-dress`}
          x1="8"
          y1="22"
          x2="28"
          y2="72"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor={palette.dress[0]} />
          <stop offset="1" stopColor={palette.dress[1]} />
        </linearGradient>
        <linearGradient
          id={`${gid}-emb`}
          x1="12"
          y1="24"
          x2="24"
          y2="40"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor={palette.embroidery} />
          <stop offset="1" stopColor={palette.trim} />
        </linearGradient>
      </defs>

      {/* Mannequin stand */}
      <ellipse cx="18" cy="75.5" rx="7" ry="1.6" fill="#1A1A18" fillOpacity="0.35" />
      <rect x="16.6" y="68" width="2.8" height="7.2" rx="0.8" fill="#8A8070" />

      {/* Flared Mukhawar skirt */}
      <path
        d="M10.5 34c-.4 8-1.2 20-2.8 30.5C6.5 68 10 70.5 18 70.5s11.5-2.5 10.3-6C26.7 54 26 42 25.5 34H10.5Z"
        fill={`url(#${gid}-dress)`}
      />
      {/* Soft skirt fold */}
      <path
        d="M18 34c.4 10 .6 22 .2 32"
        stroke="white"
        strokeOpacity="0.1"
        strokeWidth="2"
        strokeLinecap="round"
      />

      {/* Fitted bodice */}
      <path
        d="M11.5 24c0-2.4 2.8-4.2 6.5-4.2s6.5 1.8 6.5 4.2l1.2 10.5H10.3L11.5 24Z"
        fill={`url(#${gid}-dress)`}
      />

      {/* Neckline embroidery yoke */}
      <path
        d="M13.2 23.2c1.4-2.2 3.2-3.2 4.8-3.2s3.4 1 4.8 3.2"
        fill="none"
        stroke={`url(#${gid}-emb)`}
        strokeWidth="1.35"
        strokeLinecap="round"
      />
      <path
        d="M14.5 25.5c1.1-1.4 2.3-2 3.5-2s2.4.6 3.5 2"
        fill="none"
        stroke={palette.trim}
        strokeWidth="0.7"
        strokeOpacity="0.85"
        strokeLinecap="round"
      />
      {/* Embroidery dots around yoke */}
      {[14, 16, 18, 20, 22].map((x) => (
        <circle
          key={x}
          cx={x}
          cy={24.2}
          r="0.55"
          fill={palette.embroidery}
          fillOpacity="0.9"
        />
      ))}

      {/* Side embroidery panels */}
      <path
        d="M11.2 30c1.2 4 1.6 8 1.4 12"
        stroke={palette.embroidery}
        strokeWidth="0.7"
        strokeOpacity="0.55"
        strokeLinecap="round"
      />
      <path
        d="M24.8 30c-1.2 4-1.6 8-1.4 12"
        stroke={palette.embroidery}
        strokeWidth="0.7"
        strokeOpacity="0.55"
        strokeLinecap="round"
      />

      {/* Sleeve tips */}
      <path
        d="M10.5 26c-2.2 3.5-2.8 7.5-2 10.5"
        stroke={`url(#${gid}-dress)`}
        strokeWidth="3.2"
        strokeLinecap="round"
      />
      <path
        d="M25.5 26c2.2 3.5 2.8 7.5 2 10.5"
        stroke={`url(#${gid}-dress)`}
        strokeWidth="3.2"
        strokeLinecap="round"
      />
      <circle cx="8.6" cy="36.2" r="1.15" fill={palette.embroidery} />
      <circle cx="27.4" cy="36.2" r="1.15" fill={palette.embroidery} />

      {/* Mannequin neck + head (faceless display bust) */}
      <rect
        x="16.2"
        y="17.5"
        width="3.6"
        height="4.2"
        rx="1.1"
        fill={palette.head}
      />
      <ellipse cx="18" cy="13.2" rx="5.2" ry="5.8" fill={palette.head} />
      {/* Subtle head shine */}
      <ellipse
        cx="16.4"
        cy="11.8"
        rx="1.6"
        ry="2"
        fill="white"
        fillOpacity="0.28"
      />
      {/* Hair / bun suggestion */}
      <ellipse
        cx="18"
        cy="9.2"
        rx="4.2"
        ry="2.4"
        fill={variant === "gold" ? "#5A4634" : "#1A1A18"}
        fillOpacity="0.85"
      />
    </svg>
  );
}

function TailorFigure() {
  return (
    <svg
      width="56"
      height="98"
      viewBox="0 0 56 98"
      fill="none"
      className="drop-shadow-[0_3px_8px_rgba(0,0,0,0.14)]"
    >
      <defs>
        <linearGradient
          id="tailorDress"
          x1="14"
          y1="34"
          x2="42"
          y2="84"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#2A2A28" />
          <stop offset="1" stopColor="#111" />
        </linearGradient>
        <linearGradient
          id="tailorSkin"
          x1="20"
          y1="12"
          x2="34"
          y2="30"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#F0D0B4" />
          <stop offset="1" stopColor="#E0B894" />
        </linearGradient>
      </defs>
      <ellipse cx="28" cy="19" rx="14" ry="15" fill="#1A1A18" />
      <circle cx="28" cy="21.5" r="10.2" fill="url(#tailorSkin)" />
      <circle cx="21.5" cy="23.5" r="1.6" fill="#E8A090" fillOpacity="0.35" />
      <circle cx="34.5" cy="23.5" r="1.6" fill="#E8A090" fillOpacity="0.35" />
      <path
        d="M17 19c2.4-9 20-11 22 0-3.4-3.4-7.8-4.5-11-3.8-3.4.5-7.8 2.2-11 3.8Z"
        fill="#1A1A18"
      />
      <path
        d="M16.5 22c-.2 8 1.8 12 3.5 13V18c-1.6.6-3 2-3.5 4Z"
        fill="#1A1A18"
      />
      <path
        d="M39.5 22c.2 8-1.8 12-3.5 13V18c1.6.6 3 2 3.5 4Z"
        fill="#1A1A18"
      />
      <ellipse cx="24" cy="21.2" rx="1.35" ry="1.5" fill="#1A1A18" />
      <ellipse cx="32" cy="21.2" rx="1.35" ry="1.5" fill="#1A1A18" />
      <circle cx="24.4" cy="20.7" r="0.4" fill="white" />
      <circle cx="32.4" cy="20.7" r="0.4" fill="white" />
      <path
        d="M21.5 18.4c1.4-.7 3.2-.7 4.2 0"
        stroke="#1A1A18"
        strokeWidth="0.9"
        strokeLinecap="round"
      />
      <path
        d="M30.2 18.4c1.4-.7 3.2-.7 4.2 0"
        stroke="#1A1A18"
        strokeWidth="0.9"
        strokeLinecap="round"
      />
      <path
        d="M24.4 25.2c1.4 1.7 5.6 1.7 7 0"
        stroke="#C48A72"
        strokeWidth="1.1"
        strokeLinecap="round"
      />
      <rect
        x="25.2"
        y="30"
        width="5.6"
        height="5.4"
        rx="1.7"
        fill="url(#tailorSkin)"
      />
      <path
        d="M14.8 37c0-3.3 5.4-5.6 13.2-5.6S41.2 33.7 41.2 37l3.4 45c0 3.3-4.4 5.4-16.6 5.4S11.4 85.3 11.4 82l3.4-45Z"
        fill="url(#tailorDress)"
      />
      <path
        d="M27 36.5c1.5 12 2 28 1.2 42"
        stroke="white"
        strokeOpacity="0.08"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <path
        d="M21 46.5h14v30c0 2.2-2.3 3.3-7 3.3s-7-1.1-7-3.3v-30Z"
        fill="#F3EEE4"
      />
      <path d="M21 46.5h14" stroke="#D9D1C2" strokeWidth="1" />
      <circle cx="28" cy="55.5" r="2.5" fill="#111" />
      <path
        d="M26.3 56.2 30.2 62M29.7 56.2 25.8 62"
        stroke="#F3EEE4"
        strokeWidth="1"
        strokeLinecap="round"
      />
      <path
        d="M14.8 40c-3.4 4.4-4.5 11-3.3 15.2"
        stroke="url(#tailorSkin)"
        strokeWidth="4.8"
        strokeLinecap="round"
      />
      <path
        d="M41.2 40c3.4 4.4 4.5 11 3.3 15.2"
        stroke="url(#tailorSkin)"
        strokeWidth="4.8"
        strokeLinecap="round"
      />
      <circle cx="12.2" cy="54.5" r="2.1" fill="#1A1A18" />
      <circle cx="43.8" cy="54.5" r="2.1" fill="#1A1A18" />
      <ellipse cx="22" cy="93.5" rx="5.4" ry="2.4" fill="#1A1A18" />
      <ellipse cx="34" cy="93.5" rx="5.4" ry="2.4" fill="#1A1A18" />
    </svg>
  );
}

function CustomerFigure() {
  return (
    <svg
      width="52"
      height="92"
      viewBox="0 0 52 92"
      fill="none"
      className="drop-shadow-[0_3px_8px_rgba(0,0,0,0.12)]"
    >
      <defs>
        <linearGradient
          id="custSkin"
          x1="16"
          y1="10"
          x2="30"
          y2="28"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#E0B888" />
          <stop offset="1" stopColor="#C99660" />
        </linearGradient>
        <linearGradient
          id="custTop"
          x1="12"
          y1="28"
          x2="34"
          y2="50"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#6A7B6C" />
          <stop offset="1" stopColor="#4E5E52" />
        </linearGradient>
      </defs>
      <ellipse cx="22.5" cy="15.5" rx="12" ry="13" fill="#3D2B1F" />
      <circle cx="22.5" cy="18.5" r="9.1" fill="url(#custSkin)" />
      <circle cx="16.8" cy="20.5" r="1.4" fill="#D09078" fillOpacity="0.3" />
      <circle cx="28.2" cy="20.5" r="1.4" fill="#D09078" fillOpacity="0.3" />
      <path
        d="M12 16.2c1.2 8.5 4.4 11 6.5 11V12.5C15.4 12.5 13 14 12 16.2Z"
        fill="#3D2B1F"
      />
      <path
        d="M33 17c-.4 7-2.8 10-4.8 10.5V13c2.2.4 4.2 1.8 4.8 4Z"
        fill="#3D2B1F"
      />
      <ellipse cx="19.4" cy="18.3" rx="1.2" ry="1.35" fill="#1A1A18" />
      <ellipse cx="25.8" cy="18.3" rx="1.2" ry="1.35" fill="#1A1A18" />
      <circle cx="19.75" cy="17.85" r="0.35" fill="white" />
      <circle cx="26.15" cy="17.85" r="0.35" fill="white" />
      <path
        d="M19.6 22c1.15 1.35 4.5 1.35 5.65 0"
        stroke="#A67C52"
        strokeWidth="1"
        strokeLinecap="round"
      />
      <rect
        x="20.4"
        y="26.4"
        width="4.4"
        height="4.4"
        rx="1.3"
        fill="url(#custSkin)"
      />
      <path
        d="M12.2 32c0-2.7 4.3-4.9 10.3-4.9s10.3 2.2 10.3 4.9l1.7 19H10.5L12.2 32Z"
        fill="url(#custTop)"
      />
      <path
        d="M11.2 51h20.8l1.15 29c0 2.15-3.2 3.7-11.55 3.7S10 82.15 10 80l1.2-29Z"
        fill="#1A1A18"
      />
      <path
        d="M22 51c.6 10 .8 20 .4 28"
        stroke="white"
        strokeOpacity="0.07"
        strokeWidth="2.5"
      />
      <path
        d="M12.2 35c-3.2 5.4-3.7 11.5-2.2 15.6"
        stroke="url(#custSkin)"
        strokeWidth="4.2"
        strokeLinecap="round"
      />
      <path
        d="M33 35c2.7 3.3 4.2 8.4 3.2 13.5"
        stroke="url(#custSkin)"
        strokeWidth="4.2"
        strokeLinecap="round"
      />
      <g transform="translate(35,44)">
        <rect
          x="0"
          y="4"
          width="13"
          height="15"
          rx="1.7"
          fill="#C4A882"
          stroke="#8B6F4E"
          strokeWidth="0.9"
        />
        <rect
          x="1.2"
          y="5.2"
          width="10.6"
          height="3"
          rx="0.6"
          fill="#D4BC98"
          fillOpacity="0.55"
        />
        <path
          d="M3.1 4c0-3.2 2.7-5.4 3.7-5.4S10.5 0.8 10.5 4"
          fill="none"
          stroke="#8B6F4E"
          strokeWidth="1.2"
          strokeLinecap="round"
        />
      </g>
      <ellipse cx="17.2" cy="87.5" rx="4.8" ry="2.15" fill="#3D2B1F" />
      <ellipse cx="28" cy="87.5" rx="4.8" ry="2.15" fill="#3D2B1F" />
    </svg>
  );
}
