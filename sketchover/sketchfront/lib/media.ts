// Turns a picked file into something the Roomwright API accepts: PNG or JPEG, base64, kept small.
import type { ImageInput } from "./roomwright";

export type PickedImage = ImageInput & {
  preview: string; // data URL for the thumbnail
  aspect: "square" | "landscape" | "portrait";
};

const SIZES = [1280, 1024, 768]; // longest side, tried in order until the file is small enough
const MAX_CHARS = 1_200_000; // base64 length per image; keeps 4 images under typical host body limits

export async function fileToImageInput(file: File): Promise<PickedImage> {
  if (!file.type.startsWith("image/"))
    throw new Error("Attach images only (JPG, PNG or WebP). PDFs aren't supported yet.");

  const bmp = await createImageBitmap(file).catch(() => null);
  if (!bmp) throw new Error("Couldn't read that image. Try a JPG or PNG.");

  const ratio = bmp.width / bmp.height;
  const aspect = ratio > 1.15 ? "landscape" : ratio < 0.87 ? "portrait" : "square";
  const longest = Math.max(bmp.width, bmp.height);

  for (const max of SIZES) {
    const scale = Math.min(1, max / longest);
    const w = Math.max(1, Math.round(bmp.width * scale));
    const h = Math.max(1, Math.round(bmp.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) break;
    ctx.fillStyle = "#fff"; // flatten transparency so line drawings stay readable
    ctx.fillRect(0, 0, w, h);
    ctx.drawImage(bmp, 0, 0, w, h);

    // Line drawings are smaller as PNG; photos fall through to JPEG.
    for (const fmt of [
      { mime: "image/png" as const },
      { mime: "image/jpeg" as const, q: 0.9 },
    ]) {
      const url = canvas.toDataURL(fmt.mime, (fmt as { q?: number }).q);
      if (url.length <= MAX_CHARS) {
        bmp.close();
        return { data: url.split(",")[1], mime: fmt.mime, preview: url, aspect };
      }
    }
  }
  bmp.close();
  throw new Error("That image is too large. Try a smaller one.");
}
