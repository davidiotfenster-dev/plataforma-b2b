"use client";

import { useTranslations } from "next-intl";
import type { EstadoPartner, Partner } from "@/lib/types";

const ESTILOS_ESTADO: Record<EstadoPartner, { texto: string; punto: string }> = {
  PENDIENTE_VERIFICACION_EMAIL: { texto: "bg-neutral-100 text-neutral-600", punto: "bg-neutral-400" },
  PENDIENTE_APROBACION: { texto: "bg-amber-50 text-amber-800", punto: "bg-amber-500" },
  ACTIVO: { texto: "bg-green-50 text-green-800", punto: "bg-green-500" },
  SUSPENDIDO: { texto: "bg-red-50 text-red-700", punto: "bg-red-500" },
  RECHAZADO: { texto: "bg-neutral-100 text-neutral-500", punto: "bg-neutral-400" },
};

/// Estado del partner con un punto de color, más fácil de escanear en una lista.
export function EstadoPartnerBadge({ estado }: { estado: EstadoPartner }) {
  const t = useTranslations("estadosPartner");
  const estilo = ESTILOS_ESTADO[estado];
  return (
    // Los textos largos ("Pendiente de verificación de email") se parten en dos líneas en vez de invadir la columna vecina.
    <span className={`inline-flex max-w-full items-center gap-1.5 rounded-full px-2.5 py-1 text-left text-xs font-medium leading-tight ${estilo.texto}`}>
      <span className={`size-1.5 shrink-0 rounded-full ${estilo.punto}`} aria-hidden="true" />
      {t(estado)}
    </span>
  );
}

const COLORES_AVATAR = [
  "bg-sky-100 text-sky-700",
  "bg-emerald-100 text-emerald-700",
  "bg-violet-100 text-violet-700",
  "bg-amber-100 text-amber-700",
  "bg-rose-100 text-rose-700",
  "bg-teal-100 text-teal-700",
];

/// Iniciales sobre un color fijo por partner: distingue las filas de un vistazo
/// sin necesitar un logotipo.
export function PartnerAvatar({ nombre, tamano = "md" }: { nombre: string; tamano?: "md" | "lg" }) {
  const palabras = nombre.replace(/[^\p{L}\p{N}\s]/gu, " ").split(/\s+/).filter(Boolean);
  const iniciales = (palabras.length > 1 ? palabras[0][0] + palabras[1][0] : (palabras[0] ?? "?").slice(0, 2)).toUpperCase();
  let hash = 0;
  for (const caracter of nombre) hash = (hash * 31 + caracter.charCodeAt(0)) >>> 0;
  const color = COLORES_AVATAR[hash % COLORES_AVATAR.length];
  const medidas = tamano === "lg" ? "size-12 text-base" : "size-9 text-sm";
  return (
    <span className={`inline-flex shrink-0 items-center justify-center rounded-lg font-semibold ${medidas} ${color}`} aria-hidden="true">
      {iniciales}
    </span>
  );
}

/// Un partner dado de alta desde un listado lleva datos provisionales ("PENDIENTE-...")
/// hasta que se completa su ficha. Debe coincidir con la condición del backend.
export function tieneDatosPorCompletar(partner: Pick<Partner, "cif" | "dominioWeb" | "direccionFiscal">): boolean {
  return (
    partner.cif.toUpperCase().startsWith("PENDIENTE") ||
    partner.dominioWeb.endsWith(".pendiente.test") ||
    partner.direccionFiscal === "Pendiente de completar"
  );
}
