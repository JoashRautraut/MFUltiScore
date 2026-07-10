const STORAGE_PREFIX = "mfultiscore_cover_photo";
const MAX_BYTES = 2_500_000;

function storageKey(username: string) {
  return `${STORAGE_PREFIX}:${username}`;
}

export function loadCoverPhoto(username: string): string | null {
  if (typeof window === "undefined") {
    return null;
  }

  return localStorage.getItem(storageKey(username));
}

export function saveCoverPhoto(username: string, dataUrl: string) {
  if (typeof window === "undefined") {
    return;
  }

  localStorage.setItem(storageKey(username), dataUrl);
}

export function clearCoverPhoto(username: string) {
  if (typeof window === "undefined") {
    return;
  }

  localStorage.removeItem(storageKey(username));
}

export function readCoverPhotoFile(file: File): Promise<string> {
  if (!file.type.startsWith("image/")) {
    return Promise.reject(new Error("Please choose an image file."));
  }

  if (file.size > MAX_BYTES) {
    return Promise.reject(new Error("Cover photo must be smaller than 2.5 MB."));
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
