"use client";

import { useEffect } from "react";
import { io, type Socket } from "socket.io-client";
import { getSocketOrigin } from "@/lib/publicApiBase";

type MotdSocket = Socket & {
  __supportChatEffect?: symbol;
  __notifyHost?: boolean;
};

let socket: MotdSocket | null = null;

/** Lazy singleton socket — connect explicitly with getSocket().connect(). */
export function getSocket(): MotdSocket {
  if (!socket) {
    const url = getSocketOrigin();
    socket = io(url || undefined, {
      path: "/socket.io",
      withCredentials: true,
      autoConnect: false,
      transports: ["websocket", "polling"],
      // Survive brief proxy blips on Lightsail / Cloudflare.
      reconnection: true,
      reconnectionAttempts: 12,
      reconnectionDelay: 800,
    }) as MotdSocket;
  }
  return socket;
}

export function disconnectSocket() {
  if (!socket) return;
  socket.disconnect();
}

/** Keep the shared socket up for message popups across admin/fabric pages. */
export function setSocketNotifyHost(active: boolean) {
  const s = getSocket();
  s.__notifyHost = active;
}

/** Leave Live Chat without killing the notify-host connection. */
export function releaseSupportChatSocket(effectId: symbol) {
  const s = getSocket();
  if (s.__supportChatEffect !== effectId) return;
  s.__supportChatEffect = undefined;
  try {
    if (s.connected) s.emit("staff:unsubscribe-inbox");
  } catch {
    /* ignore */
  }
  if (!s.__notifyHost) {
    s.disconnect();
  }
}

function waitUntilConnected(s: Socket, timeoutMs: number): Promise<void> {
  if (s.connected) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const timer = window.setTimeout(() => {
      cleanup();
      reject(new Error("Socket connect timeout"));
    }, timeoutMs);

    const onConnect = () => {
      cleanup();
      resolve();
    };
    const onError = (err: Error) => {
      cleanup();
      reject(err);
    };
    const cleanup = () => {
      window.clearTimeout(timer);
      s.off("connect", onConnect);
      s.off("connect_error", onError);
    };

    s.once("connect", onConnect);
    s.once("connect_error", onError);
    if (!s.active) s.connect();
  });
}

export async function emitWithAck<T = unknown>(
  event: string,
  payload?: unknown,
  timeoutMs = 10000,
): Promise<T> {
  const s = getSocket();
  await waitUntilConnected(s, Math.min(timeoutMs, 8000));

  return new Promise<T>((resolve, reject) => {
    s.timeout(timeoutMs).emit(
      event,
      payload ?? {},
      (err: Error | null, res: T) => {
        if (err) {
          reject(err);
          return;
        }
        resolve(res);
      },
    );
  });
}

export function useSocketEvent<TArgs extends unknown[]>(
  event: string,
  handler: (...args: TArgs) => void,
) {
  useEffect(() => {
    const s = getSocket();
    const listener = (...args: TArgs) => handler(...args);
    s.on(event, listener as (...args: unknown[]) => void);
    return () => {
      s.off(event, listener as (...args: unknown[]) => void);
    };
  }, [event, handler]);
}
