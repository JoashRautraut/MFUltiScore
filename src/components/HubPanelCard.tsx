"use client";

import Image from "next/image";

export const PANEL_IMAGE_PATHS = {
  setup: "/panels/summary.png",
  live: "/panels/profile.png",
  summary: "/panels/setup.png",
  dashboard: "/panels/dashboard.png",
  profile: "/panels/live.png",
} as const;

type HubPanelCardProps = {
  title: string;
  subtitle: string;
  colorClass: string;
  imageSrc: string;
  onClick: () => void;
  badge?: string;
};

export function HubPanelCard({
  title,
  subtitle,
  colorClass,
  imageSrc,
  onClick,
  badge,
}: HubPanelCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group relative h-40 w-full overflow-hidden rounded-[2rem] text-left text-white shadow-lg transition hover:scale-[1.01] hover:shadow-xl active:scale-[0.99]"
    >
      <Image
        src={imageSrc}
        alt=""
        fill
        className="object-cover object-[center_30%] transition-transform duration-700 ease-out group-hover:scale-105"
        sizes="(max-width: 640px) 100vw, 480px"
      />

      <div
        className={`absolute inset-0 ${colorClass}`}
        style={{
          WebkitMaskImage:
            "linear-gradient(to right, #000 0%, #000 26%, rgba(0,0,0,0.75) 40%, rgba(0,0,0,0.35) 52%, transparent 72%)",
          maskImage:
            "linear-gradient(to right, #000 0%, #000 26%, rgba(0,0,0,0.75) 40%, rgba(0,0,0,0.35) 52%, transparent 72%)",
        }}
      />

      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(to right, rgba(0,0,0,0.42) 0%, rgba(0,0,0,0.18) 34%, rgba(0,0,0,0.04) 54%, transparent 72%)",
        }}
      />

      <div
        className="absolute inset-y-0 left-[24%] w-[50%] opacity-80"
        style={{
          background:
            "linear-gradient(to right, transparent 0%, rgba(255,255,255,0.07) 42%, transparent 100%)",
        }}
      />

      <div className="relative z-10 flex h-full min-w-0 flex-col justify-center px-6 py-5">
        {badge && (
          <span className="mb-2 w-fit rounded-full bg-white/20 px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wide backdrop-blur-sm">
            {badge}
          </span>
        )}
        <h2 className="text-2xl font-bold leading-tight drop-shadow-md">{title}</h2>
        <p className="mt-1 text-sm text-white/90 drop-shadow-md">{subtitle}</p>
      </div>
    </button>
  );
}
