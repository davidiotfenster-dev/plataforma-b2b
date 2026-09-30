"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { ShieldAlert } from "lucide-react";
import { useMe } from "@/hooks/use-me";

/// Secciones solo para ADMIN_FENSTER (el backend ya responde 403 al resto):
/// a un COMERCIAL que entre por URL se le explica en vez de dejarle la página
/// a medio cargar.
export function SoloAdmin({ children }: { children: ReactNode }) {
  const t = useTranslations("common");
  const { data: perfil, isLoading } = useMe();

  if (isLoading) return <p className="text-neutral-500">{t("loading")}</p>;
  if (perfil?.rol !== "ADMIN_FENSTER") {
    return (
      <div className="mx-auto mt-12 max-w-md rounded-xl border border-neutral-200 bg-white p-6 text-center shadow-sm">
        <ShieldAlert className="mx-auto size-8 text-neutral-400" />
        <p className="mt-3 font-medium text-neutral-900">{t("adminOnly")}</p>
        <Link href="/admin/partners" className="mt-3 inline-block text-sm text-neutral-600 underline hover:text-neutral-900">
          {t("backToCompanies")}
        </Link>
      </div>
    );
  }
  return <>{children}</>;
}
