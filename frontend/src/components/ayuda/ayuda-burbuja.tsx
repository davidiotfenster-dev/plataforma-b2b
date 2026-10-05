"use client";

import { useEffect, useId, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { ChevronDown, CircleHelp, Mail, X } from "lucide-react";
import { useMe } from "@/hooks/use-me";
import {
  PREGUNTAS_GENERALES,
  PREGUNTAS_GENERALES_CON_SESION,
  PREGUNTAS_POR_TEMA,
  temaDeRuta,
} from "./temas";

/// Correo de soporte para el enlace de contacto. Sin configurar
/// (`NEXT_PUBLIC_SOPORTE_EMAIL`), el enlace no se enseña.
const SOPORTE_EMAIL = process.env.NEXT_PUBLIC_SOPORTE_EMAIL;

function Preguntas({ ids }: { ids: readonly string[] }) {
  const t = useTranslations("ayuda");
  return (
    <ul className="divide-y divide-neutral-100">
      {ids.map((id) => (
        <li key={id}>
          <details className="group py-2">
            <summary className="flex cursor-pointer list-none items-start justify-between gap-2 rounded text-sm font-medium text-neutral-800 marker:hidden focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-500 [&::-webkit-details-marker]:hidden">
              {t(`q.${id}.p`)}
              <ChevronDown className="mt-0.5 size-4 shrink-0 text-neutral-400 transition-transform group-open:rotate-180" aria-hidden />
            </summary>
            <p className="mt-1.5 text-sm leading-relaxed text-neutral-600">{t(`q.${id}.r`)}</p>
          </details>
        </li>
      ))}
    </ul>
  );
}

/// Botón flotante de ayuda (abajo a la derecha) para todos los usuarios: abre un
/// panel con las preguntas de la pantalla en la que estás y unas generales. No
/// toca datos de nadie: es contenido fijo, en el idioma de la interfaz.
export function AyudaBurbuja() {
  const t = useTranslations("ayuda");
  const pathname = usePathname();
  const { data: perfil } = useMe();
  // Se guarda en qué pantalla se abrió: al navegar a otra, el panel se cierra solo.
  const [abiertaEn, setAbiertaEn] = useState<string | null>(null);
  const abierta = abiertaEn === pathname;
  const panel = useRef<HTMLDivElement>(null);
  const boton = useRef<HTMLButtonElement>(null);
  const panelId = useId();
  const tema = temaDeRuta(pathname);
  const generales = perfil ? PREGUNTAS_GENERALES_CON_SESION : PREGUNTAS_GENERALES;

  function cerrar() {
    setAbiertaEn(null);
    boton.current?.focus();
  }

  useEffect(() => {
    if (!abierta) return;
    panel.current?.focus();
    const alPulsar = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setAbiertaEn(null);
        boton.current?.focus();
      }
    };
    document.addEventListener("keydown", alPulsar);
    return () => document.removeEventListener("keydown", alPulsar);
  }, [abierta]);

  return (
    <div className="fixed bottom-4 right-4 z-30 flex flex-col items-end gap-3 print:hidden">
      {abierta && (
        <div
          ref={panel}
          id={panelId}
          role="dialog"
          aria-label={t("titulo")}
          tabIndex={-1}
          className="max-h-[min(32rem,calc(100vh-7rem))] w-[min(24rem,calc(100vw-2rem))] overflow-y-auto rounded-xl border border-neutral-200 bg-white shadow-xl focus:outline-none"
        >
          <div className="sticky top-0 flex items-center justify-between border-b border-neutral-100 bg-white px-4 py-3">
            <h2 className="text-sm font-semibold text-neutral-900">{t("titulo")}</h2>
            <button
              type="button"
              onClick={cerrar}
              aria-label={t("cerrar")}
              className="rounded p-1 text-neutral-500 hover:bg-neutral-100 hover:text-neutral-800"
            >
              <X className="size-4" aria-hidden />
            </button>
          </div>

          {tema && (
            <section className="px-4 pb-1 pt-3">
              <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-neutral-500">
                {t("enEstaPantalla")} · {t(`temas.${tema}`)}
              </h3>
              <Preguntas ids={PREGUNTAS_POR_TEMA[tema]} />
            </section>
          )}

          <section className="px-4 pb-3 pt-3">
            <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-neutral-500">{t("preguntasGenerales")}</h3>
            <Preguntas ids={generales} />
          </section>

          {SOPORTE_EMAIL && (
            <div className="border-t border-neutral-100 bg-neutral-50 px-4 py-3 text-sm">
              <p className="text-neutral-600">{t("contacto")}</p>
              <a
                href={`mailto:${SOPORTE_EMAIL}`}
                className="mt-1 inline-flex items-center gap-1.5 font-medium text-neutral-900 underline"
              >
                <Mail className="size-4" aria-hidden />
                {t("escribirSoporte")}
              </a>
            </div>
          )}
        </div>
      )}

      <button
        ref={boton}
        type="button"
        onClick={() => setAbiertaEn(abierta ? null : pathname)}
        aria-expanded={abierta}
        aria-controls={abierta ? panelId : undefined}
        aria-label={abierta ? t("cerrar") : t("abrir")}
        title={t("boton")}
        className="flex size-12 items-center justify-center rounded-full bg-neutral-900 text-white shadow-lg transition-colors hover:bg-neutral-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-900"
      >
        {abierta ? <X className="size-5" aria-hidden /> : <CircleHelp className="size-6" aria-hidden />}
      </button>
    </div>
  );
}
