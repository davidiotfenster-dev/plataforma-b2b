"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { ShoppingCart } from "lucide-react";
import { api, ApiError } from "@/lib/api";
import type { Producto, ResumenCarrito } from "@/lib/types";

export default function CatalogoPage() {
  const router = useRouter();
  const t = useTranslations("catalogo");
  const { data: productos, isLoading } = useQuery<Producto[]>({
    queryKey: ["catalogo"],
    queryFn: () => api.get<Producto[]>("/catalogo"),
  });
  const queryClient = useQueryClient();
  const [mensaje, setMensaje] = useState<string | null>(null);

  const agregar = useMutation({
    mutationFn: (representacionPartnerId: string) =>
      api.post<ResumenCarrito>("/carrito/items", { representacionPartnerId, cantidad: 1 }),
    onSuccess: (resumen, representacionPartnerId) => {
      queryClient.setQueryData(["carrito"], resumen);
      const producto = productos?.find((p) => p.id === representacionPartnerId);
      setMensaje(t("addedToCart", { producto: producto?.nombreComercial ?? "" }));
      setTimeout(() => setMensaje(null), 2500);
    },
  });

  if (isLoading) return <p className="text-neutral-500">{t("loading")}</p>;

  if (!productos || productos.length === 0) {
    return <p className="text-neutral-500">{t("empty")}</p>;
  }

  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold text-neutral-900">{t("title")}</h1>
      {mensaje && (
        <div className="mb-4 rounded-md bg-green-50 px-4 py-2 text-sm text-green-700">{mensaje}</div>
      )}
      {agregar.isError && (
        <div className="mb-4 rounded-md bg-red-50 px-4 py-2 text-sm text-red-700">
          {agregar.error instanceof ApiError ? agregar.error.message : t("addError")}
        </div>
      )}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {productos.map((producto) => (
          <div
            key={producto.id}
            onClick={() => router.push(`/catalogo/${producto.id}`)}
            className="cursor-pointer rounded-lg border border-neutral-200 bg-white p-4 hover:border-neutral-300"
          >
            {producto.imagenUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={producto.imagenUrl}
                alt={producto.nombreComercial}
                className="mb-3 aspect-square w-full rounded-md object-cover"
              />
            )}
            <p className="text-xs uppercase tracking-wide text-neutral-400">{producto.skuComercial}</p>
            <h2 className="mt-1 font-medium text-neutral-900">{producto.nombreComercial}</h2>
            <p className="mt-2 text-lg font-semibold text-neutral-900">{producto.pvpBase} €</p>
            <button
              onClick={(e) => {
                e.stopPropagation();
                agregar.mutate(producto.id);
              }}
              disabled={agregar.isPending}
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-md bg-neutral-900 px-3 py-2 text-sm font-medium text-white hover:bg-neutral-700 disabled:opacity-50"
            >
              <ShoppingCart className="size-4" /> {t("addToCart")}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
