"use client";

import { Link } from "@/i18n/navigation";

type AuthSplitHeroProps = {
  src: string;
  caption?: string;
  overlay?: "light" | "dark";
  /** Extra object-position classes so the model stays in the crop. */
  imageClassName?: string;
  logoPosition?: "start" | "center" | "end";
};

export function AuthSplitHero({
  src,
  caption,
  overlay = "light",
  imageClassName = "object-[22%_center] md:object-[28%_center]",
  logoPosition = "start",
}: AuthSplitHeroProps) {
  return (
    <section className="relative h-[42vh] min-h-52 w-full shrink-0 overflow-hidden md:sticky md:top-0 md:h-screen md:w-[55%]">
      <img
        src={src}
        alt=""
        className={`absolute inset-0 h-full w-full object-cover ${imageClassName}`}
      />
      {overlay === "light" ? (
        <>
          <div className="absolute inset-0 bg-linear-to-r from-black/15 via-black/5 to-transparent" />
          <div className="absolute inset-0 bg-linear-to-t from-black/35 via-transparent to-black/10" />
        </>
      ) : (
        <>
          <div className="absolute inset-0 bg-linear-to-r from-black/60 via-black/30 to-transparent" />
          <div className="absolute inset-0 bg-linear-to-t from-black/50 via-transparent to-black/20" />
        </>
      )}
      <div
        className={
          logoPosition === "center"
            ? "absolute top-5 left-1/2 z-10 -translate-x-1/2 xs:top-7.5"
            : logoPosition === "end"
              ? "absolute top-5 end-5 z-10 xs:top-7.5 xs:end-7.5"
              : "absolute top-5 start-5 z-10 xs:top-7.5 xs:start-7.5"
        }
      >
        <Link
          href="/"
          className="inline-flex items-center"
          aria-label="MOTD home"
        >
          <img
            src="/PNG/White/MOTD_Wordmark_White.png"
            alt="MOTD"
            className="h-3.5 w-auto object-contain xs:h-4 md:h-4.5 xl:h-5"
          />
        </Link>
      </div>
      {caption ? (
        <div className="absolute bottom-5 start-5 hidden md:block">
          <p className="font-label-sm text-[10px] uppercase tracking-[0.3em] text-white/50 md:text-[12px]">
            {caption}
          </p>
        </div>
      ) : null}
    </section>
  );
}
