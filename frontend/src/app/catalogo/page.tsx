"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { Cpu, ShoppingCart } from "lucide-react";
import { api, ApiError, urlImagen } from "@/lib/api";
import { muestraDeColor } from "@/lib/catalogo-admin";
import type { Producto, ResumenCarrito } from "@/lib/types";
import { PrecioProducto } from "@/components/precio-producto";

interface Modelo {
  clave: string;
  nombre: string;
  variantes: Producto[];
}

/// "Dispositivo ICON1 Blanco" -> "Dispositivo ICON1" (el color se elige aparte).
function nombreSinColor(p: Producto): string {
  if (!p.color) return p.nombreComercial;
  const i = p.nombreComercial.toLowerCase().indexOf(p.color.toLowerCase());
  if (i < 0) return p.nombreComercial;
  return (p.nombreComercial.slice(0, i) + p.nombreComercial.slice(i + p.color.length)).replace(/\s+/g, " ").trim();
}

/// Una tarjeta por modelo: las variantes que solo cambian de color se agrupan.
function agruparModelos(productos: Producto[]): Modelo[] {
  const modelos = new Map<string, Modelo>();
  for (const p of productos) {
    const clave = p.modeloId ?? p.id;
    const m = modelos.get(clave);
    if (m) m.variantes.push(p);
    else modelos.set(clave, { clave, nombre: nombreSinColor(p), variantes: [p] });
  }
  return [...modelos.values()];
}

function TarjetaModelo({
  modelo,
  onAgregar,
  ocupado,
}: {
  modelo: Modelo;
  onAgregar: (id: string) => void;
  ocupado: boolean;
}) {
  const t = useTranslations("catalogo");
  const router = useRouter();
  const [elegido, setElegido] = useState(modelo.variantes[0].id);
  const producto = modelo.variantes.find((v) => v.id === elegido) ?? modelo.variantes[0];
  const conColores = modelo.variantes.length > 1 || !!producto.color;

  return (
    <div
      onClick={() => router.push(`/catalogo/${producto.id}`)}
      className="group flex cursor-pointer flex-col rounded-xl border border-neutral-200 bg-white p-5 shadow-sm transition hover:border-neutral-300 hover:shadow-md"
    >
      <div className="mb-4 flex h-44 items-center justify-center overflow-hidden rounded-lg bg-neutral-50">
        {urlImagen(producto.imagenUrl) ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={urlImagen(producto.imagenUrl)!} alt={modelo.nombre} className="h-full w-full object-contain p-2 mix-blend-multiply" />
        ) : (
          <Cpu className="size-12 text-neutral-300" strokeWidth={1.25} />
        )}
      </div>
      <p className="text-xs uppercase tracking-wide text-neutral-400">{producto.skuComercial}</p>
      <h2 className="mt-1 text-lg font-semibold leading-snug text-neutral-900">
        {conColores ? modelo.nombre : producto.nombreComercial}
      </h2>
      <div className="mt-3 min-h-8" onClick={(e) => e.stopPropagation()}>
        {conColores && (
          <div className="flex flex-wrap items-center gap-2.5">
            {modelo.variantes.map((v) => (
              <button
                key={v.id}
                type="button"
                onClick={() => setElegido(v.id)}
                title={v.color ?? ""}
                aria-label={v.color ?? v.nombreComercial}
                aria-pressed={v.id === producto.id}
                className={`h-7 w-7 rounded-full border ${
                  v.id === producto.id ? "border-neutral-900 ring-2 ring-neutral-900 ring-offset-2" : "border-neutral-300 hover:border-neutral-500"
                }`}
                style={{ background: muestraDeColor(v.color) }}
              />
            ))}
            {producto.color && <span className="text-sm text-neutral-500">{producto.color}</span>}
          </div>
        )}
      </div>
      <div className="mt-auto pt-4">
        <PrecioProducto producto={producto} />
        <button
          onClick={(e) => {
            e.stopPropagation();
            onAgregar(producto.id);
          }}
          disabled={ocupado}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg bg-neutral-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-neutral-700 disabled:opacity-50"
        >
          <ShoppingCart className="size-4" /> {t("addToCart")}
        </button>
      </div>
    </div>
  );
}

export default function CatalogoPage() {
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

  const modelos = useMemo(() => agruparModelos(productos ?? []), [productos]);

  if (isLoading) return <p className="text-neutral-500">{t("loading")}</p>;

  if (!productos || productos.length === 0) {
    return <p className="text-neutral-500">{t("empty")}</p>;
  }

  return (
    // El catálogo se sale del ancho normal de la página para aprovechar pantallas grandes.
    <div className="relative left-1/2 w-[calc(100vw-2rem)] sm:w-[min(1700px,calc(100vw-6rem))] -translate-x-1/2">
      <h1 className="mb-6 text-2xl font-semibold text-neutral-900">{t("title")}</h1>
      {mensaje && (
        <div className="mb-4 rounded-md bg-green-50 px-4 py-2 text-sm text-green-700">{mensaje}</div>
      )}
      {agregar.isError && (
        <div className="mb-4 rounded-md bg-red-50 px-4 py-2 text-sm text-red-700">
          {agregar.error instanceof ApiError ? agregar.error.message : t("addError")}
        </div>
      )}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
        {modelos.map((modelo) => (
          <TarjetaModelo key={modelo.clave} modelo={modelo} onAgregar={(id) => agregar.mutate(id)} ocupado={agregar.isPending} />
        ))}
      </div>
    </div>
  );
}
