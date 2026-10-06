"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Minus, Plus } from "lucide-react";
import { CANTIDAD_MAXIMA } from "@/components/campo-cantidad";

/// Unidades a añadir al carrito (− [n] +) antes de pulsar «Añadir»: así no hay que
/// pulsar diez veces para meter diez unidades. No guarda nada por sí mismo.
export function SelectorUnidades({
  valor,
  onCambiar,
  etiqueta,
  tamano = "md",
}: {
  valor: number;
  onCambiar: (cantidad: number) => void;
  etiqueta: string;
  tamano?: "sm" | "md";
}) {
  const t = useTranslations("catalogo");
  const [texto, setTexto] = useState(String(valor));
  // Si el valor cambia desde fuera (vuelve a 1 tras añadir), el campo lo sigue.
  const [valorVisto, setValorVisto] = useState(valor);
  if (valor !== valorVisto) {
    setValorVisto(valor);
    setTexto(String(valor));
  }

  function fijar(n: number) {
    const limitado = Math.min(CANTIDAD_MAXIMA, Math.max(1, Math.floor(n)));
    onCambiar(limitado);
    setTexto(String(limitado));
  }

  const boton =
    "flex shrink-0 items-center justify-center text-neutral-600 transition-colors hover:bg-neutral-100 hover:text-neutral-900 disabled:opacity-30 disabled:hover:bg-transparent";
  const alto = tamano === "sm" ? "h-9" : "h-10";

  return (
    <div
      className={`flex ${alto} w-full items-stretch overflow-hidden rounded-lg border border-neutral-300 bg-white`}
      onClick={(e) => e.stopPropagation()}
    >
      <button type="button" className={`${boton} w-9`} onClick={() => fijar(valor - 1)} disabled={valor <= 1} aria-label={t("less")}>
        <Minus className="size-4" />
      </button>
      <input
        type="text"
        inputMode="numeric"
        aria-label={etiqueta}
        value={texto}
        onChange={(e) => {
          const limpio = e.target.value.replace(/\D/g, "");
          setTexto(limpio);
          if (limpio) onCambiar(Math.min(CANTIDAD_MAXIMA, Math.max(1, Number(limpio))));
        }}
        onBlur={() => fijar(Number(texto) || 1)}
        onFocus={(e) => e.currentTarget.select()}
        className="w-full min-w-0 border-x border-neutral-200 text-center text-sm font-medium text-neutral-900 focus:outline-none"
      />
      <button type="button" className={`${boton} w-9`} onClick={() => fijar(valor + 1)} disabled={valor >= CANTIDAD_MAXIMA} aria-label={t("more")}>
        <Plus className="size-4" />
      </button>
    </div>
  );
}
