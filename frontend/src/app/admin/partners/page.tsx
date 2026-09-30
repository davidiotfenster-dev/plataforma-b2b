"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { AlertTriangle, Archive, Building2, CheckCircle2, Handshake, Plus, Search, X } from "lucide-react";
import { api } from "@/lib/api";
import { MenuAcciones, type AccionMenu } from "@/components/menu-acciones";
import { Paginacion } from "@/components/paginacion";
import { EstadoPartnerBadge, PartnerAvatar, tieneDatosPorCompletar } from "@/components/partner-ui";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { useMe } from "@/hooks/use-me";
import { InsigniaMarca, MARCA_INFO } from "@/lib/marcas";
import type { EstadoPartner, Paginado, Partner, ResumenPartners } from "@/lib/types";
import { usePartnerAcciones } from "./partner-acciones";

const LIMITE_POR_PAGINA = 20;

/// Pestañas de estado, en el orden en que le importan a quien gestiona altas.
const ESTADOS_PESTANA: EstadoPartner[] = ["PENDIENTE_APROBACION", "ACTIVO", "SUSPENDIDO", "RECHAZADO", "PENDIENTE_VERIFICACION_EMAIL"];

function ListaPartners() {
  const t = useTranslations("adminPartners");
  const tEstados = useTranslations("estadosPartner");
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const { data: perfil } = useMe();
  const esAdmin = perfil?.rol === "ADMIN_FENSTER";
  const [mensaje, setMensaje] = useState<string | null>(null);
  const acciones = usePartnerAcciones(setMensaje);

  // Filtros, búsqueda y página viven en la URL: al abrir una ficha y volver atrás, la lista sigue como estaba.
  const estado = params.get("estado") ?? "";
  const soloIncompletos = params.get("incompletos") === "1";
  const archivadas = params.get("archivadas") === "1";
  const q = params.get("q") ?? "";
  const pagina = Math.max(1, Number(params.get("p")) || 1);

  function cambiarFiltros(cambios: Record<string, string | null>) {
    const siguiente = new URLSearchParams(params.toString());
    for (const [clave, valor] of Object.entries(cambios)) {
      if (valor === null || valor === "") siguiente.delete(clave);
      else siguiente.set(clave, valor);
    }
    const consulta = siguiente.toString();
    router.replace(consulta ? `${pathname}?${consulta}` : pathname, { scroll: false });
  }

  const [busqueda, setBusqueda] = useState(q);
  const busquedaDebounced = useDebouncedValue(busqueda).trim();
  useEffect(() => {
    if (busquedaDebounced !== q) cambiarFiltros({ q: busquedaDebounced || null, p: null });
    // Solo debe reaccionar a lo que el usuario escribe, no a los cambios de la URL.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [busquedaDebounced]);

  const { data: resumen } = useQuery<ResumenPartners>({
    queryKey: ["admin-partners-resumen"],
    queryFn: () => api.get<ResumenPartners>("/partners/resumen"),
  });

  function consultaEmpresas(tipo: "PARTNER" | "CLIENTE", page: number, limit: number) {
    const consulta = new URLSearchParams({ tipo, page: String(page), limit: String(limit) });
    if (estado && !archivadas) consulta.set("estado", estado);
    if (archivadas) consulta.set("archivadas", "true");
    if (soloIncompletos) consulta.set("datosPorCompletar", "true");
    if (q) consulta.set("busqueda", q);
    return api.get<Paginado<Partner>>(`/partners?${consulta}`);
  }

  // Los partners son pocos (uno por submarca): se traen todos de una vez.
  const { data: respuestaPartners, isLoading: cargandoPartners } = useQuery<Paginado<Partner>>({
    queryKey: ["admin-partners", { tipo: "PARTNER", estado, archivadas, soloIncompletos, q }],
    queryFn: () => consultaEmpresas("PARTNER", 1, 100),
    placeholderData: keepPreviousData,
  });

  const { data: respuesta, isLoading } = useQuery<Paginado<Partner>>({
    queryKey: ["admin-partners", { tipo: "CLIENTE", estado, archivadas, soloIncompletos, pagina, q }],
    queryFn: () => consultaEmpresas("CLIENTE", pagina, LIMITE_POR_PAGINA),
    placeholderData: keepPreviousData,
  });

  const socios = respuestaPartners?.data ?? [];
  const partners = respuesta?.data ?? [];
  const hayFiltros = Boolean(estado || archivadas || soloIncompletos || q);
  const pendientes = resumen?.porEstado.PENDIENTE_APROBACION ?? 0;

  const pestanas = [
    { clave: "", etiqueta: t("tabAll"), cuenta: resumen?.total, activa: !archivadas && estado === "", elegir: () => cambiarFiltros({ estado: null, archivadas: null, p: null }) },
    ...ESTADOS_PESTANA.filter((e) => (resumen?.porEstado[e] ?? 0) > 0 || (!archivadas && estado === e)).map((e) => ({
      clave: e,
      etiqueta: tEstados(e),
      cuenta: resumen?.porEstado[e],
      activa: !archivadas && estado === e,
      elegir: () => cambiarFiltros({ estado: e, archivadas: null, p: null }),
    })),
    ...((resumen?.archivadas ?? 0) > 0 || archivadas
      ? [{ clave: "archivadas", etiqueta: t("tabArchived"), cuenta: resumen?.archivadas, activa: archivadas, elegir: () => cambiarFiltros({ estado: null, archivadas: "1", p: null }) }]
      : []),
  ];

  function accionesDeFila(partner: Partner): AccionMenu[] {
    const archivada = Boolean(partner.archivadoEn);
    return [
      { clave: "ficha", etiqueta: t("openFile"), href: `/admin/partners/${partner.id}` },
      ...(esAdmin ? [{ clave: "usuarios", etiqueta: t("tabs.usuarios"), href: `/admin/partners/${partner.id}/usuarios` }] : []),
      { clave: "catalogo", etiqueta: t("tabs.catalogo"), href: `/admin/partners/${partner.id}/catalogo` },
      ...(!archivada && partner.estado === "ACTIVO"
        ? [{ clave: "suspender", etiqueta: t("suspend"), peligro: true, onSeleccionar: () => acciones.pedirSuspender(partner) }]
        : []),
      ...(!archivada && esAdmin && partner.estado === "PENDIENTE_APROBACION"
        ? [{ clave: "rechazar", etiqueta: t("reject"), peligro: true, onSeleccionar: () => acciones.pedirRechazar(partner) }]
        : []),
      archivada
        ? { clave: "desarchivar", etiqueta: t("unarchive"), onSeleccionar: () => acciones.pedirDesarchivar(partner) }
        : { clave: "archivar", etiqueta: t("archive"), onSeleccionar: () => acciones.pedirArchivar(partner) },
      // Solo sin pedidos: con pedidos se archiva (el servidor también lo exige).
      ...(esAdmin && partner._count?.ordenes === 0
        ? [{ clave: "eliminar", etiqueta: t("deleteAction"), peligro: true, onSeleccionar: () => acciones.pedirEliminar(partner) }]
        : []),
    ];
  }

  /// Tarjeta de una empresa. Partner: el logo de su submarca. Cliente: sus
  /// iniciales y la marca cuyos dispositivos ve. El borde superior es el color de esa marca.
  function tarjetaEmpresa(partner: Partner) {
    const info = MARCA_INFO[partner.marcaCatalogo];
    const recuentos = partner._count;
    const esPartner = partner.tipo === "PARTNER";
    const identificacion = [
      partner.cif.startsWith("PENDIENTE") ? null : partner.cif,
      partner.codigoCliente && t("clientCode", { codigo: partner.codigoCliente }),
    ]
      .filter(Boolean)
      .join(" · ");
    return (
      <li
        key={partner.id}
        onClick={() => router.push(`/admin/partners/${partner.id}`)}
        className={`flex min-w-0 cursor-pointer flex-col rounded-xl border border-t-4 border-neutral-200 bg-white p-4 shadow-sm transition hover:shadow-md ${info.borde} ${partner.archivadoEn ? "opacity-70" : ""}`}
      >
        <div className="flex items-start gap-3">
          {esPartner ? (
            <span className={`flex size-11 shrink-0 items-center justify-center rounded-lg text-sm font-bold text-white ${info.acento}`}>
              {info.submarca.slice(0, 2).toUpperCase()}
            </span>
          ) : (
            <PartnerAvatar nombre={partner.razonSocial} />
          )}
          <div className="min-w-0 flex-1">
            <Link
              href={`/admin/partners/${partner.id}`}
              onClick={(e) => e.stopPropagation()}
              title={partner.razonSocial}
              className="block truncate font-semibold text-neutral-900 hover:underline"
            >
              {partner.razonSocial}
            </Link>
            {esPartner ? (
              <p className="text-sm text-neutral-500">{t("ownBrand", { marca: info.submarca })}</p>
            ) : (
              <p className="truncate text-xs text-neutral-500">{identificacion || "—"}</p>
            )}
          </div>
          <div onClick={(e) => e.stopPropagation()}>
            <MenuAcciones acciones={accionesDeFila(partner)} etiqueta={t("moreActions", { partner: partner.razonSocial })} />
          </div>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <EstadoPartnerBadge estado={partner.estado} />
          {partner.archivadoEn && (
            <span className="inline-flex items-center gap-1 rounded-full bg-neutral-200 px-2.5 py-1 text-xs font-medium text-neutral-700">
              <Archive size={11} /> {t("archivedBadge")}
            </span>
          )}
          {!esPartner && <InsigniaMarca marca={partner.marcaCatalogo} />}
          {tieneDatosPorCompletar(partner) && (
            <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-700">
              <AlertTriangle size={11} /> {t("incompleteData")}
            </span>
          )}
        </div>
        {/* Empuja las cifras al pie: todas las tarjetas de una fila quedan alineadas. */}
        <div className="min-h-4 flex-1" />
        {recuentos && (
          <dl className="grid grid-cols-3 gap-2 border-t border-neutral-100 pt-3 text-center">
            <div>
              <dt className="text-[11px] uppercase tracking-wide text-neutral-400">{t("statProducts")}</dt>
              <dd className="text-lg font-semibold text-neutral-900">{recuentos.representaciones}</dd>
            </div>
            <div>
              <dt className="text-[11px] uppercase tracking-wide text-neutral-400">{t("statOrders")}</dt>
              <dd className="text-lg font-semibold text-neutral-900">{recuentos.ordenes}</dd>
            </div>
            <div>
              <dt className="text-[11px] uppercase tracking-wide text-neutral-400">{t("statDiscount")}</dt>
              <dd className="text-lg font-semibold text-neutral-900">{Number(partner.descuentoPorcentaje)}%</dd>
            </div>
          </dl>
        )}
        {!partner.archivadoEn && ((esAdmin && partner.estado === "PENDIENTE_APROBACION") || partner.estado === "SUSPENDIDO") && (
          <div className="mt-3 flex justify-end gap-2" onClick={(e) => e.stopPropagation()}>
            {esAdmin && partner.estado === "PENDIENTE_APROBACION" && (
              <button
                onClick={() => acciones.pedirAprobar(partner)}
                className="rounded-md bg-neutral-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-neutral-700"
              >
                {t("approve")}
              </button>
            )}
            {partner.estado === "SUSPENDIDO" && (
              <button
                onClick={() => acciones.pedirReactivar(partner)}
                className="rounded-md border border-green-300 px-3 py-1.5 text-xs font-medium text-green-700 hover:bg-green-50"
              >
                {t("reactivate")}
              </button>
            )}
          </div>
        )}
      </li>
    );
  }

  return (
    // Más ancho que el resto del portal para que quepan más tarjetas por fila. Sin
    // `transform`: los diálogos de acciones son `fixed`.
    <div style={{ width: "min(1440px, calc(100vw - 3rem))", marginLeft: "calc(50% - min(720px, 50vw - 1.5rem))" }}>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-neutral-900">{t("title")}</h1>
          <p className="mt-1 text-sm text-neutral-500">{t("subtitle")}</p>
        </div>
        <Link
          href="/admin/partners/nuevo"
          className="inline-flex items-center gap-1.5 rounded-md bg-neutral-900 px-3.5 py-2 text-sm font-medium text-white hover:bg-neutral-700"
        >
          <Plus size={16} /> {t("newPartner")}
        </Link>
      </div>

      {mensaje && (
        <p
          role="status"
          className="mb-4 flex items-center justify-between gap-3 rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-800"
        >
          <span className="inline-flex items-center gap-2">
            <CheckCircle2 size={16} /> {mensaje}
          </span>
          <button onClick={() => setMensaje(null)} aria-label={t("dismissMessage")} className="text-green-700 hover:text-green-900">
            <X size={14} />
          </button>
        </p>
      )}

      {esAdmin && pendientes > 0 && estado !== "PENDIENTE_APROBACION" && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <span className="inline-flex items-center gap-2">
            <AlertTriangle size={16} className="shrink-0" />
            {t("pendingBanner", { n: pendientes })}
          </span>
          <button
            onClick={() => cambiarFiltros({ estado: "PENDIENTE_APROBACION", p: null })}
            className="rounded-md bg-amber-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-amber-700"
          >
            {t("reviewPending")}
          </button>
        </div>
      )}

      <nav aria-label={t("statusFilter")} className="mb-4 flex flex-wrap gap-1 border-b border-neutral-200">
        {pestanas.map((p) => (
          <button
            key={p.clave || "todos"}
            onClick={p.elegir}
            aria-current={p.activa ? "page" : undefined}
            className={`-mb-px border-b-2 px-3.5 py-2.5 text-sm ${
              p.activa
                ? "border-neutral-900 font-medium text-neutral-900"
                : "border-transparent text-neutral-500 hover:border-neutral-300 hover:text-neutral-800"
            }`}
          >
            {p.etiqueta}
            {p.cuenta !== undefined && (
              <span
                className={`ml-1.5 rounded-full px-1.5 py-0.5 text-xs ${
                  p.clave === "PENDIENTE_APROBACION" && p.cuenta > 0 ? "bg-amber-100 text-amber-800" : "bg-neutral-100 text-neutral-600"
                }`}
              >
                {p.cuenta}
              </span>
            )}
          </button>
        ))}
      </nav>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="relative min-w-64 flex-1 sm:max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-neutral-400" />
          <input
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder={t("searchPlaceholder")}
            aria-label={t("searchPlaceholder")}
            className="w-full rounded-md border border-neutral-300 bg-white py-2 pl-9 pr-3 text-sm placeholder:text-neutral-400 focus:border-neutral-500 focus:outline-none focus:ring-1 focus:ring-neutral-300"
          />
        </div>
        {(resumen?.datosPorCompletar ?? 0) > 0 || soloIncompletos ? (
          <button
            onClick={() => cambiarFiltros({ incompletos: soloIncompletos ? null : "1", p: null })}
            aria-pressed={soloIncompletos}
            className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium ${
              soloIncompletos ? "border-amber-500 bg-amber-500 text-white" : "border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100"
            }`}
          >
            <AlertTriangle size={13} /> {t("incompleteFilter", { n: resumen?.datosPorCompletar ?? 0 })}
          </button>
        ) : null}
        {hayFiltros && (
          <button
            onClick={() => {
              setBusqueda("");
              router.replace(pathname, { scroll: false });
            }}
            className="text-xs text-neutral-500 underline hover:text-neutral-800"
          >
            {t("clearFilters")}
          </button>
        )}
      </div>

      {(esAdmin || cargandoPartners || socios.length > 0) && (
        <section className="mb-8" aria-labelledby="titulo-partners">
          <div className="mb-3 flex items-center gap-2">
            <Handshake size={18} className="text-neutral-700" />
            <h2 id="titulo-partners" className="text-lg font-semibold text-neutral-900">
              {t("partnersTitle")} <span className="font-normal text-neutral-400">{respuestaPartners?.total ?? ""}</span>
            </h2>
            <p className="hidden text-sm text-neutral-500 sm:block">· {t("partnersHelp")}</p>
          </div>
          {cargandoPartners ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {[0, 1, 2].map((i) => (
                <span key={i} className="h-40 animate-pulse rounded-xl bg-neutral-200" />
              ))}
            </div>
          ) : socios.length > 0 ? (
            <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{socios.map(tarjetaEmpresa)}</ul>
          ) : (
            <p className="rounded-xl border border-dashed border-neutral-300 px-4 py-6 text-center text-sm text-neutral-500">
              {hayFiltros ? t("noResults") : t("partnersEmpty")}
            </p>
          )}
        </section>
      )}

      <div className="mb-3 flex items-center gap-2">
        <Building2 size={18} className="text-neutral-700" />
        <h2 className="text-lg font-semibold text-neutral-900">
          {t("clientsTitle")} <span className="font-normal text-neutral-400">{respuesta?.total ?? ""}</span>
        </h2>
        <p className="hidden text-sm text-neutral-500 sm:block">· {t("clientsHelp")}</p>
      </div>
      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <span key={i} className="h-44 animate-pulse rounded-xl bg-neutral-200" />
          ))}
        </div>
      ) : partners.length > 0 ? (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">{partners.map(tarjetaEmpresa)}</ul>
      ) : (
        <div className="rounded-xl border border-dashed border-neutral-300 px-4 py-12 text-center">
          <p className="text-neutral-600">{hayFiltros ? t("noResults") : t("empty")}</p>
          {!hayFiltros && (
            <Link href="/admin/partners/nuevo" className="mt-3 inline-block text-sm font-medium text-neutral-900 underline">
              {t("newPartner")}
            </Link>
          )}
        </div>
      )}

      {respuesta && (
        <Paginacion page={respuesta.page} limit={respuesta.limit} total={respuesta.total} onPageChange={(p) => cambiarFiltros({ p: String(p) })} />
      )}

      {acciones.dialogos}
    </div>
  );
}

export default function AdminPartnersPage() {
  // `useSearchParams` exige un Suspense por encima.
  return (
    <Suspense fallback={null}>
      <ListaPartners />
    </Suspense>
  );
}
