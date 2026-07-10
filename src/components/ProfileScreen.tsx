"use client";

import { useMemo, useRef, useState } from "react";
import Image from "next/image";
import { PlayerProgressChart } from "@/components/PlayerProgressChart";
import { PANEL_IMAGE_PATHS } from "@/components/HubPanelCard";
import { loadCoverPhoto, readCoverPhotoFile, saveCoverPhoto } from "@/lib/profile-cover-photo";
import {
  addGalleryPhoto,
  loadGalleryPhotos,
  readGalleryPhotoFile,
  removeGalleryPhoto,
  type GalleryPhoto,
} from "@/lib/profile-gallery";
import { loadProfilePhoto, readProfilePhotoFile, saveProfilePhoto } from "@/lib/profile-photo";
import { ProfilePhotoLightbox } from "@/components/ProfilePhotoLightbox";
import { STAT_TYPES, type StatType } from "@/types/stats";
import type { PlayerGender } from "@/types/auth";

type ProfileTab = "overview" | "photos" | "matches" | "stats";

type GameHistoryEntry = {
  gameId: string;
  date: string;
  endedAt: string;
  team: string;
  matchupLabel: string;
  counts: Record<StatType, number>;
  points: number;
  wasMvp: boolean;
  mvpPercentage: number;
};

type ProfileSubject = {
  username: string;
  playerName: string;
  gender: PlayerGender;
  role?: "user" | "admin";
};

type PersonalProgress = {
  gameHistory: GameHistoryEntry[];
  gamesPlayed: number;
  totalPoints: number;
  statsTotals: Record<StatType, number>;
  mvpWins: number;
  bestMvpPercentage: number;
  genderRank: number | null;
  genderPoolSize: number;
  totalActions: number;
};

export type { PersonalProgress, ProfileSubject };

type ProfileScreenProps = {
  profileUser: ProfileSubject;
  personalProgress: PersonalProgress;
  profilePhotoVersion: number;
  readOnly?: boolean;
  onPhotoChange?: () => void;
  onBack: () => void;
  getTeamLabel: (team: string) => string;
};

const STAT_BAR_COLORS: Record<StatType, string> = {
  Score: "bg-amber-400",
  Assist: "bg-emerald-400",
  Block: "bg-blue-400",
  Callahan: "bg-violet-400",
};

function getInitials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

function PerformanceBar({
  label,
  value,
  max,
  barClass,
}: {
  label: string;
  value: number;
  max: number;
  barClass: string;
}) {
  const width = max > 0 ? Math.max(8, Math.round((value / max) * 100)) : 0;

  return (
    <div>
      <div className="mb-2 flex items-center justify-between text-sm">
        <span className="text-slate-300">{label}</span>
        <span className="font-semibold text-white">{value}</span>
      </div>
      <div className="h-2.5 overflow-hidden rounded-full bg-slate-800">
        <div className={`h-full rounded-full ${barClass}`} style={{ width: `${width}%` }} />
      </div>
    </div>
  );
}

