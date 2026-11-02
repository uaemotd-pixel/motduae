"use client";

import { useMemo } from "react";
import { motion, useReducedMotion } from "framer-motion";

/** Full story loop (seconds) — enough for a readable agent reply. */
const LOOP = 14.5;

const easeOutCubic = [0.22, 1, 0.36, 1] as const;

/**
 * Storyboard (normalized 0–1):
 * customer types → send → arc flight → agent sees → types → reply (≥~2s) → loop.
 *
 * Timing changes vs prior (LOOP 13):
 * - LOOP 13 → 14.5
 * - Clearer gaps between custTypeOut → send → fly → arrive
 * - replyShown→replyHold ≈ 2.3s readable hold
 * - Typing hands / cursor locked only to agentType beats
 */
const T = {
  custTypeIn: 0.05,
  custTypeHold: 0.18,
  custTypeOut: 0.22,
  send: 0.24,
  flyMid: 0.32,
  arrive: 0.4,
  agentSee: 0.44,
  agentTypeIn: 0.5,
  agentTypeHold: 0.6,
  agentTypeOut: 0.64,
  replyIn: 0.66,
  replyShown: 0.68,
  replyHold: 0.84,
  replyOut: 0.9,
  reset: 1,
} as const;

function isDaytime(now = new Date()) {
  const h = now.getHours();
  return h >= 6 && h < 18;
}

/**
 * Admin live-support empty scene — customer phone ↔ MOTD support desk.
 */
