"use client";

import { useEffect, useState } from "react";
import { Toaster } from "react-hot-toast";

const TOAST_STYLE = {
  fontFamily: "var(--font-body)",
  fontSize: "12px",
  letterSpacing: "0.24em",
  textTransform: "uppercase" as const,
  borderRadius: "8px",
  padding: "12px 18px",
  boxShadow: "0 4px 12px rgba(0,0,0,0.06)",
  maxWidth: "min(360px, calc(100vw - 24px))",
};

export default function AppToaster() {
  const [isMobile, setIsMobile] = useState(true);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 1023px)");
    const update = () => setIsMobile(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  return (
    <Toaster
      position={isMobile ? "top-center" : "top-right"}
      containerStyle={{
        top: isMobile
          ? "calc(var(--nav-height) + var(--safe-top) + 8px)"
          : "calc(var(--nav-height) + var(--safe-top) + 12px)",
        left: isMobile ? 12 : undefined,
        right: isMobile ? 12 : 16,
        zIndex: 40,
      }}
      toastOptions={{
        style: TOAST_STYLE,
        success: {
          style: {
            ...TOAST_STYLE,
            background: "#f0fdf4",
            color: "#166534",
            border: "1px solid #86efac",
          },
          iconTheme: {
            primary: "#16a34a",
            secondary: "#ffffff",
          },
        },
        error: {
          style: {
            ...TOAST_STYLE,
            background: "#fef2f2",
            color: "#991b1b",
            border: "1px solid #fca5a5",
          },
          iconTheme: {
            primary: "#dc2626",
            secondary: "#ffffff",
          },
        },
      }}
    />
  );
}
