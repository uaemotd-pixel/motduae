"use client";

import { useEffect } from "react";
import { io, type Socket } from "socket.io-client";

let socket: Socket | null = null;

function socketUrl() {
  return (
    process.env.NEXT_PUBLIC_SOCKET_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    "http://localhost:5000"
  );
}

/** Lazy singleton socket — connect explicitly with getSocket().connect(). */
export function getSocket(): Socket {
  if (!socket) {
    socket = io(socketUrl(), {
      path: "/socket.io",
      withCredentials: true,
      autoConnect: false,
      transports: ["websocket", "polling"],
    });
  }
  return socket;
}

export function disconnectSocket() {
  if (!socket) return;
  socket.disconnect();
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
