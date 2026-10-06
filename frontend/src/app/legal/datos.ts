import { cache } from "react";
import { CAMPOS_LEGALES, type AjustesLegales, type CampoLegal } from "./campos";

/// Fecha de la última revisión de la redacción de los textos. La que se
/// muestra es la más reciente entre esta y el último cambio de datos.
const REVISION_TEXTOS = "2026-10-06";

/// En el servidor se puede llamar al backend por una dirección interna
/// (`API_URL_INTERNA`); si no, por la misma que usa el navegador.
const API_URL = process.env.API_URL_INTERNA ?? process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3010";

const SIN_DATOS: AjustesLegales = {
  ...(Object.fromEntries(CAMPOS_LEGALES.map((c) => [c, null])) as Record<CampoLegal, null>),
  updatedAt: null,
};

/// Una sola petición por render aunque varias piezas de la página la pidan.
/// Sin caché entre peticiones: un cambio en el panel se ve al recargar.
export const obtenerAjustesLegales = cache(async (): Promise<AjustesLegales> => {
  try {
    const res = await fetch(`${API_URL}/ajustes-legales`, { cache: "no-store" });
    if (!res.ok) return SIN_DATOS;
    return { ...SIN_DATOS, ...((await res.json()) as Partial<AjustesLegales>) };
  } catch {
    return SIN_DATOS;
  }
});

export async function ultimaActualizacionLegal(): Promise<string> {
  const { updatedAt } = await obtenerAjustesLegales();
  const fecha = new Date(updatedAt && updatedAt > REVISION_TEXTOS ? updatedAt : REVISION_TEXTOS);
  return fecha.toLocaleDateString("es-ES", { day: "numeric", month: "long", year: "numeric", timeZone: "Europe/Madrid" });
}
