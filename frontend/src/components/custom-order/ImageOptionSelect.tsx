"use client";

import { useEffect, useId, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";

export type ImageOption = {
  id: string;
  label: string;
  image?: string;
};

type ImageOptionSelectProps = {
  label: string;
  placeholder: string;
  value: string;
  options: ImageOption[];
  onChange: (id: string) => void;
};

export default function ImageOptionSelect({
  label,
  placeholder,
  value,
  options,
  onChange,
}: ImageOptionSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const listId = useId();
  const selected = options.find((option) => option.id === value) ?? null;

  useEffect(() => {
    if (!isOpen) return;

    const handlePointerOutside = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node;
      if (rootRef.current && !rootRef.current.contains(target)) {
        setIsOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsOpen(false);
    };

    document.addEventListener("mousedown", handlePointerOutside);
    document.addEventListener("touchstart", handlePointerOutside);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handlePointerOutside);
      document.removeEventListener("touchstart", handlePointerOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen]);

  return (
    <div ref={rootRef} className="relative">
      <label className="block [font-family:var(--font-ui)] text-[10px] uppercase tracking-[0.2em] text-black mb-2">
        {label}
      </label>
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-controls={listId}
        onClick={() => setIsOpen((open) => !open)}
        className="w-full border border-(--color-border) bg-white px-3 py-2.5 flex items-center gap-3 text-left hover:border-black/40 transition hover:cursor-pointer"
      >
        <OptionThumb image={selected?.image} alt={selected?.label ?? ""} />
        <span
          className={`flex-1 min-w-0 truncate [font-family:var(--font-body)] text-[14px] ${
            selected ? "text-black" : "text-(--color-grey-muted)"
          }`}
        >
          {selected?.label ?? placeholder}
        </span>
        <ChevronDown
          className={`w-4 h-4 shrink-0 text-black/40 transition-transform duration-200 ${
            isOpen ? "rotate-180" : ""
          }`}
          aria-hidden
        />
      </button>

      {isOpen && (
        <ul
          id={listId}
          role="listbox"
          className="absolute z-50 left-0 right-0 mt-1 max-h-72 overflow-y-auto border border-(--color-border) bg-white shadow-[0_12px_28px_rgba(0,0,0,0.08)]"
        >
          {options.length === 0 ? (
            <li className="px-3 py-3 [font-family:var(--font-body)] text-[13px] text-(--color-grey-muted)">
              {placeholder}
            </li>
          ) : (
            options.map((option) => {
              const isSelected = option.id === value;
              return (
                <li key={option.id} role="option" aria-selected={isSelected}>
                  <button
                    type="button"
                    onClick={() => {
                      onChange(option.id);
                      setIsOpen(false);
                    }}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 text-left transition hover:cursor-pointer ${
                      isSelected
                        ? "bg-black text-white"
                        : "hover:bg-neutral-100 text-black"
                    }`}
                  >
                    <OptionThumb
                      image={option.image}
                      alt={option.label}
                      selected={isSelected}
                    />
                    <span className="flex-1 min-w-0 truncate [font-family:var(--font-body)] text-[14px]">
                      {option.label}
                    </span>
                    {isSelected && (
                      <span
                        className="[font-family:var(--font-ui)] text-[10px] uppercase tracking-[0.16em] shrink-0 opacity-80"
                        aria-hidden
                      >
                        ✓
                      </span>
                    )}
                  </button>
                </li>
              );
            })
          )}
        </ul>
      )}
    </div>
  );
}

function OptionThumb({
  image,
  alt,
  selected = false,
}: {
  image?: string;
  alt: string;
  selected?: boolean;
}) {
  return (
    <span
      className={`relative w-11 h-14 shrink-0 overflow-hidden bg-neutral-100 ${
        selected ? "ring-1 ring-white/50" : "border border-(--color-border)"
      }`}
    >
      {image ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={image}
          alt={alt}
          className="absolute inset-0 w-full h-full object-cover object-top"
        />
      ) : (
        <span className="absolute inset-0 flex items-center justify-center [font-family:var(--font-ui)] text-[8px] uppercase tracking-[0.12em] text-(--color-grey-muted)/70">
          —
        </span>
      )}
    </span>
  );
}
