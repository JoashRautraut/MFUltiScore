"use client";

type ProfilePhotoLightboxProps = {
  photo: string;
  alt: string;
  open: boolean;
  onClose: () => void;
};

export function ProfilePhotoLightbox({ photo, alt, open, onClose }: ProfilePhotoLightboxProps) {
  if (!open) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={`${alt} profile photo`}
    >
      <button
        type="button"
        onClick={onClose}
        className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-xl text-white transition hover:bg-white/20"
        aria-label="Close photo"
      >
        ×
      </button>

      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={photo}
        alt={alt}
        className="max-h-[85vh] max-w-full rounded-2xl object-contain shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      />
    </div>
  );
}