export default function AdminSupportEmptyScene() {
  const day = useMemo(() => isDaytime(), []);
  const reduceMotion = useReducedMotion();

  return (
    <div
      aria-hidden
      className="relative mx-auto w-full max-w-[min(100%,22rem)] select-none min-[400px]:max-w-[28rem] sm:max-w-[34rem]"
    >
      <motion.div
        className="relative overflow-hidden rounded-[1.25rem] border border-[#E8E8E4] bg-[#FFFDF9] shadow-[0_28px_64px_rgba(0,0,0,0.11)] sm:rounded-[1.55rem]"
        initial={reduceMotion ? false : { opacity: 0, y: 20, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.65, ease: easeOutCubic }}
      >
        {/* Sky header */}
        <div
          className={`relative h-[3.5rem] overflow-hidden sm:h-[4rem] ${
            day
              ? "bg-gradient-to-b from-[#8FBFEA] via-[#D0E6F8] to-[#FFFDF9]"
              : "bg-gradient-to-b from-[#0B121C] via-[#182433] to-[#FFFDF9]"
          }`}
        >
          {day ? (
            <SunMark reduceMotion={Boolean(reduceMotion)} />
          ) : (
            <MoonMark reduceMotion={Boolean(reduceMotion)} />
          )}
          {day ? (
            <>
              <motion.span
                className="absolute left-[10%] top-3 h-2.5 w-11 rounded-full bg-white/70 blur-[0.5px]"
                animate={reduceMotion ? undefined : { x: [0, 5, 0] }}
                transition={{ duration: 11, repeat: Infinity, ease: "easeInOut" }}
              />
              <span className="absolute left-[24%] top-4 h-2 w-7 rounded-full bg-white/50 blur-[0.5px]" />
              <span className="absolute right-[36%] top-5 h-1.5 w-8 rounded-full bg-white/55 blur-[0.5px]" />
            </>
          ) : (
            <>
              {[
                { l: "16%", t: "22%", s: 1 },
                { l: "38%", t: "16%", s: 1.15 },
                { l: "58%", t: "30%", s: 0.8 },
                { l: "72%", t: "18%", s: 1 },
              ].map((star, i) => (
                <motion.span
                  key={i}
                  className="absolute rounded-full bg-white"
                  style={{
                    left: star.l,
                    top: star.t,
                    width: star.s,
                    height: star.s,
                  }}
                  animate={
                    reduceMotion
                      ? { opacity: 0.6 }
                      : { opacity: [0.3, 0.9, 0.3] }
                  }
                  transition={{
                    duration: 2.6 + i * 0.4,
                    repeat: Infinity,
                    ease: "easeInOut",
                  }}
                />
              ))}
            </>
          )}
          <p
            className={`absolute bottom-1.5 left-1/2 max-w-[92%] -translate-x-1/2 truncate text-center text-[8px] uppercase tracking-[0.16em] [font-family:var(--font-ui)] sm:text-[9px] sm:tracking-[0.2em] ${
              day ? "text-[#4A6070]" : "text-white/65"
            }`}
          >
            MOTD Customer Support Center
          </p>
        </div>

        {/* Split stage — depth: rooms → props → people → chrome → flight → bubbles */}
        <div className="relative mx-2 mb-2 grid aspect-[16/10] min-h-[12.5rem] grid-cols-2 overflow-hidden rounded-xl border border-[#E4E0D8] min-[400px]:mx-3 min-[400px]:mb-3 min-[400px]:min-h-[14.5rem] sm:aspect-auto sm:h-[16.5rem]">
          {/* ── Customer side ── */}
          <div
            className={`relative border-r border-[#E4E0D8] ${
              day
                ? "bg-gradient-to-b from-[#E8F0F4] via-[#F5F2EC] to-[#E8E1D4]"
                : "bg-gradient-to-b from-[#24303A] via-[#3A4148] to-[#D9D2C4]"
            }`}
          >
            {day ? (
              <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_30%_15%,rgba(255,255,255,0.5),transparent_55%)]" />
            ) : (
              <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_70%_8%,rgba(120,150,200,0.16),transparent_50%)]" />
            )}

            {/* UAE-ish distant skyline (restrained) */}
            <div className="absolute inset-x-0 top-5 h-11 opacity-35 sm:top-6 sm:h-12">
              <CustomerSkyline day={day} />
            </div>

            <p
              className={`absolute left-2 top-2 z-[2] text-[8px] uppercase tracking-[0.16em] [font-family:var(--font-ui)] sm:text-[9px] ${
                day ? "text-[#8A8A80]" : "text-white/55"
              }`}
            >
              Customer
            </p>

            {/* Plant pot */}
            <div className="absolute bottom-10 left-2 z-[3]">
              <div className="mx-auto h-4 w-3 rounded-t-full bg-[#3D6B4F]" />
              <div className="mx-auto -mt-0.5 h-3 w-2.5 rounded-b-sm bg-[#8B6F4E]" />
            </div>

            {/* Customer + phone */}
            <motion.div
              className="absolute bottom-3 left-1/2 z-[6] -translate-x-1/2 sm:bottom-4"
              animate={
                reduceMotion
                  ? undefined
                  : { y: [0, -1.2, 0] }
              }
              transition={{ duration: 3.8, repeat: Infinity, ease: "easeInOut" }}
            >
              <div className="absolute -bottom-0.5 left-1/2 h-1.5 w-10 -translate-x-1/2 rounded-[100%] bg-black/20 blur-[2px]" />
              <CustomerFigure day={day} />
              <motion.div
                className="absolute right-[-2px] top-[40%] origin-bottom sm:right-0"
                animate={
                  reduceMotion
                    ? { rotate: -4 }
                    : {
                        // Tilt while typing, settle after send
                        rotate: [-4, -4, -10, -6, -4, -4, -4],
                        y: [0, 0, 1.5, 0.5, 0, 0, 0],
                      }
                }
                transition={{
                  duration: LOOP,
                  repeat: Infinity,
                  ease: "easeInOut",
                  times: [
                    0,
                    T.custTypeIn,
                    T.custTypeHold,
                    T.custTypeOut,
                    T.send,
                    T.arrive,
                    T.reset,
                  ],
                }}
              >
                <PhoneDevice reduceMotion={Boolean(reduceMotion)} />
              </motion.div>
              <motion.span
                className="absolute right-[10px] top-[52%] h-1.5 w-1.5 rounded-full bg-[#E8C4A8]/80 sm:right-3"
                animate={
                  reduceMotion
                    ? { opacity: 0 }
                    : {
                        opacity: [0, 0.85, 0, 0],
                        scale: [0.55, 1, 0.55, 0.55],
                      }
                }
                transition={{
                  duration: LOOP,
                  repeat: Infinity,
                  ease: "linear",
                  times: [0, T.custTypeIn, T.custTypeHold, T.reset],
                }}
              />
            </motion.div>

            {/* Typing chips — only during customer type beat */}
            <motion.div
              className="absolute left-[56%] top-[34%] z-20 flex items-center gap-0.5 rounded-full border border-white/70 bg-white/95 px-1.5 py-1 shadow-[0_4px_12px_rgba(0,0,0,0.1)] sm:left-[60%]"
              animate={
                reduceMotion
                  ? { opacity: 0 }
                  : {
                      opacity: [0, 0, 1, 1, 0, 0],
                      y: [4, 4, 0, 0, 2, 2],
                      scale: [0.86, 0.86, 1.04, 1, 0.92, 0.92],
                    }
              }
              transition={{
                duration: LOOP,
                repeat: Infinity,
                ease: "linear",
                times: [
                  0,
                  T.custTypeIn,
                  T.custTypeIn + 0.02,
                  T.custTypeHold,
                  T.custTypeOut,
                  T.reset,
                ],
              }}
            >
              {[0, 1, 2].map((i) => (
                <motion.span
                  key={i}
                  className="h-1 w-1 rounded-full bg-black/45"
                  animate={
                    reduceMotion
                      ? undefined
                      : { opacity: [0.3, 1, 0.3], y: [0, -1.4, 0] }
                  }
                  transition={{
                    duration: 0.48,
                    repeat: Infinity,
                    delay: i * 0.1,
                  }}
                />
              ))}
            </motion.div>

            {/* Customer message — soft pop after typing, fades as flight starts */}
            <motion.div
              className="absolute left-[7%] top-[18%] z-20 max-w-[82%] rounded-2xl rounded-bl-md border border-[#E8E8E4] bg-white px-2 py-1.5 text-left shadow-[0_10px_22px_rgba(0,0,0,0.1)] sm:top-[16%]"
              animate={
                reduceMotion
                  ? { opacity: 0 }
                  : {
                      opacity: [0, 0, 1, 1, 0, 0],
                      y: [8, 8, 0, 0, -4, -4],
                      scale: [0.86, 0.86, 1.04, 1, 0.94, 0.94],
                    }
              }
              transition={{
                duration: LOOP,
                repeat: Infinity,
                ease: "linear",
                times: [
                  0,
                  T.custTypeOut,
                  T.send,
                  T.flyMid,
                  T.arrive,
                  T.reset,
                ],
              }}
            >
              <p className="text-[8px] leading-snug text-black [font-family:var(--font-body)] sm:text-[9px]">
                Hi, I need help with my order
              </p>
              <span className="mt-0.5 block text-right text-[6px] text-[#8A8A80] [font-family:var(--font-ui)]">
                Just now ✓✓
              </span>
            </motion.div>
          </div>

          {/* ── Agent office ── */}
          <div
            className={`relative ${
              day
                ? "bg-gradient-to-b from-[#F7F3EB] via-[#F3EEE4] to-[#E8E0D2]"
                : "bg-gradient-to-b from-[#2B3038] via-[#3A3F46] to-[#E8E0D2]"
            }`}
          >
            {day ? (
              <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_70%_0%,rgba(255,255,255,0.4),transparent_45%)]" />
            ) : (
              <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_20%_70%,rgba(255,190,110,0.28),transparent_42%)]" />
            )}

            {/* Office window with subtle Dubai skyline */}
            <div
              className={`absolute inset-x-2 top-2 h-9 overflow-hidden rounded-md border sm:h-10 ${
                day
                  ? "border-[#D0C8B8] bg-gradient-to-b from-[#A8CDEE] to-[#E8F2FA]"
                  : "border-[#1A222C] bg-gradient-to-b from-[#101A28] to-[#243448]"
              }`}
            >
              <OfficeDubaiWindow day={day} reduceMotion={Boolean(reduceMotion)} />
              <div className="pointer-events-none absolute inset-0 grid grid-cols-2">
                <span className="border-r border-white/25" />
                <span />
              </div>
              <div className="pointer-events-none absolute inset-x-0 top-1/2 h-px bg-white/25" />
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/25 via-transparent to-transparent" />
              <div className="absolute inset-y-0 left-0 w-1.5 bg-gradient-to-r from-[#C4A882]/35 to-transparent" />
              <div className="absolute inset-y-0 right-0 w-1.5 bg-gradient-to-l from-[#C4A882]/35 to-transparent" />
            </div>

            <p
              className={`absolute right-2 top-[2.85rem] z-[2] text-[8px] uppercase tracking-[0.16em] [font-family:var(--font-ui)] sm:top-[3.15rem] sm:text-[9px] ${
                day ? "text-[#8A8A80]" : "text-white/55"
              }`}
            >
              Support desk
            </p>

            {/* Wall shelf / binder */}
            <div className="absolute left-2 top-[3.5rem] flex items-end gap-0.5 sm:top-[3.85rem]">
              <span className="h-4 w-1.5 rounded-sm bg-[#8B6F4E]" />
              <span className="h-5 w-1.5 rounded-sm bg-[#5A6B5D]" />
              <span className="h-3.5 w-1.5 rounded-sm bg-[#1A1A18]" />
            </div>

            {/* Desk */}
            <div className="absolute inset-x-1 bottom-8 z-[3] h-3.5 rounded-md border border-[#C9BFAE] bg-gradient-to-b from-[#F6F0E6] to-[#E4D9C8] shadow-[0_4px_10px_rgba(0,0,0,0.08)] sm:bottom-9 sm:h-4">
              <div className="absolute inset-x-0 top-0 h-1 rounded-t-md bg-white/40" />
            </div>
            <div className="absolute inset-x-2.5 bottom-6 z-[2] h-2 rounded-b-md bg-[#CFC4B2] sm:bottom-7" />

            {/* Desk lamp — stronger night glow */}
            <div className="absolute bottom-[2.85rem] left-[8%] z-[5] sm:bottom-[3.15rem]">
              <div className="h-4 w-0.5 bg-[#2A2A28]" />
              <div className="absolute -top-1 left-[-6px] h-2 w-4 -rotate-12 rounded-t-full bg-[#1A1A18]" />
              {!day ? (
                <div className="absolute -left-3 top-0 h-9 w-9 rounded-full bg-[radial-gradient(circle,rgba(255,200,120,0.55),transparent_70%)] blur-[1px]" />
              ) : null}
              <div className="h-1 w-2.5 rounded-full bg-[#1A1A18]" />
            </div>

            {/* Coffee mug */}
            <div className="absolute bottom-[2.85rem] right-[10%] z-[5] sm:bottom-[3.15rem]">
              <div className="h-3 w-2.5 rounded-sm border border-[#8B6F4E]/50 bg-[#F3EEE4]" />
              <div className="absolute -right-1 top-0.5 h-2 w-1 rounded-r-full border border-[#8B6F4E]/50" />
            </div>

            {/* Monitor + keyboard */}
            <div className="absolute bottom-[2.9rem] left-[42%] z-[4] w-[52%] max-w-[7rem] -translate-x-1/2 sm:bottom-[3.2rem]">
              <div className="relative overflow-hidden rounded-[5px] border border-[#1A1A18] bg-[#0D0D0C] shadow-[0_10px_22px_rgba(0,0,0,0.22)]">
                {/* Soft flash when message lands */}
                <motion.div
                  className="pointer-events-none absolute inset-0 z-[2] bg-[#7CFFB2]/15"
                  animate={
                    reduceMotion
                      ? { opacity: 0 }
                      : {
                          opacity: [0, 0, 0.55, 0.15, 0, 0],
                        }
                  }
                  transition={{
                    duration: LOOP,
                    repeat: Infinity,
                    ease: "linear",
                    times: [
                      0,
                      T.arrive,
                      T.agentSee,
                      T.agentSee + 0.04,
                      T.agentTypeIn,
                      T.reset,
                    ],
                  }}
                />
                <div className="flex items-center gap-0.5 border-b border-white/10 bg-[#171716] px-1.5 py-[3px]">
                  <span className="h-1 w-1 rounded-full bg-[#FF5F57]" />
                  <span className="h-1 w-1 rounded-full bg-[#FEBC2E]" />
                  <span className="h-1 w-1 rounded-full bg-[#28C840]" />
                  <span className="ms-auto h-1 w-8 rounded-full bg-white/10" />
                </div>
                <div className="relative h-11 bg-gradient-to-b from-[#1C1C1A] to-[#10100F] px-1.5 py-1 sm:h-[3.15rem]">
                  <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(120,180,255,0.08),transparent_70%)]" />
                  {/* Incoming bubble */}
                  <motion.div
                    className="mb-1 max-w-[92%] rounded-md rounded-bl-sm bg-white/12 px-1 py-0.5"
                    animate={
                      reduceMotion
                        ? { opacity: 0 }
                        : {
                            opacity: [0, 0, 1, 1, 1, 0],
                            scale: [0.92, 0.92, 1.03, 1, 1, 0.96],
                          }
                    }
                    transition={{
                      duration: LOOP,
                      repeat: Infinity,
                      ease: "linear",
                      times: [
                        0,
                        T.arrive,
                        T.agentSee,
                        T.replyHold,
                        T.replyOut,
                        T.reset,
                      ],
                    }}
                  >
                    <span className="block h-0.5 w-9 rounded-full bg-white/55" />
                    <span className="mt-0.5 block h-0.5 w-6 rounded-full bg-white/30" />
                  </motion.div>
                  <motion.div
                    className="ml-auto max-w-[78%] rounded-md rounded-br-sm bg-[#F3EEE4] px-1 py-0.5"
                    animate={
                      reduceMotion
                        ? { opacity: 0 }
                        : {
                            opacity: [0, 0, 1, 1, 0, 0],
                            scale: [0.9, 0.9, 1.03, 1, 0.95, 0.95],
                          }
                    }
                    transition={{
                      duration: LOOP,
                      repeat: Infinity,
                      ease: "linear",
                      times: [
                        0,
                        T.replyIn,
                        T.replyShown,
                        T.replyHold,
                        T.replyOut,
                        T.reset,
                      ],
                    }}
                  >
                    <span className="block h-0.5 w-8 rounded-full bg-black/30" />
                  </motion.div>
                  <motion.span
                    className="absolute bottom-1.5 left-2 h-2 w-0.5 bg-[#7CFFB2]/80"
                    animate={
                      reduceMotion
                        ? { opacity: 0 }
                        : {
                            opacity: [0, 0, 1, 0, 1, 0, 0],
                          }
                    }
                    transition={{
                      duration: LOOP,
                      repeat: Infinity,
                      ease: "linear",
                      times: [
                        0,
                        T.agentTypeIn,
                        T.agentTypeIn + 0.025,
                        0.54,
                        0.58,
                        T.agentTypeOut,
                        T.reset,
                      ],
                    }}
                  />
                </div>
              </div>
              <div className="mx-auto h-1.5 w-2.5 bg-[#1A1A18]" />
              <div className="mx-auto h-[3px] w-8 rounded-full bg-[#111]" />
              <div className="mx-auto mt-1 h-1.5 w-[85%] rounded-[2px] border border-[#2A2A28]/40 bg-[#2A2A28]">
                <div className="flex h-full items-center justify-center gap-[1px] px-0.5">
                  {Array.from({ length: 9 }).map((_, i) => (
                    <span
                      key={i}
                      className="h-[3px] w-[3px] rounded-[0.5px] bg-[#3A3A38]"
                    />
                  ))}
                </div>
              </div>
            </div>

            {/* Woman agent — breath + lean toward screen on arrive */}
            <motion.div
              className="absolute bottom-2.5 right-[1%] z-[7] sm:bottom-3 sm:right-[3%]"
              animate={
                reduceMotion
                  ? undefined
                  : {
                      y: [0, -1, 0, -1.2, -1.2, 0],
                      x: [0, 0, 0, -3, -3, 0],
                    }
              }
              transition={{
                duration: LOOP,
                repeat: Infinity,
                ease: "easeInOut",
                times: [
                  0,
                  0.2,
                  0.35,
                  T.agentSee,
                  T.replyHold,
                  T.reset,
                ],
              }}
            >
              <div className="absolute bottom-[6px] left-[42%] h-1.5 w-12 -translate-x-1/2 rounded-[100%] bg-black/18 blur-[2px]" />
              <motion.div
                animate={
                  reduceMotion
                    ? undefined
                    : {
                        rotate: [0, 0, -2.5, -2.5, 0],
                      }
                }
                transition={{
                  duration: LOOP,
                  repeat: Infinity,
                  times: [0, T.arrive, T.agentSee, T.replyOut, T.reset],
                }}
                style={{ transformOrigin: "55% 80%" }}
              >
                <AgentFigure />
              </motion.div>
              {/* Typing hands — only during agent type */}
              <motion.div
                className="absolute bottom-[18%] left-[12%] flex gap-1"
                animate={
                  reduceMotion
                    ? { opacity: 0 }
                    : {
                        opacity: [0, 0, 1, 1, 0, 0],
                        y: [0, 0, -1.2, 0, -1.2, 0],
                      }
                }
                transition={{
                  duration: LOOP,
                  repeat: Infinity,
                  ease: "easeInOut",
                  times: [
                    0,
                    T.agentTypeIn,
                    T.agentTypeIn + 0.02,
                    0.55,
                    0.58,
                    T.agentTypeOut,
                  ],
                }}
              >
                <span className="h-1.5 w-2.5 rounded-full bg-[#E8C4A8] shadow-sm" />
                <span className="h-1.5 w-2.5 rounded-full bg-[#E8C4A8] shadow-sm" />
              </motion.div>
            </motion.div>

            {/* Agent typing pill */}
            <motion.div
              className="absolute right-[8%] top-[40%] z-20 flex items-center gap-0.5 rounded-full border border-[#E8E8E4] bg-white/95 px-1.5 py-1 shadow-[0_4px_12px_rgba(0,0,0,0.1)]"
              animate={
                reduceMotion
                  ? { opacity: 0 }
                  : {
                      opacity: [0, 0, 1, 1, 0, 0],
                      scale: [0.86, 0.86, 1.04, 1, 0.92, 0.92],
                    }
              }
              transition={{
                duration: LOOP,
                repeat: Infinity,
                ease: "linear",
                times: [
                  0,
                  T.agentTypeIn,
                  T.agentTypeIn + 0.02,
                  T.agentTypeHold,
                  T.agentTypeOut,
                  T.reset,
                ],
              }}
            >
              {[0, 1, 2].map((i) => (
                <motion.span
                  key={i}
                  className="h-1 w-1 rounded-full bg-black/45"
                  animate={
                    reduceMotion
                      ? undefined
                      : { opacity: [0.3, 1, 0.3], y: [0, -1.4, 0] }
                  }
                  transition={{
                    duration: 0.48,
                    repeat: Infinity,
                    delay: i * 0.1,
                  }}
                />
              ))}
            </motion.div>

            {/* Agent reply — soft pop, held ≥~2.3s */}
            <motion.div
              className="absolute right-[5%] top-[24%] z-20 max-w-[84%] rounded-2xl rounded-br-md border border-black bg-black px-2 py-1.5 text-left text-white shadow-[0_10px_22px_rgba(0,0,0,0.2)] sm:top-[22%]"
              animate={
                reduceMotion
                  ? { opacity: 0 }
                  : {
                      opacity: [0, 0, 1, 1, 0, 0],
                      y: [8, 8, 0, 0, 4, 4],
                      scale: [0.86, 0.86, 1.04, 1, 0.94, 0.94],
                    }
              }
              transition={{
                duration: LOOP,
                repeat: Infinity,
                ease: "linear",
                times: [
                  0,
                  T.replyIn,
                  T.replyShown,
                  T.replyHold,
                  T.replyOut,
                  T.reset,
                ],
              }}
            >
              <p className="text-[8px] leading-snug [font-family:var(--font-body)] sm:text-[9px]">
                Of course — I&apos;m here to help
              </p>
            </motion.div>
          </div>

          {/* Flying message — soft arc + trail, ease settle on land */}
          {!reduceMotion ? (
            <>
              {/* Ghost trail */}
              <motion.div
                className="pointer-events-none absolute top-[34%] z-[29]"
                animate={{
                  left: ["36%", "36%", "46%", "56%", "60%"],
                  opacity: [0, 0, 0.35, 0.2, 0],
                  y: [0, 0, -10, 0, 2],
                  scale: [0.5, 0.5, 0.85, 0.7, 0.55],
                }}
                transition={{
                  duration: LOOP,
                  repeat: Infinity,
                  ease: easeOutCubic,
                  times: [0, T.send, T.flyMid, T.arrive, T.agentSee],
                }}
              >
                <span className="block h-5 w-5 rounded-full bg-[#C4A882]/35 blur-[3px]" />
              </motion.div>
              <motion.div
                className="pointer-events-none absolute top-[34%] z-30"
                animate={{
                  left: ["36%", "36%", "48%", "60%", "60%"],
                  opacity: [0, 0, 1, 1, 0],
                  y: [0, 0, -12, 1, 2],
                  scale: [0.55, 0.55, 1.08, 1, 0.82],
                  rotate: [0, 0, -8, 4, 0],
                }}
                transition={{
                  duration: LOOP,
                  repeat: Infinity,
                  ease: easeOutCubic,
                  times: [0, T.send, T.flyMid, T.arrive, T.agentSee],
                }}
              >
                <span className="absolute -inset-2 rounded-full bg-[#C4A882]/28 blur-md" />
                <div className="relative flex h-6 w-6 items-center justify-center rounded-full border border-[#E8E8E4] bg-white text-black shadow-[0_8px_18px_rgba(0,0,0,0.14)]">
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none">
                    <path
                      d="M4 6h16v10H8l-4 3V6Z"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
              </motion.div>
            </>
          ) : null}
        </div>
      </motion.div>
    </div>
  );
}

