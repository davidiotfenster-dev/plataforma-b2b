"use client";

import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { Trash2 } from "lucide-react";
import { api } from "@/lib/api";
import type { ResumenCarrito } from "@/lib/types";

export default function CarritoPage() {
  const queryClient = useQueryClient();
  const t = useTranslations("carrito");
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
        <p className="text-neutral-500">
          {t("empty")}{" "}
          <Link href="/catalogo" className="text-neutral-900 underline">
            {t("viewCatalog")}
          </Link>
        </p>
      </div>
    );
  }

  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold text-neutral-900">{t("title")}</h1>
      <div className="overflow-hidden rounded-lg border border-neutral-200 bg-white">
        <table className="w-full text-sm">
          <thead className="border-b border-neutral-200 bg-neutral-50 text-left text-neutral-500">
            <tr>
              <th className="px-4 py-3 font-medium">{t("product")}</th>
              <th className="px-4 py-3 font-medium">{t("netPrice")}</th>
              <th className="px-4 py-3 font-medium">{t("quantity")}</th>
              <th className="px-4 py-3 font-medium">{t("total")}</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {carrito.items.map((item) => (
              <tr key={item.id} className="border-b border-neutral-100 last:border-0">
                <td className="px-4 py-3">
                  <p className="font-medium text-neutral-900">{item.nombreComercial}</p>
                  <p className="text-xs text-neutral-400">{item.skuComercial}</p>
                </td>
                <td className="px-4 py-3 text-neutral-700">{item.precioNetoUnitario} €</td>
                <td className="px-4 py-3">
                  <input
                    type="number"
                    min={1}
                    defaultValue={item.cantidad}
                    onBlur={(e) => {
                      const cantidad = Number(e.target.value);
                      if (cantidad > 0 && cantidad !== item.cantidad) {
                        actualizarCantidad.mutate({ id: item.id, cantidad });
                      }
                    }}
                    className="w-20 rounded-md border border-neutral-300 px-2 py-1"
                  />
                </td>
                <td className="px-4 py-3 font-medium text-neutral-900">{item.totalLinea} €</td>
                <td className="px-4 py-3 text-right">
                  <button
                    onClick={() => eliminar.mutate(item.id)}
                    className="text-neutral-400 hover:text-red-600"
                    aria-label={t("removeLine")}
                  >
                    <Trash2 className="size-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-6 flex items-center justify-between">
        <p className="text-lg font-semibold text-neutral-900">{t("totalLabel", { total: carrito.totalPedido })}</p>
        <Link
          href="/checkout"
          className="rounded-md bg-neutral-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-neutral-700"
        >
          {t("continueToCheckout")}
        </Link>
      </div>
    </div>
  );
}
