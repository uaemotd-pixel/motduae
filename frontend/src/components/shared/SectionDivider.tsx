"use client";

import * as images from "../../../public/images/ImageIndex";

type DividerVariant = 1 | 2 | 3;

interface SectionDividerProps {
  variant?: DividerVariant;
  className?: string;
}

export default function SectionDivider({
  variant = 2,
  className = "",
}: SectionDividerProps) {
  const divider = {
    1: images.element_1.src,
    2: images.element_2.src,
    3: images.element_3.src,
  }[variant];

  return (
    <div
      className={`relative flex items-center justify-center py-16 px-6 overflow-hidden ${className}`}
    >
      {/* Left Line */}
      <div className="h-px flex-1 max-w-48 bg-gradient-to-r from-transparent via-stone-300 to-stone-300" />

      {/* Center Decoration */}
      <div className="mx-8 flex items-center gap-4">
        <img
          src={divider}
          alt=""
          aria-hidden
          draggable={false}
          className="w-5 md:w-6 opacity-40 select-none pointer-events-none"
        />

        <img
          src={divider}
          alt=""
          aria-hidden
          draggable={false}
          className="w-12 md:w-14 animate-divider select-none pointer-events-none"
        />

        <img
          src={divider}
          alt=""
          aria-hidden
          draggable={false}
          className="w-5 md:w-6 opacity-40 select-none pointer-events-none"
        />
      </div>

      {/* Right Line */}
      <div className="h-px flex-1 max-w-48 bg-gradient-to-l from-transparent via-stone-300 to-stone-300" />

      {/* Animation */}
      <style jsx>{`
        @keyframes dividerBreath {
          0%,
          100% {
            transform: translateY(0) scale(1);
            opacity: 0.9;
            filter: drop-shadow(0 0 0 rgba(0, 0, 0, 0));
          }

          50% {
            transform: translateY(-2px) scale(1.05);
            opacity: 1;
            filter: drop-shadow(0 0 10px rgba(201, 162, 39, 0.25));
          }
        }

        .animate-divider {
          animation: dividerBreath 5s ease-in-out infinite;
          will-change: transform;
        }
      `}</style>
    </div>
  );
}
