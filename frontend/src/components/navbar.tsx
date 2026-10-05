"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { BarChart3, Boxes, CircleUser, LayoutGrid, LogOut, Package, ShieldCheck, ShoppingCart, Tags, Users, type LucideIcon } from "lucide-react";
import { useMe } from "@/hooks/use-me";
import { api } from "@/lib/api";
import { puedeComprar } from "@/lib/acceso";
import { LanguageSwitcher } from "@/components/language-switcher";
import { Marca } from "@/components/marca";

/// Botón de cerrar sesión: con borde y rojo al pasar por encima, para que no
/// se confunda con un enlace más del menú.
function BotonSalir({ onClick, etiqueta, email, className = "" }: { onClick: () => void; etiqueta: string; email: string; className?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={email}
      aria-label={`${etiqueta} (${email})`}
      className={`items-center gap-1.5 rounded-md border border-neutral-300 px-2.5 py-1.5 text-sm font-medium text-neutral-700 transition-colors hover:border-red-300 hover:bg-red-50 hover:text-red-700 focus-visible:border-red-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-200 ${className}`}
    >
      <LogOut className="size-4" /> {etiqueta}
    </button>
  );
}

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
      {/* Franja con la cuenta en uso: en la barra principal el correo no cabía. */}
      {!isLoading && perfil && (
        <div className="border-b border-neutral-100 bg-neutral-50">
          <p className="mx-auto flex max-w-6xl items-center justify-end gap-1.5 px-4 py-1 text-xs text-neutral-500 sm:px-6">
            <CircleUser className="size-3.5 shrink-0" aria-hidden />
            <span className="min-w-0 truncate">
              {t("signedInAs")} <span className="font-medium text-neutral-700">{perfil.email}</span>
              {" · "}
              {perfil.rol === "ADMIN_FENSTER"
                ? t("roleAdmin")
                : perfil.rol === "COMERCIAL"
                  ? t("roleComercial")
                  : (perfil.partner?.razonSocial ?? "")}
            </span>
          </p>
        </div>
      )}
      {/* Colocación por ancho (con `order`):
          - escritorio (xl): una fila → marca | secciones | idioma + Salir
          - tablet (md–xl): fila 1 → marca … idioma + Salir; fila 2 → secciones
          - móvil: fila 1 → marca … Salir; fila 2 → secciones + idioma
          "Salir" siempre arriba a la derecha, nunca suelto al final. */}
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-4 gap-y-3 px-4 py-3 sm:px-6 sm:py-4">
        <Link href="/" className="order-1 shrink-0">
          <Marca subtitulo={t("subtitle")} />
        </Link>

        {!isLoading && perfil && (
          <>
            <div className="order-2 ml-auto flex shrink-0 items-center gap-3 text-sm xl:order-3 xl:ml-0">
              <span className="hidden md:block">
                <LanguageSwitcher />
              </span>
              <BotonSalir onClick={logout} etiqueta={t("logout")} email={perfil.email} className="flex" />
            </div>

            <nav className="order-3 flex w-full flex-wrap items-center gap-1 text-sm xl:order-2 xl:ml-auto xl:w-auto xl:flex-nowrap xl:justify-end">
              {perfil.rol !== "ADMIN_FENSTER" && perfil.rol !== "COMERCIAL" && (
                <>
                  <NavLink href="/catalogo" icono={LayoutGrid}>{t("catalogo")}</NavLink>
                  {puedeComprar(perfil.rol) && <NavLink href="/carrito" icono={ShoppingCart}>{t("carrito")}</NavLink>}
                  <NavLink href="/pedidos" icono={Package}>{t("pedidos")}</NavLink>
                  {perfil.rol === "PARTNER_ADMIN" && <NavLink href="/equipo" icono={Users}>{t("usuarios")}</NavLink>}
                </>
              )}
              {(perfil.rol === "ADMIN_FENSTER" || perfil.rol === "COMERCIAL") && (
                <>
                  <NavLink href="/admin/partners" icono={ShieldCheck}>{t("partners")}</NavLink>
                  {perfil.rol === "ADMIN_FENSTER" && (
                    <>
                      <NavLink href="/admin/marcas" icono={Tags}>{t("marcas")}</NavLink>
                      <NavLink href="/admin/catalogo" icono={Boxes}>{t("catalogoBase")}</NavLink>
                    </>
                  )}
                  <NavLink href="/admin/pedidos" icono={Package}>{t("pedidos")}</NavLink>
                  {perfil.rol === "ADMIN_FENSTER" && (
                    <NavLink href="/admin/dashboard" icono={BarChart3}>{t("dashboard")}</NavLink>
                  )}
                </>
              )}
              <span className="ml-auto md:hidden">
                <LanguageSwitcher />
              </span>
            </nav>
          </>
        )}

        {!isLoading && !perfil && (
          <nav className="order-2 ml-auto flex items-center gap-4 text-sm">
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