function CustomerSkyline({ day }: { day: boolean }) {
  const fill = day ? "#7A8E98" : "#152028";
  return (
    <svg viewBox="0 0 160 44" className="h-full w-full" preserveAspectRatio="none">
      <path
        d="M0 44V28h10V18h6v10h8V12h5v16h10V20h7v8h9V8h4v4l3-6 3 6v4h8V22h6v6h12V14h5v14h10V18h7v10h14V24h8v20H0Z"
        fill={fill}
        fillOpacity="0.85"
      />
      {/* Tiny Burj hint */}
      <path d="M78 44V6l1.5-4 1.5 4v38H78Z" fill={fill} />
    </svg>
  );
}

function OfficeDubaiWindow({
  day,
  reduceMotion,
}: {
  day: boolean;
  reduceMotion?: boolean;
}) {
  return (
    <div className="absolute inset-0 overflow-hidden">
      <div
        className={`absolute inset-0 ${
          day
            ? "bg-gradient-to-b from-[#9EC8E8] via-[#C5DDF0] to-[#E8D9B8]"
            : "bg-gradient-to-b from-[#0C1522] via-[#1A2838] to-[#2A3848]"
        }`}
      />
      {!day ? (
        <motion.span
          className="absolute right-3 top-1.5 h-2 w-2 rounded-full bg-[#EDE6DA]/9"
          animate={
            reduceMotion
              ? { opacity: 0.85 }
              : { opacity: [0.65, 1, 0.65] }
          }
          transition={{ duration: 4.5, repeat: Infinity, ease: "easeInOut" }}
        />
      ) : (
        <span className="absolute right-2.5 top-1.5 h-2.5 w-2.5 rounded-full bg-[#F5C542] shadow-[0_0_8px_rgba(245,197,66,0.45)]" />
      )}
      <svg
        viewBox="0 0 100 40"
        className="absolute inset-x-0 bottom-0 h-[78%] w-full"
        preserveAspectRatio="xMidYMax meet"
      >
        <rect
          x="0"
          y="30"
          width="100"
          height="10"
          fill={day ? "#C9B896" : "#1A2430"}
          fillOpacity="0.5"
        />
        <path
          d="M4 40V26h4V20h3v6h5V22h3v8h6V18h3v4l2-5 2 5v4h5V24h4v6h8V16h3v10h6V22h4v8h8V25h5v15H4Z"
          fill={day ? "#4A6074" : "#2A3848"}
          fillOpacity="0.9"
        />
        {/* Burj needle */}
        <path
          d="M48 40V10l1.4-5 1.4 5v30H48Z"
          fill={day ? "#3D5164" : "#1E2A38"}
        />
        <path
          d="M48.6 40V14l0.8-3 0.8 3v26H48.6Z"
          fill={day ? "#6B8498" : "#3A4E62"}
        />
        {/* Sail hint */}
        <path
          d="M78 40c0-10 1.8-18 4.5-24 0.6 1.2 1.2 6 1.2 24H78Z"
          fill={day ? "#4A6074" : "#2A3848"}
        />
      </svg>
    </div>
  );
}

