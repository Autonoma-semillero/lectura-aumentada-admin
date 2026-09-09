export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

export async function apiFetch<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const response = await fetch(`/api/backend/${path.replace(/^\/+/, "")}`, {
    ...init,
    headers: {
      ...(init?.body instanceof FormData
        ? {}
        : { "Content-Type": "application/json" }),
      ...init?.headers,
    },
  });

  if (response.status === 401) {
    window.location.replace("/login");
    throw new ApiError("Tu sesión expiró.", 401);
  }

  const contentType = response.headers.get("content-type") ?? "";
  const payload = contentType.includes("application/json")
    ? await response.json()
    : await response.text();

  if (!response.ok) {
    const rawMessage =
      typeof payload === "object" && payload && "message" in payload
        ? String((payload as { message: unknown }).message)
        : String(payload || "No fue posible completar la solicitud.");
    throw new ApiError(toFriendlyMessage(rawMessage, response.status), response.status);
  }

  return payload as T;
}

function toFriendlyMessage(message: string, status: number): string {
  if (status === 409 && message.toLowerCase().includes("marker")) {
    return "Ese marcador ya está asociado a otro modelo 3D.";
  }
  if (status === 409) return "Ya existe un registro con esos datos.";
  if (status === 403) return "Tu cuenta no tiene permiso para realizar esta acción.";
  if (status === 404) return "No encontramos el registro solicitado.";
  return message;
}
