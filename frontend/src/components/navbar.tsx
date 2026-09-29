"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { LogOut, Package, ShoppingCart, ShieldCheck, LayoutGrid, BarChart3, Boxes } from "lucide-react";
import { useMe } from "@/hooks/use-me";
import { api } from "@/lib/api";
import { LanguageSwitcher } from "@/components/language-switcher";

export function Navbar() {
  const { data: perfil, isLoading } = useMe();
  const queryClient = useQueryClient();
  const router = useRouter();
  const t = useTranslations("nav");

  async function logout() {
    await api.post("/auth/logout");
    queryClient.setQueryData(["me"], null);
    router.push("/login");
  }

  return (
    <header className="border-b border-neutral-200 bg-white">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link href="/" className="text-lg font-semibold tracking-tight text-neutral-900">
          IoT FENSTER <span className="text-sm font-normal text-neutral-500">{t("subtitle")}</span>
        </Link>

        {!isLoading && perfil && (
          <nav className="flex items-center gap-6 text-sm">
            {perfil.rol !== "ADMIN_FENSTER" && perfil.rol !== "COMERCIAL" && (
              <>
                <Link href="/catalogo" className="flex items-center gap-1.5 text-neutral-600 hover:text-neutral-900">
                  <LayoutGrid className="size-4" /> {t("catalogo")}
                </Link>
                <Link href="/carrito" className="flex items-center gap-1.5 text-neutral-600 hover:text-neutral-900">
                  <ShoppingCart className="size-4" /> {t("carrito")}
                </Link>
                <Link href="/pedidos" className="flex items-center gap-1.5 text-neutral-600 hover:text-neutral-900">
                  <Package className="size-4" /> {t("pedidos")}
                </Link>
              </>
            )}
            {(perfil.rol === "ADMIN_FENSTER" || perfil.rol === "COMERCIAL") && (
              <>
                <Link href="/admin/partners" className="flex items-center gap-1.5 text-neutral-600 hover:text-neutral-900">
                  <ShieldCheck className="size-4" /> {t("partners")}
                </Link>
                {perfil.rol === "ADMIN_FENSTER" && (
                  <Link href="/admin/catalogo" className="flex items-center gap-1.5 text-neutral-600 hover:text-neutral-900">
                    <Boxes className="size-4" /> {t("catalogoBase")}
                  </Link>
                )}
                <Link href="/admin/pedidos" className="flex items-center gap-1.5 text-neutral-600 hover:text-neutral-900">
                  <Package className="size-4" /> {t("pedidos")}
                </Link>
                {perfil.rol === "ADMIN_FENSTER" && (
                  <Link href="/admin/dashboard" className="flex items-center gap-1.5 text-neutral-600 hover:text-neutral-900">
                    <BarChart3 className="size-4" /> {t("dashboard")}
                  </Link>
                )}
              </>
            )}
            <span className="text-neutral-400">|</span>
            <LanguageSwitcher />
            <span className="text-neutral-500">{perfil.email}</span>
            <button onClick={logout} className="flex items-center gap-1.5 text-neutral-600 hover:text-red-600">
              <LogOut className="size-4" /> {t("logout")}
            </button>
          </nav>
        )}

        {!isLoading && !perfil && (
          <nav className="flex items-center gap-4 text-sm">
            <LanguageSwitcher />
            <Link href="/login" className="text-neutral-600 hover:text-neutral-900">
              {t("login")}
            </Link>
            <Link href="/registro" className="rounded-md bg-neutral-900 px-3 py-1.5 text-white hover:bg-neutral-700">
              {t("registro")}
            </Link>
          </nav>
        )}
      </div>
    </header>
  );
}
