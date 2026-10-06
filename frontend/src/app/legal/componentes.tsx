import type { ReactNode } from "react";
import type { CampoLegal } from "./campos";
import { obtenerAjustesLegales } from "./datos";

export const ETIQUETAS_LEGALES: Record<CampoLegal, string> = {
  razonSocial: "razón social",
  cif: "CIF",
  domicilio: "domicilio social",
  emailContacto: "email de contacto",
  emailPrivacidad: "email de privacidad",
  telefono: "teléfono",
  registroMercantil: "datos del Registro Mercantil",
  alojamiento: "proveedor de alojamiento y país",
  ciudadTribunales: "ciudad de los tribunales",
  portes: "portes y pedido mínimo",
  formaPago: "forma de pago por defecto",
  devoluciones: "devoluciones e incidencias de transporte",
  plazoRegistros: "plazo de conservación de los registros",
};

/// Pinta un dato de los ajustes legales o, si aún no está rellenado en el
/// panel (Admin › Datos legales), un marcador ámbar bien visible.
export async function Dato({ campo }: { campo: CampoLegal }) {
  const valor = (await obtenerAjustesLegales())[campo];
  if (valor) return <>{valor}</>;
  return <Pendiente>{ETIQUETAS_LEGALES[campo]}</Pendiente>;
}

/// Marcador ámbar para cualquier dato o cláusula que falte por decidir.
export function Pendiente({ children }: { children: ReactNode }) {
  return <mark className="rounded bg-amber-100 px-1 text-amber-900">[pendiente: {children}]</mark>;
}

export function Seccion({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold text-neutral-900">{titulo}</h2>
      {children}
    </section>
  );
}

export function Lista({ children }: { children: ReactNode }) {
  return <ul className="list-disc space-y-1.5 pl-5">{children}</ul>;
}
