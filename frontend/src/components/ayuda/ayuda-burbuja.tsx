"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { ArrowLeft, ChevronDown, CircleHelp, Mail, MessageCircle, Search, X } from "lucide-react";
import { useMe } from "@/hooks/use-me";
import {
  PREGUNTAS_GENERALES,
  PREGUNTAS_GENERALES_CON_SESION,
  PREGUNTAS_POR_TEMA,
  TEMAS_PERSONAL,
  TEMAS_PORTAL,
  TEMAS_PORTAL_CON_SESION,
  temaDeRuta,
  type TemaAyuda,
} from "./temas";
import { CONTACTOS, WHATSAPP } from "./contacto";

/// Minúsculas y sin tildes, para que «busqueda» encuentre «búsqueda».
function normalizar(texto: string) {
  return texto.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();
}

function Preguntas({ ids, etiquetas }: { ids: readonly string[]; etiquetas?: Record<string, string> }) {
  const t = useTranslations("ayuda");
  return (
    <ul className="divide-y divide-neutral-100">
      {ids.map((id) => (
        <li key={id}>
          <details className="group py-2">
            <summary className="flex cursor-pointer list-none items-start justify-between gap-2 rounded text-sm font-medium text-neutral-800 marker:hidden focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-500 [&::-webkit-details-marker]:hidden">
              <span>
                {t(`q.${id}.p`)}
                {etiquetas?.[id] && (
                  <span className="mt-0.5 block text-xs font-normal text-neutral-500">{etiquetas[id]}</span>
                )}
              </span>
              <ChevronDown className="mt-0.5 size-4 shrink-0 text-neutral-400 transition-transform group-open:rotate-180" aria-hidden />
            </summary>
            <p className="mt-1.5 text-sm leading-relaxed text-neutral-600">{t(`q.${id}.r`)}</p>
          </details>
        </li>
      ))}
    </ul>
  );
}

const titulo3 = "mb-1 text-xs font-semibold uppercase tracking-wide text-neutral-500";

