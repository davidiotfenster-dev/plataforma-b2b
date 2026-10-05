import type { RolUsuario } from "@/lib/types";

/// Zonas del portal que exigen sesión, y quién puede entrar en cada una. Todo lo
/// demás (portada, login, registro, verificación, páginas legales…) es público.
/// El backend sigue siendo quien decide de verdad (401/403/404); esto solo evita
/// que alguien vea una pantalla vacía o a medio cargar que no es la suya.
const ZONAS: { prefijos: string[]; roles: RolUsuario[] }[] = [
  { prefijos: ["/admin"], roles: ["ADMIN_FENSTER", "COMERCIAL"] },
  {
    prefijos: ["/catalogo", "/carrito", "/checkout", "/pedidos"],
    roles: ["PARTNER_ADMIN", "PARTNER_COMPRADOR", "PARTNER_CONSULTA"],
  },
];

function zonaDe(pathname: string) {
  return ZONAS.find((zona) => zona.prefijos.some((p) => pathname === p || pathname.startsWith(`${p}/`)));
}

export function requiereSesion(pathname: string): boolean {
  return zonaDe(pathname) !== undefined;
}

/// `true` si la ruta es pública o si el rol puede entrar en su zona.
export function puedeVer(pathname: string, rol: RolUsuario): boolean {
  const zona = zonaDe(pathname);
  return !zona || zona.roles.includes(rol);
}

export function paginaInicio(rol: RolUsuario): string {
  if (rol === "ADMIN_FENSTER") return "/admin/pedidos";
  if (rol === "COMERCIAL") return "/admin/partners";
  return "/catalogo";
}

/// Adónde ir tras iniciar sesión: la página que se quería abrir (`?next=`) si es
/// una ruta interna de la zona del usuario; si no, su página de inicio. Validarlo
/// evita que un enlace manipulado mande fuera del portal tras el login.
export function destinoTrasLogin(next: string | null, rol: RolUsuario): string {
  if (next?.startsWith("/")) {
    // Se resuelve contra un origen ficticio: si el resultado sale de él (p. ej.
    // "//otro.com" o "/\t/otro.com"), no era una ruta interna.
    const base = "http://portal.invalid";
    const url = URL.canParse(next, base) ? new URL(next, base) : null;
    if (url?.origin === base && requiereSesion(url.pathname) && puedeVer(url.pathname, rol)) {
      return url.pathname + url.search;
    }
  }
  return paginaInicio(rol);
}
