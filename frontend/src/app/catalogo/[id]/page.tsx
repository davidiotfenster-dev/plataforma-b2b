"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import { ArrowLeft, Check, FileText, ShoppingCart } from "lucide-react";
import { api, ApiError, urlImagen } from "@/lib/api";
import type { ProductoDetalle, ResumenCarrito } from "@/lib/types";
import { useMe } from "@/hooks/use-me";
import { puedeComprar as puedeComprarRol } from "@/lib/acceso";
import { PrecioProducto } from "@/components/precio-producto";
import { SelectorUnidades } from "@/components/selector-unidades";

export default function ProductoDetallePage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const t = useTranslations("catalogoDetalle");
  const tCatalogo = useTranslations("catalogo");
  const locale = useLocale();
  const [unidades, setUnidades] = useState(1);
  const { data: perfil } = useMe();
  const puedeComprar = perfil ? puedeComprarRol(perfil.rol) : false;
  const { data: producto, isLoading } = useQuery<ProductoDetalle>({
    queryKey: ["catalogo", params.id],
    queryFn: () => api.get<ProductoDetalle>(`/catalogo/${params.id}`),
  });

  const agregar = useMutation({
    mutationFn: (cantidad: number) => api.post<ResumenCarrito>("/carrito/items", { representacionPartnerId: params.id, cantidad }),
    onSuccess: (resumen) => {
      queryClient.setQueryData(["carrito"], resumen);
      setUnidades(1);
    },
  });

  if (isLoading) return <p className="text-neutral-500">{t("loading")}</p>;
  if (!producto) return <p className="text-neutral-500">{t("notFound")}</p>;

  const especificaciones = producto.productoBase?.especificacionesJson;

  return (
    <div>
      <button
        onClick={() => router.push("/catalogo")}
        className="mb-6 flex items-center gap-1.5 text-sm text-neutral-500 hover:text-neutral-700"
      >
        <ArrowLeft className="size-4" /> {t("back")}
      </button>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        <div className="flex aspect-square items-center justify-center overflow-hidden rounded-lg border border-neutral-200 bg-neutral-50">
          {urlImagen(producto.imagenUrl) ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={urlImagen(producto.imagenUrl)!} alt={producto.nombreComercial} className="h-full w-full object-contain p-4 mix-blend-multiply" />
          ) : (
            <span className="text-sm text-neutral-400">{t("noImage")}</span>
          )}
        </div>

        <div>
          <p className="text-xs uppercase tracking-wide text-neutral-400">{producto.skuComercial}</p>
          <h1 className="mt-1 text-2xl font-semibold text-neutral-900">{producto.nombreComercial}</h1>
          <div className="mt-3">
            <PrecioProducto producto={producto} />
          </div>

          {puedeComprar && agregar.isError && (
            <div className="mt-3 rounded-md bg-red-50 px-4 py-2 text-sm text-red-700">
              {agregar.error instanceof ApiError ? agregar.error.message : t("addError")}
            </div>
          )}
          {puedeComprar && agregar.isSuccess && (
            <div role="status" className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 rounded-md bg-green-50 px-4 py-2 text-sm text-green-700">
              <span className="flex items-center gap-1.5">
                <Check className="size-4" aria-hidden /> {tCatalogo("addedToCartQty", { producto: producto.nombreComercial, cantidad: agregar.variables ?? 1 })}
              </span>
              <Link href="/carrito" className="font-medium underline hover:text-green-900">
                {t("goToCart")}
              </Link>
            </div>
          )}

          {puedeComprar && (
            <div className="mt-4 flex max-w-md gap-2">
              <div className="w-32 shrink-0">
                <SelectorUnidades valor={unidades} onCambiar={setUnidades} etiqueta={tCatalogo("unitsOf", { producto: producto.nombreComercial })} />
              </div>
              <button
                onClick={() => {
                  if (unidades >= 1_000 && !window.confirm(tCatalogo("quantityHugeConfirm", { cantidad: new Intl.NumberFormat(locale).format(unidades) }))) return;
                  agregar.mutate(unidades);
                }}
                disabled={agregar.isPending}
                className="flex h-10 flex-1 items-center justify-center gap-2 rounded-lg bg-neutral-900 px-4 text-sm font-medium text-white hover:bg-neutral-700 disabled:opacity-50"
              >
                <ShoppingCart className="size-4" /> {t("addToCart")}
              </button>
            </div>
          )}

          {producto.documentacionUrl && (
            <a
              href={producto.documentacionUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-4 flex items-center gap-1.5 text-sm text-neutral-600 underline hover:text-neutral-900"
            >
              <FileText className="size-4" /> {t("documentation")}
            </a>
          )}

          {especificaciones && Object.keys(especificaciones).length > 0 && (
            <div className="mt-6">
              <h2 className="mb-2 text-sm font-medium text-neutral-700">{t("specifications")}</h2>
              <dl className="divide-y divide-neutral-100 rounded-lg border border-neutral-200 bg-white text-sm">
                {Object.entries(especificaciones).map(([clave, valor]) => (
                  <div key={clave} className="flex justify-between gap-4 px-4 py-2.5">
                    <dt className="text-neutral-500">{clave}</dt>
                    <dd className="text-right font-medium text-neutral-900">{String(valor)}</dd>
                  </div>
                ))}
              </dl>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
