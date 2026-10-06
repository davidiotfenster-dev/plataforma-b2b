"use client";

import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { AlertTriangle, ArrowLeft, ArrowRight, Minus, Plus, Trash2 } from "lucide-react";
import { api } from "@/lib/api";
import type { LineaCarrito, ResumenCarrito } from "@/lib/types";
import { AyudaPuntual } from "@/components/ayuda/ayuda-puntual";
import { usePrecio } from "@/lib/formato";
import { CampoCantidad, CANTIDAD_MAXIMA } from "@/components/campo-cantidad";
import { PasosCompra } from "@/components/pasos-compra";
import { CarritoVacio, Miniatura } from "@/components/carrito-ui";

/// Cantidad con − y + a los lados: lo habitual es subir o bajar de una en una.
function CantidadLinea({
  linea,
  onCambiar,
  ocupado,
}: {
  linea: LineaCarrito;
  onCambiar: (cantidad: number) => Promise<unknown>;
  ocupado: boolean;
}) {
  const t = useTranslations("carrito");
  const boton =
    "flex size-8 shrink-0 items-center justify-center rounded-md border border-neutral-300 bg-white text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900 disabled:opacity-30 disabled:hover:bg-white";
  return (
    <div className="flex items-start gap-1.5">
      <button
        type="button"
        className={boton}
        disabled={ocupado || linea.cantidad <= 1}
        onClick={() => onCambiar(linea.cantidad - 1).catch(() => {})}
        aria-label={t("less", { producto: linea.nombreComercial })}
      >
        <Minus className="size-3.5" />
      </button>
      <CampoCantidad valor={linea.cantidad} etiqueta={t("quantityOf", { producto: linea.nombreComercial })} onCambiar={onCambiar} />
      <button
        type="button"
        className={boton}
        disabled={ocupado || linea.cantidad >= CANTIDAD_MAXIMA}
        onClick={() => onCambiar(linea.cantidad + 1).catch(() => {})}
        aria-label={t("more", { producto: linea.nombreComercial })}
      >
        <Plus className="size-3.5" />
      </button>
    </div>
  );
}

function AvisoNoDisponible() {
  const t = useTranslations("carrito");
  return (
    <p className="mt-1 flex items-center gap-1 text-xs font-medium text-amber-800">
      <AlertTriangle className="size-3.5 shrink-0" aria-hidden /> {t("unavailable")}
    </p>
  );
}

