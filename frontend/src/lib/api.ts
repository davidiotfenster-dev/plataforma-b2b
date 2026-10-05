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
      // Con FormData el navegador pone el Content-Type (con el boundary) él solo.
      ...(init?.body instanceof FormData ? {} : { "Content-Type": "application/json" }),
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
  delete: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: "DELETE", body: body ? JSON.stringify(body) : undefined }),
  upload: <T>(path: string, formData: FormData) => request<T>(path, { method: "POST", body: formData }),
};

/// Descarga un archivo protegido por la sesión (un `<a href>` directo no siempre
/// llevaría la cookie) y lo guarda con el nombre indicado.
export async function descargarArchivo(path: string, nombre: string): Promise<void> {
  const res = await fetch(`${API_URL}${path}`, { credentials: "include" });
  if (!res.ok) {
    const body = await res.json().catch(() => ({ message: res.statusText }));
    throw new ApiError(res.status, body.message ?? "Error de red", body.codigo);
  }
  const url = URL.createObjectURL(await res.blob());
  const enlace = document.createElement("a");
  enlace.href = url;
  enlace.download = nombre;
  document.body.appendChild(enlace);
  enlace.click();
  enlace.remove();
  URL.revokeObjectURL(url);
}

/// Las fotos las sirve el backend (`/imagenes/<archivo>`); la base guarda solo la ruta.
export function urlImagen(ruta: string | null | undefined): string | null {
  if (!ruta) return null;
  return ruta.startsWith("/imagenes/") ? `${API_URL}${ruta}` : ruta;
}
