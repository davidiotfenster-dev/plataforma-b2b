"use client";

import { useLocale, useTranslations } from "next-intl";
import { usePrecio } from "@/lib/formato";
import type { Producto } from "@/lib/types";

/// Lo que paga el cliente por unidad (su precio neto, con su descuento ya
/// aplicado) y, debajo, el PVP del que parte. Sin descuento solo sale el precio.
export function PrecioProducto({ producto }: { producto: Pick<Producto, "pvpBase" | "precioNeto" | "descuentoPorcentaje"> }) {
  const t = useTranslations("catalogo");
  const locale = useLocale();
  const precio = usePrecio();
  const descuento = Number(producto.descuentoPorcentaje);

  if (!(descuento > 0)) {
    return <p className="text-2xl font-semibold text-neutral-900">{precio(producto.pvpBase)}</p>;
  }
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-teal-700">{t("yourPrice")}</p>
      <p className="text-2xl font-semibold text-neutral-900">{precio(producto.precioNeto)}</p>
      <p className="text-sm text-neutral-500">
        {t("pvpDiscount", {
          pvp: precio(producto.pvpBase),
          descuento: new Intl.NumberFormat(locale, { maximumFractionDigits: 2 }).format(descuento),
        })}
      </p>
    </div>
  );
}
