import "server-only";

import { put } from "@vercel/blob";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

export async function storeAudio(
  bytes: Uint8Array,
  fileName: string,
  contentType: string,
  origin: string,
): Promise<string> {
  const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, "-");
  const storageName = `${crypto.randomUUID()}-${safeName}`;

  if (process.env.BLOB_READ_WRITE_TOKEN) {
    const blob = await put(`audio/${storageName}`, Buffer.from(bytes), {
      access: "public",
      contentType,
      token: process.env.BLOB_READ_WRITE_TOKEN,
    });
    return blob.url;
  }

  if (process.env.NODE_ENV === "production") {
    throw new Error("Configura el almacenamiento de audio antes de guardar archivos.");
  }

  const uploadDirectory = path.join(process.cwd(), "public", "uploads", "audio");
  await mkdir(uploadDirectory, { recursive: true });
  await writeFile(path.join(uploadDirectory, storageName), bytes);
  return `${origin}/uploads/audio/${storageName}`;
}
