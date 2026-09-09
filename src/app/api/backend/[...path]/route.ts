import { NextResponse } from "next/server";
import { getAccessToken, getBackendUrl } from "@/lib/backend";

type RouteContext = {
  params: Promise<{ path: string[] }>;
};

async function proxyRequest(request: Request, context: RouteContext) {
  const token = await getAccessToken();
  if (!token) {
    return NextResponse.json({ message: "Sesión no válida." }, { status: 401 });
  }

  const { path } = await context.params;
  const sourceUrl = new URL(request.url);
  const targetUrl = new URL(getBackendUrl(path.join("/")));
  targetUrl.search = sourceUrl.search;

  const headers = new Headers();
  headers.set("Authorization", `Bearer ${token}`);
  const contentType = request.headers.get("content-type");
  if (contentType) headers.set("Content-Type", contentType);

  const method = request.method;
  const body = method === "GET" || method === "HEAD" ? undefined : await request.arrayBuffer();

  try {
    const backendResponse = await fetch(targetUrl, {
      method,
      headers,
      body,
      cache: "no-store",
    });
    const responseHeaders = new Headers();
    const responseType = backendResponse.headers.get("content-type");
    if (responseType) responseHeaders.set("Content-Type", responseType);
    return new NextResponse(backendResponse.body, {
      status: backendResponse.status,
      headers: responseHeaders,
    });
  } catch {
    return NextResponse.json(
      { message: "No pudimos conectar con el backend." },
      { status: 502 },
    );
  }
}

export const GET = proxyRequest;
export const POST = proxyRequest;
export const PATCH = proxyRequest;
export const DELETE = proxyRequest;
