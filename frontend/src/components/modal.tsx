"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";
import { X } from "lucide-react";
import { useTranslations } from "next-intl";

const FOCUSABLES = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/// Ventana modal accesible: Esc y clic en el fondo la cierran, el foco se queda
/// dentro mientras está abierta y vuelve al botón que la abrió al cerrarla, y el
/// fondo de la página no se desplaza.
export function Modal({
  titulo,
  onCerrar,
  children,
  bloqueada = false,
  ancho = "max-w-md",
}: {
  titulo: string;
  onCerrar: () => void;
  children: ReactNode;
  /// Mientras hay una operación en curso no se puede cerrar.
  bloqueada?: boolean;
  ancho?: string;
}) {
  const t = useTranslations("common");
  const tituloId = useId();
  const caja = useRef<HTMLDivElement>(null);
  const cerrar = useRef(onCerrar);
  const estaBloqueada = useRef(bloqueada);

  useEffect(() => {
    cerrar.current = onCerrar;
    estaBloqueada.current = bloqueada;
  });

  useEffect(() => {
    const abiertoDesde = document.activeElement as HTMLElement | null;
    const overflowPrevio = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    // Foco inicial: el primer campo, o el primer botón si no hay campos.
    const elementos = caja.current?.querySelectorAll<HTMLElement>(FOCUSABLES);
    const primerCampo = caja.current?.querySelector<HTMLElement>("input:not([disabled]), select:not([disabled]), textarea:not([disabled])");
    (primerCampo ?? elementos?.[1] ?? elementos?.[0])?.focus();

    const alPulsar = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !estaBloqueada.current) {
        cerrar.current();
        return;
      }
      if (e.key !== "Tab" || !caja.current) return;
      const dentro = [...caja.current.querySelectorAll<HTMLElement>(FOCUSABLES)];
      if (dentro.length === 0) return;
      const primero = dentro[0];
      const ultimo = dentro[dentro.length - 1];
      if (e.shiftKey && document.activeElement === primero) {
        e.preventDefault();
        ultimo.focus();
      } else if (!e.shiftKey && document.activeElement === ultimo) {
        e.preventDefault();
        primero.focus();
      }
    };
    document.addEventListener("keydown", alPulsar);
    return () => {
      document.removeEventListener("keydown", alPulsar);
      document.body.style.overflow = overflowPrevio;
      abiertoDesde?.focus?.();
    };
  }, []);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={() => {
        if (!bloqueada) onCerrar();
      }}
    >
      <div
        ref={caja}
        role="dialog"
        aria-modal="true"
        aria-labelledby={tituloId}
        onClick={(e) => e.stopPropagation()}
        className={`w-full ${ancho} rounded-xl bg-white shadow-xl`}
      >
        <div className="flex items-start justify-between gap-4 border-b border-neutral-100 px-5 py-4">
          <h2 id={tituloId} className="text-base font-semibold text-neutral-900">
            {titulo}
          </h2>
          <button
            onClick={onCerrar}
            disabled={bloqueada}
            aria-label={t("close")}
            className="rounded p-1 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700 disabled:opacity-40"
          >
            <X size={16} />
          </button>
        </div>
        <div className="px-5 py-4">{children}</div>
      </div>
    </div>
  );
}
