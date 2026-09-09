import { put } from "@vercel/blob";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { getAuthorizedTeacherToken } from "@/lib/backend";

const MAX_AUDIO_BYTES = 10 * 1024 * 1024;
const ALLOWED_EXTENSIONS = new Set(["m4a", "mp3", "wav"]);

export async function POST(request: Request) {
  if (!(await getAuthorizedTeacherToken())) return NextResponse.json({ message: "Sesión docente no válida." }, { status: 403 });
  const formData = await request.formData();
  const audio = formData.get("file");
  if (!(audio instanceof File)) return NextResponse.json({ message: "Selecciona un audio." }, { status: 400 });
  const extension = audio.name.toLowerCase().split(".").pop() ?? "";
  if (!ALLOWED_EXTENSIONS.has(extension)) return NextResponse.json({ message: "Usa un archivo M4A, MP3 o WAV." }, { status: 400 });
  if (audio.size === 0 || audio.size > MAX_AUDIO_BYTES) return NextResponse.json({ message: "El audio debe pesar menos de 10 MB." }, { status: 413 });

  const bytes = new Uint8Array(await audio.arrayBuffer());
  const safeName = audio.name.replace(/[^a-zA-Z0-9._-]/g, "-");
  const storageName = `${crypto.randomUUID()}-${safeName}`;
  if (process.env.BLOB_READ_WRITE_TOKEN) {
    const blob = await put(`audio/${storageName}`, Buffer.from(bytes), {
      access: "public",
      contentType: audio.type || "application/octet-stream",
      token: process.env.BLOB_READ_WRITE_TOKEN,
    });
    return NextResponse.json({ url: blob.url });
  }
  if (process.env.NODE_ENV === "production") return NextResponse.json({ message: "Configura el almacenamiento de audio antes de cargar archivos." }, { status: 503 });

  const uploadDirectory = path.join(process.cwd(), "public", "uploads", "audio");
  await mkdir(uploadDirectory, { recursive: true });
  await writeFile(path.join(uploadDirectory, storageName), bytes);
  return NextResponse.json({ url: `${new URL(request.url).origin}/uploads/audio/${storageName}` });
}