/// Contenido del panel. Se monta al abrirlo, así la búsqueda y el tema elegido
/// empiezan de cero cada vez.
function PanelAyuda({
  temaRuta,
  temas,
  generales,
  conContacto,
}: {
  temaRuta: TemaAyuda | null;
  temas: readonly TemaAyuda[];
  generales: readonly string[];
  conContacto: boolean;
}) {
  const t = useTranslations("ayuda");
  const [busqueda, setBusqueda] = useState("");
  // Tema que el usuario ha elegido en "Otros temas"; sin elegir, el de la pantalla.
  const [temaElegido, setTemaElegido] = useState<TemaAyuda | null>(null);
  const tema = temaElegido ?? temaRuta;

  // Todas las preguntas que puede consultar este usuario, cada una con el primer
  // tema en el que sale (para enseñarlo junto al resultado).
  const indice = useMemo(() => {
    const temaDe: Record<string, TemaAyuda | null> = {};
    for (const tm of temas) for (const id of PREGUNTAS_POR_TEMA[tm]) temaDe[id] ??= tm;
    for (const id of generales) temaDe[id] ??= null;
    return Object.entries(temaDe).map(([id, tm]) => ({
      id,
      tema: tm,
      texto: normalizar(`${t(`q.${id}.p`)} ${t(`q.${id}.r`)}`),
    }));
  }, [temas, generales, t]);

  const palabras = normalizar(busqueda).split(/\s+/).filter(Boolean);
  const buscando = palabras.length > 0;
  const resultados = buscando ? indice.filter((p) => palabras.every((w) => p.texto.includes(w))) : [];
  const etiquetas = Object.fromEntries(
    resultados.map((p) => [p.id, p.tema ? t(`temas.${p.tema}`) : t("preguntasGenerales")]),
  );
  const otros = temas.filter((tm) => tm !== tema);

  return (
    <>
      <div className="border-b border-neutral-100 px-4 py-3">
        <label className="relative block">
          <span className="sr-only">{t("buscar")}</span>
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-neutral-400" aria-hidden />
          <input
            type="search"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder={t("buscarPlaceholder")}
            className="w-full rounded-md border border-neutral-300 py-1.5 pl-8 pr-2 text-sm placeholder:text-neutral-400 focus:border-neutral-500 focus:outline-none"
          />
        </label>
      </div>

      {buscando ? (
        <section className="px-4 pb-3 pt-3" aria-live="polite">
          <h3 className={titulo3}>{t("resultados", { n: resultados.length })}</h3>
          {resultados.length > 0 ? (
            <Preguntas ids={resultados.map((p) => p.id)} etiquetas={etiquetas} />
          ) : (
            <p className="py-2 text-sm text-neutral-600">{t("sinResultados")}</p>
          )}
        </section>
      ) : (
        <>
          {tema && (
            <section className="px-4 pb-1 pt-3">
              {temaElegido && temaElegido !== temaRuta && (
                <button
                  type="button"
                  onClick={() => setTemaElegido(null)}
                  className="mb-2 inline-flex items-center gap-1 rounded text-xs text-neutral-500 hover:text-neutral-800"
                >
                  <ArrowLeft className="size-3.5" aria-hidden />
                  {temaRuta ? t("volverPantalla") : t("volver")}
                </button>
              )}
              <h3 className={titulo3}>
                {temaElegido && temaElegido !== temaRuta ? t(`temas.${tema}`) : `${t("enEstaPantalla")} · ${t(`temas.${tema}`)}`}
              </h3>
              <Preguntas ids={PREGUNTAS_POR_TEMA[tema]} />
            </section>
          )}

          <section className="px-4 pb-3 pt-3">
            <h3 className={titulo3}>{t("preguntasGenerales")}</h3>
            <Preguntas ids={generales} />
          </section>

          {otros.length > 0 && (
            <section className="px-4 pb-4 pt-1">
              <h3 className={`${titulo3} mb-2`}>{t("otrosTemas")}</h3>
              <ul className="flex flex-wrap gap-1.5">
                {otros.map((tm) => (
                  <li key={tm}>
                    <button
                      type="button"
                      onClick={() => setTemaElegido(tm)}
                      className="rounded-full border border-neutral-200 px-2.5 py-1 text-xs text-neutral-700 hover:border-neutral-400 hover:bg-neutral-50"
                    >
                      {t(`temas.${tm}`)}
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </>
      )}

      {conContacto && (
        <div className="border-t border-neutral-100 bg-neutral-50 px-4 py-3 text-sm">
          <h3 className="mb-2 font-medium text-neutral-800">{t("contacto")}</h3>
          <ul className="space-y-3">
            {CONTACTOS.map((c) => (
              <li key={c.id}>
                <p className="text-neutral-900">
                  <span className="font-medium">{t(`contactos.${c.id}.titulo`)}</span>
                  <span className="text-neutral-500"> · {t(`contactos.${c.id}.texto`)}</span>
                </p>
                <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1">
                  <a
                    href={`mailto:${c.email}`}
                    className="inline-flex items-center gap-1.5 text-neutral-900 underline underline-offset-2 hover:text-neutral-600"
                  >
                    <Mail className="size-4 shrink-0" aria-hidden />
                    {c.email}
                  </a>
                  {WHATSAPP && (
                    <a
                      href={`https://wa.me/${WHATSAPP}?text=${encodeURIComponent(t(`contactos.${c.id}.mensaje`))}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={`WhatsApp · ${t(`contactos.${c.id}.titulo`)}`}
                      className="inline-flex items-center gap-1.5 text-green-700 underline underline-offset-2 hover:text-green-900"
                    >
                      <MessageCircle className="size-4 shrink-0" aria-hidden />
                      WhatsApp
                    </a>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </>
  );
}

/// Botón flotante de ayuda (abajo a la derecha) para todos los usuarios: abre un
/// panel con las preguntas de la pantalla en la que estás, unas generales, un
/// buscador y el resto de temas de su tipo de usuario (el personal de IoT FENSTER
/// ve los del panel; clientes y visitantes, los del portal, y al pie cómo
/// contactar con IoT FENSTER). No toca datos de nadie: es contenido fijo, en el
/// idioma de la interfaz.
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
  const personal = perfil?.rol === "ADMIN_FENSTER" || perfil?.rol === "COMERCIAL";
  const temas = personal ? TEMAS_PERSONAL : perfil ? TEMAS_PORTAL_CON_SESION : TEMAS_PORTAL;
  const temaRuta = temaDeRuta(pathname);
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
          className="max-h-[min(36rem,calc(100vh-7rem))] w-[min(24rem,calc(100vw-2rem))] overflow-y-auto rounded-xl border border-neutral-200 bg-white shadow-xl focus:outline-none"
        >
          <div className="sticky top-0 z-10 flex items-center justify-between border-b border-neutral-100 bg-white px-4 py-3">
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
          <PanelAyuda temaRuta={temaRuta} temas={temas} generales={generales} conContacto={!personal} />
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
