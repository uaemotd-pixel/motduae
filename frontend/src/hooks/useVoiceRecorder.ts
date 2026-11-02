"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type VoiceRecording = {
  audio: string;
  durationMs: number;
  mimeType: string;
};

const MAX_MS = 60_000;

function pickMimeType() {
  if (typeof MediaRecorder === "undefined") return "";
  const candidates = [
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/mp4",
    "audio/ogg;codecs=opus",
  ];
  return candidates.find((t) => MediaRecorder.isTypeSupported(t)) || "";
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(reader.error || new Error("read_failed"));
    reader.readAsDataURL(blob);
  });
}

export function formatRecordingTime(ms: number) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function useVoiceRecorder() {
  const [recording, setRecording] = useState(false);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [error, setError] = useState("");
  const [supported, setSupported] = useState(true);

  const mediaRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const startedAtRef = useRef(0);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const maxTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const stopResolverRef = useRef<((value: VoiceRecording | null) => void) | null>(
    null,
  );

  const cleanupStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    mediaRef.current = null;
    chunksRef.current = [];
    if (tickRef.current) {
      clearInterval(tickRef.current);
      tickRef.current = null;
    }
    if (maxTimerRef.current) {
      clearTimeout(maxTimerRef.current);
      maxTimerRef.current = null;
    }
  }, []);

  useEffect(() => {
    setSupported(
      typeof window !== "undefined" &&
        typeof navigator !== "undefined" &&
        !!navigator.mediaDevices?.getUserMedia &&
        typeof MediaRecorder !== "undefined",
    );
    return () => {
      cleanupStream();
      stopResolverRef.current?.(null);
      stopResolverRef.current = null;
    };
  }, [cleanupStream]);

  const start = useCallback(async (): Promise<"ok" | "unsupported" | "mic_denied" | "busy"> => {
    if (!supported) return "unsupported";
    if (recording) return "busy";
    setError("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mimeType = pickMimeType();
      const recorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream);
      mediaRef.current = recorder;
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        const resolve = stopResolverRef.current;
        stopResolverRef.current = null;
        const durationMs = Math.min(
          MAX_MS,
          Date.now() - startedAtRef.current,
        );
        const type = recorder.mimeType || mimeType || "audio/webm";
        const blob = new Blob(chunksRef.current, { type });
        cleanupStream();
        setRecording(false);
        setElapsedMs(0);

        if (!resolve) return;
        if (blob.size < 200 || durationMs < 400) {
          resolve(null);
          return;
        }
        void blobToDataUrl(blob)
          .then((audio) => resolve({ audio, durationMs, mimeType: type }))
          .catch(() => resolve(null));
      };

      startedAtRef.current = Date.now();
      recorder.start(250);
      setRecording(true);
      setElapsedMs(0);
      tickRef.current = setInterval(() => {
        setElapsedMs(Date.now() - startedAtRef.current);
      }, 200);
      maxTimerRef.current = setTimeout(() => {
        if (mediaRef.current?.state === "recording") {
          mediaRef.current.stop();
        }
      }, MAX_MS);
      return "ok";
    } catch {
      cleanupStream();
      setRecording(false);
      setError("mic_denied");
      return "mic_denied";
    }
  }, [cleanupStream, recording, supported]);

  const stop = useCallback(() => {
    return new Promise<VoiceRecording | null>((resolve) => {
      const recorder = mediaRef.current;
      if (!recorder || recorder.state === "inactive") {
        cleanupStream();
        setRecording(false);
        resolve(null);
        return;
      }
      stopResolverRef.current = resolve;
      try {
        recorder.stop();
      } catch {
        cleanupStream();
        setRecording(false);
        resolve(null);
      }
    });
  }, [cleanupStream]);

  const cancel = useCallback(() => {
    stopResolverRef.current = null;
    const recorder = mediaRef.current;
    if (recorder && recorder.state !== "inactive") {
      try {
        recorder.onstop = null;
        recorder.stop();
      } catch {
        /* ignore */
      }
    }
    cleanupStream();
    setRecording(false);
    setElapsedMs(0);
  }, [cleanupStream]);

  return {
    supported,
    recording,
    elapsedMs,
    error,
    start,
    stop,
    cancel,
  };
}
