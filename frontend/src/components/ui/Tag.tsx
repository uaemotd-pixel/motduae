import { forwardRef, type HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

/**
 * Brand tags / chips — one visual language, responsive type scale.
 *
 * size="sm" → product-card overlays, compact chips
 * size="md" → status / list badges
 */
const sizeClasses = {
  sm: "px-1.5 py-px text-[8px] tracking-[0.14em] sm:px-2 sm:py-0.5 sm:text-[9px]",
  md: "px-2 py-0.5 text-[9px] tracking-[0.16em] sm:px-2.5 sm:py-1 sm:text-[10px]",
} as const;

const variantClasses = {
  /** Black fill — featured / category default */
  solid: "bg-black text-white border border-transparent",
  /** White fill on dark media */
  inverse: "bg-white text-black border border-transparent",
  /** Quiet outline */
  outline: "bg-transparent text-black border border-black",
  /** Muted UI chip */
  muted: "bg-gray-50 text-gray-600 border border-gray-200",
  success: "bg-emerald-50 text-emerald-800 border border-emerald-200",
  warning: "bg-amber-50 text-amber-800 border border-amber-200",
  danger: "bg-red-50 text-red-700 border border-red-200",
  info: "bg-blue-50 text-blue-700 border border-blue-200",
  accent: "bg-indigo-50 text-indigo-700 border border-indigo-200",
} as const;

export type TagSize = keyof typeof sizeClasses;
export type TagVariant = keyof typeof variantClasses;

type TagVariantsInput = {
  size?: TagSize;
  variant?: TagVariant;
  /** Soft drop shadow for tags over imagery */
  elevated?: boolean;
  truncate?: boolean;
  className?: string;
};

export function tagVariants({
  size = "sm",
  variant = "solid",
  elevated = false,
  truncate = false,
  className,
}: TagVariantsInput = {}) {
  return cn(
    "inline-flex max-w-full items-center font-ui font-medium uppercase",
    "whitespace-nowrap select-none",
    sizeClasses[size],
    variantClasses[variant],
    elevated && "shadow-sm",
    truncate && "truncate",
    className,
  );
}

export type TagProps = HTMLAttributes<HTMLSpanElement> & TagVariantsInput;

export const Tag = forwardRef<HTMLSpanElement, TagProps>(function Tag(
  {
    size = "sm",
    variant = "solid",
    elevated = false,
    truncate = false,
    className,
    ...props
  },
  ref,
) {
  return (
    <span
      ref={ref}
      className={tagVariants({
        size,
        variant,
        elevated,
        truncate,
        className,
      })}
      {...props}
    />
  );
});
