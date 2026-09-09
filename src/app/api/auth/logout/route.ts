import { NextResponse } from "next/server";
import {
  ACCESS_COOKIE,
  getAccessToken,
  getBackendUrl,
  PROFILE_COOKIE,
} from "@/lib/backend";

export async function POST() {
  const accessToken = await getAccessToken();
  if (accessToken) {
    await fetch(getBackendUrl("auth/logout"), {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: "no-store",
    }).catch(() => undefined);
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.delete(ACCESS_COOKIE);
  response.cookies.delete(PROFILE_COOKIE);
  return response;
}
