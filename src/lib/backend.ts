import { cookies } from "next/headers";

export const ACCESS_COOKIE = "lectura_teacher_access";
export const PROFILE_COOKIE = "lectura_teacher_profile";

export type TeacherProfile = {
  id: string;
  email: string;
  display_name?: string;
  roles: string[];
};

const DEFAULT_BACKEND_URL =
  "https://lectura-aumentada-backend-jc.vercel.app/api";

export function getBackendUrl(path: string): string {
  const baseUrl = (process.env.BACKEND_BASE_URL ?? DEFAULT_BACKEND_URL)
    .trim()
    .replace(/\/+$/, "");
  return `${baseUrl}/${path.replace(/^\/+/, "")}`;
}

export async function getAccessToken(): Promise<string | undefined> {
  return (await cookies()).get(ACCESS_COOKIE)?.value;
}

export async function getAuthorizedTeacherToken(): Promise<string | null> {
  const token = await getAccessToken();
  if (!token) return null;
  try {
    const response = await fetch(getBackendUrl("docente/students"), {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    return response.ok ? token : null;
  } catch {
    return null;
  }
}

export function encodeProfile(profile: TeacherProfile): string {
  return Buffer.from(JSON.stringify(profile), "utf8").toString("base64url");
}

export function decodeProfile(value?: string): TeacherProfile | null {
  if (!value) return null;
  try {
    return JSON.parse(
      Buffer.from(value, "base64url").toString("utf8"),
    ) as TeacherProfile;
  } catch {
    return null;
  }
}
