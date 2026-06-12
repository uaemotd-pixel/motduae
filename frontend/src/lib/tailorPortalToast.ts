export const TOAST_BASE = {
    position: "top-right" as const,
    duration: 6000,
    style: {
        fontFamily: "var(--font-body)",
        fontSize: "13px",
        letterSpacing: "0.04em",
        borderRadius: "0",
        padding: "14px 18px",
        maxWidth: "360px",
    },
};

export const SUCCESS_TOAST = {
    ...TOAST_BASE,
    style: {
        ...TOAST_BASE.style,
        background: "#f0fdf4",
        color: "#166534",
        border: "1px solid #86efac",
    },
    iconTheme: { primary: "#16a34a", secondary: "#ffffff" },
};

export const ERROR_TOAST = {
    ...TOAST_BASE,
    style: {
        ...TOAST_BASE.style,
        background: "#fef2f2",
        color: "#991b1b",
        border: "1px solid #fca5a5",
    },
    iconTheme: { primary: "#dc2626", secondary: "#ffffff" },
};
