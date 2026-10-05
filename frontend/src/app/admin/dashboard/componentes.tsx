"use client";

import { useMemo } from "react";
import { useLocale, useTranslations } from "next-intl";
import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import type { EstadoPedido } from "@/lib/types";

export const ORDEN_ESTADOS: EstadoPedido[] = ["RECIBIDO", "CONFIRMADO", "EN_PREPARACION", "PREPARADO", "ENVIADO", "CANCELADO"];

export const COLOR_ESTADO: Record<EstadoPedido, string> = {
  RECIBIDO: "#a3a3a3",
  CONFIRMADO: "#3b82f6",
  EN_PREPARACION: "#f59e0b",
  PREPARADO: "#a855f7",
  ENVIADO: "#22c55e",
  CANCELADO: "#ef4444",
};

/// Formateadores en el idioma del usuario (euros, números, fechas).
export function useFormatos() {
  const locale = useLocale();
  return useMemo(() => {
    const euros = new Intl.NumberFormat(locale, { style: "currency", currency: "EUR", maximumFractionDigits: 0 });
    const eurosCompacto = new Intl.NumberFormat(locale, { style: "currency", currency: "EUR", notation: "compact", maximumFractionDigits: 1 });
    const numero = new Intl.NumberFormat(locale);
    const porcentaje = new Intl.NumberFormat(locale, { style: "percent", maximumFractionDigits: 0 });
    const fechaLarga = new Intl.DateTimeFormat(locale, { day: "numeric", month: "short", year: "numeric" });
    return {
      euros: (n: number) => euros.format(n),
      eurosCompacto: (n: number) => eurosCompacto.format(n),
      numero: (n: number) => numero.format(n),
      porcentaje: (n: number) => porcentaje.format(n),
      fechaLarga: (isoDia: string) => fechaLarga.format(new Date(`${isoDia}T00:00:00`)),
    };
  }, [locale]);
}

/// Variación frente al periodo anterior. Con icono y signo, no solo color.
export function Variacion({ actual, anterior }: { actual: number; anterior: number }) {
  const t = useTranslations("adminDashboard");
  const f = useFormatos();
  if (anterior === 0) {
    return <span className="text-neutral-400">{t("vsPrevious.none")}</span>;
  }
  const cambio = (actual - anterior) / anterior;
  const plano = Math.abs(cambio) < 0.005;
  const Icono = plano ? Minus : cambio > 0 ? ArrowUpRight : ArrowDownRight;
  const color = plano ? "text-neutral-500" : cambio > 0 ? "text-emerald-700" : "text-red-700";
  return (
    <span className="inline-flex items-center gap-1">
      <span className={`inline-flex items-center gap-0.5 font-medium ${color}`}>
        <Icono className="size-3.5" aria-hidden />
        {cambio > 0 ? "+" : ""}
        {f.porcentaje(cambio)}
      </span>
      <span className="text-neutral-500">{t("vsPrevious.label")}</span>
    </span>
  );
}
