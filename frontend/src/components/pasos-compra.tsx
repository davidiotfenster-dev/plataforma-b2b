"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { Check } from "lucide-react";

/// Los dos pasos del pedido (carrito → datos y confirmación), arriba del carrito y del
/// checkout, para que se sepa dónde se está y que no hay un paso de pago.
export function PasosCompra({ paso }: { paso: 1 | 2 }) {
  const t = useTranslations("pasosCompra");
  const pasos = [
    { n: 1, etiqueta: t("cart"), href: "/carrito" },
    { n: 2, etiqueta: t("confirm"), href: null },
  ] as const;

  return (
    <ol className="mb-6 flex items-center gap-2 text-sm" aria-label={t("label")}>
      {pasos.map(({ n, etiqueta, href }, i) => {
        const hecho = n < paso;
        const actual = n === paso;
        const contenido = (
          <>
            <span
              className={`flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
                hecho ? "bg-teal-600 text-white" : actual ? "bg-neutral-900 text-white" : "border border-neutral-300 bg-white text-neutral-500"
              }`}
            >
              {hecho ? <Check className="size-3.5" aria-hidden /> : n}
            </span>
            <span className={actual ? "font-semibold text-neutral-900" : "text-neutral-500"}>{etiqueta}</span>
          </>
        );
        return (
          <li key={n} className="flex items-center gap-2" aria-current={actual ? "step" : undefined}>
            {i > 0 && <span className={`h-px w-6 sm:w-10 ${hecho || actual ? "bg-teal-600" : "bg-neutral-300"}`} aria-hidden />}
            {hecho && href ? (
              <Link href={href} className="flex items-center gap-2 hover:underline">
                {contenido}
              </Link>
            ) : (
              <span className="flex items-center gap-2">{contenido}</span>
            )}
          </li>
        );
      })}
    </ol>
  );
}
