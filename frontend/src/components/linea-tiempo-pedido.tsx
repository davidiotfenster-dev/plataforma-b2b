"use client";

import { useLocale, useTranslations } from "next-intl";
import { Check } from "lucide-react";
import { ESTADOS_PEDIDO } from "@/lib/types";
import type { EstadoPedido, HistorialEstado } from "@/lib/types";

/// Fecha y hora cortas de un momento del pedido.
export function fechaHora(iso: string, locale: string): string {
  return new Date(iso).toLocaleString(locale, { dateStyle: "short", timeStyle: "short" });
}

/// Progreso del pedido por sus cinco pasos. El paso actual va resaltado y los ya
/// superados llevan la fecha en que se alcanzaron. Un pedido cancelado no usa
/// esta línea (la pantalla enseña el aviso de cancelación en su lugar).
export function LineaTiempoPedido({ estado, historial }: { estado: EstadoPedido; historial: HistorialEstado[] }) {
  const t = useTranslations("pedidoDetalle");
  const tEstados = useTranslations("estados");
  const locale = useLocale();
  const actual = ESTADOS_PEDIDO.indexOf(estado);

  /// Si un admin devolvió el pedido a un paso anterior y luego avanzó otra vez,
  /// cada paso conserva la fecha en que se alcanzó por primera vez; así las
  /// fechas siguen el orden de la línea.
  const fechaDe = (paso: EstadoPedido): string | null =>
    historial.find((entrada) => entrada.estado === paso)?.createdAt ?? null;

  return (
    <ol
      aria-label={t("timelineLabel")}
      className="flex flex-col gap-4 rounded-lg border border-neutral-200 bg-white p-4 sm:grid sm:grid-cols-5 sm:gap-0 sm:p-5"
    >
      {ESTADOS_PEDIDO.map((paso, indice) => {
        const alcanzado = indice <= actual;
        const esActual = indice === actual;
        const fecha = alcanzado ? fechaDe(paso) : null;

        return (
          <li
            key={paso}
            aria-current={esActual ? "step" : undefined}
            className="relative flex items-start gap-3 sm:flex-col sm:items-center sm:gap-2 sm:text-center"
          >
            {indice < ESTADOS_PEDIDO.length - 1 && (
              <span
                aria-hidden
                className={`absolute left-4 top-8 h-[calc(100%-1rem)] w-0.5 -translate-x-1/2 sm:left-1/2 sm:top-[calc(1rem-1px)] sm:h-0.5 sm:w-full sm:translate-x-0 ${
                  indice < actual ? "bg-green-500" : "bg-neutral-200"
                }`}
              />
            )}
            <span
              className={`relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
                esActual
                  ? "bg-green-600 text-white ring-4 ring-green-100"
                  : alcanzado
                    ? "bg-green-600 text-white"
                    : "bg-neutral-100 text-neutral-400"
              }`}
            >
              {alcanzado ? <Check className="h-4 w-4" aria-hidden /> : indice + 1}
            </span>
            <div className="min-w-0">
              <p className={`text-sm ${alcanzado ? "font-medium text-neutral-900" : "text-neutral-400"}`}>
                {tEstados(paso)}
              </p>
              {fecha && <p className="text-xs text-neutral-500">{fechaHora(fecha, locale)}</p>}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