export default function CarritoPage() {
  const queryClient = useQueryClient();
  const t = useTranslations("carrito");
  const precio = usePrecio();
  const tAyuda = useTranslations("ayuda");
  const { data: carrito, isLoading } = useQuery<ResumenCarrito>({
    queryKey: ["carrito"],
    queryFn: () => api.get<ResumenCarrito>("/carrito/resumen"),
    // Los precios pueden cambiar mientras la página está abierta: se vuelven a leer solos.
    refetchInterval: 30_000,
  });

  const actualizarCantidad = useMutation({
    mutationFn: ({ id, cantidad }: { id: string; cantidad: number }) =>
      api.patch<ResumenCarrito>(`/carrito/items/${id}`, { cantidad }),
    onSuccess: (resumen) => queryClient.setQueryData(["carrito"], resumen),
  });

  const eliminar = useMutation({
    mutationFn: (id: string) => api.delete<ResumenCarrito>(`/carrito/items/${id}`),
    onSuccess: (resumen) => queryClient.setQueryData(["carrito"], resumen),
  });

  if (isLoading) return <p className="text-neutral-500">{t("loading")}</p>;

  if (!carrito || carrito.items.length === 0) {
    return (
      <div>
        <h1 className="mb-4 text-2xl font-semibold text-neutral-900">{t("title")}</h1>
        <CarritoVacio texto={t("empty")} hint={t("emptyHint")} accion={t("viewCatalog")} />
      </div>
    );
  }

  const hayNoDisponibles = carrito.items.some((item) => !item.disponible);
  const articulos = carrito.items.reduce((suma, linea) => suma + linea.cantidad, 0);
  const cambiar = (id: string) => (cantidad: number) => actualizarCantidad.mutateAsync({ id, cantidad });
  const botonQuitar = (item: LineaCarrito) => (
    <button
      onClick={() => eliminar.mutate(item.id)}
      disabled={eliminar.isPending}
      className="rounded-md p-1.5 text-neutral-400 hover:bg-red-50 hover:text-red-600"
      aria-label={t("removeLine")}
      title={t("removeLine")}
    >
      <Trash2 className="size-4" />
    </button>
  );

  return (
    <div>
      <PasosCompra paso={1} />
      <div className="mb-6 flex items-baseline justify-between gap-4">
        <h1 className="text-2xl font-semibold text-neutral-900">{t("title")}</h1>
        <p className="text-sm text-neutral-500">{t("summaryCount", { lineas: carrito.items.length, articulos })}</p>
      </div>

      {/* Escritorio y tablet: tabla. */}
      <div className="hidden overflow-hidden rounded-lg border border-neutral-200 bg-white md:block">
        <table className="w-full text-sm">
          <thead className="border-b border-neutral-200 bg-neutral-50 text-left text-neutral-500">
            <tr>
              <th className="px-4 py-3 font-medium">{t("product")}</th>
              <th className="px-4 py-3 font-medium">
                <span className="inline-flex items-center gap-1">
                  {t("netPrice")}
                  <AyudaPuntual texto={tAyuda("puntual.precioNetoCarrito")} />
                </span>
              </th>
              <th className="px-4 py-3 font-medium">{t("quantity")}</th>
              <th className="px-4 py-3 text-right font-medium">{t("total")}</th>
              <th className="w-12 px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {carrito.items.map((item) => (
              <tr key={item.id} className={`border-b border-neutral-100 last:border-0 ${item.disponible ? "" : "bg-amber-50"}`}>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <Miniatura linea={item} />
                    <div className="min-w-0">
                      <Link href={`/catalogo/${item.representacionPartnerId}`} className="font-medium text-neutral-900 hover:underline">
                        {item.nombreComercial}
                      </Link>
                      <p className="text-xs text-neutral-400">{item.skuComercial}</p>
                      {!item.disponible && <AvisoNoDisponible />}
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 text-neutral-700">{precio(item.precioNetoUnitario)}</td>
                <td className="px-4 py-3">
                  <CantidadLinea linea={item} onCambiar={cambiar(item.id)} ocupado={actualizarCantidad.isPending} />
                </td>
                <td className="px-4 py-3 text-right font-medium text-neutral-900">{precio(item.totalLinea)}</td>
                <td className="px-4 py-3 text-right">{botonQuitar(item)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Móvil: una tarjeta por línea; la tabla no cabía y se cortaba el total. */}
      <ul className="space-y-3 md:hidden">
        {carrito.items.map((item) => (
          <li key={item.id} className={`rounded-lg border p-3 ${item.disponible ? "border-neutral-200 bg-white" : "border-amber-200 bg-amber-50"}`}>
            <div className="flex gap-3">
              <Miniatura linea={item} className="size-16" />
              <div className="min-w-0 flex-1">
                <p className="font-medium leading-snug text-neutral-900">{item.nombreComercial}</p>
                <p className="text-xs text-neutral-400">{item.skuComercial}</p>
                <p className="mt-1 text-sm text-neutral-600">
                  {precio(item.precioNetoUnitario)} <span className="text-neutral-400">/ {t("unit")}</span>
                </p>
                {!item.disponible && <AvisoNoDisponible />}
              </div>
              <div className="-mr-1 -mt-1">{botonQuitar(item)}</div>
            </div>
            <div className="mt-3 flex items-start justify-between gap-3 border-t border-neutral-100 pt-3">
              <CantidadLinea linea={item} onCambiar={cambiar(item.id)} ocupado={actualizarCantidad.isPending} />
              <p className="pt-1 font-semibold text-neutral-900">{precio(item.totalLinea)}</p>
            </div>
          </li>
        ))}
      </ul>

      <div className="mt-6 rounded-lg border border-neutral-200 bg-white p-4 sm:flex sm:items-center sm:justify-between sm:gap-6">
        <div>
          <p className="text-lg font-semibold text-neutral-900">{t("totalLabel", { total: precio(carrito.totalPedido) })}</p>
          <p className="text-xs text-neutral-500">{t("totalHint")}</p>
        </div>
        <div className="mt-4 flex flex-col-reverse gap-2 sm:mt-0 sm:flex-row sm:items-center">
          <Link
            href="/catalogo"
            className="flex items-center justify-center gap-1.5 rounded-md px-4 py-2.5 text-sm font-medium text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900"
          >
            <ArrowLeft className="size-4" /> {t("keepShopping")}
          </Link>
          {hayNoDisponibles ? (
            <span
              aria-disabled="true"
              className="flex cursor-not-allowed items-center justify-center gap-1.5 rounded-md bg-neutral-900 px-5 py-2.5 text-sm font-medium text-white opacity-50"
            >
              {t("continueToCheckout")} <ArrowRight className="size-4" />
            </span>
          ) : (
            <Link
              href="/checkout"
              className="flex items-center justify-center gap-1.5 rounded-md bg-neutral-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-neutral-700"
            >
              {t("continueToCheckout")} <ArrowRight className="size-4" />
            </Link>
          )}
        </div>
      </div>
      {hayNoDisponibles && (
        <p role="alert" className="mt-3 text-right text-sm text-amber-800">
          {t("unavailableBlock")}
        </p>
      )}
    </div>
  );
}
