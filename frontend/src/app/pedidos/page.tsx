"use client";

import { useState } from "react";
import Link from "next/link";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import { ExternalLink, Search } from "lucide-react";
import { api } from "@/lib/api";
import { ESTADOS_PEDIDO } from "@/lib/types";
import type { EstadoPedido, PedidoResumen, PedidosPagina } from "@/lib/types";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { EstadoBadge } from "@/components/estado-badge";
import { Paginacion } from "@/components/paginacion";

const POR_PAGINA = 10;
const EN_CURSO: EstadoPedido[] = ["RECIBIDO", "CONFIRMADO", "EN_PREPARACION", "PREPARADO"];

const ORDENES = {
  fecha_desc: { orden: "fecha", sentido: "desc", clave: "sortNewest" },
  fecha_asc: { orden: "fecha", sentido: "asc", clave: "sortOldest" },
  total_desc: { orden: "total", sentido: "desc", clave: "sortTotalHigh" },
  total_asc: { orden: "total", sentido: "asc", clave: "sortTotalLow" },
} as const;
type ClaveOrden = keyof typeof ORDENES;

/// Productos del pedido en una línea: "2× Connect-1, 1× Pulsar +3 más".
function useResumenProductos() {
  const t = useTranslations("pedidos");
  return (pedido: PedidoResumen) => {
    const texto = pedido.productos.map((p) => `${p.cantidad}× ${p.nombre}`).join(", ");
    return pedido.productosRestantes > 0 ? `${texto} ${t("moreProducts", { n: pedido.productosRestantes })}` : texto;
  };
}

function Envio({ pedido }: { pedido: PedidoResumen }) {
  const t = useTranslations("pedidos");
  if (pedido.estado !== "ENVIADO" || !pedido.trackingUrl) return null;
  return (
    <a
      href={pedido.trackingUrl}
      target="_blank"
      rel="noreferrer"
      className="mt-1 inline-flex items-center gap-1 text-xs text-green-700 underline"
    >
      <ExternalLink className="h-3 w-3" aria-hidden />
      {t("trackShipment")}
      {pedido.transportista ? ` · ${pedido.transportista}` : ""}
    </a>
  );
}

