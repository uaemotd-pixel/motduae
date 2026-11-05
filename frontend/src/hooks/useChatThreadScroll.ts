"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type RefObject,
} from "react";

const NEAR_BOTTOM_PX = 120;

/**
 * Tracks whether the chat thread is near the bottom and counts
 * messages that arrived while the user was scrolled up.
 */
export function useChatThreadScroll(
  threadRef: RefObject<HTMLElement | null>,
  messageCount: number,
  opts?: { enabled?: boolean; resetKey?: string | null },
) {
  const enabled = opts?.enabled !== false;
  const [nearBottom, setNearBottom] = useState(true);
  const [unseenCount, setUnseenCount] = useState(0);
  const nearBottomRef = useRef(true);
  const prevCountRef = useRef(messageCount);

  const measure = useCallback(() => {
    const el = threadRef.current;
    if (!el) return true;
    const gap = el.scrollHeight - el.scrollTop - el.clientHeight;
    return gap <= NEAR_BOTTOM_PX;
  }, [threadRef]);

  useEffect(() => {
    nearBottomRef.current = true;
    setNearBottom(true);
    setUnseenCount(0);
    prevCountRef.current = messageCount;
  }, [opts?.resetKey]); // eslint-disable-line react-hooks/exhaustive-deps -- reset on thread switch only

  useEffect(() => {
    if (!enabled) return;
    const el = threadRef.current;
    if (!el) return;

    const onScroll = () => {
      const atBottom = measure();
      nearBottomRef.current = atBottom;
      setNearBottom(atBottom);
      if (atBottom) setUnseenCount(0);
    };

    el.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => el.removeEventListener("scroll", onScroll);
  }, [enabled, threadRef, measure, opts?.resetKey]);

  useEffect(() => {
    if (!enabled) return;
    const prev = prevCountRef.current;
    prevCountRef.current = messageCount;
    if (messageCount <= prev) return;
    if (nearBottomRef.current) {
      setUnseenCount(0);
      return;
    }
    setUnseenCount((n) => n + (messageCount - prev));
  }, [messageCount, enabled]);

  const jumpToLatest = useCallback(
    (scrollFn: (immediate?: boolean) => void) => {
      setUnseenCount(0);
      nearBottomRef.current = true;
      setNearBottom(true);
      scrollFn(false);
    },
    [],
  );

  return {
    nearBottom,
    unseenCount,
    showJump: enabled && (!nearBottom || unseenCount > 0),
    jumpToLatest,
  };
}
