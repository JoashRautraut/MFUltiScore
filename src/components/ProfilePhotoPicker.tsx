"use client";

import { useRef, useState } from "react";
import { loadProfilePhoto, readProfilePhotoFile, saveProfilePhoto } from "@/lib/profile-photo";

type ProfilePhotoPickerProps = {
  username: string;
  playerName: string;
  size?: "sm" | "lg";
  onPhotoChange?: () => void;
};

function getInitials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export function ProfilePhotoPicker({ username, playerName, size = "lg", onPhotoChange }: ProfilePhotoPickerProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [photo, setPhoto] = useState<string | null>(() => loadProfilePhoto(username));
  const [error, setError] = useState("");

  const dimensions = size === "lg" ? "h-28 w-28" : "h-11 w-11";
  const buttonSize = size === "lg" ? "h-9 w-9" : "h-7 w-7";

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) {
      return;
    }

    try {
      const dataUrl = await readProfilePhotoFile(file);
      saveProfilePhoto(username, dataUrl);
      setPhoto(dataUrl);
      setError("");
      onPhotoChange?.();
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Could not upload photo.");
    }
  }

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative">
        <div
          className={`${dimensions} overflow-hidden rounded-full bg-slate-200 shadow-lg ring-4 ring-white`}
        >
          {photo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={photo} alt={playerName} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-slate-300 to-slate-400 text-xl font-bold text-white">
              {getInitials(playerName) || "?"}
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className={`absolute bottom-0 right-0 ${buttonSize} flex items-center justify-center rounded-full bg-slate-900 text-sm text-white shadow-md transition hover:bg-slate-700`}
          aria-label="Upload profile photo"
        >
          📷
        </button>

        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="sr-only"
          onChange={handleFileChange}
        />
      </div>

      {size === "lg" && (
        <p className="text-center text-sm text-slate-500">Tap the camera to add your photo</p>
      )}

      {error && <p className="text-center text-sm text-red-600">{error}</p>}
    </div>
  );
}

export function ProfilePhotoAvatar({
  username,
  playerName,
  className = "h-11 w-11",
}: {
  username: string;
  playerName: string;
  className?: string;
}) {
  const photo = loadProfilePhoto(username);

  if (photo) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={photo}
        alt={playerName}
        className={`${className} rounded-full object-cover ring-2 ring-white shadow`}
      />
    );
  }

  return (
    <div
      className={`${className} flex items-center justify-center rounded-full bg-gradient-to-br from-slate-700 to-slate-900 text-xs font-bold text-white ring-2 ring-white shadow`}
    >
      {getInitials(playerName) || "?"}
    </div>
  );
}
