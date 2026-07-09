"use client";

import type { ReactNode } from "react";

type HubPanelCardProps = {
  title: string;
  subtitle: string;
  colorClass: string;
  artwork: ReactNode;
  onClick: () => void;
  badge?: string;
};

export function HubPanelCard({
  title,
  subtitle,
  colorClass,
  artwork,
  onClick,
  badge,
}: HubPanelCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`group relative flex h-36 w-full overflow-hidden rounded-[2rem] ${colorClass} px-6 py-5 text-left text-white shadow-lg transition hover:scale-[1.01] hover:shadow-xl active:scale-[0.99]`}
    >
      <div className="relative z-10 flex min-w-0 flex-1 flex-col justify-center">
        {badge && (
          <span className="mb-2 w-fit rounded-full bg-white/20 px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wide">
            {badge}
          </span>
        )}
        <h2 className="text-2xl font-bold leading-tight">{title}</h2>
        <p className="mt-1 text-sm text-white/80">{subtitle}</p>
      </div>

      <div className="pointer-events-none absolute -right-2 bottom-0 top-0 flex w-[48%] items-end justify-end">
        {artwork}
      </div>
    </button>
  );
}

export function SetupPanelArt() {
  return (
    <svg viewBox="0 0 180 180" className="h-full w-full translate-y-2" aria-hidden>
      <circle cx="118" cy="58" r="34" fill="rgba(255,255,255,0.18)" />
      <rect x="72" y="88" width="72" height="54" rx="12" fill="rgba(255,255,255,0.92)" />
      <rect x="82" y="100" width="36" height="6" rx="3" fill="#2563eb" />
      <rect x="82" y="112" width="52" height="5" rx="2.5" fill="#93c5fd" />
      <rect x="82" y="122" width="44" height="5" rx="2.5" fill="#93c5fd" />
      <circle cx="58" cy="118" r="28" fill="#1d4ed8" />
      <rect x="42" y="146" width="32" height="34" rx="16" fill="#1e40af" />
    </svg>
  );
}

export function LivePanelArt() {
  return (
    <svg viewBox="0 0 180 180" className="h-full w-full translate-y-1" aria-hidden>
      <circle cx="120" cy="48" r="30" fill="rgba(255,255,255,0.18)" />
      <circle cx="126" cy="72" r="22" fill="rgba(255,255,255,0.95)" />
      <path d="M70 130 C88 88, 118 72, 150 58" stroke="rgba(255,255,255,0.35)" strokeWidth="8" fill="none" />
      <circle cx="52" cy="112" r="24" fill="#fb7185" />
      <rect x="36" y="136" width="32" height="36" rx="16" fill="#e11d48" />
      <path d="M108 58 L148 42 L132 78 Z" fill="#fda4af" />
    </svg>
  );
}

export function SummaryPanelArt() {
  return (
    <svg viewBox="0 0 180 180" className="h-full w-full translate-y-2" aria-hidden>
      <rect x="78" y="70" width="72" height="88" rx="14" fill="rgba(255,255,255,0.92)" />
      <rect x="90" y="86" width="48" height="6" rx="3" fill="#7c3aed" />
      <rect x="90" y="100" width="36" height="5" rx="2.5" fill="#c4b5fd" />
      <rect x="90" y="112" width="42" height="5" rx="2.5" fill="#c4b5fd" />
      <circle cx="58" cy="108" r="26" fill="#6d28d9" />
      <path d="M48 92 L68 92 L58 76 Z" fill="#fbbf24" />
      <rect x="42" y="134" width="32" height="32" rx="16" fill="#5b21b6" />
    </svg>
  );
}

export function DashboardPanelArt() {
  return (
    <svg viewBox="0 0 180 180" className="h-full w-full translate-y-2" aria-hidden>
      <rect x="70" y="108" width="18" height="42" rx="6" fill="rgba(255,255,255,0.35)" />
      <rect x="96" y="88" width="18" height="62" rx="6" fill="rgba(255,255,255,0.55)" />
      <rect x="122" y="98" width="18" height="52" rx="6" fill="rgba(255,255,255,0.45)" />
      <circle cx="58" cy="102" r="26" fill="#f59e0b" />
      <text x="50" y="110" fontSize="22">🥇</text>
      <rect x="40" y="128" width="34" height="34" rx="17" fill="#d97706" />
    </svg>
  );
}

export function ProfilePanelArt() {
  return (
    <svg viewBox="0 0 180 180" className="h-full w-full translate-y-1" aria-hidden>
      <circle cx="118" cy="72" r="34" fill="rgba(255,255,255,0.14)" />
      <circle cx="112" cy="78" r="28" fill="rgba(255,255,255,0.92)" />
      <circle cx="58" cy="108" r="28" fill="#334155" />
      <rect x="40" y="136" width="36" height="38" rx="18" fill="#0f172a" />
      <circle cx="112" cy="72" r="10" fill="#cbd5e1" />
      <path d="M92 92 C98 84, 126 84, 132 92 C126 104, 98 104, 92 92 Z" fill="#cbd5e1" />
    </svg>
  );
}
