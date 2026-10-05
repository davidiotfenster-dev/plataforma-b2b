"use client";

import { useId, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { ApiError } from "@/lib/api";

/// A partir de aquí se pregunta antes de guardar: un cero de más (10 → 100) es fácil de teclear.
const CANTIDAD_A_CONFIRMAR = 1_000;

/// Igual que el tope del servidor (`CANTIDAD_MAXIMA_POR_LINEA`).
export const CANTIDAD_MAXIMA = 100_000;

/// Cantidad de una línea del carrito. El valor se confirma al salir del campo o
/// con Intro; si no es un entero entre 1 y el máximo, o el servidor lo rechaza,
/// el campo vuelve a la cantidad que de verdad hay guardada y se explica por qué
/// (antes se quedaba el número escrito mientras el total no cambiaba).
export function CampoCantidad({
  valor,
  onCambiar,
  disabled = false,
  etiqueta,
}: {
  valor: number;
  onCambiar: (cantidad: number) => Promise<unknown>;
  disabled?: boolean;
  etiqueta: string;
}) {
  const t = useTranslations("carrito");
  const locale = useLocale();
  const errorId = useId();
  const [texto, setTexto] = useState(String(valor));
  const [error, setError] = useState<string | null>(null);

  // Si la cantidad guardada cambia por otro lado (recarga, otra pestaña), el campo la sigue.
  const [valorVisto, setValorVisto] = useState(valor);
  if (valor !== valorVisto) {
    setValorVisto(valor);
    setTexto(String(valor));
  }

  async function confirmar() {
    const limpio = texto.trim();
    if (!/^\d+$/.test(limpio) || Number(limpio) < 1 || Number(limpio) > CANTIDAD_MAXIMA) {
      setTexto(String(valor));
      setError(t("quantityInvalid", { max: new Intl.NumberFormat(locale).format(CANTIDAD_MAXIMA) }));
      return;
    }
    setError(null);
    const cantidad = Number(limpio);
    if (cantidad === valor) {
      setTexto(String(valor));
      return;
    }
    if (cantidad >= CANTIDAD_A_CONFIRMAR && !window.confirm(t("quantityHugeConfirm", { cantidad: new Intl.NumberFormat(locale).format(cantidad) }))) {
      setTexto(String(valor));
      return;
    }
    try {
      await onCambiar(cantidad);
    } catch (err) {
      setTexto(String(valor));
      setError(err instanceof ApiError ? err.message : t("quantityError"));
    }
  }

  return (
    <div>
      <input
        type="text"
        inputMode="numeric"
        aria-label={etiqueta}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        value={texto}
        disabled={disabled}
        onChange={(e) => {
          setTexto(e.target.value);
          setError(null);
        }}
        onBlur={confirmar}
        onKeyDown={(e) => {
          if (e.key === "Enter") e.currentTarget.blur();
        }}
        className={`w-20 rounded-md border px-2 py-1 disabled:bg-neutral-50 ${error ? "border-red-400" : "border-neutral-300"}`}
      />
      {error && (
        <p id={errorId} role="alert" className="mt-1 max-w-48 text-xs text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}
