"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Check, ChevronDown, Download } from "lucide-react";
import { locales, localeNames, type Locale } from "@/i18n/locales";

/// Botón "Descargar PDF" que primero pregunta en qué idioma quiere el documento.
/// El idioma de la pantalla va el primero y marcado; se cierra con Esc, al hacer
/// clic fuera o al elegir uno.
export function DescargarPdf({
  onElegir,
  descargando,
}: {
  onElegir: (idioma: Locale) => void;
  descargando: boolean;
}) {
  const t = useTranslations("pedidoDetalle");
  const actual = useLocale() as Locale;
  const [abierto, setAbierto] = useState(false);
  const contenedor = useRef<HTMLDivElement>(null);
  const menu = useRef<HTMLUListElement>(null);
  const menuId = useId();
  const idiomas = [actual, ...locales.filter((l) => l !== actual)];

  useEffect(() => {
    if (!abierto) return;
    menu.current?.querySelector<HTMLElement>('[role="menuitem"]')?.focus();
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

  /// Flechas arriba/abajo para moverse entre los idiomas.
  function alPulsarEnMenu(e: React.KeyboardEvent<HTMLUListElement>) {
    if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
    e.preventDefault();
    const opciones = [...e.currentTarget.querySelectorAll<HTMLElement>('[role="menuitem"]')];
    const indice = opciones.indexOf(document.activeElement as HTMLElement);
    const siguiente = (indice + (e.key === "ArrowDown" ? 1 : -1) + opciones.length) % opciones.length;
    opciones[siguiente]?.focus();
  }

  return (
    <div ref={contenedor} className="relative">
      <button
        type="button"
        onClick={() => setAbierto((v) => !v)}
        disabled={descargando}
        aria-haspopup="menu"
        aria-expanded={abierto}
        aria-controls={menuId}
        className="inline-flex items-center gap-2 rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-700 hover:bg-neutral-50 disabled:opacity-50"
      >
        <Download className="h-4 w-4" aria-hidden />
        {descargando ? t("downloading") : t("downloadPdf")}
        <ChevronDown className="h-4 w-4 text-neutral-400" aria-hidden />
      </button>
      {abierto && (
        <div className="absolute right-0 z-20 mt-1 w-52 overflow-hidden rounded-lg border border-neutral-200 bg-white shadow-lg">
          <p id={`${menuId}-titulo`} className="border-b border-neutral-100 px-3 py-2 text-xs font-medium text-neutral-500">
            {t("pdfLanguageTitle")}
          </p>
          <ul id={menuId} ref={menu} role="menu" aria-labelledby={`${menuId}-titulo`} onKeyDown={alPulsarEnMenu} className="py-1">
            {idiomas.map((idioma) => (
              <li key={idioma} role="none">
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setAbierto(false);
                    onElegir(idioma);
                  }}
                  className="flex w-full items-center justify-between px-3 py-2 text-left text-sm text-neutral-700 hover:bg-neutral-50 focus-visible:bg-neutral-50 focus-visible:outline-none"
                >
                  {localeNames[idioma]}
                  {idioma === actual && <Check className="h-4 w-4 text-neutral-400" aria-hidden />}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
