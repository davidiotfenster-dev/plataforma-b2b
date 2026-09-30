const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3010";

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    /// Código de negocio opcional (p. ej. PRECIOS_CAMBIADOS) para mostrar un aviso traducido.
    public code?: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({ message: res.statusText }));
    // Nest devuelve una lista de textos cuando falla la validación de varios campos.
    const mensaje = Array.isArray(body.message) ? body.message.join(" · ") : body.message;
    throw new ApiError(res.status, mensaje ?? "Error de red", body.codigo);
  }

  if (res.status === 204) {
    return undefined as T;
  }

  return res.json() as Promise<T>;
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: "POST", body: body ? JSON.stringify(body) : undefined }),
  patch: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: "PATCH", body: body ? JSON.stringify(body) : undefined }),
  delete: <T>(path: string) => request<T>(path, { method: "DELETE" }),
};
