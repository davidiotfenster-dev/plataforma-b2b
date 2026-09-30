"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import { ArrowLeft, Cpu, RotateCw } from "lucide-react";
import { api, ApiError, descargarArchivo, urlImagen } from "@/lib/api";
import type { Order, ResultadoRepetirPedido } from "@/lib/types";
import { useMe } from "@/hooks/use-me";
import type { Locale } from "@/i18n/locales";
import { DescargarPdf } from "@/components/descargar-pdf";
import { EstadoBadge } from "@/components/estado-badge";
import { fechaHora, LineaTiempoPedido } from "@/components/linea-tiempo-pedido";

export default function PedidoDetallePage() {
  const params = useParams<{ id: string }>();
  const t = useTranslations("pedidoDetalle");
  const locale = useLocale();
  const queryClient = useQueryClient();
  const { data: me } = useMe();
  const [errorPdf, setErrorPdf] = useState(false);

  const { data: order, isLoading } = useQuery<Order>({
    queryKey: ["pedidos", params.id],
    queryFn: () => api.get<Order>(`/pedidos/${params.id}`),
  });

  const descargarPdf = useMutation({
    mutationFn: (idioma: Locale) =>
      descargarArchivo(`/pedidos/${params.id}/pdf?idioma=${idioma.toUpperCase()}`, `${order?.codigoPed ?? "pedido"}.pdf`),
    onMutate: () => setErrorPdf(false),
    onError: () => setErrorPdf(true),
  });

  const repetir = useMutation({
    mutationFn: () => api.post<ResultadoRepetirPedido>(`/carrito/repetir/${params.id}`),
    onSuccess: (resultado) => queryClient.setQueryData(["carrito"], resultado.carrito),
  });

  if (isLoading) return <p className="text-neutral-500">{t("loading")}</p>;
  if (!order) return <p className="text-neutral-500">{t("notFound")}</p>;

  const cancelado = order.estado === "CANCELADO";
  const fechaCancelacion = [...(order.historial ?? [])].reverse().find((h) => h.estado === "CANCELADO")?.createdAt;
  const puedeComprar = me?.rol === "PARTNER_ADMIN" || me?.rol === "PARTNER_COMPRADOR";
  const resultado = repetir.data;

  return (
    <div>
      <Link href="/pedidos" className="mb-3 inline-flex items-center gap-1 text-sm text-neutral-500 hover:text-neutral-900">
        <ArrowLeft className="h-4 w-4" aria-hidden />
        {t("back")}
      </Link>

      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold text-neutral-900">{order.codigoPed}</h1>
            <EstadoBadge estado={order.estado} />
          </div>
          <p className="mt-1 text-sm text-neutral-500">{t("placedOn", { fecha: fechaHora(order.createdAt, locale) })}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <DescargarPdf onElegir={(idioma) => descargarPdf.mutate(idioma)} descargando={descargarPdf.isPending} />
          {puedeComprar && (
            <button
              type="button"
              onClick={() => repetir.mutate()}
              disabled={repetir.isPending}
              className="inline-flex items-center gap-2 rounded-md bg-neutral-900 px-3 py-2 text-sm text-white hover:bg-neutral-700 disabled:opacity-50"
            >
              <RotateCw className="h-4 w-4" aria-hidden />
              {repetir.isPending ? t("reordering") : t("reorder")}
            </button>
          )}
        </div>
      </div>

      {errorPdf && (
        <p role="alert" className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {t("downloadError")}
        </p>
      )}

      {repetir.isError && (
        <p role="alert" className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {repetir.error instanceof ApiError ? repetir.error.message : t("reorderError")}
        </p>
      )}

      {resultado && (
        <div role="status" className="mb-4 space-y-2 rounded-md border border-neutral-200 bg-white p-4 text-sm">
          <p className={resultado.agregadas > 0 ? "font-medium text-green-700" : "font-medium text-amber-700"}>
            {resultado.agregadas > 0 ? t("reorderDone", { n: resultado.agregadas }) : t("reorderNone")}
          </p>
          {resultado.noDisponibles.length > 0 && (
            <p className="text-amber-700">{t("reorderUnavailable", { productos: resultado.noDisponibles.join(", ") })}</p>
          )}
          {resultado.preciosCambiados.length > 0 && (
            <div className="text-amber-700">
              <p>{t("reorderPriceChanges")}</p>
              <ul className="ml-5 list-disc">
                {resultado.preciosCambiados.map((cambio) => (
                  <li key={cambio.nombre}>
                    {t("reorderPriceLine", { nombre: cambio.nombre, anterior: cambio.anterior, actual: cambio.actual })}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {resultado.agregadas > 0 && (
            <Link href="/carrito" className="inline-block font-medium text-neutral-900 underline">
              {t("goToCart")}
            </Link>
          )}
        </div>
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
              <th className="hidden px-4 py-3 font-medium sm:table-cell">{t("netPrice")}</th>
              <th className="px-4 py-3 font-medium">{t("total")}</th>
            </tr>
          </thead>
          <tbody>
            {order.items?.map((item) => {
              const descuento = Number.parseFloat(item.descuentoAplicado);
              return (
                <tr key={item.id} className="border-b border-neutral-100 last:border-0">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-md bg-neutral-50">
                        {urlImagen(item.imagenUrl) ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={urlImagen(item.imagenUrl)!} alt="" className="h-full w-full object-contain p-1 mix-blend-multiply" />
                        ) : (
                          <Cpu className="size-5 text-neutral-300" strokeWidth={1.25} aria-hidden />
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-neutral-900">{item.nombreProducto}</p>
                        <p className="text-xs text-neutral-400">{item.skuComercial}</p>
                        <p className="text-xs text-neutral-500 sm:hidden">{t("unitPrice", { precio: item.precioNetoUnitario })}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-neutral-600">{item.cantidad}</td>
                  <td className="hidden px-4 py-3 text-neutral-600 sm:table-cell">
                    <p>{item.precioNetoUnitario} €</p>
                    {descuento > 0 && (
                      <p className="text-xs text-neutral-400">{t("pvpDiscount", { pvp: item.pvpHistorico, descuento })}</p>
                    )}
                  </td>
                  <td className="px-4 py-3 font-medium text-neutral-900">{item.totalLinea} €</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="mt-4 text-right text-lg font-semibold text-neutral-900">
        {t("totalLabel", { total: order.totalNeto })}
      </p>
    </div>
  );
}
