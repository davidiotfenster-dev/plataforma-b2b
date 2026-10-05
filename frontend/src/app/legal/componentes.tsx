import type { ReactNode } from "react";
import { DATOS_EMPRESA } from "./datos-empresa";

const ETIQUETAS: Record<keyof typeof DATOS_EMPRESA, string> = {
  razonSocial: "razón social",
  cif: "CIF",
  domicilio: "domicilio social",
  emailContacto: "email de contacto",
  emailPrivacidad: "email de privacidad",
  telefono: "teléfono",
  registroMercantil: "datos del Registro Mercantil",
  alojamiento: "proveedor de alojamiento y país",
  ciudadTribunales: "ciudad de los tribunales",
};

/// Pinta un dato de la empresa o, si aún no está rellenado en
/// `datos-empresa.ts`, un marcador ámbar bien visible.
export function Dato({ campo }: { campo: keyof typeof DATOS_EMPRESA }) {
  const valor = DATOS_EMPRESA[campo];
  if (valor) return <>{valor}</>;
  return <Pendiente>{ETIQUETAS[campo]}</Pendiente>;
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