function SunMark({ reduceMotion }: { reduceMotion?: boolean }) {
  return (
    <motion.div
      className="absolute right-4 top-2 sm:right-6 sm:top-2.5"
      animate={reduceMotion ? undefined : { rotate: [0, 12, 0] }}
      transition={{ duration: 16, repeat: Infinity, ease: "easeInOut" }}
    >
      <div className="relative h-8 w-8 sm:h-9 sm:w-9">
        <span className="absolute inset-0 rounded-full bg-[#F5C542]/25 blur-md" />
        <span className="absolute inset-[24%] rounded-full bg-gradient-to-br from-[#FFE08A] to-[#F0B429] shadow-[0_0_18px_rgba(245,197,66,0.55)]" />
        {Array.from({ length: 10 }).map((_, i) => (
          <span
            key={i}
            className="absolute left-1/2 top-1/2 h-[46%] w-[2px] rounded-full bg-[#F5C542]/7"
            style={{
              transform: `translate(-50%, -100%) rotate(${i * 36}deg)`,
              transformOrigin: "50% 100%",
            }}
          />
        ))}
      </div>
    </motion.div>
  );
}

function MoonMark({ reduceMotion }: { reduceMotion?: boolean }) {
  return (
    <motion.div
      className="absolute right-4 top-2.5 sm:right-6 sm:top-3"
      animate={reduceMotion ? undefined : { y: [0, -2, 0] }}
      transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
    >
      <div className="relative h-7 w-7 sm:h-8 sm:w-8">
        <span className="absolute inset-0 rounded-full bg-[#E8E4D8]/2 blur-md" />
        <span className="absolute inset-[8%] rounded-full bg-gradient-to-br from-[#F4F0E6] to-[#D8D2C4] shadow-[0_0_16px_rgba(232,228,216,0.35)]" />
        <span className="absolute -right-0.5 -top-0.5 h-[78%] w-[78%] rounded-full bg-[#0F1722]" />
      </div>
    </motion.div>
  );
}

