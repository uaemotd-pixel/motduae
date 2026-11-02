/**
 * Continuous soft call ringtone / ringback (Web Audio synthesis).
 * Steady looping motif — no long dead gaps. Original; not a copyrighted asset.
 */

type RingtoneHandle = {
  stop: () => void;
};

let sharedCtx: AudioContext | null = null;

function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const AC =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext })
      .webkitAudioContext;
  if (!AC) return null;
  if (!sharedCtx || sharedCtx.state === "closed") {
    sharedCtx = new AC();
  }
  return sharedCtx;
}

/** Soft rounded tone with short overlap-friendly decay. */
function note(
  ctx: AudioContext,
  dest: AudioNode,
  time: number,
  freq: number,
  gain: number,
  duration: number,
) {
  const osc = ctx.createOscillator();
  const harm = ctx.createOscillator();
  const g = ctx.createGain();
  const filter = ctx.createBiquadFilter();

  osc.type = "sine";
  harm.type = "triangle";
  osc.frequency.setValueAtTime(freq, time);
  harm.frequency.setValueAtTime(freq * 2.003, time);

  filter.type = "lowpass";
  filter.frequency.setValueAtTime(2400, time);
  filter.Q.setValueAtTime(0.5, time);

  const harmGain = ctx.createGain();
  harmGain.gain.setValueAtTime(0.28, time);

  const attack = 0.025;
  const release = Math.max(0.12, duration * 0.45);
  g.gain.setValueAtTime(0.0001, time);
  g.gain.exponentialRampToValueAtTime(gain, time + attack);
  g.gain.setValueAtTime(gain, time + duration - release);
  g.gain.exponentialRampToValueAtTime(0.0001, time + duration);

  osc.connect(filter);
  harm.connect(harmGain);
  harmGain.connect(filter);
  filter.connect(g);
  g.connect(dest);

  const stopAt = time + duration + 0.02;
  osc.start(time);
  harm.start(time);
  osc.stop(stopAt);
  harm.stop(stopAt);
}

/**
 * Continuous 8-note loop (even spacing) — keeps ringing without empty pauses.
 */
function scheduleIncomingLoop(
  ctx: AudioContext,
  dest: AudioNode,
  start: number,
) {
  // Smooth rising–falling figure, ~1.6s, immediately repeats
  const step = 0.2;
  const freqs = [
    523.25, // C5
    587.33, // D5
    659.25, // E5
    698.46, // F5
    783.99, // G5
    698.46, // F5
    659.25, // E5
    587.33, // D5
  ];
  freqs.forEach((f, i) => {
    const t = start + i * step;
    note(ctx, dest, t, f, 0.16 + (i % 4 === 0 ? 0.03 : 0), 0.34);
    // Light chord under every other note for body
    if (i % 2 === 0) {
      note(ctx, dest, t + 0.01, f * 0.5, 0.06, 0.38);
    }
  });
}

/** Outbound: continuous gentle pulse pairs. */
function scheduleOutgoingLoop(
  ctx: AudioContext,
  dest: AudioNode,
  start: number,
) {
  const step = 0.28;
  for (let i = 0; i < 6; i += 1) {
    const t = start + i * step;
    note(ctx, dest, t, 523.25, 0.1, 0.3);
    note(ctx, dest, t + 0.05, 659.25, 0.09, 0.32);
  }
}

/**
 * Start continuous looping ringtone.
 * `kind: "in"` = incoming; `"out"` = softer calling tone.
 */
export function startCallRingtone(
  kind: "in" | "out" = "in",
): RingtoneHandle {
  const ctx = getCtx();
  if (!ctx) {
    return { stop: () => undefined };
  }

  let stopped = false;
  let loopTimer: ReturnType<typeof setTimeout> | null = null;
  const master = ctx.createGain();
  master.gain.value = kind === "in" ? 0.55 : 0.3;
  master.connect(ctx.destination);

  // Loop length matches phrase so audio feels continuous
  const phraseMs = kind === "in" ? 1600 : 1680;

  const arm = () => {
    if (stopped) return;
    void ctx.resume().catch(() => undefined);
    const t0 = ctx.currentTime + 0.01;
    if (kind === "in") {
      scheduleIncomingLoop(ctx, master, t0);
    } else {
      scheduleOutgoingLoop(ctx, master, t0);
    }
    loopTimer = setTimeout(arm, phraseMs);
  };

  arm();

  return {
    stop: () => {
      if (stopped) return;
      stopped = true;
      if (loopTimer) clearTimeout(loopTimer);
      loopTimer = null;
      try {
        master.gain.setTargetAtTime(0.0001, ctx.currentTime, 0.04);
        setTimeout(() => {
          try {
            master.disconnect();
          } catch {
            /* ignore */
          }
        }, 150);
      } catch {
        try {
          master.disconnect();
        } catch {
          /* ignore */
        }
      }
    },
  };
}
