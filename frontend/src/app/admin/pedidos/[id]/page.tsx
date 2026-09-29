"use client";

import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { api } from "@/lib/api";
import type { Order } from "@/lib/types";
import { EstadoBadge } from "@/components/estado-badge";
import { EstadoLegend } from "@/components/estado-legend";
import { AvanzarEstado } from "@/components/avanzar-estado";
import { ForzarEstado } from "@/components/forzar-estado";

export default function AdminPedidoDetallePage() {
  const params = useParams<{ id: string }>();
  const t = useTranslations("pedidoDetalle");
  const { data: order, isLoading } = useQuery<Order>({
    queryKey: ["admin-pedidos", params.id],
    queryFn: () => api.get<Order>(`/pedidos/admin/${params.id}`),
  });

  if (isLoading) return <p className="text-neutral-500">{t("loading")}</p>;
  if (!order) return <p className="text-neutral-500">{t("notFound")}</p>;

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-neutral-900">
          {order.codigoPed} · {order.partner?.razonSocial}
        </h1>
        <EstadoBadge estado={order.estado} />
      </div>

      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-neutral-200 bg-white p-4">
        <EstadoLegend actual={order.estado} />
        <AvanzarEstado order={order} invalidateKeys={[["admin-pedidos", params.id], ["admin-pedidos"]]} />
      </div>

      <div className="mb-6">
        <ForzarEstado order={order} invalidateKeys={[["admin-pedidos", params.id], ["admin-pedidos"]]} />
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        <div className="rounded-lg border border-neutral-200 bg-white p-4 text-sm">
          <p className="text-neutral-400">{t("shippingAddress")}</p>
          <p className="mt-1 text-neutral-900">{order.direccionEnvio}</p>
        </div>
        <div className="rounded-lg border border-neutral-200 bg-white p-4 text-sm">
          <p className="text-neutral-400">{t("poNumber")}</p>
          <p className="mt-1 text-neutral-900">{order.poNumber}</p>
        </div>
        {order.notas && (
          <div className="rounded-lg border border-neutral-200 bg-white p-4 text-sm sm:col-span-2">
            <p className="text-neutral-400">{t("notes")}</p>
            <p className="mt-1 text-neutral-900">{order.notas}</p>
          </div>
        )}
        {order.estado === "ENVIADO" && (
          <div className="rounded-lg border border-green-200 bg-green-50 p-4 text-sm sm:col-span-2">
            <p className="font-medium text-green-800">{t("shipmentTitle")}</p>
            <p className="mt-1 text-green-700">{t("carrier", { valor: order.transportista ?? "" })}</p>
            <p className="text-green-700">{t("trackingNumber", { valor: order.numeroExpedicion ?? "" })}</p>
            {order.trackingUrl && (
              <a href={order.trackingUrl} target="_blank" rel="noreferrer" className="text-green-700 underline">
                {t("trackShipment")}
              </a>
            )}
          </div>
        )}
      </div>

      <h2 className="mb-3 mt-8 text-lg font-semibold text-neutral-900">{t("lines")}</h2>
      <div className="overflow-hidden rounded-lg border border-neutral-200 bg-white">
        <table className="w-full text-sm">
          <thead className="border-b border-neutral-200 bg-neutral-50 text-left text-neutral-500">
            <tr>
              <th className="px-4 py-3 font-medium">{t("product")}</th>
              <th className="px-4 py-3 font-medium">{t("quantity")}</th>
              <th className="px-4 py-3 font-medium">{t("netPrice")}</th>
              <th className="px-4 py-3 font-medium">{t("total")}</th>
            </tr>
          </thead>
          <tbody>
            {order.items?.map((item) => (
              <tr key={item.id} className="border-b border-neutral-100 last:border-0">
                <td className="px-4 py-3">
                  <p className="font-medium text-neutral-900">{item.nombreProducto}</p>
                  <p className="text-xs text-neutral-400">{item.skuComercial}</p>
                </td>
                <td className="px-4 py-3 text-neutral-600">{item.cantidad}</td>
                <td className="px-4 py-3 text-neutral-600">{item.precioNetoUnitario} €</td>
                <td className="px-4 py-3 font-medium text-neutral-900">{item.totalLinea} €</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-4 text-right text-lg font-semibold text-neutral-900">
        {t("totalLabel", { total: order.totalNeto })}
      </p>
    </div>
  );
}
