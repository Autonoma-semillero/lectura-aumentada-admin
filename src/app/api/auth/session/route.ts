import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import {
  ACCESS_COOKIE,
  decodeProfile,
  PROFILE_COOKIE,
} from "@/lib/backend";

export async function GET() {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get(ACCESS_COOKIE)?.value;
  const profile = decodeProfile(cookieStore.get(PROFILE_COOKIE)?.value);
  if (!accessToken || !profile) {
    return NextResponse.json({ message: "Sesión no válida." }, { status: 401 });
  }
  return NextResponse.json({ user: profile });
}
