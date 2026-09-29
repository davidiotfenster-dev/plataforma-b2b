"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useMe } from "@/hooks/use-me";

export default function HomePage() {
  const { data: perfil, isLoading } = useMe();
  const router = useRouter();
  const t = useTranslations("home");
  const tCommon = useTranslations("common");

  useEffect(() => {
    if (isLoading) return;
    if (!perfil) return;
    router.replace(perfil.rol === "ADMIN_FENSTER" ? "/admin/pedidos" : "/catalogo");
  }, [perfil, isLoading, router]);

  if (isLoading) {
    return <p className="text-neutral-500">{tCommon("loading")}</p>;
  }

  if (perfil) {
    return null;
  }

  return (
    <div className="mx-auto max-w-xl text-center">
      <h1 className="text-3xl font-semibold text-neutral-900">{t("title")}</h1>
      <p className="mt-3 text-neutral-600">{t("description")}</p>
    </div>
  );
}
