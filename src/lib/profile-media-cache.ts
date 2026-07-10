import { clearCoverPhoto, saveCoverPhoto } from "@/lib/profile-cover-photo";
import { replaceGalleryPhotos } from "@/lib/profile-gallery";
import { clearProfilePhoto, saveProfilePhoto } from "@/lib/profile-photo";
import type { ProfileMediaBundle } from "@/types/profile-media";

export function cacheProfileMediaBundle(bundle: ProfileMediaBundle) {
  if (bundle.avatar) {
    saveProfilePhoto(bundle.username, bundle.avatar);
  } else {
    clearProfilePhoto(bundle.username);
  }

  if (bundle.cover) {
    saveCoverPhoto(bundle.username, bundle.cover);
  } else {
    clearCoverPhoto(bundle.username);
  }

  replaceGalleryPhotos(
    bundle.username,
    bundle.gallery.map((item) => ({
      id: item.photoId,
      dataUrl: item.dataUrl,
      uploadedAt: item.uploadedAt,
    })),
  );
}
