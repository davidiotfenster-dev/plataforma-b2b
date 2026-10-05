"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import { api, descargarArchivo } from "@/lib/api";
import type { Order } from "@/lib/types";
import type { Locale } from "@/i18n/locales";
import { EstadoBadge } from "@/components/estado-badge";
import { AvanzarEstado } from "@/components/avanzar-estado";
import { ForzarEstado } from "@/components/forzar-estado";
import { DescargarPdf } from "@/components/descargar-pdf";
import { fechaHora, LineaTiempoPedido } from "@/components/linea-tiempo-pedido";

export default function AdminPedidoDetallePage() {
  const params = useParams<{ id: string }>();
  const t = useTranslations("pedidoDetalle");
  const locale = useLocale();
  const [errorPdf, setErrorPdf] = useState(false);
  const { data: order, isLoading } = useQuery<Order>({
    queryKey: ["admin-pedidos", params.id],
    queryFn: () => api.get<Order>(`/pedidos/admin/${params.id}`),
  });

  const descargarPdf = useMutation({
    mutationFn: (idioma: Locale) =>
      descargarArchivo(`/pedidos/admin/${params.id}/pdf?idioma=${idioma.toUpperCase()}`, `${order?.codigoPed ?? "pedido"}.pdf`),
    onMutate: () => setErrorPdf(false),
    onError: () => setErrorPdf(true),
  });

  if (isLoading) return <p className="text-neutral-500">{t("loading")}</p>;
  if (!order) return <p className="text-neutral-500">{t("notFound")}</p>;

  const cancelado = order.estado === "CANCELADO";
  const fechaCancelacion = [...(order.historial ?? [])].reverse().find((h) => h.estado === "CANCELADO")?.createdAt;

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-semibold text-neutral-900">
              {order.codigoPed} · {order.partner?.razonSocial}
            </h1>
            <EstadoBadge estado={order.estado} />
          </div>
          <p className="mt-1 text-sm text-neutral-500">
            {t("placedOn", { fecha: fechaHora(order.createdAt, locale) })}
            {order.usuario && <> · {t("placedBy", { nombre: order.usuario.nombre, email: order.usuario.email })}</>}
          </p>
        </div>
        <DescargarPdf onElegir={(idioma) => descargarPdf.mutate(idioma)} descargando={descargarPdf.isPending} />
      </div>

      {errorPdf && (
        <p role="alert" className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {t("downloadError")}
        </p>
      )}

      {cancelado ? (
        <div role="status" className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 text-sm">
          <p className="font-medium text-red-800">{t("cancelledTitle")}</p>
          {fechaCancelacion && <p className="text-red-700">{t("cancelledOn", { fecha: fechaHora(fechaCancelacion, locale) })}</p>}
          {order.motivoCancelacion && <p className="mt-1 text-red-700">{t("cancelReason", { motivo: order.motivoCancelacion })}</p>}
        </div>
      ) : (
        <div className="mb-6">
          <LineaTiempoPedido estado={order.estado} historial={order.historial ?? []} />
        </div>
      )}

      {/* El botón de avanzar va bajo la línea de progreso, que ya enseña en qué paso está. */}
      <div className="-mt-3 mb-6 text-right empty:hidden">
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
