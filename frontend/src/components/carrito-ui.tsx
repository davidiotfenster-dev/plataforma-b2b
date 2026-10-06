"use client";

import Link from "next/link";
import { ArrowRight, Cpu, ShoppingCart } from "lucide-react";
import { urlImagen } from "@/lib/api";
import type { LineaCarrito } from "@/lib/types";

/// Foto pequeña del producto en las líneas del carrito y del resumen del checkout.
export function Miniatura({ linea, className = "size-12" }: { linea: Pick<LineaCarrito, "imagenUrl">; className?: string }) {
  const url = urlImagen(linea.imagenUrl);
  return (
    <div className={`flex shrink-0 items-center justify-center overflow-hidden rounded-md border border-neutral-100 bg-neutral-50 ${className}`}>
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt="" className="h-full w-full object-contain p-1 mix-blend-multiply" />
      ) : (
        <Cpu className="size-5 text-neutral-300" strokeWidth={1.25} aria-hidden />
      )}
    </div>
  );
}

/// Carrito vacío: un hueco con icono y un botón al catálogo, en vez de una línea de texto suelta.
export function CarritoVacio({ texto, hint, accion }: { texto: string; hint: string; accion: string }) {
  return (
    <div className="rounded-xl border border-dashed border-neutral-300 bg-white px-6 py-14 text-center">
      <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-neutral-100">
        <ShoppingCart className="size-6 text-neutral-400" aria-hidden />
      </div>
      <p className="mt-4 font-medium text-neutral-900">{texto}</p>
      <p className="mt-1 text-sm text-neutral-500">{hint}</p>
      <Link
        href="/catalogo"
        className="mt-5 inline-flex items-center gap-1.5 rounded-md bg-neutral-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-neutral-700"
      >
        {accion} <ArrowRight className="size-4" />
      </Link>
    </div>
  );
}
