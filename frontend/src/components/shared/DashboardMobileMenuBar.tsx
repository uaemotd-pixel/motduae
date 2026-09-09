"use client";

import { Menu } from "lucide-react";

type DashboardMobileMenuBarProps = {
  onOpen: () => void;
};

/** In-flow mobile menu trigger for portal shells. Must not be `fixed` — that
 *  sits on top of every page title in the same corner. */
export function DashboardMobileMenuBar({ onOpen }: DashboardMobileMenuBarProps) {
  return (
    <div className="mb-4 flex items-center lg:hidden">
      <button
        type="button"
        onClick={onOpen}
        className="rounded-md bg-black p-2 text-white shadow-md transition hover:bg-(--dash-charcoal-deep)"
        aria-label="Open menu"
      >
        <Menu className="h-5 w-5" />
      </button>
    </div>
  );
}
