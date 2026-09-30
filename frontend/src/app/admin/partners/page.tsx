"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { AlertTriangle, CheckCircle2, Plus, Search, X } from "lucide-react";
import { api } from "@/lib/api";
import { MenuAcciones, type AccionMenu } from "@/components/menu-acciones";
import { Paginacion } from "@/components/paginacion";
import { EstadoPartnerBadge, PartnerAvatar, tieneDatosPorCompletar } from "@/components/partner-ui";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { useMe } from "@/hooks/use-me";
import type { EstadoPartner, Paginado, Partner, ResumenPartners } from "@/lib/types";
import { usePartnerAcciones } from "./partner-acciones";

const LIMITE_POR_PAGINA = 20;

/// Pestañas de estado, en el orden en que le importan a quien gestiona altas.
const ESTADOS_PESTANA: EstadoPartner[] = ["PENDIENTE_APROBACION", "ACTIVO", "SUSPENDIDO", "RECHAZADO", "PENDIENTE_VERIFICACION_EMAIL"];

function FilaEsqueleto() {
  return (
    <li className="flex items-center gap-3 border-t border-neutral-100 px-4 py-4">
      <span className="size-9 animate-pulse rounded-lg bg-neutral-200" />
      <span className="h-4 w-56 animate-pulse rounded bg-neutral-200" />
    </li>
  );
}

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

  const { data: respuesta, isLoading } = useQuery<Paginado<Partner>>({
    queryKey: ["admin-partners", { estado, soloIncompletos, pagina, q }],
    queryFn: () => {
      const consulta = new URLSearchParams({ page: String(pagina), limit: String(LIMITE_POR_PAGINA) });
      if (estado) consulta.set("estado", estado);
      if (soloIncompletos) consulta.set("datosPorCompletar", "true");
      if (q) consulta.set("busqueda", q);
      return api.get<Paginado<Partner>>(`/partners?${consulta}`);
    },
    placeholderData: keepPreviousData,
  });

  const partners = respuesta?.data ?? [];
  const hayFiltros = Boolean(estado || soloIncompletos || q);
  const pendientes = resumen?.porEstado.PENDIENTE_APROBACION ?? 0;

  const pestanas = [
    { clave: "", etiqueta: t("tabAll"), cuenta: resumen?.total },
    ...ESTADOS_PESTANA.filter((e) => (resumen?.porEstado[e] ?? 0) > 0 || estado === e).map((e) => ({
      clave: e,
      etiqueta: tEstados(e),
      cuenta: resumen?.porEstado[e],
    })),
  ];

  function accionesDeFila(partner: Partner): AccionMenu[] {
    return [
      { clave: "ficha", etiqueta: t("openFile"), href: `/admin/partners/${partner.id}` },
      ...(esAdmin ? [{ clave: "usuarios", etiqueta: t("tabs.usuarios"), href: `/admin/partners/${partner.id}/usuarios` }] : []),
      { clave: "catalogo", etiqueta: t("tabs.catalogo"), href: `/admin/partners/${partner.id}/catalogo` },
      ...(partner.estado === "ACTIVO"
        ? [{ clave: "suspender", etiqueta: t("suspend"), peligro: true, onSeleccionar: () => acciones.pedirSuspender(partner) }]
        : []),
      ...(esAdmin && partner.estado === "PENDIENTE_APROBACION"
        ? [{ clave: "rechazar", etiqueta: t("reject"), peligro: true, onSeleccionar: () => acciones.pedirRechazar(partner) }]
        : []),
    ];
  }

  return (
    <div>
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
        <p role="status" className="mb-4 flex items-center justify-between gap-3 rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-800">
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
            onClick={() => cambiarFiltros({ estado: p.clave, p: null })}
            aria-current={estado === p.clave ? "page" : undefined}
            className={`-mb-px border-b-2 px-3.5 py-2.5 text-sm ${
              estado === p.clave
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
              soloIncompletos
                ? "border-amber-500 bg-amber-500 text-white"
                : "border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100"
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

      <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-sm">
        <div className="hidden grid-cols-12 gap-4 bg-neutral-50 px-4 py-2.5 text-xs font-medium uppercase tracking-wide text-neutral-500 md:grid">
          <div className="col-span-4">{t("colPartner")}</div>
          <div className="col-span-2">{t("colStatus")}</div>
          <div className="col-span-2">{t("colConditions")}</div>
          <div className="col-span-2">{t("colActivity")}</div>
          <div className="col-span-2 text-right">{t("colActions")}</div>
        </div>

        <ul>
          {isLoading && [0, 1, 2, 3, 4].map((i) => <FilaEsqueleto key={i} />)}
          {partners.map((partner) => {
            const recuentos = partner._count;
            return (
              <li
                key={partner.id}
                onClick={() => router.push(`/admin/partners/${partner.id}`)}
                className="grid cursor-pointer grid-cols-1 gap-2 border-t border-neutral-100 px-4 py-3.5 first:border-t-0 hover:bg-neutral-50 md:grid-cols-12 md:items-center md:gap-4 md:first:border-t"
              >
                <div className="flex min-w-0 items-center gap-3 md:col-span-4">
                  <PartnerAvatar nombre={partner.razonSocial} />
                  <div className="min-w-0">
                    <Link
                      href={`/admin/partners/${partner.id}`}
                      onClick={(e) => e.stopPropagation()}
                      className="block truncate font-medium text-neutral-900 hover:underline"
                    >
                      {partner.razonSocial}
                    </Link>
                    <p className="truncate text-xs text-neutral-500">
                      {[partner.cif.startsWith("PENDIENTE") ? null : partner.cif, partner.codigoCliente && t("clientCode", { codigo: partner.codigoCliente })]
                        .filter(Boolean)
                        .join(" · ") || "—"}
                    </p>
                    {tieneDatosPorCompletar(partner) && (
                      <p className="mt-0.5 inline-flex items-center gap-1 text-xs font-medium text-amber-700">
                        <AlertTriangle size={11} /> {t("incompleteData")}
                      </p>
                    )}
                  </div>
                </div>

                <div className="md:col-span-2">
                  <EstadoPartnerBadge estado={partner.estado} />
                </div>

                <div className="text-sm md:col-span-2">
                  {partner.estado === "ACTIVO" || partner.tarifa ? (
                    <>
                      <p className="text-neutral-800">
                        {partner.tarifa ?? "—"} · {t("discountShort", { n: Number(partner.descuentoPorcentaje) })}
                      </p>
                      <p className="text-xs text-neutral-500">{partner.marcaComercial ?? t("noBrand")}</p>
                    </>
                  ) : (
                    <span className="text-neutral-400">—</span>
                  )}
                </div>

                <div className="text-sm md:col-span-2">
                  {recuentos && (
                    <>
                      {partner.estado === "ACTIVO" && recuentos.representaciones === 0 ? (
                        <p className="font-medium text-amber-700">{t("noCatalog")}</p>
                      ) : (
                        <p className="text-neutral-800">{t("productsCount", { n: recuentos.representaciones })}</p>
                      )}
                      <p className="text-xs text-neutral-500">{t("ordersCount", { n: recuentos.ordenes })}</p>
                    </>
                  )}
                </div>

                <div className="flex items-center justify-end gap-2 md:col-span-2">
                  {esAdmin && partner.estado === "PENDIENTE_APROBACION" && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        acciones.pedirAprobar(partner);
                      }}
                      className="rounded-md bg-neutral-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-neutral-700"
                    >
                      {t("approve")}
                    </button>
                  )}
                  {partner.estado === "SUSPENDIDO" && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        acciones.pedirReactivar(partner);
                      }}
                      className="rounded-md border border-green-300 px-3 py-1.5 text-xs font-medium text-green-700 hover:bg-green-50"
                    >
                      {t("reactivate")}
                    </button>
                  )}
                  <MenuAcciones acciones={accionesDeFila(partner)} etiqueta={t("moreActions", { partner: partner.razonSocial })} />
                </div>
              </li>
            );
          })}
        </ul>

        {!isLoading && partners.length === 0 && (
          <div className="border-t border-neutral-100 px-4 py-12 text-center">
            <p className="text-neutral-600">{hayFiltros ? t("noResults") : t("empty")}</p>
            {!hayFiltros && (
              <Link href="/admin/partners/nuevo" className="mt-3 inline-block text-sm font-medium text-neutral-900 underline">
                {t("newPartner")}
              </Link>
            )}
          </div>
        )}
      </div>

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
