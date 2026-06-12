"use client";

import { useEffect, useState } from "react";

type NumericInputProps = {
    id?: string;
    value: number;
    onChange: (value: number) => void;
    className?: string;
    min?: number;
    step?: number | string;
    allowDecimal?: boolean;
};

export default function NumericInput({
    id,
    value,
    onChange,
    className,
    min,
    step,
    allowDecimal = false,
}: NumericInputProps) {
    const [draft, setDraft] = useState("");
    const [focused, setFocused] = useState(false);

    const formatValue = (num: number) => {
        if (!Number.isFinite(num) || num === 0) return "";
        return String(num);
    };

    useEffect(() => {
        if (!focused) {
            setDraft(formatValue(value));
        }
    }, [value, focused]);

    const pattern = allowDecimal ? /^\d*\.?\d*$/ : /^\d*$/;

    return (
        <input
            id={id}
            type="text"
            inputMode={allowDecimal ? "decimal" : "numeric"}
            min={min}
            step={step}
            value={focused ? draft : formatValue(value)}
            onFocus={() => {
                setFocused(true);
                setDraft(formatValue(value));
            }}
            onChange={(e) => {
                const next = e.target.value;
                if (next !== "" && !pattern.test(next)) return;

                setDraft(next);

                if (next === "" || next === ".") {
                    onChange(Number.NaN);
                    return;
                }

                onChange(Number(next));
            }}
            onBlur={() => {
                setFocused(false);

                if (draft === "" || draft === ".") {
                    onChange(Number.NaN);
                    setDraft("");
                    return;
                }

                const parsed = Number(draft);
                onChange(Number.isFinite(parsed) ? parsed : Number.NaN);
            }}
            className={className}
        />
    );
}