export default function PedidosPage() {
  const t = useTranslations("pedidos");
  const tEstados = useTranslations("estados");
  const locale = useLocale();
  const resumirProductos = useResumenProductos();

  const [busqueda, setBusqueda] = useState("");
  const [estado, setEstado] = useState<EstadoPedido | "">("");
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");
  const [clave, setClave] = useState<ClaveOrden>("fecha_desc");
  const [page, setPage] = useState(1);
  const busquedaDiferida = useDebouncedValue(busqueda);

  const filtrosActivos = Boolean(busqueda || estado || desde || hasta);
  const { orden, sentido } = ORDENES[clave];

  const { data, isLoading, isError } = useQuery<PedidosPagina>({
    queryKey: ["pedidos", { busqueda: busquedaDiferida, estado, desde, hasta, orden, sentido, page }],
    queryFn: () => {
      const params = new URLSearchParams({ page: String(page), limit: String(POR_PAGINA), orden, sentido });
      if (busquedaDiferida.trim()) params.set("busqueda", busquedaDiferida.trim());
      if (estado) params.set("estado", estado);
      if (desde) params.set("desde", desde);
      if (hasta) params.set("hasta", hasta);
      return api.get<PedidosPagina>(`/pedidos?${params}`);
    },
    // Al cambiar de página o de filtro se sigue viendo la lista anterior en vez de parpadear.
    placeholderData: keepPreviousData,
  });

  if (isLoading) return <p className="text-neutral-500">{t("loading")}</p>;
  if (isError || !data) return <p className="text-red-600">{t("loadError")}</p>;

  const { porEstado, enviadosUltimos7Dias } = data.resumen;
  const totalPedidos = Object.values(porEstado).reduce((suma, n) => suma + (n ?? 0), 0);
  const enCurso = EN_CURSO.reduce((suma, e) => suma + (porEstado[e] ?? 0), 0);

  if (totalPedidos === 0) {
    return (
      <div>
        <h1 className="mb-4 text-2xl font-semibold text-neutral-900">{t("title")}</h1>
        <p className="text-neutral-500">
          {t("empty")}{" "}
          <Link href="/catalogo" className="text-neutral-900 underline">
            {t("viewCatalog")}
          </Link>
        </p>
      </div>
    );
  }

  const cambiar = <T,>(setter: (valor: T) => void) => (valor: T) => {
    setter(valor);
    setPage(1);
  };
  const quitarFiltros = () => {
    setBusqueda("");
    setEstado("");
    setDesde("");
    setHasta("");
    setPage(1);
  };

  const campo = "rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900";
  const chip = (activo: boolean) =>
    `rounded-full border px-3 py-1 text-xs font-medium ${
      activo
        ? "border-neutral-900 bg-neutral-900 text-white"
        : "border-neutral-300 bg-white text-neutral-700 hover:bg-neutral-50"
    }`;

  return (
    <div>
      <h1 className="mb-4 text-2xl font-semibold text-neutral-900">{t("title")}</h1>

      <dl className="mb-6 grid grid-cols-3 gap-2 sm:gap-3">
        {[
          { etiqueta: t("summaryActive"), valor: enCurso },
          { etiqueta: t("summaryShipped"), valor: enviadosUltimos7Dias },
          { etiqueta: t("summaryTotal"), valor: totalPedidos },
        ].map(({ etiqueta, valor }) => (
          <div key={etiqueta} className="rounded-lg border border-neutral-200 bg-white px-3 py-2 sm:px-4 sm:py-3">
            <dt className="text-xs text-neutral-500">{etiqueta}</dt>
            <dd className="text-2xl font-semibold text-neutral-900">{valor}</dd>
          </div>
        ))}
      </dl>

      <div className="mb-4 space-y-3">
        <div className="flex flex-col gap-3 md:flex-row md:items-end">
          <div className="relative md:flex-1">
            <label htmlFor="pedidos-busqueda" className="sr-only">
              {t("searchLabel")}
            </label>
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" aria-hidden />
            <input
              id="pedidos-busqueda"
              type="search"
              value={busqueda}
              onChange={(e) => cambiar(setBusqueda)(e.target.value)}
              placeholder={t("searchPlaceholder")}
              className={`${campo} w-full pl-9`}
            />
          </div>
          <div className="grid grid-cols-2 gap-3 md:flex">
            <label className="text-xs text-neutral-500">
              {t("dateFrom")}
              <input
                type="date"
                value={desde}
                max={hasta || undefined}
                onChange={(e) => cambiar(setDesde)(e.target.value)}
                className={`${campo} mt-1 block w-full`}
              />
            </label>
            <label className="text-xs text-neutral-500">
              {t("dateTo")}
              <input
                type="date"
                value={hasta}
                min={desde || undefined}
                onChange={(e) => cambiar(setHasta)(e.target.value)}
                className={`${campo} mt-1 block w-full`}
              />
            </label>
          </div>
          <label className="text-xs text-neutral-500">
            {t("sortLabel")}
            <select
              value={clave}
              onChange={(e) => cambiar(setClave)(e.target.value as ClaveOrden)}
              className={`${campo} mt-1 block w-full`}
            >
              {(Object.keys(ORDENES) as ClaveOrden[]).map((k) => (
                <option key={k} value={k}>
                  {t(ORDENES[k].clave)}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div role="group" aria-label={t("statusFilter")} className="flex flex-wrap gap-2">
          <button type="button" aria-pressed={estado === ""} onClick={() => cambiar(setEstado)("")} className={chip(estado === "")}>
            {t("allStatuses")} ({totalPedidos})
          </button>
          {[...ESTADOS_PEDIDO, "CANCELADO" as const].map((e) => {
            const cantidad = porEstado[e] ?? 0;
            // Un estado sin pedidos solo se ofrece si es el que está seleccionado.
            if (cantidad === 0 && estado !== e) return null;
            return (
              <button key={e} type="button" aria-pressed={estado === e} onClick={() => cambiar(setEstado)(e)} className={chip(estado === e)}>
                {tEstados(e)} ({cantidad})
              </button>
            );
          })}
        </div>

        <div className="flex items-center justify-between text-sm text-neutral-500" aria-live="polite">
          <span>{t("resultsCount", { n: data.total })}</span>
          {filtrosActivos && (
            <button type="button" onClick={quitarFiltros} className="text-neutral-900 underline">
              {t("clearFilters")}
            </button>
          )}
        </div>
      </div>

      {data.data.length === 0 ? (
        <p className="rounded-lg border border-neutral-200 bg-white px-4 py-8 text-center text-neutral-500">{t("noResults")}</p>
      ) : (
        <>
          <div className="hidden overflow-hidden rounded-lg border border-neutral-200 bg-white md:block">
            <table className="w-full text-sm">
              <thead className="border-b border-neutral-200 bg-neutral-50 text-left text-neutral-500">
                <tr>
                  <th className="px-4 py-3 font-medium">{t("order")}</th>
                  <th className="px-4 py-3 font-medium">{t("date")}</th>
                  <th className="px-4 py-3 font-medium">{t("poNumber")}</th>
                  <th className="px-4 py-3 font-medium">{t("products")}</th>
                  <th className="px-4 py-3 font-medium">{t("total")}</th>
                  <th className="px-4 py-3 font-medium">{t("status")}</th>
                </tr>
              </thead>
              <tbody>
                {data.data.map((pedido) => (
                  <tr key={pedido.id} className="border-b border-neutral-100 align-top last:border-0">
                    <td className="px-4 py-3">
                      <Link href={`/pedidos/${pedido.id}`} className="font-medium text-neutral-900 hover:underline">
                        {pedido.codigoPed}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-neutral-600">{new Date(pedido.createdAt).toLocaleDateString(locale)}</td>
                    <td className="px-4 py-3 text-neutral-600">{pedido.poNumber}</td>
                    <td className="max-w-xs px-4 py-3 text-neutral-600">
                      <p className="line-clamp-2">{resumirProductos(pedido)}</p>
                      <p className="text-xs text-neutral-400">{t("itemsCount", { n: pedido.articulos })}</p>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 font-medium text-neutral-900">{pedido.totalNeto} €</td>
                    <td className="px-4 py-3">
                      <EstadoBadge estado={pedido.estado} />
                      <div>
                        <Envio pedido={pedido} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <ul className="space-y-3 md:hidden">
            {data.data.map((pedido) => (
              <li key={pedido.id} className="rounded-lg border border-neutral-200 bg-white p-4 text-sm">
                <div className="flex items-start justify-between gap-3">
                  <Link href={`/pedidos/${pedido.id}`} className="font-medium text-neutral-900 underline">
                    {pedido.codigoPed}
                  </Link>
                  <EstadoBadge estado={pedido.estado} />
                </div>
                <p className="mt-1 text-xs text-neutral-500">
                  {new Date(pedido.createdAt).toLocaleDateString(locale)} · {t("poNumber")} {pedido.poNumber}
                </p>
                <p className="mt-2 text-neutral-600">{resumirProductos(pedido)}</p>
                <div className="mt-2 flex items-end justify-between gap-3">
                  <span className="text-xs text-neutral-400">{t("itemsCount", { n: pedido.articulos })}</span>
                  <span className="font-semibold text-neutral-900">{pedido.totalNeto} €</span>
                </div>
                <Envio pedido={pedido} />
              </li>
            ))}
          </ul>

          <Paginacion page={data.page} limit={data.limit} total={data.total} onPageChange={setPage} />
        </>
      )}
    </div>
  );
}