function PhoneDevice({ reduceMotion }: { reduceMotion?: boolean }) {
  return (
    <div className="relative h-10 w-[19px] rounded-[5px] border border-[#111] bg-[#0D0D0C] shadow-[0_4px_10px_rgba(0,0,0,0.28)] sm:h-11 sm:w-[21px]">
      <div className="absolute inset-[2px] overflow-hidden rounded-[3px] bg-[#1A1A18]">
        <div className="absolute inset-x-0 top-0 h-1.5 bg-[#111]" />
        <motion.div
          className="absolute inset-x-0.5 top-2 space-y-[2px]"
          animate={
            reduceMotion
              ? { opacity: 0.75 }
              : { opacity: [0.45, 1, 0.45] }
          }
          transition={{ duration: 1.15, repeat: Infinity }}
        >
          <span className="block h-[2px] w-full rounded-full bg-[#7CFFB2]/75" />
          <span className="block h-[2px] w-[70%] rounded-full bg-white/30" />
          <span className="block h-[2px] w-[55%] rounded-full bg-white/20" />
        </motion.div>
      </div>
      <span className="absolute bottom-[3px] left-1/2 h-[2px] w-2.5 -translate-x-1/2 rounded-full bg-white/20" />
    </div>
  );
}

function CustomerFigure({ day }: { day: boolean }) {
  return (
    <svg
      width="58"
      height="98"
      viewBox="0 0 58 98"
      fill="none"
      className="h-[5rem] w-auto drop-shadow-[0_3px_8px_rgba(0,0,0,0.14)] sm:h-[6rem]"
    >
      <defs>
        <linearGradient
          id="cSkin"
          x1="16"
          y1="10"
          x2="32"
          y2="30"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#F0D0B4" />
          <stop offset="1" stopColor="#D9A878" />
        </linearGradient>
        <linearGradient
          id="cTop"
          x1="12"
          y1="30"
          x2="40"
          y2="55"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#5C6F60" />
          <stop offset="1" stopColor="#3E4E42" />
        </linearGradient>
      </defs>
      <ellipse cx="26" cy="16.5" rx="13" ry="14" fill="#2A1810" />
      <circle cx="26" cy="19" r="9.5" fill="url(#cSkin)" />
      <circle cx="19.5" cy="21" r="1.5" fill="#E8A090" fillOpacity="0.32" />
      <circle cx="32.5" cy="21" r="1.5" fill="#E8A090" fillOpacity="0.32" />
      <path
        d="M14.5 17c1.2 9 4.5 12 7 12V12.5c-3 .4-5.8 2-7 4.5Z"
        fill="#2A1810"
      />
      <path
        d="M37.5 17c-1.2 9-4.5 12-7 12V12.5c3 .4 5.8 2 7 4.5Z"
        fill="#2A1810"
      />
      <path
        d="M16 15c2.5-8.5 19-10 21.5 0-3.2-3.2-7.5-4.2-10.8-3.6S19 12.5 16 15Z"
        fill="#2A1810"
      />
      <ellipse cx="22.2" cy="18.8" rx="1.25" ry="1.4" fill="#1A1A18" />
      <ellipse cx="29.8" cy="18.8" rx="1.25" ry="1.4" fill="#1A1A18" />
      <circle cx="22.55" cy="18.35" r="0.4" fill="white" />
      <circle cx="30.15" cy="18.35" r="0.4" fill="white" />
      <path
        d="M22.5 23c1.2 1.4 5 1.4 6.2 0"
        stroke="#C48A72"
        strokeWidth="1.05"
        strokeLinecap="round"
      />
      <rect
        x="23.8"
        y="27.5"
        width="4.5"
        height="4.5"
        rx="1.3"
        fill="url(#cSkin)"
      />
      <path
        d="M14 33c0-2.6 4.5-4.8 12-4.8s12 2.2 12 4.8l1.7 18.5H12.3L14 33Z"
        fill="url(#cTop)"
      />
      <path
        d="M13 51.5h26l1.1 30c0 2.1-3.3 3.6-14.1 3.6S11.9 83.6 11.9 81.5L13 51.5Z"
        fill="#141414"
      />
      <path
        d="M26 52c.5 10 .7 20 .3 28"
        stroke="white"
        strokeOpacity="0.07"
        strokeWidth="2.5"
      />
      <path
        d="M14 36c-3.2 5.2-3.8 11.5-2.2 15.5"
        stroke="url(#cSkin)"
        strokeWidth="4.3"
        strokeLinecap="round"
      />
      <path
        d="M38 36c2.8 3.4 4.2 8.8 3.2 14"
        stroke="url(#cSkin)"
        strokeWidth="4.3"
        strokeLinecap="round"
      />
      <ellipse
        cx="19.5"
        cy="92"
        rx="5"
        ry="2.2"
        fill={day ? "#2A1810" : "#1A1A18"}
      />
      <ellipse
        cx="32.5"
        cy="92"
        rx="5"
        ry="2.2"
        fill={day ? "#2A1810" : "#1A1A18"}
      />
    </svg>
  );
}

