"use client";

import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import {
  ChevronDown,
  Mic,
  MicOff,
  Phone,
  PhoneOff,
} from "lucide-react";
import ChatAvatar from "@/components/shared/ChatAvatar";
import type { AudioCallUiStatus } from "@/hooks/useAudioCall";
import type { NetworkQuality } from "@/lib/realtime/webrtcAudioCall";

type AudioCallOverlayProps = {
  role: "agent" | "customer";
  status: AudioCallUiStatus;
  error: string | null;
  muted: boolean;
  elapsedLabel: string;
  networkQuality?: NetworkQuality | null;
  peerName?: string;
  peerAvatarSrc?: string | null;
  /** Show MOTD brand mark when no peer photo (customer calling support). */
  peerBrand?: boolean;
  isAr?: boolean;
  /**
   * `viewport` = fixed fullscreen (customer on site);
   * `panel` = inside chat pane;
   * `dashboard` = admin main canvas (beside sidebar).
   */
  placement?: "panel" | "viewport" | "dashboard";
  /**
   * Force the top call header (e.g. agent opened another inbox chat).
   * Tap expands the call UI and runs `onReturnToCall`.
   */
  forceMinimized?: boolean;
  /** Called when expanding from the call header (navigate back to call thread). */
  onReturnToCall?: () => void;
  onAccept?: () => void;
  onReject?: () => void;
  onHangup: () => void;
  onToggleMute: () => void;
  onDismissError?: () => void;
};

function networkQualityMeta(q: NetworkQuality, isAr: boolean) {
  switch (q) {
    case "excellent":
      return {
        bars: 4,
        color: "bg-[#25D366]",
        label: isAr ? "ممتاز" : "Excellent",
      };
    case "good":
      return {
        bars: 3,
        color: "bg-[#25D366]",
        label: isAr ? "جيد" : "Good",
      };
    case "fair":
      return {
        bars: 2,
        color: "bg-[#F5A623]",
        label: isAr ? "متوسط" : "Fair",
      };
    case "poor":
      return {
        bars: 1,
        color: "bg-[#F15C6D]",
        label: isAr ? "ضعيف" : "Poor",
      };
  }
}

function NetworkQualityIndicator({
  quality,
  isAr,
}: {
  quality: NetworkQuality;
  isAr: boolean;
}) {
  const meta = networkQualityMeta(quality, isAr);
  const heights = ["h-1.5", "h-2.5", "h-3.5", "h-4.5"];
  return (
    <div
      className="mt-3 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5"
      title={meta.label}
      aria-label={
        isAr ? `جودة الشبكة: ${meta.label}` : `Network quality: ${meta.label}`
      }
    >
      <span className="flex items-end gap-0.5" aria-hidden>
        {heights.map((h, i) => (
          <span
            key={h}
            className={`w-1 rounded-sm ${h} ${
              i < meta.bars ? meta.color : "bg-white/20"
            }`}
          />
        ))}
      </span>
      <span className="text-[11px] text-white/70 [font-family:var(--font-body)]">
        {meta.label}
      </span>
    </div>
  );
}

function errorCopy(code: string | null, isAr: boolean) {
  switch (code) {
    case "mic_denied":
      return isAr
        ? "يرجى السماح بالوصول إلى الميكروفون."
        : "Please allow microphone access.";
    case "missed":
      return isAr ? "لم يتم الرد على المكالمة." : "No answer.";
    case "rejected":
      return isAr ? "رفض العميل المكالمة." : "Customer declined the call.";
    case "customer_offline":
      return isAr ? "العميل غير متصل." : "Customer is offline.";
    case "busy":
      return isAr ? "هناك مكالمة جارية." : "A call is already in progress.";
    case "session_not_active":
      return isAr
        ? "المكالمة متاحة للمحادثات النشطة فقط."
        : "Calls are only available on active chats.";
    case "disabled":
      return isAr ? "المكالمات الصوتية غير مفعّلة." : "Audio calls are disabled.";
    case "forbidden":
      return isAr ? "غير مسموح." : "Not allowed.";
    case "invite_failed":
    case "accept_failed":
    case "media_failed":
    case "connection_failed":
    case "signal_failed":
      return isAr
        ? "تعذر إتمام المكالمة. حاولي مرة أخرى."
        : "Could not complete the call. Try again.";
    default:
      return isAr ? "حدث خطأ في المكالمة." : "Call error.";
  }
}

