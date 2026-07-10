export type ProfileMediaType = "avatar" | "cover" | "gallery";

export type ProfileMediaItem = {
  photoId: string;
  username: string;
  mediaType: ProfileMediaType;
  dataUrl: string;
  caption: string;
  uploadedAt: string;
};

export type ProfileMediaBundle = {
  username: string;
  avatar: string | null;
  cover: string | null;
  gallery: ProfileMediaItem[];
};

export type SaveProfileMediaInput = {
  actingUsername: string;
  mediaType: ProfileMediaType;
  dataUrl: string;
  caption?: string;
};
