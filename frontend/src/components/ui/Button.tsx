import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

const variantClasses = {
  /** Filled black CTA — primary actions */
  primary:
    "bg-black text-white hover:bg-[#2A2A28] border border-transparent",
  /** Outlined black — secondary / cancel */
  secondary:
    "bg-transparent text-black border border-black hover:bg-black hover:text-white",
  /** Underline text control — back / tertiary */
  ghost:
    "bg-transparent text-black border-0 border-b border-black rounded-none px-0 hover:opacity-50",
  /** Destructive filled */
  danger:
    "bg-(--dash-danger) text-white border border-transparent hover:opacity-90",
} as const;

const sizeClasses = {
  sm: "px-4 py-2 text-[9px] tracking-[0.2em]",
  md: "px-6 py-2.5 text-[10px] tracking-[0.22em]",
  lg: "px-8 py-3 text-[10px] tracking-[0.22em]",
} as const;

/** Ghost keeps underline rhythm; size only affects type scale. */
const ghostSizeClasses = {
  sm: "py-0.5 text-[9px] tracking-[0.2em]",
  md: "py-0.5 text-[10px] tracking-[0.22em]",
  lg: "py-0.5 text-[11px] tracking-[0.24em]",
} as const;

export type ButtonVariant = keyof typeof variantClasses;
export type ButtonSize = keyof typeof sizeClasses;

type ButtonVariantsInput = {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  className?: string;
};

/**
 * Shared class builder for `<Button>` and non-button hosts (e.g. `Link`).
 *
 * @example
 * <Link className={buttonVariants({ variant: "primary", size: "lg" })} href="...">
 */
export function buttonVariants({
  variant = "primary",
  size = "md",
  fullWidth = false,
  className,
}: ButtonVariantsInput = {}) {
  const sizeClass =
    variant === "ghost" ? ghostSizeClasses[size] : sizeClasses[size];

  return cn(
    "inline-flex items-center justify-center gap-2 font-ui uppercase transition",
    "disabled:opacity-40 disabled:cursor-not-allowed hover:cursor-pointer",
    "whitespace-nowrap select-none",
    variantClasses[variant],
    sizeClass,
    fullWidth && "w-full",
    className,
  );
}

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> &
  ButtonVariantsInput;

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  function Button(
    {
      variant = "primary",
      size = "md",
      fullWidth = false,
      className,
      type = "button",
      ...props
    },
    ref,
  ) {
    return (
      <button
        ref={ref}
        type={type}
        className={buttonVariants({ variant, size, fullWidth, className })}
        {...props}
      />
    );
  },
);
