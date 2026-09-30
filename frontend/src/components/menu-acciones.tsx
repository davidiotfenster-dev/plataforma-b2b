"use client";

import { useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { MoreHorizontal } from "lucide-react";

export interface AccionMenu {
  clave: string;
  etiqueta: string;
  /// Enlace de navegación; si no hay, se usa `onSeleccionar`.
  href?: string;
  onSeleccionar?: () => void;
  peligro?: boolean;
}

/// Menú de "más acciones" (los tres puntos) para no llenar cada fila de botones.
/// Se cierra con Esc, al hacer clic fuera o al elegir una opción.
export function MenuAcciones({ acciones, etiqueta }: { acciones: AccionMenu[]; etiqueta: string }) {
  const [abierto, setAbierto] = useState(false);
  const contenedor = useRef<HTMLDivElement>(null);
  const menuId = useId();

  useEffect(() => {
    if (!abierto) return;
    const alHacerClic = (e: MouseEvent) => {
      if (!contenedor.current?.contains(e.target as Node)) setAbierto(false);
    };
    const alPulsar = (e: KeyboardEvent) => {
      if (e.key === "Escape") setAbierto(false);
    };
    document.addEventListener("mousedown", alHacerClic);
    document.addEventListener("keydown", alPulsar);
    return () => {
      document.removeEventListener("mousedown", alHacerClic);
      document.removeEventListener("keydown", alPulsar);
    };
  }, [abierto]);

  if (acciones.length === 0) return null;

  return (
    <div ref={contenedor} className="relative" onClick={(e) => e.stopPropagation()}>
      <button
        onClick={() => setAbierto((v) => !v)}
        aria-label={etiqueta}
        aria-haspopup="menu"
        aria-expanded={abierto}
        aria-controls={menuId}
        className="rounded-md p-1.5 text-neutral-500 hover:bg-neutral-100 hover:text-neutral-800"
      >
        <MoreHorizontal size={18} />
      </button>
      {abierto && (
        <ul
          id={menuId}
          role="menu"
          className="absolute right-0 z-20 mt-1 w-48 overflow-hidden rounded-lg border border-neutral-200 bg-white py-1 shadow-lg"
        >
          {acciones.map((accion) => {
            const clase = `block w-full px-3 py-2 text-left text-sm hover:bg-neutral-50 ${
              accion.peligro ? "text-red-600" : "text-neutral-700"
            }`;
            return (
              <li key={accion.clave} role="none">
                {accion.href ? (
                  <Link href={accion.href} role="menuitem" className={clase} onClick={() => setAbierto(false)}>
                    {accion.etiqueta}
                  </Link>
                ) : (
                  <button
                    role="menuitem"
                    className={clase}
                    onClick={() => {
                      setAbierto(false);
                      accion.onSeleccionar?.();
                    }}
                  >
                    {accion.etiqueta}
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
