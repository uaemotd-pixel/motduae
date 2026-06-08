// components/shared/SuccessModal.tsx
"use client";

import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface SuccessModalProps {
    isOpen: boolean;
    onClose: () => void;
    title?: string;
    message?: string;
    orderId?: string;
    orderName?: string;
    orderItems?: Array<{ name: string; id: string }>;
}

export default function SuccessModal({
    isOpen,
    onClose,
    title = "Order Placed Successfully!",
    message = "Your order has been confirmed.",
    orderId,
    orderName,
    orderItems,
}: SuccessModalProps) {
    // Close on Escape key
    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === "Escape" && isOpen) onClose();
        };
        window.addEventListener("keydown", handleEscape);
        return () => window.removeEventListener("keydown", handleEscape);
    }, [isOpen, onClose]);

    // Prevent body scroll when modal is open
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = "hidden";
        } else {
            document.body.style.overflow = "unset";
        }
        return () => {
            document.body.style.overflow = "unset";
        };
    }, [isOpen]);

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop overlay */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="fixed inset-0 bg-black/50 z-50"
                        onClick={onClose}
                    />
                    {/* Modal container */}
                    <div className="fixed inset-0 flex items-center justify-center z-50 pointer-events-none">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                            transition={{ duration: 0.25, ease: "easeOut" }}
                            className="pointer-events-auto w-full max-w-md mx-4 bg-white border border-(--color-border) rounded-lg shadow-xl p-6 md:p-8 text-center"
                        >
                            {/* Success icon */}
                            <div className="w-16 h-16 mx-auto mb-4 bg-green-100 rounded-full flex items-center justify-center">
                                <svg
                                    className="w-8 h-8 text-green-600"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M5 13l4 4L19 7"
                                    />
                                </svg>
                            </div>

                            <h2 className="[font-family:var(--font-display)] text-2xl text-black mb-2">
                                {title}
                            </h2>
                            <p className="text-[14px] text-(--color-grey-muted) mb-3">{message}</p>

                            {/* Order ID */}
                            {orderId && (
                                <p className="[font-family:var(--font-ui)] text-[11px] tracking-[0.2em] text-black/60 mb-3">
                                    Order ID: <span className="font-medium">{orderId}</span>
                                </p>
                            )}

                            {/* Ordered Items List */}
                            {orderItems && orderItems.length > 0 && (
                                <div className="mt-2 mb-4 text-left max-h-40 overflow-y-auto">
                                    <p className="[font-family:var(--font-ui)] text-[10px] uppercase tracking-[0.2em] text-(--color-grey-muted) mb-2">
                                        Items in this order:
                                    </p>
                                    <ul className="space-y-1.5">
                                        {orderItems.map((item, idx) => (
                                            <li key={idx} className="text-[12px] text-black/80 border-b border-(--color-border) pb-1">
                                                <span className="font-medium">{item.name}</span>
                                                <br />
                                                <span className="text-[10px] text-(--color-grey-muted)">ID: {item.id}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}

                            {/* Legacy orderName (if no orderItems) */}
                            {orderName && (!orderItems || orderItems.length === 0) && (
                                <p className="[font-family:var(--font-ui)] text-[11px] tracking-[0.2em] text-black/60 mb-6">
                                    Order Name: <span className="font-medium">{orderName}</span>
                                </p>
                            )}

                            <button
                                onClick={onClose}
                                className="mt-2 px-6 py-2 bg-black text-white text-[11px] uppercase tracking-[0.24em] [font-family:var(--font-ui)] hover:bg-white hover:text-black border border-black transition hover:cursor-pointer"
                            >
                                OK
                            </button>
                        </motion.div>
                    </div>
                </>
            )}
        </AnimatePresence>
    );
}