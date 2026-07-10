import "server-only";

import {
  addProfileGalleryPhoto,
  getProfileMediaForUser,
  removeProfileGalleryPhoto,
  upsertProfileMedia,
} from "@/lib/sheets";
import { getUsers } from "@/lib/sheets";
import type {
  ProfileMediaBundle,
  ProfileMediaItem,
  ProfileMediaType,
  SaveProfileMediaInput,
} from "@/types/profile-media";

function normalizeUsername(username: string) {
  return username.trim().toLowerCase();
}

function toBundle(username: string, rows: Awaited<ReturnType<typeof getProfileMediaForUser>>): ProfileMediaBundle {
  const avatarRow = rows.find((row) => row.mediaType === "avatar");
  const coverRow = rows.find((row) => row.mediaType === "cover");
  const gallery = rows
    .filter((row) => row.mediaType === "gallery")
    .map(
      (row): ProfileMediaItem => ({
        photoId: row.photoId,
        username: row.username,
        mediaType: row.mediaType,
        dataUrl: row.dataUrl,
        caption: row.caption,
        uploadedAt: row.uploadedAt,
      }),
    )
    .sort((left, right) => right.uploadedAt.localeCompare(left.uploadedAt));

  return {
    username,
    avatar: avatarRow?.dataUrl ?? null,
    cover: coverRow?.dataUrl ?? null,
    gallery,
  };
}

async function assertCanEditProfile(actingUsername: string, targetUsername: string) {
  const normalizedActor = normalizeUsername(actingUsername);
  const normalizedTarget = normalizeUsername(targetUsername);

  if (!normalizedActor || !normalizedTarget) {
    throw new Error("Both usernames are required.");
  }

  if (normalizedActor !== normalizedTarget) {
    throw new Error("You can only update your own profile photos.");
  }

  const users = await getUsers();
  if (!users.some((user) => normalizeUsername(user.username) === normalizedActor)) {
    throw new Error("Account not found.");
  }
}

export async function getProfileMediaBundle(username: string): Promise<ProfileMediaBundle> {
  const trimmedUsername = username.trim();
  if (!trimmedUsername) {
    throw new Error("Username is required.");
  }

  const rows = await getProfileMediaForUser(trimmedUsername);
  return toBundle(trimmedUsername, rows);
}

export async function saveProfileMedia(
  targetUsername: string,
  input: SaveProfileMediaInput,
): Promise<ProfileMediaBundle> {
  await assertCanEditProfile(input.actingUsername, targetUsername);

  if (input.mediaType === "gallery") {
    await addProfileGalleryPhoto({
      username: targetUsername,
      dataUrl: input.dataUrl,
      caption: input.caption,
    });
  } else {
    await upsertProfileMedia({
      username: targetUsername,
      mediaType: input.mediaType,
      dataUrl: input.dataUrl,
    });
  }

  return getProfileMediaBundle(targetUsername);
}

export async function deleteProfileMediaPhoto(input: {
  targetUsername: string;
  actingUsername: string;
  photoId: string;
  mediaType: ProfileMediaType;
}) {
  await assertCanEditProfile(input.actingUsername, input.targetUsername);

  if (input.mediaType !== "gallery") {
    throw new Error("Only gallery photos can be deleted.");
  }

  await removeProfileGalleryPhoto({
    username: input.targetUsername,
    photoId: input.photoId,
  });

  return getProfileMediaBundle(input.targetUsername);
}