function statusLine(
  status: AudioCallUiStatus,
  elapsedLabel: string,
  isAr: boolean,
) {
  switch (status) {
    case "ringing_in":
      return isAr ? "مكالمة صوتية واردة" : "Incoming voice call";
    case "calling_out":
      return isAr ? "جارٍ الاتصال…" : "Calling…";
    case "ringing_out":
      return isAr ? "يرن…" : "Ringing…";
    case "connecting":
      return isAr ? "جارٍ الاتصال…" : "Connecting…";
    case "active":
      return elapsedLabel;
    case "failed":
      return isAr ? "تعذر الاتصال" : "Call failed";
    default:
      return "";
  }
}

function canMinimize(status: AudioCallUiStatus) {
  return (
    status === "calling_out" ||
    status === "ringing_out" ||
    status === "connecting" ||
    status === "active"
  );
}

export default function AudioCallOverlay({
  role,
  status,
  error,
  muted,
  elapsedLabel,
  networkQuality = null,
  peerName,
  peerAvatarSrc,
  peerBrand = false,
  isAr = false,
  placement = "panel",
  forceMinimized = false,
  onReturnToCall,
  onAccept,
  onReject,
  onHangup,
  onToggleMute,
  onDismissError,
}: AudioCallOverlayProps) {
  const [minimized, setMinimized] = useState(false);
  const [portalReady, setPortalReady] = useState(false);

  useEffect(() => {
    setPortalReady(true);
  }, []);

  // Reset / force expand for incoming ring, failures, and idle.
  useEffect(() => {
    if (
      status === "idle" ||
      status === "ringing_in" ||
      status === "failed" ||
      !canMinimize(status)
    ) {
      setMinimized(false);
    }
  }, [status]);

  // Leaving the call chat → WhatsApp header; back on that chat → full call UI.
  useEffect(() => {
    if (!canMinimize(status)) return;
    if (forceMinimized) {
      setMinimized(true);
    } else {
      setMinimized(false);
    }
  }, [forceMinimized, status]);

  if (status === "idle" && !error) return null;

  const mountInPortal = placement === "viewport" && portalReady;
  const renderLayer = (node: ReactNode) =>
    mountInPortal ? createPortal(node, document.body) : node;

  const displayName =
    peerName ||
    (role === "agent"
      ? isAr
        ? "عميل"
        : "Customer"
      : isAr
        ? "MOTD Care"
        : "MOTD Care");

  const showIncoming = status === "ringing_in" && role === "customer";
  const showOutboundControls =
    status === "calling_out" ||
    status === "ringing_out" ||
    status === "connecting" ||
    status === "active" ||
    status === "failed";
  const isRingingPhase =
    status === "ringing_in" ||
    status === "calling_out" ||
    status === "ringing_out";

  const dashboardShell =
    "fixed inset-y-0 right-0 left-0 z-[200] lg:left-[var(--admin-sidebar-w,0px)]";
  const dashboardHeader =
    "fixed top-0 right-0 left-0 z-[200] lg:left-[var(--admin-sidebar-w,0px)]";

  const shellPos =
    placement === "viewport"
      ? "fixed inset-0 z-[200]"
      : placement === "dashboard"
        ? dashboardShell
        : "absolute inset-0 z-[60]";

  const showCallHeader =
    (minimized || forceMinimized) && canMinimize(status);

  // Error-only sheet (missed / declined) — compact WhatsApp-style toast card
  if (status === "idle" && error) {
    return renderLayer(
      <div
        className={`${shellPos} flex items-end justify-center bg-black/50 p-4 backdrop-blur-[2px] sm:items-center`}
      >
        <div className="w-full max-w-sm overflow-hidden rounded-2xl bg-[#111B21] px-5 py-6 text-center text-white shadow-2xl">
          <p className="text-[15px] [font-family:var(--font-body)]">
            {errorCopy(error, isAr)}
          </p>
          <button
            type="button"
            onClick={onDismissError}
            className="mt-5 rounded-full bg-white px-5 py-2.5 text-[13px] text-black transition hover:bg-white/90 hover:cursor-pointer [font-family:var(--font-body)]"
          >
            {isAr ? "حسناً" : "OK"}
          </button>
        </div>
      </div>,
    );
  }

  // Ongoing-call header — black bar, scoped to chat panel when placement=panel
  if (showCallHeader) {
    const headerStatus =
      status === "active"
        ? elapsedLabel
        : statusLine(status, elapsedLabel, isAr);
    const hint = isAr ? "اضغطي للعودة إلى المكالمة" : "Tap to return to call";
    const headerPos =
      placement === "viewport"
        ? "fixed inset-x-0 top-0 z-[200] pt-[max(0px,var(--safe-top))]"
        : placement === "dashboard"
          ? dashboardHeader
          : "absolute inset-x-0 top-0 z-[80]";

    return renderLayer(
      <div
        className={`pointer-events-auto ${headerPos}`}
        role="status"
        aria-live="polite"
        aria-label={isAr ? "مكالمة جارية" : "Ongoing call"}
      >
        <div className="flex items-center gap-1 bg-[#1A1A1A] px-2 py-2 text-white shadow-[0_4px_18px_rgba(0,0,0,0.28)] sm:px-3">
          <button
            type="button"
            onClick={() => {
              setMinimized(false);
              onReturnToCall?.();
            }}
            className="flex min-w-0 flex-1 items-center gap-2.5 rounded-lg px-1.5 py-1 text-start transition hover:bg-white/10 hover:cursor-pointer"
            aria-label={hint}
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/12">
              <Phone className="h-4 w-4" strokeWidth={2} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[13px] font-medium leading-tight [font-family:var(--font-body)]">
                {displayName}
              </span>
              <span className="mt-0.5 flex items-center gap-1.5 text-[11px] text-white/85 [font-family:var(--font-body)]">
                <span className="h-1.5 w-1.5 shrink-0 animate-pulse rounded-full bg-white" />
                {headerStatus}
                <span className="text-white/55">·</span>
                <span className="truncate text-white/70">{hint}</span>
              </span>
            </span>
          </button>

          <button
            type="button"
            onClick={onToggleMute}
            disabled={status !== "active" && status !== "connecting"}
            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition hover:cursor-pointer active:scale-95 disabled:cursor-not-allowed disabled:opacity-40 ${
              muted
                ? "bg-white text-black"
                : "bg-white/12 text-white hover:bg-white/20"
            }`}
            aria-label={
              muted
                ? isAr
                  ? "إلغاء كتم الصوت"
                  : "Unmute"
                : isAr
                  ? "كتم الصوت"
                  : "Mute"
            }
          >
            {muted ? (
              <MicOff className="h-4 w-4" strokeWidth={1.75} />
            ) : (
              <Mic className="h-4 w-4" strokeWidth={1.75} />
            )}
          </button>

          <button
            type="button"
            onClick={onHangup}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#F15C6D] text-white transition hover:bg-[#E0485A] hover:cursor-pointer active:scale-95"
            aria-label={isAr ? "إنهاء" : "End call"}
          >
            <PhoneOff className="h-4 w-4" strokeWidth={1.75} />
          </button>
        </div>
      </div>,
    );
  }

  return renderLayer(
    <div
      className={`${shellPos} flex flex-col bg-[#0B141A] text-white`}
      role="dialog"
      aria-modal="true"
      aria-label={isAr ? "مكالمة صوتية" : "Voice call"}
    >
      {/* Soft vignette like WhatsApp call screen */}
      <div
        className="pointer-events-none absolute inset-0 opacity-80"
        style={{
          background:
            "radial-gradient(ellipse 80% 55% at 50% 28%, rgba(255,255,255,0.08), transparent 70%), linear-gradient(180deg, #1A1A1A 0%, #0B141A 55%, #000 100%)",
        }}
      />

      <div className="relative z-[1] flex min-h-0 flex-1 flex-col items-center px-6 pb-8 pt-10 sm:pt-14">
        {/* Minimize — WhatsApp chevron */}
        {canMinimize(status) ? (
          <button
            type="button"
            onClick={() => setMinimized(true)}
            className="absolute start-3 top-3 flex h-10 w-10 items-center justify-center rounded-full text-white/70 transition hover:bg-white/10 hover:text-white hover:cursor-pointer sm:start-4 sm:top-4"
            aria-label={isAr ? "تصغير المكالمة" : "Minimize call"}
          >
            <ChevronDown className="h-7 w-7" strokeWidth={1.5} />
          </button>
        ) : null}

        <p className="mb-8 text-[12px] uppercase tracking-[0.2em] text-white/45 [font-family:var(--font-ui)]">
          {isAr ? "مكالمة صوتية" : "Voice call"}
        </p>

        {/* Avatar + pulse rings while ringing */}
        <div className="relative mb-7 flex h-36 w-36 items-center justify-center sm:h-40 sm:w-40">
          {isRingingPhase ? (
            <>
              <span className="absolute inset-0 animate-ping rounded-full bg-white/10 [animation-duration:2.2s]" />
              <span className="absolute inset-3 animate-pulse rounded-full bg-white/5" />
            </>
          ) : null}
          <span className="relative flex h-28 w-28 items-center justify-center overflow-hidden rounded-full ring-2 ring-white/20 sm:h-32 sm:w-32">
            <ChatAvatar
              name={displayName}
              src={peerAvatarSrc}
              brand={peerBrand}
              size="lg"
              className="!h-full !w-full !text-[28px] sm:!text-[32px]"
            />
          </span>
        </div>

        <h2 className="max-w-full truncate px-2 text-center text-[26px] font-light tracking-tight text-white [font-family:var(--font-display)] sm:text-[30px]">
          {displayName}
        </h2>
        <p className="mt-2 text-center text-[15px] text-white/65 [font-family:var(--font-body)]">
          {statusLine(status, elapsedLabel, isAr)}
        </p>

        {status === "active" && networkQuality ? (
          <NetworkQualityIndicator quality={networkQuality} isAr={isAr} />
        ) : null}

        {error && status !== "idle" ? (
          <p className="mt-4 max-w-xs text-center text-[13px] text-[#FF8A80] [font-family:var(--font-body)]">
            {errorCopy(error, isAr)}
          </p>
        ) : null}

        <div className="flex-1" />

        {/* WhatsApp-style bottom actions */}
        {showIncoming ? (
          <div className="flex w-full max-w-sm items-end justify-between gap-6 px-4 pb-2">
            <div className="flex flex-col items-center gap-2.5">
              <button
                type="button"
                onClick={onReject}
                className="flex h-[3.75rem] w-[3.75rem] items-center justify-center rounded-full bg-[#F15C6D] text-white shadow-lg transition hover:bg-[#E0485A] hover:cursor-pointer active:scale-95"
                aria-label={isAr ? "رفض" : "Decline"}
              >
                <PhoneOff className="h-7 w-7" strokeWidth={1.75} />
              </button>
              <span className="text-[12px] text-white/70 [font-family:var(--font-body)]">
                {isAr ? "رفض" : "Decline"}
              </span>
            </div>
            <div className="flex flex-col items-center gap-2.5">
              <button
                type="button"
                onClick={onAccept}
                className="flex h-[3.75rem] w-[3.75rem] items-center justify-center rounded-full bg-[#25D366] text-white shadow-lg transition hover:bg-[#1EBE57] hover:cursor-pointer active:scale-95"
                aria-label={isAr ? "قبول" : "Accept"}
              >
                <Phone className="h-7 w-7" strokeWidth={1.75} />
              </button>
              <span className="text-[12px] text-white/70 [font-family:var(--font-body)]">
                {isAr ? "قبول" : "Accept"}
              </span>
            </div>
          </div>
        ) : null}

        {showOutboundControls ? (
          <div
            className={`flex w-full max-w-sm items-end px-4 pb-2 ${
              canMinimize(status) || status === "failed" || status === "active"
                ? "justify-between gap-6"
                : "justify-center"
            }`}
          >
            {status === "active" ||
            status === "connecting" ||
            status === "failed" ? (
              <div className="flex flex-col items-center gap-2.5">
                <button
                  type="button"
                  onClick={onToggleMute}
                  disabled={status === "connecting"}
                  className={`flex h-14 w-14 items-center justify-center rounded-full transition hover:cursor-pointer active:scale-95 disabled:cursor-not-allowed disabled:opacity-40 ${
                    muted
                      ? "bg-white text-black"
                      : "bg-white/15 text-white hover:bg-white/25"
                  }`}
                  aria-label={
                    muted
                      ? isAr
                        ? "إلغاء كتم الصوت"
                        : "Unmute"
                      : isAr
                        ? "كتم الصوت"
                        : "Mute"
                  }
                >
                  {muted ? (
                    <MicOff className="h-6 w-6" strokeWidth={1.75} />
                  ) : (
                    <Mic className="h-6 w-6" strokeWidth={1.75} />
                  )}
                </button>
                <span className="text-[12px] text-white/70 [font-family:var(--font-body)]">
                  {muted ? (isAr ? "مكتوم" : "Muted") : isAr ? "كتم" : "Mute"}
                </span>
              </div>
            ) : null}

            <div className="flex flex-col items-center gap-2.5">
              <button
                type="button"
                onClick={onHangup}
                className="flex h-[3.75rem] w-[3.75rem] items-center justify-center rounded-full bg-[#F15C6D] text-white shadow-lg transition hover:bg-[#E0485A] hover:cursor-pointer active:scale-95"
                aria-label={
                  status === "calling_out" ||
                  status === "ringing_out" ||
                  status === "connecting"
                    ? isAr
                      ? "إلغاء"
                      : "Cancel"
                    : isAr
                      ? "إنهاء"
                      : "End call"
                }
              >
                <PhoneOff className="h-7 w-7" strokeWidth={1.75} />
              </button>
              <span className="text-[12px] text-white/70 [font-family:var(--font-body)]">
                {status === "calling_out" ||
                status === "ringing_out" ||
                status === "connecting"
                  ? isAr
                    ? "إلغاء"
                    : "Cancel"
                  : isAr
                    ? "إنهاء"
                    : "End"}
              </span>
            </div>

            {canMinimize(status) || status === "failed" ? (
              <div className="flex flex-col items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => setMinimized(true)}
                  disabled={status === "failed"}
                  className="flex h-14 w-14 items-center justify-center rounded-full bg-white/15 text-white transition hover:bg-white/25 hover:cursor-pointer active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
                  aria-label={isAr ? "تصغير" : "Minimize"}
                >
                  <ChevronDown className="h-6 w-6" strokeWidth={1.75} />
                </button>
                <span className="text-[12px] text-white/70 [font-family:var(--font-body)]">
                  {isAr ? "تصغير" : "Minimize"}
                </span>
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>,
  );
}
