"use client";

import { useEffect, useMemo, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";

/**
 * “From Atelier Doorstep to MOTD Care” — 17s loop.
 * 0.00–0.12 establish · 0.12–0.32 intent · 0.32–0.47 flight
 * 0.47–0.72 care · 0.72–0.88 hold (≥2.2s) · 0.90–1.00 dissolve
 */
const LOOP = 17;

const easeOutCubic = [0.22, 1, 0.36, 1] as const;

const T = {
  glance: 0.12,
  custTypeIn: 0.16,
  custTypeHold: 0.28,
  custTypeOut: 0.32,
  send: 0.34,
  flyMid: 0.4,
  arrive: 0.47,
  agentSee: 0.5,
  agentTypeIn: 0.54,
  agentTypeHold: 0.64,
  agentTypeOut: 0.68,
  replyIn: 0.7,
  replyShown: 0.72,
  replyHold: 0.86,
  replyOut: 0.9,
  dissolve: 0.93,
  reset: 1,
} as const;

/** Same motion; copy swaps each loop. */
const COPY = [
  {
    customer: "Hi — my fabric cut arrived, but the shade feels cooler than the listing.",
    agent: "Of course — I’ll check the dye lot and arrange an exchange.",
    tag: "FAB-204",
  },
  {
    customer: "The ready-made piece fits tight through the shoulder. Can we exchange?",
    agent: "Yes — I’ll check size stock and set an exchange for you.",
    tag: "RO-1842",
  },
  {
    customer: "Can the tailor adjust the sleeve on this design before stitching?",
    agent: "I’ll ask the tailor and confirm the sleeve change with you.",
    tag: "DS-091",
  },
] as const;

function isDaytime(now = new Date()) {
  const h = now.getHours();
  return h >= 6 && h < 18;
}

/**
 * Admin live-support empty scene — atelier doorstep ↔ MOTD Care desk.
 */
export default function AdminSupportEmptyScene() {
  const day = useMemo(() => isDaytime(), []);
  const reduceMotion = useReducedMotion();
  const [copyIndex, setCopyIndex] = useState(0);
  const copy = COPY[copyIndex];

  useEffect(() => {
    if (reduceMotion) return;
    const id = window.setInterval(() => {
      setCopyIndex((i) => (i + 1) % COPY.length);
    }, LOOP * 1000);
    return () => window.clearInterval(id);
  }, [reduceMotion]);

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

            {/* Arched majlis opening + distant skyline */}
            <div className="absolute inset-x-3 top-6 h-12 overflow-hidden rounded-t-[2rem] border border-[#C4A882]/40 opacity-80 sm:top-7 sm:h-14">
              <CustomerSkyline day={day} />
            </div>
            {/* Mashrabiya screen */}
            <div
              className="pointer-events-none absolute bottom-8 left-0 top-16 w-3 opacity-40"
              style={{
                backgroundImage:
                  "radial-gradient(circle, #8B6F4E 0.6px, transparent 0.7px)",
                backgroundSize: "4px 4px",
              }}
            />
            {/* Date palm */}
            <svg
              viewBox="0 0 24 40"
              className="absolute bottom-8 right-1 h-10 w-6 opacity-50"
              aria-hidden
            >
              <path d="M12 40V16" stroke="#5C6F60" strokeWidth="1.4" />
              <path
                d="M12 16c-6-1-9-6-8-9 4 2 7 4 8 9Zm0 0c6-1 9-6 8-9-4 2-7 4-8 9Zm0 1c-2-6-1-10 2-12-2 5-2 8-2 12Zm0 1c2-6 1-10-2-12 2 5 2 8 2 12Z"
                fill="#3D6B4F"
              />
            </svg>

            <p
              className={`absolute left-2 top-2 z-[2] text-[8px] uppercase tracking-[0.16em] [font-family:var(--font-ui)] sm:text-[9px] ${
                day ? "text-[#8A8A80]" : "text-white/55"
              }`}
            >
              Customer
            </p>

            {/* Fabric bolt + order tag — fashion truth, not a generic plant */}
            <motion.div
              className="absolute bottom-9 left-1.5 z-[3] origin-bottom sm:left-2"
              animate={
                reduceMotion ? undefined : { rotate: [0, 1.2, 0, -0.6, 0] }
              }
              transition={{ duration: LOOP, repeat: Infinity, ease: "easeInOut" }}
            >
              <div className="h-5 w-7 rounded-sm bg-gradient-to-br from-[#C4A882] via-[#E8D7C0] to-[#8B6F4E] shadow-[0_2px_4px_rgba(0,0,0,0.12)]" />
              <div className="absolute inset-x-1 top-1 h-px bg-white/50" />
              <div className="absolute -right-1 top-0 h-5 w-1.5 rounded-r-sm bg-[#5C6F60]" />
            </motion.div>
            <div className="absolute bottom-[4.6rem] left-2 z-[4] rounded-sm border border-[#E8E8E4] bg-[#FFFDF9] px-1 py-0.5 shadow-sm">
              <p className="text-[6px] font-medium tracking-[0.08em] text-[#8B6F4E] [font-family:var(--font-ui)] sm:text-[7px]">
                {copy.tag}
              </p>
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
              className="absolute left-[7%] top-[18%] z-20 max-w-[88%] rounded-2xl rounded-bl-md border border-[#E8E8E4] bg-white px-2 py-1.5 text-left shadow-[0_10px_22px_rgba(0,0,0,0.1)] sm:top-[16%]"
              animate={
                reduceMotion
                  ? { opacity: 1, y: 0, scale: 1 }
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
              <p className="text-[8px] leading-snug text-black [font-family:var(--font-body)] sm:text-[10px]">
                {copy.customer}
              </p>
              <span className="mt-0.5 block text-right text-[6px] text-[#8A8A80] [font-family:var(--font-ui)] sm:text-[7px]">
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

            {/* Arched Gulf window with Dubai skyline */}
            <div
              className={`absolute inset-x-3 top-2 h-10 overflow-hidden rounded-t-[1.4rem] border sm:h-11 ${
                day
                  ? "border-[#C4A882]/50 bg-gradient-to-b from-[#A8CDEE] to-[#E8F2FA]"
                  : "border-[#C4A882]/30 bg-gradient-to-b from-[#101A28] to-[#243448]"
              }`}
            >
              <OfficeDubaiWindow day={day} reduceMotion={Boolean(reduceMotion)} />
              <div className="pointer-events-none absolute inset-x-2 bottom-0 top-3 rounded-t-full border border-white/25" />
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/25 via-transparent to-transparent" />
              <div className="absolute inset-y-0 left-0 w-1.5 bg-gradient-to-r from-[#C4A882]/35 to-transparent" />
              <div className="absolute inset-y-0 right-0 w-1.5 bg-gradient-to-l from-[#C4A882]/35 to-transparent" />
            </div>

            <p
              className={`absolute right-2 top-[2.85rem] z-[2] text-[8px] uppercase tracking-[0.16em] [font-family:var(--font-ui)] sm:top-[3.15rem] sm:text-[9px] ${
                day ? "text-[#8A8A80]" : "text-white/55"
              }`}
            >
              MOTD Care
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

            {/* Fabric sample card on the wall */}
            <div className="absolute right-2 top-[3.4rem] z-[2] w-7 overflow-hidden rounded-sm border border-[#E8E8E4] bg-white shadow-sm sm:top-[3.75rem]">
              <div className="h-3 bg-gradient-to-br from-[#5C6F60] to-[#C4A882]" />
              <p className="px-0.5 py-px text-center text-[5px] tracking-[0.12em] text-[#8A8A80] [font-family:var(--font-ui)]">
                MOTD
              </p>
            </div>

            {/* Measuring tape — settles during the hold */}
            <motion.div
              className="absolute bottom-[3.15rem] left-[18%] z-[6] h-1.5 w-10 overflow-hidden rounded-sm bg-[#F3EEE4] sm:bottom-[3.45rem]"
              animate={
                reduceMotion
                  ? undefined
                  : { rotate: [8, 8, 2, 2, 8], y: [0, 0, 1, 1, 0] }
              }
              transition={{
                duration: LOOP,
                repeat: Infinity,
                ease: "easeInOut",
                times: [0, T.replyShown, T.replyHold, T.dissolve, T.reset],
              }}
            >
              <div className="flex h-full">
                {Array.from({ length: 8 }).map((_, i) => (
                  <span
                    key={i}
                    className={`h-full w-[12.5%] border-r border-[#1A1A18]/30 ${
                      i % 2 ? "bg-[#C4A882]/40" : ""
                    }`}
                  />
                ))}
              </div>
            </motion.div>

            {/* Brass dallah */}
            <div className="absolute bottom-[2.7rem] right-[8%] z-[5] sm:bottom-[3rem]">
              <div className="relative h-4 w-3">
                <span className="absolute bottom-0 left-0.5 h-2.5 w-2 rounded-b-full rounded-t-md bg-gradient-to-b from-[#E6C98A] to-[#8B6F4E]" />
                <span className="absolute -left-1 top-1 h-1 w-1.5 rounded-l-full border border-[#8B6F4E] bg-[#C4A882]" />
                <span className="absolute -right-0.5 -top-1 h-2 w-0.5 origin-bottom -rotate-45 rounded-full bg-[#8B6F4E]" />
                <span className="absolute -top-0.5 left-0.5 h-1 w-2 rounded-t-sm bg-[#6B5438]" />
              </div>
              {!day && !reduceMotion ? (
                <motion.span
                  className="absolute -top-2 left-0.5 h-2 w-1.5 rounded-full bg-white/40 blur-[1px]"
                  animate={{ y: [0, -4, -7], opacity: [0.45, 0.2, 0] }}
                  transition={{ duration: 2.4, repeat: Infinity, ease: "easeOut" }}
                />
              ) : null}
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
              className="absolute right-[4%] top-[22%] z-20 max-w-[90%] rounded-2xl rounded-br-md border border-black bg-black px-2 py-1.5 text-left text-white shadow-[0_10px_22px_rgba(0,0,0,0.2)] sm:top-[20%]"
              animate={
                reduceMotion
                  ? { opacity: 1, y: 0, scale: 1 }
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
              <p className="text-[8px] leading-snug [font-family:var(--font-body)] sm:text-[10px]">
                {copy.agent}
              </p>
            </motion.div>
          </div>

          {/* Flying paper chip — sand trail + a single stitch spark */}
          {!reduceMotion ? (
            <>
              <motion.div
                className="pointer-events-none absolute top-[32%] z-[29]"
                animate={{
                  left: ["34%", "34%", "46%", "58%", "62%"],
                  opacity: [0, 0, 0.4, 0.18, 0],
                  y: [0, 0, -14, 2, 4],
                  scale: [0.6, 0.6, 1, 0.85, 0.7],
                }}
                transition={{
                  duration: LOOP,
                  repeat: Infinity,
                  ease: easeOutCubic,
                  times: [0, T.send, T.flyMid, T.arrive, T.agentSee],
                }}
              >
                <span className="block h-6 w-10 rounded-full bg-[#C4A882]/40 blur-[4px]" />
              </motion.div>
              <motion.div
                className="pointer-events-none absolute top-[30%] z-30"
                animate={{
                  left: ["32%", "32%", "46%", "61%", "59%", "59%"],
                  opacity: [0, 0, 1, 1, 0, 0],
                  y: [4, 4, -16, 2, 6, 6],
                  scale: [0.7, 0.7, 1.06, 1.03, 0.9, 0.9],
                  rotate: [0, 0, -7, 3, 0, 0],
                }}
                transition={{
                  duration: LOOP,
                  repeat: Infinity,
                  ease: easeOutCubic,
                  times: [0, T.send, T.flyMid, T.arrive, T.arrive + 0.03, T.agentSee],
                }}
              >
                <div className="relative max-w-[7.5rem] rounded-xl rounded-bl-md border border-[#E8E8E4] bg-[#FFFDF9] px-2 py-1 shadow-[0_10px_18px_rgba(0,0,0,0.14)]">
                  <p className="text-[7px] leading-snug text-black [font-family:var(--font-body)] sm:text-[8px]">
                    {copy.tag} · shade
                  </p>
                </div>
              </motion.div>
              <motion.span
                className="pointer-events-none absolute top-[26%] z-30 h-2 w-px bg-[#C4A882]"
                animate={{
                  left: ["48%", "48%", "50%", "50%"],
                  opacity: [0, 0, 1, 0],
                  scaleY: [0.2, 0.2, 1, 0.2],
                }}
                transition={{
                  duration: LOOP,
                  repeat: Infinity,
                  ease: "easeOut",
                  times: [0, T.flyMid, T.flyMid + 0.02, T.arrive],
                }}
              />
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

/** Athletic customer in a tailored open abaya and close shayla. */
function CustomerFigure({ day }: { day: boolean }) {
  return (
    <svg
      width="52"
      height="108"
      viewBox="0 0 52 108"
      fill="none"
      className="h-[5.6rem] w-auto drop-shadow-[0_3px_8px_rgba(0,0,0,0.14)] sm:h-[6.6rem]"
    >
      <defs>
        <linearGradient id="cSkin" x1="18" y1="8" x2="34" y2="28" gradientUnits="userSpaceOnUse">
          <stop stopColor="#F3D4B8" />
          <stop offset="1" stopColor="#E0B48C" />
        </linearGradient>
        <linearGradient id="cAbaya" x1="10" y1="28" x2="42" y2="104" gradientUnits="userSpaceOnUse">
          <stop stopColor="#2C2824" />
          <stop offset="1" stopColor="#12100E" />
        </linearGradient>
        <linearGradient id="cInner" x1="18" y1="32" x2="34" y2="96" gradientUnits="userSpaceOnUse">
          <stop stopColor="#6E7F72" />
          <stop offset="1" stopColor="#3E4E44" />
        </linearGradient>
      </defs>
      {/* Inner column dress — athletic line */}
      <path d="M20 36c1-2 4-3.2 6-3.2s5 1.2 6 3.2l2.2 58H17.8L20 36Z" fill="url(#cInner)" />
      {/* Open tailored abaya, cinched at the waist */}
      <path
        d="M14 34c2-6 6-8 12-8s10 2 12 8l6 62c.4 4-2 7-8 8-4 .6-10 .6-14 0-6-1-8.4-4-8-8l0-62Z"
        fill="url(#cAbaya)"
      />
      <path d="M18.5 36c1.2 16 1.6 36 1 58" stroke="#12100E" strokeWidth="5.5" strokeLinecap="round" />
      <path
        d="M16.5 33.5c4-2 8-3 9.5-3s5.5 1 9.5 3"
        stroke="#C4A882"
        strokeWidth="1.15"
        fill="none"
        strokeLinecap="round"
      />
      <path d="M21 48h10" stroke="#C4A882" strokeWidth="1.05" strokeLinecap="round" />
      <path d="M26 33v22" stroke="#C4A882" strokeWidth="0.7" strokeOpacity="0.8" />
      {/* Long athletic arms */}
      <path d="M15 36c-4 8-5 16-3 22" stroke="url(#cSkin)" strokeWidth="2.6" strokeLinecap="round" />
      <path d="M37 36c4 7 5 14 3.2 20" stroke="url(#cSkin)" strokeWidth="2.6" strokeLinecap="round" />
      <ellipse cx="19" cy="102" rx="3.2" ry="1.5" fill={day ? "#141210" : "#0C0A08"} />
      <ellipse cx="33" cy="102" rx="3.2" ry="1.5" fill={day ? "#141210" : "#0C0A08"} />
      {/* Close modern shayla — covers hair, leaves the jawline */}
      <path
        d="M16 16c.6-8 5-12 10-12s9.4 4 10 12c-.4 2-1.2 4-2 5.5-1.6-3.2-4-5-8-5s-6.4 1.8-8 5c-.8-1.5-1.6-3.5-2-5.5Z"
        fill="#1C1916"
      />
      <path d="M15.5 18c1 6 2 12 2.2 16 2-4 4.2-6.5 8.3-6.5s6.3 2.5 8.3 6.5c.2-4 1.2-10 2.2-16-2.2-1.6-5-2.4-10.5-2.4S17.7 16.4 15.5 18Z" fill="#241F1B" />
      <path d="M18 15.5c2.2-2.2 5-3.2 8-3.2s5.8 1 8 3.2" stroke="#C4A882" strokeWidth="0.75" fill="none" />
      <ellipse cx="26" cy="18.5" rx="6.2" ry="7" fill="url(#cSkin)" />
      <ellipse cx="23.6" cy="18.2" rx="0.85" ry="1" fill="#1A1A18" />
      <ellipse cx="28.4" cy="18.2" rx="0.85" ry="1" fill="#1A1A18" />
      <path d="M23.8 21.6c.9 1 3.4 1 4.3 0" stroke="#C48A72" strokeWidth="0.8" strokeLinecap="round" />
      <path d="M24.2 24.6h3.6v3.2c0 .7-.8 1.2-1.8 1.2s-1.8-.5-1.8-1.2v-3.2Z" fill="url(#cSkin)" />
    </svg>
  );
}

/** Seated agent — athletic posture, tailored black abaya and close shayla. */
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

      {/* Fitted black abaya — shoulders in, waist marked, long line */}
      <path
        d="M28 32c1-4 5.5-6.5 13-6.5s12 2.5 13 6.5l5 28c1 5-1 9-7 11-4 1.2-12 1.4-16 .2-6-1.6-9-5.5-8-10.5L28 32Z"
        fill="url(#aAbaya)"
      />
      <path d="M33 34c.4 10 .6 22 .2 34" stroke="#C4A882" strokeWidth="0.75" strokeOpacity="0.75" />
      <path d="M49 34c-.4 10-.6 22-.2 34" stroke="#C4A882" strokeWidth="0.75" strokeOpacity="0.55" />
      <path
        d="M34 31.5c2.4-1.5 5.2-2.2 7-2.2s4.6.7 7 2.2"
        stroke="#C4A882"
        strokeWidth="1.15"
        strokeLinecap="round"
        fill="none"
      />
      <path d="M36 44h10" stroke="#C4A882" strokeWidth="1" strokeLinecap="round" />
      <ellipse cx="35" cy="86" rx="3.4" ry="1.5" fill="#0A0A0A" />
      <ellipse cx="47" cy="86" rx="3.4" ry="1.5" fill="#0A0A0A" />

      {/* Shayla wrapped close, hair covered, face open */}
      <path
        d="M29 16c.4-8 5.2-12 12-12s11.6 4 12 12c-.3 2.2-1 4.2-1.8 6-1.8-3.4-4.4-5.2-10.2-5.2s-8.4 1.8-10.2 5.2c-.8-1.8-1.5-3.8-1.8-6Z"
        fill="url(#aShayla)"
      />
      <path
        d="M28 19c1.2 7 2.2 14 2.4 20 2.2-5 4.6-8 9.6-8s7.4 3 9.6 8c.2-6 1.2-13 2.4-20-2.6-1.8-6-2.8-12-2.8S30.6 17.2 28 19Z"
        fill="url(#aShayla)"
      />
      <path
        d="M31 16c2.2-2.4 5.4-3.4 10-3.4s7.8 1 10 3.4"
        stroke="#C4A882"
        strokeWidth="0.75"
        fill="none"
      />

      <ellipse cx="41" cy="18.2" rx="6.4" ry="7.2" fill="url(#aSkin)" />
      <ellipse cx="38.4" cy="17.8" rx="0.9" ry="1.05" fill="#1A1A18" />
      <ellipse cx="43.6" cy="17.8" rx="0.9" ry="1.05" fill="#1A1A18" />
      <path
        d="M38.6 21c.9 1.1 3.6 1.1 4.6 0"
        stroke="#C48A72"
        strokeWidth="0.85"
        strokeLinecap="round"
      />
      <path d="M39.4 24.8h3.4v2.8c0 .6-.7 1.1-1.7 1.1s-1.7-.5-1.7-1.1v-2.8Z" fill="url(#aSkin)" />
      <path d="M30 36c-5 5-7 12-5.5 18" stroke="url(#aAbaya)" strokeWidth="5" strokeLinecap="round" />
      <path d="M52 36c5 5 7 12 5.5 18" stroke="url(#aAbaya)" strokeWidth="5" strokeLinecap="round" />
      <path d="M26 52c3.2 1.4 7 2 10 1.2" stroke="url(#aSkin)" strokeWidth="2.4" strokeLinecap="round" />
      <path d="M56 52c-3.2 1.4-7 2-10 1.2" stroke="url(#aSkin)" strokeWidth="2.4" strokeLinecap="round" />
    </svg>
  );
}
