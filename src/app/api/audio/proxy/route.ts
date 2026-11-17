import { NextResponse } from "next/server";
import { getAuthorizedTeacherToken } from "@/lib/backend";

const ALLOWED_HOSTS = new Set([
  "drive.google.com",
  "drive.usercontent.google.com",
]);

export async function GET(request: Request) {
  if (!(await getAuthorizedTeacherToken())) {
    return NextResponse.json({ message: "Sesión docente no válida." }, { status: 403 });
  }

  const target = new URL(request.url).searchParams.get("url");
  if (!target) {
    return NextResponse.json({ message: "Falta la URL del audio." }, { status: 400 });
  }

  let parsed: URL;
  try {
    parsed = new URL(target);
  } catch {
    return NextResponse.json({ message: "URL de audio inválida." }, { status: 400 });
  }
  if (parsed.protocol !== "https:" || !ALLOWED_HOSTS.has(parsed.hostname)) {
    return NextResponse.json({ message: "Origen de audio no permitido." }, { status: 400 });
  }

  const upstream = await fetch(parsed, { redirect: "follow" });
  if (!upstream.ok || !upstream.body) {
    return NextResponse.json({ message: "No fue posible obtener el audio." }, { status: 502 });
  }

  return new NextResponse(upstream.body, {
    headers: {
      "Content-Type": upstream.headers.get("content-type") ?? "audio/mpeg",
      "Cache-Control": "private, max-age=3600",
    },
  });
}
