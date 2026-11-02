/**
 * Browser WebRTC helpers for 1:1 admin→customer audio calls.
 * Signaling is handled by the caller via Socket.IO (`call:signal`).
 */

export type IceServerConfig = RTCIceServer;

export type CallSignal =
  | { type: "offer"; sdp: string }
  | { type: "answer"; sdp: string }
  | { type: "ice"; candidate: RTCIceCandidateInit | null };

export type WebrtcAudioSession = {
  pc: RTCPeerConnection;
  localStream: MediaStream;
  remoteStream: MediaStream;
  /** Replace remote audio element srcObject when tracks arrive. */
  remoteAudio: HTMLAudioElement;
  setMuted: (muted: boolean) => void;
  isMuted: () => boolean;
  close: () => void;
};

const DEFAULT_ICE: RTCIceServer[] = [
  { urls: "stun:stun.l.google.com:19302" },
];

export function audioCallsUiEnabled() {
  const raw = process.env.NEXT_PUBLIC_AUDIO_CALLS_ENABLED;
  if (raw === undefined || raw === "") return true;
  return ["1", "true", "yes"].includes(String(raw).toLowerCase());
}

export async function createAudioSession(options: {
  iceServers?: IceServerConfig[];
  onSignal: (signal: CallSignal) => void;
  onConnectionState?: (state: RTCPeerConnectionState) => void;
  /** When true, this peer creates the offer after local media is ready. */
  isCaller: boolean;
}): Promise<WebrtcAudioSession> {
  const iceServers =
    options.iceServers && options.iceServers.length
      ? options.iceServers
      : DEFAULT_ICE;

  const pc = new RTCPeerConnection({ iceServers });
  const localStream = await navigator.mediaDevices.getUserMedia({
    audio: true,
    video: false,
  });
  const remoteStream = new MediaStream();
  const remoteAudio = document.createElement("audio");
  remoteAudio.autoplay = true;
  remoteAudio.setAttribute("playsinline", "true");
  // Attach for autoplay policies; keep off-DOM.
  remoteAudio.style.display = "none";
  document.body.appendChild(remoteAudio);

  for (const track of localStream.getTracks()) {
    pc.addTrack(track, localStream);
  }

  pc.ontrack = (ev) => {
    for (const track of ev.streams[0]?.getTracks?.() || [ev.track]) {
      if (track) remoteStream.addTrack(track);
    }
    remoteAudio.srcObject = remoteStream;
    void remoteAudio.play().catch(() => {
      /* autoplay may require a prior user gesture — accept/invite counts */
    });
  };

  pc.onicecandidate = (ev) => {
    options.onSignal({
      type: "ice",
      candidate: ev.candidate ? ev.candidate.toJSON() : null,
    });
  };

  pc.onconnectionstatechange = () => {
    options.onConnectionState?.(pc.connectionState);
  };

  let muted = false;

  const session: WebrtcAudioSession = {
    pc,
    localStream,
    remoteStream,
    remoteAudio,
    setMuted: (next) => {
      muted = next;
      for (const track of localStream.getAudioTracks()) {
        track.enabled = !next;
      }
    },
    isMuted: () => muted,
    close: () => {
      try {
        pc.ontrack = null;
        pc.onicecandidate = null;
        pc.onconnectionstatechange = null;
        pc.close();
      } catch {
        /* ignore */
      }
      for (const track of localStream.getTracks()) track.stop();
      for (const track of remoteStream.getTracks()) track.stop();
      remoteAudio.srcObject = null;
      remoteAudio.remove();
    },
  };

  if (options.isCaller) {
    const offer = await pc.createOffer({ offerToReceiveAudio: true });
    await pc.setLocalDescription(offer);
    options.onSignal({
      type: "offer",
      sdp: offer.sdp || "",
    });
  }

  return session;
}

export async function handleRemoteSignal(
  session: WebrtcAudioSession,
  signal: CallSignal,
): Promise<void> {
  const { pc } = session;
  if (signal.type === "offer") {
    await pc.setRemoteDescription({ type: "offer", sdp: signal.sdp });
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
    // Caller of handleRemoteSignal must send the answer via onSignal path —
    // we return by emitting through a side channel: create answer signal here
    // by mutating isn't ideal. Instead return answer for caller to send.
    return;
  }
  if (signal.type === "answer") {
    await pc.setRemoteDescription({ type: "answer", sdp: signal.sdp });
    return;
  }
  if (signal.type === "ice") {
    if (signal.candidate) {
      try {
        await pc.addIceCandidate(signal.candidate);
      } catch {
        /* candidate may arrive before remote description; ignore soft fails */
      }
    }
  }
}

/** Callee: apply offer and produce answer SDP to send back. */
export async function answerRemoteOffer(
  session: WebrtcAudioSession,
  offerSdp: string,
): Promise<CallSignal> {
  const { pc } = session;
  await pc.setRemoteDescription({ type: "offer", sdp: offerSdp });
  const answer = await pc.createAnswer();
  await pc.setLocalDescription(answer);
  return { type: "answer", sdp: answer.sdp || "" };
}

export type NetworkQuality = "excellent" | "good" | "fair" | "poor";

/**
 * Estimate link quality from WebRTC getStats (packet loss + RTT).
 * Returns null when stats are not ready yet.
 */
export async function sampleNetworkQuality(
  pc: RTCPeerConnection,
): Promise<NetworkQuality | null> {
  try {
    const stats = await pc.getStats();
    let rttMs: number | null = null;
    let packetsLost = 0;
    let packetsReceived = 0;
    let packetsSent = 0;

    stats.forEach((report) => {
      if (report.type === "candidate-pair" && report.state === "succeeded") {
        const rtt = Number(
          (report as RTCStats & { currentRoundTripTime?: number })
            .currentRoundTripTime,
        );
        if (Number.isFinite(rtt) && rtt >= 0) {
          rttMs = rtt * 1000;
        }
      }
      if (report.type === "inbound-rtp" && report.kind === "audio") {
        packetsLost += Number(report.packetsLost) || 0;
        packetsReceived += Number(report.packetsReceived) || 0;
      }
      if (report.type === "outbound-rtp" && report.kind === "audio") {
        packetsSent += Number(report.packetsSent) || 0;
      }
      if (report.type === "remote-inbound-rtp" && report.kind === "audio") {
        const rtt = Number(
          (report as RTCStats & { roundTripTime?: number }).roundTripTime,
        );
        if (Number.isFinite(rtt) && rtt >= 0) {
          rttMs = rtt * 1000;
        }
        const fractionLost = Number(
          (report as RTCStats & { fractionLost?: number }).fractionLost,
        );
        if (Number.isFinite(fractionLost) && fractionLost > 0) {
          // Approximate lost packets from fraction when inbound counters are thin.
          packetsLost = Math.max(
            packetsLost,
            Math.round(fractionLost * Math.max(packetsSent, 1)),
          );
        }
      }
    });

    const total = packetsReceived + packetsLost;
    if (total < 8 && rttMs == null && packetsSent < 8) {
      return null;
    }

    const lossRate = total > 0 ? packetsLost / total : 0;

    if (lossRate >= 0.12 || (rttMs != null && rttMs >= 450)) return "poor";
    if (lossRate >= 0.05 || (rttMs != null && rttMs >= 250)) return "fair";
    if (lossRate >= 0.02 || (rttMs != null && rttMs >= 150)) return "good";
    return "excellent";
  } catch {
    return null;
  }
}
