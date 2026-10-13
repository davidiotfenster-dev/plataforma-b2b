"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import { Check, Cpu, Search, ShoppingCart, X } from "lucide-react";
import { api, ApiError, urlImagen } from "@/lib/api";
import { muestraDeColor } from "@/lib/catalogo-admin";
import type { Producto, ResumenCarrito } from "@/lib/types";
import { useMe } from "@/hooks/use-me";
import { puedeComprar as puedeComprarRol } from "@/lib/acceso";
import { PrecioProducto } from "@/components/precio-producto";
import { SelectorUnidades } from "@/components/selector-unidades";

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

/// Texto en minúsculas y sin tildes, para que «connect» encuentre «Connect» y «boton» «Botón».
function normalizar(texto: string): string {
  return texto.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

function coincide(modelo: Modelo, busqueda: string): boolean {
  const palabras = normalizar(busqueda).split(/\s+/).filter(Boolean);
  if (palabras.length === 0) return true;
  const texto = normalizar(
    [modelo.nombre, ...modelo.variantes.flatMap((v) => [v.nombreComercial, v.skuComercial, v.color ?? ""])].join(" "),
  );
  return palabras.every((p) => texto.includes(p));
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
  puedeComprar,
  enCarrito,
}: {
  modelo: Modelo;
  onAgregar: (id: string, cantidad: number) => Promise<unknown>;
  ocupado: boolean;
  puedeComprar: boolean;
  /// Unidades de cada variante que ya hay en el carrito.
  enCarrito: Map<string, number>;
}) {
  const t = useTranslations("catalogo");
  const router = useRouter();
  const [elegido, setElegido] = useState(modelo.variantes[0].id);
  const producto = modelo.variantes.find((v) => v.id === elegido) ?? modelo.variantes[0];
  const conColores = modelo.variantes.length > 1 || !!producto.color;
  const [unidades, setUnidades] = useState(1);
  const formatoNumero = new Intl.NumberFormat(useLocale());
  const yaEnCarrito = enCarrito.get(producto.id) ?? 0;

  return (
    <div
      onClick={() => router.push(`/catalogo/${producto.id}`)}
      className="group flex cursor-pointer flex-col rounded-xl border border-neutral-200 bg-white p-4 shadow-sm transition hover:border-neutral-300 hover:shadow-md min-[480px]:p-3 sm:p-5"
    >
      <div className="relative mb-3 flex h-44 items-center justify-center overflow-hidden rounded-lg bg-neutral-50 min-[480px]:h-28 sm:mb-4 sm:h-44">
        {yaEnCarrito > 0 && (
          <span className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-full bg-teal-600 px-2 py-0.5 text-[11px] font-medium text-white shadow-sm">
            <Check className="size-3" aria-hidden /> {t("inCart", { cantidad: yaEnCarrito })}
          </span>
        )}
        {urlImagen(producto.imagenUrl) ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={urlImagen(producto.imagenUrl)!} alt={modelo.nombre} className="h-full w-full object-contain p-2 mix-blend-multiply transition-transform duration-300 group-hover:scale-105" />
        ) : (
          <Cpu className="size-10 text-neutral-300 sm:size-12" strokeWidth={1.25} />
        )}
      </div>
      <p className="truncate text-[11px] uppercase tracking-wide text-neutral-400 sm:text-xs">{producto.skuComercial}</p>
      <h2 className="mt-1 text-lg font-semibold leading-snug text-neutral-900 min-[480px]:text-sm sm:text-lg">
        {conColores ? modelo.nombre : producto.nombreComercial}
      </h2>
      <div className="mt-2 min-h-7 sm:mt-3 sm:min-h-8" onClick={(e) => e.stopPropagation()}>
        {conColores && (
          <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
            {modelo.variantes.map((v) => (
              <button
                key={v.id}
                type="button"
                onClick={() => setElegido(v.id)}
                title={v.color ?? ""}
                aria-label={v.color ?? v.nombreComercial}
                aria-pressed={v.id === producto.id}
                className={`h-6 w-6 rounded-full border sm:h-7 sm:w-7 ${
                  v.id === producto.id ? "border-neutral-900 ring-2 ring-neutral-900 ring-offset-2" : "border-neutral-300 hover:border-neutral-500"
                }`}
                style={{ background: muestraDeColor(v.color) }}
              />
            ))}
            {producto.color && <span className="w-full text-xs text-neutral-500 sm:w-auto sm:text-sm">{producto.color}</span>}
          </div>
        )}
      </div>
      <div className="mt-auto pt-3 sm:pt-4">
        <PrecioProducto producto={producto} />
        {puedeComprar && (
          <div className="mt-3 flex flex-col gap-2 sm:mt-4 sm:flex-row" onClick={(e) => e.stopPropagation()}>
            <div className="sm:w-28 sm:shrink-0">
              <SelectorUnidades
                valor={unidades}
                onCambiar={setUnidades}
                etiqueta={t("unitsOf", { producto: producto.nombreComercial })}
              />
            </div>
            <button
              onClick={() => {
                // Igual que en el carrito: un cero de más (10 → 100) es fácil de teclear.
                if (unidades >= 1_000 && !window.confirm(t("quantityHugeConfirm", { cantidad: formatoNumero.format(unidades) }))) return;
                onAgregar(producto.id, unidades).then(() => setUnidades(1), () => {});
              }}
              disabled={ocupado}
              className="flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-neutral-900 px-3 text-sm font-medium text-white transition-colors hover:bg-neutral-700 disabled:opacity-50"
            >
              <ShoppingCart className="size-4 shrink-0" /> <span className="truncate">{t("add")}</span>
            </button>
          </div>
        )}
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
  const { data: perfil } = useMe();
  // Mientras no se sabe el rol no se enseña el botón: así no parpadea a quien solo consulta.
  const puedeComprar = perfil ? puedeComprarRol(perfil.rol) : false;
  const [mensaje, setMensaje] = useState<string | null>(null);
  const temporizadorMensaje = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { data: carrito } = useQuery<ResumenCarrito>({
    queryKey: ["carrito"],
    queryFn: () => api.get<ResumenCarrito>("/carrito/resumen"),
    enabled: puedeComprar,
  });
  const enCarrito = useMemo(
    () => new Map((carrito?.items ?? []).map((linea) => [linea.representacionPartnerId, linea.cantidad])),
    [carrito],
  );
  const [busqueda, setBusqueda] = useState("");

  const agregar = useMutation({
    mutationFn: ({ representacionPartnerId, cantidad }: { representacionPartnerId: string; cantidad: number }) =>
      api.post<ResumenCarrito>("/carrito/items", { representacionPartnerId, cantidad }),
    onSuccess: (resumen, { representacionPartnerId, cantidad }) => {
      queryClient.setQueryData(["carrito"], resumen);
      const producto = productos?.find((p) => p.id === representacionPartnerId);
      setMensaje(t("addedToCartQty", { producto: producto?.nombreComercial ?? "", cantidad }));
      // Un aviso nuevo reinicia la cuenta: si no, el anterior lo borraría antes de tiempo.
      if (temporizadorMensaje.current) clearTimeout(temporizadorMensaje.current);
      temporizadorMensaje.current = setTimeout(() => setMensaje(null), 2500);
    },
  });

  const modelos = useMemo(() => agruparModelos(productos ?? []), [productos]);
  const visibles = useMemo(() => modelos.filter((m) => coincide(m, busqueda)), [modelos, busqueda]);

  if (isLoading) return <EsqueletoCatalogo titulo={t("title")} />;

  if (!productos || productos.length === 0) {
    return <p className="text-neutral-500">{t("empty")}</p>;
  }

  return (
    // El catálogo se sale del ancho normal de la página para aprovechar pantallas grandes.
    <div className="relative left-1/2 w-[calc(100vw-2rem)] sm:w-[min(1700px,calc(100vw-6rem))] -translate-x-1/2">
      <div className="mb-5 flex flex-col gap-3 sm:mb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-neutral-900">{t("title")}</h1>
          <p className="mt-1 text-sm text-neutral-500">
            {busqueda.trim() ? t("showingOf", { visibles: visibles.length, total: modelos.length }) : t("modelCount", { total: modelos.length })}
          </p>
        </div>
        <div className="relative w-full sm:w-80">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-neutral-400" aria-hidden />
          <input
            type="search"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder={t("searchPlaceholder")}
            aria-label={t("searchPlaceholder")}
            className="h-10 w-full rounded-lg border border-neutral-300 bg-white pl-9 pr-9 text-sm placeholder:text-neutral-400 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-100 [&::-webkit-search-cancel-button]:hidden"
          />
          {busqueda && (
            <button
              type="button"
              onClick={() => setBusqueda("")}
              aria-label={t("clearSearch")}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700"
            >
              <X className="size-4" />
            </button>
          )}
        </div>
      </div>
      {/* Fijo y sobre la página: así se ve también al añadir desde una tarjeta de más abajo,
          y no empuja el catálogo hacia abajo al aparecer y desaparecer. */}
      {mensaje && (
        <div
          role="status"
          className="fixed bottom-20 left-1/2 z-40 flex max-w-[calc(100vw-2rem)] -translate-x-1/2 items-center gap-2 rounded-md bg-green-600 px-4 py-2 text-sm text-white shadow-lg md:bottom-6"
        >
          <Check className="size-4 shrink-0" aria-hidden /> {mensaje}
        </div>
      )}
      {agregar.isError && (
        <div className="mb-4 rounded-md bg-red-50 px-4 py-2 text-sm text-red-700">
          {agregar.error instanceof ApiError ? agregar.error.message : t("addError")}
        </div>
      )}
      {visibles.length === 0 ? (
        <div className="rounded-xl border border-dashed border-neutral-300 bg-white px-6 py-12 text-center">
          <Search className="mx-auto size-8 text-neutral-300" aria-hidden />
          <p className="mt-3 text-sm text-neutral-600">{t("noResults", { busqueda: busqueda.trim() })}</p>
          <button type="button" onClick={() => setBusqueda("")} className="mt-3 text-sm font-medium text-teal-700 hover:underline">
            {t("clearSearch")}
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 min-[480px]:grid-cols-2 sm:gap-6 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
          {visibles.map((modelo) => (
            <TarjetaModelo
              key={modelo.clave}
              modelo={modelo}
              onAgregar={(id, cantidad) => agregar.mutateAsync({ representacionPartnerId: id, cantidad })}
              ocupado={agregar.isPending}
              puedeComprar={puedeComprar}
              enCarrito={enCarrito}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/// Mientras carga, la forma del catálogo en gris en vez de una línea de texto: la página no salta al llegar los datos.
function EsqueletoCatalogo({ titulo }: { titulo: string }) {
  return (
    <div className="relative left-1/2 w-[calc(100vw-2rem)] sm:w-[min(1700px,calc(100vw-6rem))] -translate-x-1/2" aria-busy="true">
      <h1 className="mb-5 text-2xl font-semibold text-neutral-900 sm:mb-6">{titulo}</h1>
      <div className="grid grid-cols-1 gap-4 min-[480px]:grid-cols-2 sm:gap-6 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
        {Array.from({ length: 8 }, (_, i) => (
          <div key={i} className="animate-pulse rounded-xl border border-neutral-200 bg-white p-4 min-[480px]:p-3 sm:p-5">
            <div className="h-44 rounded-lg bg-neutral-100 min-[480px]:h-28 sm:h-44" />
            <div className="mt-4 h-3 w-1/3 rounded bg-neutral-100" />
            <div className="mt-2 h-4 w-2/3 rounded bg-neutral-100" />
            <div className="mt-6 h-6 w-1/2 rounded bg-neutral-100" />
            <div className="mt-4 h-10 rounded-lg bg-neutral-100" />
          </div>
        ))}
      </div>
    </div>
  );
}
