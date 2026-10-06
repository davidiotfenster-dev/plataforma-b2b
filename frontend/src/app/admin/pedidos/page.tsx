"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import { ChevronDown, ChevronRight, Search } from "lucide-react";
import { api } from "@/lib/api";
import { ESTADOS_PEDIDO, type EstadoPedido, type Order, type Paginado } from "@/lib/types";
import { EstadoBadge } from "@/components/estado-badge";
import { AvanzarEstado } from "@/components/avanzar-estado";
import { CancelarPedido } from "@/components/cancelar-pedido";
import { Paginacion } from "@/components/paginacion";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { usePrecio } from "@/lib/formato";

const LIMITE_POR_PAGINA = 20;

interface ResumenPartner {
  partnerId: string;
  razonSocial: string;
  total: number;
  pendientes: number;
}

function TarjetaPartner({ resumen }: { resumen: ResumenPartner }) {
  const router = useRouter();
  const t = useTranslations("adminPedidos");
  const locale = useLocale();
  const precio = usePrecio();
  const [abierto, setAbierto] = useState(false);

  const { data: pedidos, isLoading } = useQuery<Order[]>({
    queryKey: ["admin-pedidos-por-partner", resumen.partnerId],
    queryFn: () => api.get<Order[]>(`/pedidos/admin/por-partner/${resumen.partnerId}`),
    enabled: abierto,
  });

  return (
    <div className="rounded-lg border border-neutral-200 bg-white">
      <button onClick={() => setAbierto((v) => !v)} className="flex w-full items-center justify-between gap-2 p-4 text-left">
        <div className="flex items-center gap-2">
          {abierto ? <ChevronDown className="size-4 text-neutral-400" /> : <ChevronRight className="size-4 text-neutral-400" />}
          <span className="font-medium text-neutral-900">{resumen.razonSocial}</span>
          {resumen.pendientes > 0 && (
            <span className="flex size-5 items-center justify-center rounded-full bg-red-600 text-xs font-semibold text-white">
              {resumen.pendientes}
            </span>
          )}
        </div>
        <span className="text-xs text-neutral-400">{t("orderCount", { cantidad: resumen.total })}</span>
      </button>

      {abierto && (
        <div className="space-y-2 border-t border-neutral-100 p-3">
          {isLoading && <p className="text-sm text-neutral-500">{t("loading")}</p>}
          {pedidos?.map((order) => (
            <div
              key={order.id}
              onClick={() => router.push(`/admin/pedidos/${order.id}`)}
              className="cursor-pointer rounded-md border border-neutral-200 p-3 hover:border-neutral-300"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="font-medium text-neutral-900">{order.codigoPed}</p>
                  <p className="text-xs text-neutral-400">
                    PO {order.poNumber} · {precio(order.totalNeto)} · {new Date(order.createdAt).toLocaleDateString(locale)}
                  </p>
                  {order.estado === "CANCELADO" && order.motivoCancelacion && (
                    <p className="mt-1 text-xs text-red-600">{t("cancelReason", { motivo: order.motivoCancelacion })}</p>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <EstadoBadge estado={order.estado} />
                  <AvanzarEstado order={order} invalidateKeys={[["admin-pedidos-por-partner", resumen.partnerId], ["admin-pedidos-resumen"], ["admin-pedidos-lista"]]} />
                  <CancelarPedido order={order} invalidateKeys={[["admin-pedidos-por-partner", resumen.partnerId], ["admin-pedidos-resumen"], ["admin-pedidos-lista"]]} />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function VistaPorEmpresa() {
  const t = useTranslations("adminPedidos");
  const [busqueda, setBusqueda] = useState("");
  const [page, setPage] = useState(1);
  const busquedaDebounced = useDebouncedValue(busqueda);

  const { data: respuesta, isLoading } = useQuery<Paginado<ResumenPartner>>({
    queryKey: ["admin-pedidos-resumen", page, busquedaDebounced],
    queryFn: () => {
      const params = new URLSearchParams({ page: String(page), limit: String(LIMITE_POR_PAGINA) });
      if (busquedaDebounced.trim()) params.set("busqueda", busquedaDebounced.trim());
      return api.get<Paginado<ResumenPartner>>(`/pedidos/admin/resumen-por-partner?${params}`);
    },
    placeholderData: (anterior) => anterior,
  });

  return (
    <div>
      <div className="mb-4 flex justify-end">
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-neutral-400" />
          <input
            value={busqueda}
            onChange={(e) => {
              setBusqueda(e.target.value);
              // Al cambiar la búsqueda se vuelve a la página 1 (la del resultado anterior puede no existir).
              setPage(1);
            }}
            placeholder={t("searchPlaceholder")}
            className="w-56 rounded-md border border-neutral-200 py-1.5 pl-8 pr-3 text-sm text-neutral-700 placeholder:text-neutral-400 focus:border-neutral-400 focus:outline-none"
          />
        </div>
      </div>

      {isLoading ? (
        <p className="text-neutral-500">{t("loading")}</p>
      ) : (
        <div className="space-y-3">
          {respuesta?.data.map((resumen) => (
            <TarjetaPartner key={resumen.partnerId} resumen={resumen} />
          ))}
          {respuesta?.total === 0 && (
            <p className="text-neutral-500">{busquedaDebounced.trim() ? t("noResults") : t("empty")}</p>
          )}
        </div>
      )}
      {respuesta && (
        <Paginacion page={respuesta.page} limit={respuesta.limit} total={respuesta.total} onPageChange={setPage} />
      )}
    </div>
  );
}

const FILTROS_ESTADO: (EstadoPedido | "")[] = ["", ...ESTADOS_PEDIDO, "CANCELADO"];

/// Todos los pedidos en una sola lista: para dar con uno por su código, su PO o
/// la empresa sin saber en qué tarjeta está, o ver todo lo que está en un estado.
function VistaTodos() {
  const t = useTranslations("adminPedidos");
  const tEstados = useTranslations("estados");
  const router = useRouter();
  const locale = useLocale();
  const precio = usePrecio();
  const [busqueda, setBusqueda] = useState("");
  const [estado, setEstado] = useState<EstadoPedido | "">("");
  const [page, setPage] = useState(1);
  const busquedaDebounced = useDebouncedValue(busqueda);

  const { data: respuesta, isLoading } = useQuery<Paginado<Order>>({
    queryKey: ["admin-pedidos-lista", page, busquedaDebounced, estado],
    queryFn: () => {
      const params = new URLSearchParams({ page: String(page), limit: String(LIMITE_POR_PAGINA) });
      if (busquedaDebounced.trim()) params.set("busqueda", busquedaDebounced.trim());
      if (estado) params.set("estado", estado);
      return api.get<Paginado<Order>>(`/pedidos/admin/lista?${params}`);
    },
    placeholderData: (anterior) => anterior,
  });

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <select
          value={estado}
          onChange={(e) => {
            setEstado(e.target.value as EstadoPedido | "");
            setPage(1);
          }}
          aria-label={t("filterByStatus")}
          className="rounded-md border border-neutral-200 bg-white px-2 py-1.5 text-sm text-neutral-700"
        >
          {FILTROS_ESTADO.map((e) => (
            <option key={e} value={e}>
              {e ? tEstados(e) : t("allStatuses")}
            </option>
          ))}
        </select>
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-neutral-400" />
          <input
            value={busqueda}
            onChange={(e) => {
              setBusqueda(e.target.value);
              setPage(1);
            }}
            placeholder={t("searchOrdersPlaceholder")}
            className="w-72 rounded-md border border-neutral-200 py-1.5 pl-8 pr-3 text-sm text-neutral-700 placeholder:text-neutral-400 focus:border-neutral-400 focus:outline-none"
          />
        </div>
      </div>

      {isLoading ? (
        <p className="text-neutral-500">{t("loading")}</p>
      ) : (
        <ul className="space-y-2">
          {respuesta?.data.map((order) => (
            <li
              key={order.id}
              onClick={() => router.push(`/admin/pedidos/${order.id}`)}
              className="cursor-pointer rounded-md border border-neutral-200 bg-white p-3 hover:border-neutral-300"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="font-medium text-neutral-900">
                    {order.codigoPed} <span className="font-normal text-neutral-500">· {order.partner?.razonSocial}</span>
                  </p>
                  <p className="text-xs text-neutral-400">
                    PO {order.poNumber} · {precio(order.totalNeto)} · {new Date(order.createdAt).toLocaleDateString(locale)}
                  </p>
                </div>
                <EstadoBadge estado={order.estado} />
              </div>
            </li>
          ))}
          {respuesta?.total === 0 && (
            <p className="text-neutral-500">{busquedaDebounced.trim() || estado ? t("noOrdersFound") : t("empty")}</p>
          )}
        </ul>
      )}
      {respuesta && (
        <Paginacion page={respuesta.page} limit={respuesta.limit} total={respuesta.total} onPageChange={setPage} />
      )}
    </div>
  );
}

export default function AdminPedidosPage() {
  const t = useTranslations("adminPedidos");
  const [vista, setVista] = useState<"empresa" | "todos">("empresa");
  const opciones = [
    { id: "empresa", etiqueta: t("byCompany") },
    { id: "todos", etiqueta: t("allOrders") },
  ] as const;

  return (
    <div>
      <h1 className="mb-4 text-2xl font-semibold text-neutral-900">{t("title")}</h1>
      <div role="tablist" className="mb-4 inline-flex rounded-md border border-neutral-200 bg-white p-0.5 text-sm">
        {opciones.map((o) => (
          <button
            key={o.id}
            role="tab"
            aria-selected={vista === o.id}
            onClick={() => setVista(o.id)}
            className={`rounded px-3 py-1.5 ${vista === o.id ? "bg-neutral-900 font-medium text-white" : "text-neutral-600 hover:bg-neutral-50"}`}
          >
            {o.etiqueta}
          </button>
        ))}
      </div>
      {vista === "empresa" ? <VistaPorEmpresa /> : <VistaTodos />}
    </div>
  );
}