export function ProfileScreen({
  profileUser,
  personalProgress,
  profilePhotoVersion,
  readOnly = false,
  onPhotoChange,
  onBack,
  getTeamLabel,
}: ProfileScreenProps) {
  const coverInputRef = useRef<HTMLInputElement>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const [tab, setTab] = useState<ProfileTab>("overview");
  const [uploadError, setUploadError] = useState("");
  const [lightboxPhoto, setLightboxPhoto] = useState<string | null>(null);

  const coverPhoto = loadCoverPhoto(profileUser.username);
  const avatarPhoto = loadProfilePhoto(profileUser.username);
  const galleryPhotos = useMemo(
    () => loadGalleryPhotos(profileUser.username),
    [profileUser.username, profilePhotoVersion],
  );
  const statMax = useMemo(
    () => Math.max(1, ...STAT_TYPES.map((stat) => personalProgress.statsTotals[stat])),
    [personalProgress.statsTotals],
  );

  const recentMatches = personalProgress.gameHistory.slice(0, 4);

  function notifyMediaChange() {
    setUploadError("");
    onPhotoChange?.();
  }

  async function handleCoverUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) {
      return;
    }

    try {
      const dataUrl = await readCoverPhotoFile(file);
      saveCoverPhoto(profileUser.username, dataUrl);
      notifyMediaChange();
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : "Could not upload cover photo.");
    }
  }

  async function handleAvatarUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) {
      return;
    }

    try {
      const dataUrl = await readProfilePhotoFile(file);
      saveProfilePhoto(profileUser.username, dataUrl);
      notifyMediaChange();
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : "Could not upload profile photo.");
    }
  }

  async function handleGalleryUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) {
      return;
    }

    try {
      const dataUrl = await readGalleryPhotoFile(file);
      addGalleryPhoto(profileUser.username, dataUrl);
      notifyMediaChange();
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : "Could not upload photo.");
    }
  }

  function handleRemoveGalleryPhoto(photoId: string) {
    removeGalleryPhoto(profileUser.username, photoId);
    notifyMediaChange();
  }

  function renderGalleryGrid(photos: GalleryPhoto[]) {
    if (photos.length === 0) {
      return (
        <p className="rounded-2xl bg-slate-900/80 p-4 text-sm text-slate-400">
          {readOnly
            ? "No photos uploaded yet."
            : "Share moments from games and tournaments. Your photos appear here."}
        </p>
      );
    }

    return (
      <div className="grid grid-cols-3 gap-2">
        {photos.map((photo) => (
          <div key={photo.id} className="group relative aspect-square overflow-hidden rounded-2xl bg-slate-800">
            <button
              type="button"
              onClick={() => setLightboxPhoto(photo.dataUrl)}
              className="h-full w-full"
              aria-label="View photo"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={photo.dataUrl} alt="" className="h-full w-full object-cover transition group-hover:brightness-110" />
            </button>
            {!readOnly && (
              <button
                type="button"
                onClick={() => handleRemoveGalleryPhoto(photo.id)}
                className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-black/60 text-sm text-white opacity-0 transition hover:bg-black/80 group-hover:opacity-100"
                aria-label="Remove photo"
              >
                ×
              </button>
            )}
          </div>
        ))}
      </div>
    );
  }

  return (
    <section className="-mx-4 overflow-hidden rounded-[2rem] bg-slate-950 text-white shadow-2xl sm:mx-0">
      <div className="relative h-56">
        {coverPhoto ? (
          <button
            type="button"
            onClick={() => setLightboxPhoto(coverPhoto)}
            className="absolute inset-0"
            aria-label={`View ${profileUser.playerName} cover photo`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              key={`cover-${profilePhotoVersion}`}
              src={coverPhoto}
              alt=""
              className="absolute inset-0 h-full w-full object-cover"
            />
          </button>
        ) : (
          <Image
            src={PANEL_IMAGE_PATHS.profile}
            alt=""
            fill
            className="object-cover object-center"
            sizes="480px"
            priority
          />
        )}

        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "linear-gradient(to bottom, rgba(2,6,23,0.15) 0%, rgba(2,6,23,0.55) 55%, rgba(2,6,23,0.95) 100%)",
          }}
        />

        <button
          type="button"
          onClick={onBack}
          className="absolute left-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-black/35 text-lg text-white backdrop-blur-sm transition hover:bg-black/50"
          aria-label="Back"
        >
          ←
        </button>

        {readOnly ? (
          <span className="absolute right-4 top-4 rounded-full bg-black/35 px-3 py-1.5 text-xs font-medium text-slate-200 backdrop-blur-sm">
            View only
          </span>
        ) : (
          <button
            type="button"
            onClick={() => coverInputRef.current?.click()}
            className="absolute bottom-16 right-4 rounded-full bg-black/45 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur-sm transition hover:bg-black/60"
          >
            {coverPhoto ? "Change cover" : "Add cover photo"}
          </button>
        )}

        {!readOnly && (
          <>
            <input
              ref={coverInputRef}
              type="file"
              accept="image/*"
              className="sr-only"
              onChange={handleCoverUpload}
            />
            <input
              ref={avatarInputRef}
              type="file"
              accept="image/*"
              className="sr-only"
              onChange={handleAvatarUpload}
            />
            <input
              ref={galleryInputRef}
              type="file"
              accept="image/*"
              className="sr-only"
              onChange={handleGalleryUpload}
            />
          </>
        )}

        <div className="absolute bottom-4 left-4 right-4 flex items-end justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <div className="relative shrink-0">
              <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-full bg-slate-800 ring-4 ring-slate-950">
                {avatarPhoto ? (
                  <button
                    type="button"
                    onClick={() => setLightboxPhoto(avatarPhoto)}
                    className="h-full w-full overflow-hidden rounded-full"
                    aria-label={`View ${profileUser.playerName} profile photo`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      key={`avatar-${profilePhotoVersion}`}
                      src={avatarPhoto}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  </button>
                ) : (
                  <span className="text-lg font-bold">{getInitials(profileUser.playerName)}</span>
                )}
              </div>
              {!readOnly && (
                <button
                  type="button"
                  onClick={() => avatarInputRef.current?.click()}
                  className="absolute bottom-0 right-0 flex h-7 w-7 items-center justify-center rounded-full bg-blue-500 text-xs text-white shadow-lg transition hover:bg-blue-400"
                  aria-label="Update profile photo"
                >
                  📷
                </button>
              )}
            </div>
            <div className="min-w-0 pb-1">
              <h2 className="truncate text-2xl font-bold">{profileUser.playerName}</h2>
              <p className="text-sm text-slate-300">
                MFULTISCORE · {profileUser.gender === "female" ? "Female" : "Male"}
                {profileUser.role === "admin" ? " · Admin" : ""}
              </p>
            </div>
          </div>
        </div>
      </div>

      {uploadError && <p className="px-4 pt-3 text-sm text-red-400">{uploadError}</p>}

      <div className="grid grid-cols-4 gap-2 px-4 py-4">
        <div className="rounded-2xl bg-slate-900/90 p-3 text-center">
          <p className="text-2xl font-bold text-blue-400">{personalProgress.totalPoints}</p>
          <p className="mt-1 text-xs text-slate-400">Points</p>
        </div>
        <div className="rounded-2xl bg-slate-900/90 p-3 text-center">
          <p className="text-2xl font-bold text-emerald-400">{personalProgress.gamesPlayed}</p>
          <p className="mt-1 text-xs text-slate-400">Games</p>
        </div>
        <div className="rounded-2xl bg-slate-900/90 p-3 text-center">
          <p className="text-2xl font-bold text-amber-400">{personalProgress.mvpWins}</p>
          <p className="mt-1 text-xs text-slate-400">MPV</p>
        </div>
        <div className="rounded-2xl bg-slate-900/90 p-3 text-center">
          <p className="text-2xl font-bold text-rose-400">
            {personalProgress.genderRank ? `#${personalProgress.genderRank}` : "—"}
          </p>
          <p className="mt-1 text-xs text-slate-400">Rank</p>
        </div>
      </div>

      <div className="px-4 pb-2">
        <div className="flex rounded-full bg-slate-900 p-1">
          {(
            [
              ["overview", "Overview"],
              ["photos", "Photos"],
              ["matches", "Matches"],
              ["stats", "Stats"],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => setTab(value)}
              className={`flex-1 rounded-full px-2 py-2 text-xs font-medium transition sm:px-3 sm:text-sm ${
                tab === value ? "bg-white text-slate-900" : "text-slate-300 hover:text-white"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-4 px-4 pb-6 pt-3">
        {tab === "overview" && (
          <>
            <div className="rounded-2xl bg-slate-900/80 p-4">
              <h3 className="text-lg font-semibold">Performance</h3>
              <div className="mt-4 space-y-4">
                {STAT_TYPES.map((statType) => (
                  <PerformanceBar
                    key={statType}
                    label={statType}
                    value={personalProgress.statsTotals[statType]}
                    max={statMax}
                    barClass={STAT_BAR_COLORS[statType]}
                  />
                ))}
              </div>
            </div>

            <div>
              <div className="mb-3 flex items-center justify-between gap-3">
                <h3 className="text-lg font-semibold">Photos</h3>
                {galleryPhotos.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setTab("photos")}
                    className="text-sm font-medium text-blue-400 hover:text-blue-300"
                  >
                    See all
                  </button>
                )}
              </div>
              {renderGalleryGrid(galleryPhotos.slice(0, 3))}
            </div>

            <div>
              <h3 className="mb-3 text-lg font-semibold">Recent matches</h3>
              {recentMatches.length === 0 ? (
                <p className="rounded-2xl bg-slate-900/80 p-4 text-sm text-slate-400">
                  {readOnly
                    ? "No saved games yet for this player."
                    : "No saved games yet. Your match history will appear here."}
                </p>
              ) : (
                <div className="space-y-2">
                  {recentMatches.map((game) => (
                    <div
                      key={game.gameId}
                      className="flex items-center justify-between rounded-2xl bg-slate-900/80 px-4 py-3"
                    >
                      <div className="min-w-0">
                        <p className="truncate font-medium">{game.matchupLabel}</p>
                        <p className="text-sm text-slate-400">
                          {getTeamLabel(game.team)} · {game.date}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-white">{game.points} pts</p>
                        {game.wasMvp && (
                          <span className="text-xs font-medium text-amber-400">MPV</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}

        {tab === "photos" && (
          <div>
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold">Photos</h3>
                <p className="mt-1 text-sm text-slate-400">
                  {galleryPhotos.length} photo{galleryPhotos.length === 1 ? "" : "s"}
                </p>
              </div>
              {!readOnly && (
                <button
                  type="button"
                  onClick={() => galleryInputRef.current?.click()}
                  className="rounded-full bg-blue-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-400"
                >
                  Add photo
                </button>
              )}
            </div>
            {renderGalleryGrid(galleryPhotos)}
          </div>
        )}

        {tab === "matches" && (
          <div>
            <h3 className="mb-3 text-lg font-semibold">Match history</h3>
            {personalProgress.gameHistory.length === 0 ? (
              <p className="rounded-2xl bg-slate-900/80 p-4 text-sm text-slate-400">
                No saved games yet.
              </p>
            ) : (
              <div className="space-y-2">
                {personalProgress.gameHistory.map((game) => (
                  <div
                    key={game.gameId}
                    className="rounded-2xl bg-slate-900/80 px-4 py-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-medium">{game.matchupLabel}</p>
                        <p className="mt-1 text-sm text-slate-400">
                          {game.date} · Ended {game.endedAt}
                        </p>
                        <p className="mt-1 text-sm text-slate-500">{getTeamLabel(game.team)}</p>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="text-lg font-bold text-white">{game.points}</p>
                        <p className="text-xs text-slate-400">points</p>
                        {game.wasMvp && (
                          <span className="mt-1 inline-block rounded-full bg-amber-400/15 px-2 py-0.5 text-xs font-medium text-amber-300">
                            MPV {game.mvpPercentage}%
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {STAT_TYPES.map((statType) => (
                        <span
                          key={statType}
                          className="rounded-full bg-slate-800 px-2.5 py-1 text-xs text-slate-300"
                        >
                          {statType} {game.counts[statType]}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {tab === "stats" && (
          <>
            <div className="grid grid-cols-2 gap-2">
              {STAT_TYPES.map((statType) => (
                <div key={statType} className="rounded-2xl bg-slate-900/80 p-4">
                  <p className="text-sm text-slate-400">{statType}</p>
                  <p className="mt-1 text-3xl font-bold">{personalProgress.statsTotals[statType]}</p>
                </div>
              ))}
            </div>

            <div className="rounded-2xl bg-slate-900/80 p-4">
              <p className="text-sm text-slate-400">Total actions</p>
              <p className="mt-1 text-3xl font-bold">{personalProgress.totalActions}</p>
              {personalProgress.bestMvpPercentage > 0 && (
                <p className="mt-2 text-sm text-amber-300">
                  Best MPV share: {personalProgress.bestMvpPercentage}%
                </p>
              )}
            </div>

            <div className="overflow-hidden rounded-2xl border border-slate-800 bg-white">
              <PlayerProgressChart games={personalProgress.gameHistory} />
            </div>
          </>
        )}
      </div>

      {lightboxPhoto && (
        <ProfilePhotoLightbox
          photo={lightboxPhoto}
          alt={profileUser.playerName}
          open={Boolean(lightboxPhoto)}
          onClose={() => setLightboxPhoto(null)}
        />
      )}
    </section>
  );
}
