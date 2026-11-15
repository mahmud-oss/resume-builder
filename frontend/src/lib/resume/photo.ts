const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_FILE_BYTES = 5 * 1024 * 1024;
const OUTPUT_SIZE = 400;

export class PhotoError extends Error {}

/**
 * Validates a chosen photo and turns it into a small square JPEG (data URL) so it can be
 * stored with the resume. The picture is centre-cropped to a square.
 */
export async function processPhoto(file: File): Promise<string> {
  if (!ALLOWED_TYPES.includes(file.type)) {
    throw new PhotoError("Please choose a JPG, PNG or WebP image.");
  }
  if (file.size > MAX_FILE_BYTES) {
    throw new PhotoError("The image is too large. Please choose one under 5 MB.");
  }

  const bitmap = await createImageBitmap(file).catch(() => {
    throw new PhotoError("That image could not be read. Please try another one.");
  });

  const side = Math.min(bitmap.width, bitmap.height);
  const sx = (bitmap.width - side) / 2;
  const sy = (bitmap.height - side) / 2;

  const canvas = document.createElement("canvas");
  canvas.width = OUTPUT_SIZE;
  canvas.height = OUTPUT_SIZE;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new PhotoError("Your browser could not process the image.");
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, OUTPUT_SIZE, OUTPUT_SIZE);
  ctx.drawImage(bitmap, sx, sy, side, side, 0, 0, OUTPUT_SIZE, OUTPUT_SIZE);
  bitmap.close();

  return canvas.toDataURL("image/jpeg", 0.85);
}
