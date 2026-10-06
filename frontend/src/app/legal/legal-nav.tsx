"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { Pencil } from "lucide-react";
import { useMe } from "@/hooks/use-me";
import { PAGINAS_LEGALES } from "./paginas";

export function LegalNav() {
  const t = useTranslations("legal");
  const pathname = usePathname();
  const { data: perfil } = useMe();

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
      {perfil?.rol === "ADMIN_FENSTER" && (
        <Link
          href="/admin/datos-legales"
          className="ml-auto inline-flex items-center gap-1.5 rounded-full border border-amber-300 bg-amber-50 px-3 py-1 text-sm text-amber-900 hover:border-amber-400"
        >
          <Pencil className="size-3.5" />
          {t("editarDatos")}
        </Link>
      )}
    </nav>
  );
}
