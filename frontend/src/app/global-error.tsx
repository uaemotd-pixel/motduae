"use client";

import { useEffect } from "react";
import "./globals.css";

type Props = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function GlobalError({ error, reset }: Props) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="en">
      <body className="bg-white text-black">
        <main className="grid min-h-screen place-items-center px-4 py-16 sm:px-6">
          <div className="w-full max-w-xl text-center">
            <p className="[font-family:var(--font-ui)] text-[11px] uppercase tracking-[0.28em] text-[#8A8A80]">
              MOTD
            </p>
            <h1 className="mt-4 [font-family:var(--font-display)] text-4xl font-light tracking-tight sm:text-5xl">
              Something went wrong
            </h1>
            <p className="mt-4 [font-family:var(--font-body)] text-base leading-relaxed text-[#5A5A56]">
              An unexpected error stopped this page from loading. You can try
              again, or return home.
            </p>
            {error.digest ? (
              <p className="mt-3 [font-family:var(--font-ui)] text-[10px] uppercase tracking-[0.2em] text-[#8A8A80]">
                Ref {error.digest}
              </p>
            ) : null}
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <button
                type="button"
                onClick={() => reset()}
                className="[font-family:var(--font-ui)] w-full bg-black px-6 py-3 text-[11px] uppercase tracking-[0.22em] text-white sm:w-auto"
              >
                Try again
              </button>
              <a
                href="/en"
                className="[font-family:var(--font-ui)] w-full border border-black px-6 py-3 text-[11px] uppercase tracking-[0.22em] text-black sm:w-auto"
              >
                Go home
              </a>
            </div>
          </div>
        </main>
      </body>
    </html>
  );
}