/** Seated woman support agent in elegant Gulf abaya. */
function AgentFigure() {
  return (
    <svg
      width="82"
      height="104"
      viewBox="0 0 82 104"
      fill="none"
      className="h-[5.5rem] w-auto drop-shadow-[0_3px_8px_rgba(0,0,0,0.14)] sm:h-[6.5rem]"
    >
      <defs>
        <linearGradient
          id="aSkin"
          x1="30"
          y1="8"
          x2="46"
          y2="30"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#F2D2B6" />
          <stop offset="1" stopColor="#E0B894" />
        </linearGradient>
        <linearGradient
          id="aChair"
          x1="18"
          y1="38"
          x2="60"
          y2="90"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#3A3A36" />
          <stop offset="1" stopColor="#1A1A18" />
        </linearGradient>
        <linearGradient
          id="aAbaya"
          x1="22"
          y1="32"
          x2="58"
          y2="92"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#2A2A28" />
          <stop offset="0.45" stopColor="#141414" />
          <stop offset="1" stopColor="#0A0A0A" />
        </linearGradient>
        <linearGradient
          id="aShayla"
          x1="26"
          y1="4"
          x2="54"
          y2="34"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#1F1F1C" />
          <stop offset="1" stopColor="#0E0E0C" />
        </linearGradient>
      </defs>

      <path
        d="M24 40c0-4 5-7 17-7s17 3 17 7v20c0 3.5-5 6-17 6s-17-2.5-17-6V40Z"
        fill="url(#aChair)"
      />
      <path
        d="M27 43c0-2.5 4-4.5 14-4.5s14 2 14 4.5v14c0 2.5-4 4.5-14 4.5s-14-2-14-4.5V43Z"
        fill="#454540"
      />
      <ellipse cx="41" cy="70" rx="21" ry="5.2" fill="#1A1A18" />
      <rect x="39" y="74" width="4" height="10" rx="1" fill="#1A1A18" />
      <ellipse cx="41" cy="86" rx="13" ry="2.3" fill="#2A2A28" />
      <path
        d="M28 86h26M41 86l-8 6M41 86l8 6"
        stroke="#1A1A18"
        strokeWidth="1.6"
        strokeLinecap="round"
      />

      <path
        d="M23 34c0-3.2 7-6 18-6s18 2.8 18 6l4 34c1 6-2 10-10 12-5 1.2-15 1.5-22 0-8-2-12-6-11-12l3-34Z"
        fill="url(#aAbaya)"
      />
      <path
        d="M41 29c1.2 14 1.8 28 1 42"
        stroke="white"
        strokeOpacity="0.07"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <path
        d="M34 32.5c2.2-1.4 5.2-2.1 7-2.1s4.8.7 7 2.1"
        stroke="#C4A882"
        strokeWidth="1.15"
        strokeLinecap="round"
        fill="none"
      />
      <path
        d="M41 31.5v28"
        stroke="#C4A882"
        strokeWidth="0.9"
        strokeOpacity="0.85"
        strokeLinecap="round"
      />
      <path
        d="M26 68c4 2.5 10 4 15 4s11-1.5 15-4"
        stroke="#C4A882"
        strokeWidth="1"
        strokeOpacity="0.7"
        strokeLinecap="round"
        fill="none"
      />
      <path
        d="M27 70c2 6 4 12 5 16h18c1-4 3-10 5-16-5 2-12 3.5-14 3.5S32 72 27 70Z"
        fill="#111"
      />
      <ellipse cx="33" cy="88" rx="4.5" ry="1.8" fill="#0A0A0A" />
      <ellipse cx="49" cy="88" rx="4.5" ry="1.8" fill="#0A0A0A" />

      <path
        d="M25 20c1-12 8.5-17.5 16-17.5S56 8 57 20c0 4-1.5 8-3 11-2.5-5-6-9-13-9s-10.5 4-13 9c-1.5-3-3-7-3-11Z"
        fill="url(#aShayla)"
      />
      <path
        d="M26 24c2 10 3.5 18 4 24 3-8 6-14 11-16 5 2 8 8 11 16 .5-6 2-14 4-24-3.5-3-8-5-15-5s-11.5 2-15 5Z"
        fill="url(#aShayla)"
      />
      <path
        d="M28.5 22c2.5-3.5 7-5.5 12.5-5.5s10 2 12.5 5.5"
        stroke="#C4A882"
        strokeWidth="0.8"
        strokeOpacity="0.65"
        fill="none"
        strokeLinecap="round"
      />

      <circle cx="41" cy="19.5" r="8.8" fill="url(#aSkin)" />
      <circle cx="35" cy="21.2" r="1.35" fill="#E8A090" fillOpacity="0.32" />
      <circle cx="47" cy="21.2" r="1.35" fill="#E8A090" fillOpacity="0.32" />
      <ellipse cx="37" cy="19" rx="1.15" ry="1.3" fill="#1A1A18" />
      <ellipse cx="45" cy="19" rx="1.15" ry="1.3" fill="#1A1A18" />
      <circle cx="37.35" cy="18.55" r="0.35" fill="white" />
      <circle cx="45.35" cy="18.55" r="0.35" fill="white" />
      <path
        d="M37.2 22.8c1.2 1.4 5 1.4 6.2 0"
        stroke="#C48A72"
        strokeWidth="1"
        strokeLinecap="round"
      />

      <path
        d="M28.5 19c0-6.8 5.4-11.8 12.5-11.8S53.5 12.2 53.5 19"
        stroke="#111"
        strokeWidth="2.1"
        fill="none"
      />
      <rect x="25.8" y="17.2" width="5" height="7" rx="2.1" fill="#111" />
      <rect x="51.2" y="17.2" width="5" height="7" rx="2.1" fill="#111" />
      <path
        d="M30.8 24.8h6.5"
        stroke="#111"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
      <circle cx="38" cy="24.8" r="1.45" fill="#111" />
      <circle cx="38" cy="24.8" r="0.5" fill="#7CFFB2" />

      <path
        d="M38.2 27.5h5.6v4.2c0 1-1.2 1.6-2.8 1.6s-2.8-.6-2.8-1.6v-4.2Z"
        fill="url(#aSkin)"
      />
      <path
        d="M23.5 38c-4 3.2-6.5 8.5-6 13.5 3.5 1 8 1.2 12 .4"
        fill="url(#aAbaya)"
      />
      <path
        d="M58.5 38c4 3.2 6.5 8.5 6 13.5-3.5 1-8 1.2-12 .4"
        fill="url(#aAbaya)"
      />
      <path
        d="M19.5 51.5c3 1.2 8 2 12.5 1.4"
        stroke="url(#aSkin)"
        strokeWidth="3.6"
        strokeLinecap="round"
      />
      <path
        d="M62.5 51.5c-3 1.2-8 2-12.5 1.4"
        stroke="url(#aSkin)"
        strokeWidth="3.6"
        strokeLinecap="round"
      />
    </svg>
  );
}
