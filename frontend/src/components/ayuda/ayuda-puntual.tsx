"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { CircleHelp } from "lucide-react";

const ANCHO = 256;

/// Pequeño "?" junto a una etiqueta que explica un concepto en una frase. Se abre
/// al pulsarlo (o al pasar el ratón / enfocarlo con el teclado) y se cierra con
/// Esc, al hacer clic fuera o al desplazar la pantalla. Se posiciona con
/// `fixed` para no quedar recortado por tablas o tarjetas con `overflow-hidden`.
export function AyudaPuntual({ texto }: { texto: string }) {
  const t = useTranslations("ayuda");
  const [pos, setPos] = useState<{ arriba: number; izquierda: number } | null>(null);
  const boton = useRef<HTMLButtonElement>(null);
  const id = useId();
  const abierto = pos !== null;

  function abrir() {
    const caja = boton.current?.getBoundingClientRect();
    if (!caja) return;
    const izquierda = Math.min(Math.max(8, caja.left - 8), window.innerWidth - ANCHO - 8);
    setPos({ arriba: caja.bottom + 6, izquierda });
  }

  useEffect(() => {
    if (!abierto) return;
    const cerrar = () => setPos(null);
    const alPulsar = (e: KeyboardEvent) => e.key === "Escape" && cerrar();
    const alHacerClic = (e: MouseEvent) => {
      if (!boton.current?.contains(e.target as Node)) cerrar();
    };
    document.addEventListener("keydown", alPulsar);
    document.addEventListener("mousedown", alHacerClic);
    window.addEventListener("scroll", cerrar, true);
    window.addEventListener("resize", cerrar);
    return () => {
      document.removeEventListener("keydown", alPulsar);
      document.removeEventListener("mousedown", alHacerClic);
      window.removeEventListener("scroll", cerrar, true);
      window.removeEventListener("resize", cerrar);
    };
  }, [abierto]);

  return (
    <>
      <button
        ref={boton}
        type="button"
        onClick={() => (abierto ? setPos(null) : abrir())}
        onMouseEnter={abrir}
        onMouseLeave={() => setPos(null)}
        onFocus={abrir}
        onBlur={() => setPos(null)}
        aria-label={t("masInfo")}
        aria-describedby={abierto ? id : undefined}
        className="inline-flex align-middle text-neutral-400 hover:text-neutral-700 focus-visible:text-neutral-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-500"
      >
        <CircleHelp className="size-3.5" aria-hidden />
      </button>
      {pos && (
        <span
          id={id}
          role="tooltip"
          style={{ top: pos.arriba, left: pos.izquierda, width: ANCHO }}
          className="pointer-events-none fixed z-50 rounded-lg bg-neutral-900 px-3 py-2 text-xs font-normal normal-case leading-relaxed tracking-normal text-white shadow-lg"
        >
          {texto}
        </span>
      )}
    </>
  );
}
