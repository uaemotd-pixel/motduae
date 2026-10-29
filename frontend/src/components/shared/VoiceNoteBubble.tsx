"use client";

import { useEffect, useRef, useState } from "react";
import { Pause, Play } from "lucide-react";

const BAR_COUNT = 36;
const MIN_BAR = 0.18;

function formatDuration(ms: number) {
  const total = Math.max(0, Math.round(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

/** Fallback shape when decode fails — still looks like a voice strip. */
function fallbackPeaks(count: number) {
  return Array.from({ length: count }, (_, i) => {
    const t = i / Math.max(1, count - 1);
    const wave =
      0.35 +
      0.45 * Math.abs(Math.sin(t * Math.PI * 3.2)) +
      0.2 * Math.abs(Math.sin(t * Math.PI * 7.1));
    return Math.min(1, Math.max(MIN_BAR, wave));
  });
}

async function extractPeaks(dataUrl: string, count: number): Promise<number[]> {
  if (typeof window === "undefined" || !dataUrl) return fallbackPeaks(count);
  try {
    const res = await fetch(dataUrl);
    const raw = await res.arrayBuffer();
    const Ctx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext;
    const ctx = new Ctx();
    const audioBuf = await ctx.decodeAudioData(raw.slice(0));
    await ctx.close();

    const channel = audioBuf.getChannelData(0);
    const block = Math.max(1, Math.floor(channel.length / count));
    const peaks: number[] = [];

    for (let i = 0; i < count; i += 1) {
      let peak = 0;
      const start = i * block;
      const end = Math.min(channel.length, start + block);
      for (let j = start; j < end; j += 1) {
        const v = Math.abs(channel[j] || 0);
        if (v > peak) peak = v;
      }
      // Soften a bit so tiny noise doesn't look flat / spikes don't dominate.
      peaks.push(Math.pow(peak, 0.65));
    }

    const max = Math.max(...peaks, 0.0001);
    return peaks.map((p) =>
      Math.min(1, Math.max(MIN_BAR, MIN_BAR + (1 - MIN_BAR) * (p / max))),
    );
  } catch {
    return fallbackPeaks(count);
  }
}

type VoiceNoteBubbleProps = {
  audio: string;
  durationMs?: number;
  onDark?: boolean;
};

export default function VoiceNoteBubble({
  audio,
  durationMs = 0,
  onDark = false,
}: VoiceNoteBubbleProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaElementAudioSourceNode | null>(null);
  const rafRef = useRef<number | null>(null);
  const peaksRef = useRef<number[]>(fallbackPeaks(BAR_COUNT));

  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [peaks, setPeaks] = useState<number[]>(() => fallbackPeaks(BAR_COUNT));
  const [liveLevels, setLiveLevels] = useState<number[]>(() =>
    Array(BAR_COUNT).fill(0),
  );

  useEffect(() => {
    let cancelled = false;
    peaksRef.current = fallbackPeaks(BAR_COUNT);
    setPeaks(peaksRef.current);
    void extractPeaks(audio, BAR_COUNT).then((next) => {
      if (cancelled) return;
      peaksRef.current = next;
      setPeaks(next);
    });
    return () => {
      cancelled = true;
    };
  }, [audio]);

  useEffect(() => {
    const el = new Audio(audio);
    el.preload = "metadata";
    // data: URLs don't need CORS; only set for remote media.
    if (!audio.startsWith("data:")) {
      el.crossOrigin = "anonymous";
    }
    audioRef.current = el;

    const onTime = () => {
      const dur =
        el.duration && Number.isFinite(el.duration)
          ? el.duration
          : durationMs / 1000;
      setElapsed(el.currentTime * 1000);
      setProgress(dur > 0 ? Math.min(1, el.currentTime / dur) : 0);
    };
    const onEnded = () => {
      setPlaying(false);
      setProgress(0);
      setElapsed(0);
      setLiveLevels(Array(BAR_COUNT).fill(0));
      stopAnalyserLoop();
    };

    el.addEventListener("timeupdate", onTime);
    el.addEventListener("ended", onEnded);
    return () => {
      stopAnalyserLoop();
      el.pause();
      el.removeEventListener("timeupdate", onTime);
      el.removeEventListener("ended", onEnded);
      try {
        sourceRef.current?.disconnect();
      } catch {
        /* ignore */
      }
      sourceRef.current = null;
      analyserRef.current = null;
      void audioCtxRef.current?.close().catch(() => undefined);
      audioCtxRef.current = null;
      audioRef.current = null;
    };
  }, [audio, durationMs]);

  const stopAnalyserLoop = () => {
    if (rafRef.current != null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  };

  const ensureAnalyser = async () => {
    const el = audioRef.current;
    if (!el) return null;

    const Ctx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext;

    if (!audioCtxRef.current) {
      audioCtxRef.current = new Ctx();
    }
    const ctx = audioCtxRef.current;
    if (ctx.state === "suspended") {
      await ctx.resume();
    }

    // MediaElementSource can only be created once per element.
    if (!sourceRef.current) {
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 128;
      analyser.smoothingTimeConstant = 0.72;
      const source = ctx.createMediaElementSource(el);
      source.connect(analyser);
      analyser.connect(ctx.destination);
      analyserRef.current = analyser;
      sourceRef.current = source;
    }

    return analyserRef.current;
  };

  const startAnalyserLoop = () => {
    stopAnalyserLoop();
    const tick = () => {
      const analyser = analyserRef.current;
      if (!analyser) return;

      const bins = analyser.frequencyBinCount;
      const data = new Uint8Array(bins);
      analyser.getByteFrequencyData(data);

      const next = new Array<number>(BAR_COUNT);
      for (let i = 0; i < BAR_COUNT; i += 1) {
        // Bias toward lower/mid bins — voice energy lives there.
        const idx = Math.min(
          bins - 1,
          Math.floor((i / BAR_COUNT) * bins * 0.55),
        );
        const neighbors = [
          data[idx] || 0,
          data[Math.min(bins - 1, idx + 1)] || 0,
          data[Math.max(0, idx - 1)] || 0,
        ];
        const avg = (neighbors[0] + neighbors[1] + neighbors[2]) / 3 / 255;
        next[i] = Math.min(1, Math.pow(avg, 0.85));
      }
      setLiveLevels(next);
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
  };

  const toggle = () => {
    const el = audioRef.current;
    if (!el) return;
    if (playing) {
      el.pause();
      setPlaying(false);
      stopAnalyserLoop();
      setLiveLevels(Array(BAR_COUNT).fill(0));
      return;
    }
    void (async () => {
      try {
        await ensureAnalyser();
        await el.play();
        setPlaying(true);
        startAnalyserLoop();
      } catch {
        setPlaying(false);
        stopAnalyserLoop();
      }
    })();
  };

  const displayMs = playing || progress > 0 ? elapsed : durationMs;
  const btn = onDark
    ? "bg-white text-black hover:bg-white/90"
    : "bg-black text-white hover:bg-[#1a1a1a]";
  const meta = onDark ? "text-white/70" : "text-[#667781]";
  const barPlayed = onDark ? "bg-white" : "bg-[#111B21]";
  const barRest = onDark ? "bg-white/35" : "bg-[#111B21]/35";

  return (
    <div className="flex min-w-[200px] max-w-[260px] items-center gap-2.5 py-0.5 pe-1">
      <button
        type="button"
        onClick={toggle}
        aria-label={playing ? "Pause voice note" : "Play voice note"}
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition hover:cursor-pointer ${btn}`}
      >
        {playing ? (
          <Pause className="h-4 w-4" strokeWidth={2} fill="currentColor" />
        ) : (
          <Play
            className="h-4 w-4 translate-x-[1px]"
            strokeWidth={2}
            fill="currentColor"
          />
        )}
      </button>
      <div className="min-w-0 flex-1">
        <div
          className="flex h-7 w-full items-center gap-[2px]"
          aria-hidden
        >
          {peaks.map((peak, i) => {
            const played = i / BAR_COUNT <= progress;
            const live = liveLevels[i] || 0;
            // Static envelope from the recording, boosted by live frequency while playing.
            const height = playing
              ? Math.min(
                  1,
                  Math.max(
                    MIN_BAR,
                    peak * (0.45 + 0.55 * live) + live * 0.35,
                  ),
                )
              : peak;
            return (
              <span
                key={i}
                className={`w-[2.5px] shrink-0 self-center rounded-full transition-[height,background-color] duration-75 ${
                  played ? barPlayed : barRest
                }`}
                style={{ height: `${Math.max(3, Math.round(height * 28))}px` }}
              />
            );
          })}
        </div>
        <p
          className={`mt-0.5 [font-family:var(--font-ui)] text-[10px] tabular-nums ${meta}`}
        >
          {formatDuration(displayMs)}
        </p>
      </div>
    </div>
  );
}
