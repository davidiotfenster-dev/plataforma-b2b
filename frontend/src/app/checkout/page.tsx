"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { api, ApiError } from "@/lib/api";
import type { Order, ResumenCarrito } from "@/lib/types";

export default function CheckoutPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const t = useTranslations("checkout");
  const { data: carrito, isLoading } = useQuery<ResumenCarrito>({
    queryKey: ["carrito"],
    queryFn: () => api.get<ResumenCarrito>("/carrito/resumen"),
    // Los precios pueden cambiar mientras la página está abierta: se vuelven a leer solos.
    refetchInterval: 30_000,
  });

  const [direccionEnvio, setDireccionEnvio] = useState("");
  const [poNumber, setPoNumber] = useState("");
  const [notas, setNotas] = useState("");
  const [error, setError] = useState<string | null>(null);

  const confirmar = useMutation({
    mutationFn: () =>
      api.post<Order>("/pedidos/confirmar", {
        direccionEnvio,
        poNumber,
        notas: notas || undefined,
        // El total que el cliente está viendo: si cambió, el servidor no confirma en silencio.
        totalEsperado: carrito?.totalPedido,
      }),
    onSuccess: (order) => {
      queryClient.invalidateQueries({ queryKey: ["carrito"] });
      queryClient.invalidateQueries({ queryKey: ["pedidos"] });
      router.push(`/pedidos/${order.id}`);
    },
    onError: (err) => {
      if (err instanceof ApiError && err.code === "PRECIOS_CAMBIADOS") {
        // Se trae el carrito con los precios nuevos para que revise el total antes de volver a confirmar.
        queryClient.invalidateQueries({ queryKey: ["carrito"] });
        setError(t("pricesChanged"));
        return;
      }
      setError(err instanceof ApiError ? err.message : t("confirmError"));
    },
  });

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    confirmar.mutate();
  }

  if (isLoading) return <p className="text-neutral-500">{t("loading")}</p>;

  if (!carrito || carrito.items.length === 0) {
    return <p className="text-neutral-500">{t("emptyCart")}</p>;
  }

  return (
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
      <div>
        <h1 className="mb-4 text-2xl font-semibold text-neutral-900">{t("orderSummary")}</h1>
        <div className="divide-y divide-neutral-100 rounded-lg border border-neutral-200 bg-white">
          {carrito.items.map((item) => (
            <div key={item.id} className="flex items-center justify-between px-4 py-3 text-sm">
              <div>
                <p className="font-medium text-neutral-900">{item.nombreComercial}</p>
                <p className="text-xs text-neutral-400">
                  {item.cantidad} × {item.precioNetoUnitario} €
                </p>
              </div>
              <p className="font-medium text-neutral-900">{item.totalLinea} €</p>
            </div>
          ))}
        </div>
        <p className="mt-4 text-right text-lg font-semibold text-neutral-900">
          {t("totalLabel", { total: carrito.totalPedido })}
        </p>
      </div>

      <div>
        <h2 className="mb-4 text-lg font-semibold text-neutral-900">{t("deliveryTitle")}</h2>
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-neutral-700">{t("shippingAddress")}</label>
            <textarea
              required
              value={direccionEnvio}
              onChange={(e) => setDireccionEnvio(e.target.value)}
              rows={3}
              className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-neutral-700">{t("poNumber")}</label>
            <input
              required
              value={poNumber}
              onChange={(e) => setPoNumber(e.target.value)}
              className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-500 focus:outline-none"
            />
            <p className="mt-1 text-xs text-neutral-400">{t("poNumberHelp")}</p>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-neutral-700">{t("notes")}</label>
            <textarea
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              rows={2}
              className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-500 focus:outline-none"
            />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button
            type="submit"
            disabled={confirmar.isPending}
            className="w-full rounded-md bg-neutral-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-neutral-700 disabled:opacity-50"
          >
            {confirmar.isPending ? t("confirming") : t("confirm")}
          </button>
          <p className="text-xs text-neutral-400">{t("disclaimer")}</p>
        </form>
      </div>
    </div>
  );
}
