/// Qué ayuda se enseña en cada pantalla. Los textos viven en `messages/*.json`
/// (`ayuda.temas.<tema>` y `ayuda.q.<id>.p|r`); aquí solo se decide qué preguntas
/// salen en cada tema y a qué tema pertenece cada ruta.

export type TemaAyuda =
  | "inicio"
  | "login"
  | "registro"
  | "catalogo"
  | "carrito"
  | "checkout"
  | "pedidos"
  | "pedidoDetalle"
  | "adminEmpresas"
  | "adminFicha"
  | "adminMarcas"
  | "adminProductos"
  | "adminPedidos"
  | "adminDashboard";

export const PREGUNTAS_POR_TEMA: Record<TemaAyuda, readonly string[]> = {
  inicio: ["quePuedoHacer"],
  login: ["noEntro", "olvidePassword"],
  registro: ["correoEmpresa", "despuesDeEnviar"],
  catalogo: ["precioVisto", "productoFalta", "variantes"],
  carrito: ["carritoGuardado", "preciosCambian"],
  checkout: ["poNumber", "comoSePaga", "editarDespues"],
  pedidos: ["estados", "encontrarPedido"],
  pedidoDetalle: ["descargarPdf", "repetirPedido", "precioFijo"],
  adminEmpresas: ["partnerOCliente", "aprobarSolicitud", "suspenderArchivarEliminar"],
  adminFicha: ["datosPorCompletar", "descuentoEmpresa", "productosDeMarca"],
  adminMarcas: ["cambiosAplican", "anadirLoQueFalta"],
  adminProductos: ["productoBase", "subirImagenes"],
  adminPedidos: ["avanzarPedido", "cancelarPedido", "corregirEstado"],
  adminDashboard: ["cifrasCanceladas"],
};

/// Preguntas que salen en todas las pantallas (la segunda, solo con sesión iniciada).
export const PREGUNTAS_GENERALES = ["cambiarIdioma"] as const;
export const PREGUNTAS_GENERALES_CON_SESION = ["cambiarIdioma", "miCuenta"] as const;

export function temaDeRuta(ruta: string): TemaAyuda | null {
  if (ruta === "/") return "inicio";
  if (ruta.startsWith("/login") || ruta.startsWith("/resetear-password")) return "login";
  if (ruta.startsWith("/registro")) return "registro";
  if (ruta.startsWith("/catalogo")) return "catalogo";
  if (ruta.startsWith("/carrito")) return "carrito";
  if (ruta.startsWith("/checkout")) return "checkout";
  if (ruta === "/pedidos") return "pedidos";
  if (ruta.startsWith("/pedidos/")) return "pedidoDetalle";
  if (ruta === "/admin/partners") return "adminEmpresas";
  if (ruta.startsWith("/admin/partners/")) return "adminFicha";
  if (ruta.startsWith("/admin/marcas")) return "adminMarcas";
  if (ruta.startsWith("/admin/catalogo")) return "adminProductos";
  if (ruta.startsWith("/admin/pedidos")) return "adminPedidos";
  if (ruta.startsWith("/admin/dashboard")) return "adminDashboard";
  return null;
}
