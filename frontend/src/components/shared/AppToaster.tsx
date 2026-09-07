"use client";

import { useEffect, useState, type CSSProperties } from "react";
import {
  Toaster,
  ToastBar,
  resolveValue,
  type Toast,
} from "react-hot-toast";

const TOAST_STYLE: CSSProperties = {
  fontFamily: "var(--font-body)",
  fontSize: "13px",
  letterSpacing: "0.02em",
  textTransform: "none",
  borderRadius: "8px",
  padding: "12px 16px",
  boxShadow: "0 4px 12px rgba(0,0,0,0.06)",
  maxWidth: "min(360px, calc(100vw - 24px))",
  width: "fit-content",
  display: "flex",
  alignItems: "center",
};

const SUCCESS_STYLE: CSSProperties = {
  ...TOAST_STYLE,
  background: "#f0fdf4",
  color: "#166534",
  border: "1px solid #86efac",
};

const ERROR_STYLE: CSSProperties = {
  ...TOAST_STYLE,
  background: "#fef2f2",
  color: "#991b1b",
  border: "1px solid #fca5a5",
};

/** Short copy stays on one line; longer / multi-line messages may wrap. */
function shouldWrapMessage(toast: Toast): boolean {
  const value = resolveValue(toast.message, toast);
  if (typeof value !== "string") return true;
  if (value.includes("\n")) return true;
  return value.trim().length > 42;
}

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
      containerClassName="motd-toaster"
      containerStyle={{
        // Dashboards (account/admin/fabric/tailor) have no site navbar; offsetting
        // by --nav-height parked toasts too low. Keep a tight safe-area gap only.
        top: isMobile
          ? "calc(var(--safe-top) + 8px)"
          : "calc(var(--safe-top) + 12px)",
        // Avoid setting both left+right — that stretches the toaster and
        // lets flex message nodes shrink/wrap short phrases like "Member removed".
        ...(isMobile
          ? { insetInline: 12 }
          : { insetInlineEnd: 16 }),
        zIndex: 9999,
      }}
      toastOptions={{
        style: TOAST_STYLE,
        success: {
          style: SUCCESS_STYLE,
          iconTheme: { primary: "#16a34a", secondary: "#ffffff" },
        },
        error: {
          style: ERROR_STYLE,
          iconTheme: { primary: "#dc2626", secondary: "#ffffff" },
        },
      }}
    >
      {(t) => (
        <ToastBar toast={t} style={t.style}>
          {({ icon }) => (
            <>
              {icon}
              <div
                {...t.ariaProps}
                className="motd-toast-message"
                style={{
                  margin: "0 8px",
                  color: "inherit",
                  flex: "0 1 auto",
                  lineHeight: 1.35,
                  textTransform: "none",
                  letterSpacing: "0.02em",
                  whiteSpace: shouldWrapMessage(t) ? "normal" : "nowrap",
                  overflowWrap: shouldWrapMessage(t) ? "anywhere" : "normal",
                }}
              >
                {resolveValue(t.message, t)}
              </div>
            </>
          )}
        </ToastBar>
      )}
    </Toaster>
  );
}
