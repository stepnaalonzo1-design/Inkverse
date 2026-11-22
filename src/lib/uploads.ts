import { mkdir, readFile, writeFile } from "node:fs/promises";
import { randomBytes } from "node:crypto";
import path from "node:path";

/** Uploaded images live outside /public and are served through /api/media/[name]. */
export const UPLOAD_DIR = process.env.UPLOAD_DIR
  ? path.resolve(process.env.UPLOAD_DIR)
  : path.join(process.cwd(), "uploads");

const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;
const EXTENSION_BY_TYPE: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};
const MIME_BY_EXTENSION: Record<string, string> = {
  jpg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
};
const MEDIA_NAME_PATTERN = /^[a-f0-9]{32}\.(jpg|png|webp|gif)$/;

function matchesSignature(buffer: Buffer, extension: string): boolean {
  switch (extension) {
    case "jpg":
      return buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
    case "png":
      return buffer
        .subarray(0, 8)
        .equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
    case "gif":
      return buffer.subarray(0, 4).toString("ascii") === "GIF8";
    case "webp":
      return (
        buffer.subarray(0, 4).toString("ascii") === "RIFF" &&
        buffer.subarray(8, 12).toString("ascii") === "WEBP"
      );
    default:
      return false;
  }
}

export type UploadResult = { ok: true; url: string } | { ok: false; error: string };

/** Validates type, size and file signature (magic bytes), then stores the image under a random name. */
export async function saveImageUpload(file: File): Promise<UploadResult> {
  const extension = EXTENSION_BY_TYPE[file.type];
  if (!extension) {
    return { ok: false, error: "Only JPG, PNG, WEBP or GIF images are allowed." };
  }
  if (file.size <= 0) {
    return { ok: false, error: "The selected file is empty." };
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return { ok: false, error: "Images must be 8 MB or smaller." };
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  if (!matchesSignature(buffer, extension)) {
    return { ok: false, error: "The file contents do not match an image type." };
  }

  const name = `${randomBytes(16).toString("hex")}.${extension}`;
  await mkdir(UPLOAD_DIR, { recursive: true });
  // Path is built from a server-generated random name only, never from user input.
  await writeFile(path.join(/*turbopackIgnore: true*/ UPLOAD_DIR, name), buffer);
  return { ok: true, url: `/api/media/${name}` };
}

export async function readUpload(
  name: string,
): Promise<{ data: Buffer; contentType: string } | null> {
  if (!MEDIA_NAME_PATTERN.test(name)) return null;
  const extension = name.split(".").pop() ?? "";
  try {
    // `name` has already been validated against MEDIA_NAME_PATTERN above, so traversal is impossible.
    const data = await readFile(path.join(/*turbopackIgnore: true*/ UPLOAD_DIR, name));
    return { data, contentType: MIME_BY_EXTENSION[extension] ?? "application/octet-stream" };
  } catch {
    return null;
  }
}
