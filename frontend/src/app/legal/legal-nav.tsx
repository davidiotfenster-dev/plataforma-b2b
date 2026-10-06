"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { PAGINAS_LEGALES } from "./paginas";

export function LegalNav() {
  const t = useTranslations("legal");
  const pathname = usePathname();

  return (
    <nav aria-label={t("navLabel")} className="flex flex-wrap gap-2">
      {PAGINAS_LEGALES.map(({ href, clave }) => {
        const activo = pathname === href;
        return (
          <Link
            key={href}
            href={href}
            aria-current={activo ? "page" : undefined}
            className={`rounded-full border px-3 py-1 text-sm transition ${
              activo
                ? "border-teal-600 bg-teal-50 text-teal-800"
                : "border-neutral-300 bg-white text-neutral-600 hover:border-neutral-400 hover:text-neutral-900"
            }`}
          >
            {t(clave)}
          </Link>
        );
      })}
    </nav>
  );
}
