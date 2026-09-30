"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { LogOut, Package, ShoppingCart, ShieldCheck, LayoutGrid, BarChart3, Boxes, type LucideIcon } from "lucide-react";
import { useMe } from "@/hooks/use-me";
import { api } from "@/lib/api";
import { LanguageSwitcher } from "@/components/language-switcher";
import { Marca } from "@/components/marca";

/// Enlace de la barra superior; la sección en la que estás queda resaltada.
function NavLink({ href, icono: Icono, children }: { href: string; icono: LucideIcon; children: ReactNode }) {
  const pathname = usePathname();
  const activo = pathname === href || pathname.startsWith(`${href}/`);
  return (
    <Link
      href={href}
      aria-current={activo ? "page" : undefined}
      className={`flex items-center gap-1.5 rounded-md px-2.5 py-1.5 transition-colors ${
        activo
          ? "bg-neutral-100 font-semibold text-neutral-900 shadow-[inset_0_-2px_0_0_var(--color-teal-600)]"
          : "text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900"
      }`}
    >
      <Icono className="size-4" /> {children}
    </Link>
  );
}

export function Navbar() {
  const { data: perfil, isLoading } = useMe();
  const queryClient = useQueryClient();
  const router = useRouter();
  const t = useTranslations("nav");

  async function logout() {
    try {
      await api.post("/auth/logout");
    } finally {
      // Se vacía TODA la caché (no solo el perfil): en un ordenador compartido, el
      // siguiente usuario no debe ver ni un instante el carrito o los pedidos del anterior.
      queryClient.clear();
      router.push("/login");
    }
  }

  return (
    <header className="border-b border-neutral-200 bg-white">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-6 gap-y-3 px-4 py-3 sm:px-6 sm:py-4">
        <Link href="/">
          <Marca subtitulo={t("subtitle")} />
        </Link>

        {!isLoading && perfil && (
          <nav className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm sm:gap-x-6">
            {perfil.rol !== "ADMIN_FENSTER" && perfil.rol !== "COMERCIAL" && (
              <>
                <NavLink href="/catalogo" icono={LayoutGrid}>{t("catalogo")}</NavLink>
                <NavLink href="/carrito" icono={ShoppingCart}>{t("carrito")}</NavLink>
                <NavLink href="/pedidos" icono={Package}>{t("pedidos")}</NavLink>
              </>
            )}
            {(perfil.rol === "ADMIN_FENSTER" || perfil.rol === "COMERCIAL") && (
              <>
                <NavLink href="/admin/partners" icono={ShieldCheck}>{t("partners")}</NavLink>
                {perfil.rol === "ADMIN_FENSTER" && (
                  <NavLink href="/admin/catalogo" icono={Boxes}>{t("catalogoBase")}</NavLink>
                )}
                <NavLink href="/admin/pedidos" icono={Package}>{t("pedidos")}</NavLink>
                {perfil.rol === "ADMIN_FENSTER" && (
                  <NavLink href="/admin/dashboard" icono={BarChart3}>{t("dashboard")}</NavLink>
                )}
              </>
            )}
            <span className="hidden text-neutral-400 md:inline">|</span>
            <LanguageSwitcher />
            <span className="hidden text-neutral-500 md:inline">{perfil.email}</span>
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
