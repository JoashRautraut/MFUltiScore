const STORAGE_PREFIX = "mfultiscore_gallery_photos";
const MAX_PHOTOS = 12;
const MAX_BYTES = 1_200_000;

export type GalleryPhoto = {
  id: string;
  dataUrl: string;
  uploadedAt: string;
};

function storageKey(username: string) {
  return `${STORAGE_PREFIX}:${username}`;
}

function createPhotoId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function loadGalleryPhotos(username: string): GalleryPhoto[] {
  if (typeof window === "undefined") {
    return [];
  }

  const raw = localStorage.getItem(storageKey(username));
  if (!raw) {
    return [];
  }

  try {
    const photos = JSON.parse(raw) as GalleryPhoto[];
    return Array.isArray(photos) ? photos : [];
  } catch {
    return [];
  }
}

function saveGalleryPhotos(username: string, photos: GalleryPhoto[]) {
  if (typeof window === "undefined") {
    return;
  }

  localStorage.setItem(storageKey(username), JSON.stringify(photos));
}

export function readGalleryPhotoFile(file: File): Promise<string> {
  if (!file.type.startsWith("image/")) {
    return Promise.reject(new Error("Please choose an image file."));
  }

  if (file.size > MAX_BYTES) {
    return Promise.reject(new Error("Each photo must be smaller than 1.2 MB."));
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
      } else {
        reject(new Error("Could not read the image."));
      }
    };
    reader.onerror = () => reject(new Error("Could not read the image."));
    reader.readAsDataURL(file);
  });
}

export function addGalleryPhoto(username: string, dataUrl: string): GalleryPhoto[] {
  const photos = loadGalleryPhotos(username);
  if (photos.length >= MAX_PHOTOS) {
    throw new Error(`You can upload up to ${MAX_PHOTOS} photos.`);
  }

  const nextPhoto: GalleryPhoto = {
    id: createPhotoId(),
    dataUrl,
    uploadedAt: new Date().toISOString(),
  };

  const next = [nextPhoto, ...photos];
  saveGalleryPhotos(username, next);
  return next;
}

export function removeGalleryPhoto(username: string, photoId: string): GalleryPhoto[] {
  const next = loadGalleryPhotos(username).filter((photo) => photo.id !== photoId);
  saveGalleryPhotos(username, next);
  return next;
}

export function getGalleryPhotoLimit() {
  return MAX_PHOTOS;
}
