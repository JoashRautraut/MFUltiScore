const MAX_DATA_URL_LENGTH = 48_000;

function loadImageFromFile(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const image = new Image();

    image.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Could not read the image."));
    };
    image.src = objectUrl;
  });
}

function canvasToDataUrl(canvas: HTMLCanvasElement, quality: number) {
  return canvas.toDataURL("image/jpeg", quality);
}

function drawScaledImage(image: HTMLImageElement, maxDimension: number) {
  const scale = Math.min(1, maxDimension / Math.max(image.width, image.height));
  const width = Math.max(1, Math.round(image.width * scale));
  const height = Math.max(1, Math.round(image.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("Could not prepare the image.");
  }

  context.drawImage(image, 0, 0, width, height);
  return canvas;
}

export async function compressImageForUpload(file: File): Promise<string> {
  if (!file.type.startsWith("image/")) {
    throw new Error("Please choose an image file.");
  }

  const image = await loadImageFromFile(file);

  for (const maxDimension of [1600, 1200, 960, 720, 540, 420]) {
    const canvas = drawScaledImage(image, maxDimension);

    for (const quality of [0.88, 0.8, 0.72, 0.64, 0.56, 0.48]) {
      const dataUrl = canvasToDataUrl(canvas, quality);
      if (dataUrl.length <= MAX_DATA_URL_LENGTH) {
        return dataUrl;
      }
    }
  }

  throw new Error("Image is too large. Try a smaller photo.");
}
