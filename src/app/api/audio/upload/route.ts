import { NextResponse } from "next/server";
import { storeAudio } from "@/lib/audio-storage";
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
  try {
    const url = await storeAudio(bytes, audio.name, audio.type || "application/octet-stream", new URL(request.url).origin);
    return NextResponse.json({ url });
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : "No fue posible guardar el audio.";
    return NextResponse.json({ message }, { status: 503 });
  }
}
