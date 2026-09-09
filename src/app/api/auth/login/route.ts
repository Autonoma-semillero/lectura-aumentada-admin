import { NextResponse } from "next/server";
import {
  ACCESS_COOKIE,
  encodeProfile,
  getBackendUrl,
  PROFILE_COOKIE,
  type TeacherProfile,
} from "@/lib/backend";

type LoginResponse = {
  accessToken: string;
  user: TeacherProfile;
};

export async function POST(request: Request) {
  let credentials: unknown;
  try {
    credentials = await request.json();
  } catch {
    return NextResponse.json({ message: "Datos de acceso inválidos." }, { status: 400 });
  }

  try {
    const backendResponse = await fetch(getBackendUrl("auth/login"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(credentials),
      cache: "no-store",
    });
    const payload = (await backendResponse.json()) as LoginResponse & {
      message?: string;
    };

    if (!backendResponse.ok) {
      return NextResponse.json(
        { message: "Correo o contraseña incorrectos." },
        { status: backendResponse.status },
      );
    }

    const isTeacher = payload.user.roles.includes("teacher");
    if (!isTeacher) {
      await fetch(getBackendUrl("auth/logout"), {
        method: "POST",
        headers: { Authorization: `Bearer ${payload.accessToken}` },
        cache: "no-store",
      }).catch(() => undefined);
      return NextResponse.json(
        { message: "Este panel es exclusivo para profesores." },
        { status: 403 },
      );
    }

    const response = NextResponse.json({ user: payload.user });
    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax" as const,
      path: "/",
      maxAge: 60 * 60 * 8,
    };
    response.cookies.set(ACCESS_COOKIE, payload.accessToken, cookieOptions);
    response.cookies.set(PROFILE_COOKIE, encodeProfile(payload.user), cookieOptions);
    return response;
  } catch {
    return NextResponse.json(
      { message: "No pudimos conectar con el servicio. Intenta nuevamente." },
      { status: 502 },
    );
  }
}
