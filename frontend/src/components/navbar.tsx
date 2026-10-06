"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { BarChart3, Boxes, CircleUser, LayoutGrid, LogOut, Package, ShieldCheck, ShoppingCart, Tags, Users, type LucideIcon } from "lucide-react";
import { useMe } from "@/hooks/use-me";
import { api } from "@/lib/api";
import type { ResumenCarrito } from "@/lib/types";
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
      <LogOut className="size-4" /> <span className="hidden sm:inline">{etiqueta}</span>
    </button>
  );
}

/// Número de artículos del carrito, para saber que se ha añadido algo sin entrar.
/// Comparte la consulta ["carrito"] con el carrito y el catálogo, que la actualizan al añadir.
function useArticulosCarrito(activo: boolean): number {
  const { data: carrito } = useQuery<ResumenCarrito>({
    queryKey: ["carrito"],
    queryFn: () => api.get<ResumenCarrito>("/carrito/resumen"),
    enabled: activo,
  });
  return carrito?.items.reduce((suma, linea) => suma + linea.cantidad, 0) ?? 0;
}

function Contador({ valor, className = "" }: { valor: number; className?: string }) {
  if (valor <= 0) return null;
  return (
    <span className={`rounded-full bg-teal-600 px-1.5 py-0.5 text-[11px] font-semibold leading-none text-white ${className}`} aria-label={`${valor}`}>
      {valor > 999 ? "999+" : valor}
    </span>
  );
}

interface Seccion {
  href: string;
  icono: LucideIcon;
  etiqueta: string;
  contador?: number;
}

/// Secciones del menú según el rol. Las usan la barra de arriba (tablet y escritorio)
/// y la barra de pestañas de abajo (móvil), para que nunca difieran.
function useSecciones(): Seccion[] {
  const { data: perfil } = useMe();
  const t = useTranslations("nav");
  const conCarrito = !!perfil && puedeComprar(perfil.rol);
  const articulos = useArticulosCarrito(conCarrito);
  if (!perfil) return [];
  if (perfil.rol === "ADMIN_FENSTER" || perfil.rol === "COMERCIAL") {
    const admin = perfil.rol === "ADMIN_FENSTER";
    return [
      { href: "/admin/partners", icono: ShieldCheck, etiqueta: t("partners") },
      ...(admin
        ? [
            { href: "/admin/marcas", icono: Tags, etiqueta: t("marcas") },
            { href: "/admin/catalogo", icono: Boxes, etiqueta: t("catalogoBase") },
          ]
        : []),
      { href: "/admin/pedidos", icono: Package, etiqueta: t("pedidos") },
      ...(admin ? [{ href: "/admin/dashboard", icono: BarChart3, etiqueta: t("dashboard") }] : []),
    ];
  }
  return [
    { href: "/catalogo", icono: LayoutGrid, etiqueta: t("catalogo") },
    ...(conCarrito ? [{ href: "/carrito", icono: ShoppingCart, etiqueta: t("carrito"), contador: articulos }] : []),
    { href: "/pedidos", icono: Package, etiqueta: t("pedidos") },
    ...(perfil.rol === "PARTNER_ADMIN" ? [{ href: "/equipo", icono: Users, etiqueta: t("usuarios") }] : []),
  ];
}

function useActivo(href: string): boolean {
  const pathname = usePathname();
  // El checkout es el segundo paso del carrito: la pestaña del carrito sigue marcada.
  if (href === "/carrito" && pathname === "/checkout") return true;
  return pathname === href || pathname.startsWith(`${href}/`);
}

/// Enlace de la barra superior; la sección en la que estás queda resaltada.
function NavLink({ seccion }: { seccion: Seccion }) {
  const activo = useActivo(seccion.href);
  const { icono: Icono } = seccion;
  return (
    <Link
      href={seccion.href}
      aria-current={activo ? "page" : undefined}
      className={`flex items-center gap-1.5 rounded-md px-2.5 py-1.5 transition-colors ${
        activo
          ? "bg-neutral-100 font-semibold text-neutral-900 shadow-[inset_0_-2px_0_0_var(--color-teal-600)]"
          : "text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900"
      }`}
    >
      <Icono className="size-4" /> {seccion.etiqueta}
      {seccion.contador !== undefined && <Contador valor={seccion.contador} className="ml-1" />}
    </Link>
  );
}

function PestanaMovil({ seccion }: { seccion: Seccion }) {
  const activo = useActivo(seccion.href);
  const { icono: Icono } = seccion;
  return (
    <Link
      href={seccion.href}
      aria-current={activo ? "page" : undefined}
      className={`relative flex min-w-0 flex-1 flex-col items-center gap-0.5 px-1 pb-1.5 pt-2 text-[11px] leading-tight ${
        activo ? "font-semibold text-teal-700" : "text-neutral-500"
      }`}
    >
      {activo && <span className="absolute inset-x-3 top-0 h-0.5 rounded-full bg-teal-600" aria-hidden />}
      <span className="relative">
        <Icono className="size-5" strokeWidth={activo ? 2.25 : 1.75} />
        {seccion.contador !== undefined && <Contador valor={seccion.contador} className="absolute -right-3 -top-1.5" />}
      </span>
      <span className="w-full truncate text-center">{seccion.etiqueta}</span>
    </Link>
  );
}

/// En el móvil las secciones van en una barra fija abajo, al alcance del pulgar,
/// y la cabecera se queda en una sola fila. Incluye un hueco para que la barra
/// no tape el final de la página.
export function NavegacionMovil() {
  const secciones = useSecciones();
  const t = useTranslations("nav");
  if (secciones.length === 0) return null;
  return (
    <>
      <div className="h-16 md:hidden" aria-hidden />
      <nav
        aria-label={t("menu")}
        className="fixed inset-x-0 bottom-0 z-30 border-t border-neutral-200 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden print:hidden"
      >
        <div className="mx-auto flex max-w-md">
          {secciones.map((seccion) => (
            <PestanaMovil key={seccion.href} seccion={seccion} />
          ))}
        </div>
      </nav>
    </>
  );
}

export function Navbar() {
  const { data: perfil, isLoading } = useMe();
  const queryClient = useQueryClient();
  const router = useRouter();
  const t = useTranslations("nav");
  const secciones = useSecciones();

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
          - móvil: una fila → marca … idioma + Salir; las secciones van en la barra de abajo
          "Salir" siempre arriba a la derecha, nunca suelto al final. */}
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-4 gap-y-3 px-4 py-3 sm:px-6 sm:py-4">
        <Link href="/" className="order-1 shrink-0">
          <Marca subtitulo={<span className={perfil ? "hidden sm:inline" : undefined}>{t("subtitle")}</span>} />
        </Link>

        {!isLoading && perfil && (
          <>
            <div className="order-2 ml-auto flex shrink-0 items-center gap-2 text-sm sm:gap-3 xl:order-3 xl:ml-0">
              <span className="hidden md:block">
                <LanguageSwitcher />
              </span>
              <span className="md:hidden">
                <LanguageSwitcher compacto />
              </span>
              <BotonSalir onClick={logout} etiqueta={t("logout")} email={perfil.email} className="flex" />
            </div>

            <nav className="order-3 hidden w-full flex-wrap items-center gap-1 text-sm md:flex xl:order-2 xl:ml-auto xl:w-auto xl:flex-nowrap xl:justify-end">
              {secciones.map((seccion) => (
                <NavLink key={seccion.href} seccion={seccion} />
              ))}
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
