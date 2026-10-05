import { FAMILIA_DE_MARCA } from "./marcas";
import type { Partner, ProductoBaseAdmin, ReferenciaMarca } from "./types";

/// Marcas comerciales con las que se vende un mismo aparato. Las "marcas" del
/// Excel de dispositivos (DISPOSITIVOSIOT) que en la práctica son la misma
/// marca van juntas: VBH vende el aparato como Wave (Greenteq), Procomsa como
/// ICON y MySmartWindow como Connect.
export interface FamiliaMarca {
  clave: string;
  etiqueta: string;
  /// Valores de `ReferenciaMarca.marca` que pertenecen a esta familia.
  marcas: string[];
}

export const FAMILIAS_DE_MARCA: FamiliaMarca[] = [
  { clave: "vbh", etiqueta: "VBH · Wave", marcas: ["VBH", "GREENTEQ", "WAVE"] },
  { clave: "procomsa", etiqueta: "Procomsa · ICON", marcas: ["PROCOMSA", "ICON"] },
  { clave: "mysmartwindow", etiqueta: "MySmartWindow · Connect", marcas: ["MYSMARTWINDOW", "C-WALL"] },
];

function normalizar(texto: string): string {
  return texto
    .toUpperCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^A-Z0-9]/g, "");
}

/// Familia de marca que ve la empresa: la marca de catálogo de su ficha
/// (partner: la suya; distribuidor: MySmartWindow salvo que se cambie).
export function familiasDelPartner(partner: Pick<Partner, "marcaCatalogo">): string[] {
  return [FAMILIA_DE_MARCA[partner.marcaCatalogo]];
}

export function referenciasDe(producto: ProductoBaseAdmin): ReferenciaMarca[] {
  return producto.especificacionesJson?.referencias ?? [];
}

/// ¿El producto se vende con nombres de marca? (mandos, cables... sin
/// referencias por marca tienen un único nombre neutro.)
export function tieneNombresDeMarca(producto: ProductoBaseAdmin): boolean {
  return referenciasDe(producto).length > 0;
}

export interface Candidato {
  clave: string;
  marca: string;
  nombre: string;
  sku: string;
}

/// "Dispositivo ICON1" + Blanco -> "Dispositivo ICON1 Blanco" (si el nombre de la
/// marca no dice ya el color, blanco y negro serían indistinguibles).
function nombreConColor(nombre: string, color: string | null | undefined): string {
  if (!color) return nombre;
  const enNombre = normalizar(nombre);
  const yaLoDice = color.split("/").some((parte) => enNombre.includes(normalizar(parte)));
  return yaLoDice ? nombre : `${nombre} ${color}`;
}

/// Nombres/SKU con los que el producto puede aparecer en el catálogo de un
/// partner de esas familias de marca.
///
/// Regla de aislamiento: un partner solo ve nombres de SU marca. El nombre
/// técnico (que suele juntar varias marcas, "Wave1 / ICON1 Blanco") solo se usa
/// si el producto no tiene nombres de marca. Si los tiene pero ninguno es de la
/// marca del partner, no hay candidatos y el producto no se asigna desde aquí.
export function candidatosParaPartner(producto: ProductoBaseAdmin, familias: string[]): Candidato[] {
  const refs = referenciasDe(producto);
  if (refs.length === 0) {
    return [{ clave: "tecnico", marca: "", nombre: producto.nombreTecnico, sku: producto.skuIndustrial }];
  }
  const marcasPermitidas = new Set(
    FAMILIAS_DE_MARCA.filter((f) => familias.includes(f.clave)).flatMap((f) => f.marcas.map(normalizar)),
  );
  const color = producto.especificacionesJson?.color;
  const deSuMarca = refs
    .map((r, i) => ({ r, i }))
    .filter(({ r }) => marcasPermitidas.has(normalizar(r.marca)))
    .map(({ r, i }) => ({ clave: `ref-${i}`, marca: r.marca, nombre: nombreConColor(r.nombre, color), sku: r.refInterna }));
  // Productos para todos los partners (mandos, EVO, cables...): si no tienen
  // nombre en la marca del partner, se usa su único nombre disponible.
  if (deSuMarca.length === 0 && producto.especificacionesJson?.ambito === "todos") {
    const [r] = refs;
    return [{ clave: "ref-0", marca: r.marca, nombre: nombreConColor(r.nombre, color), sku: r.refInterna }];
  }
  return deSuMarca;
}

export interface ItemAsignacion {
  productoBaseId: string;
  skuComercial: string;
  nombreComercial: string;
  pvpBase: number;
}

export interface PropuestaCatalogo {
  items: ItemAsignacion[];
  /// Productos de la marca que no se pueden asignar porque la tarifa aún no tiene su precio.
  sinPrecio: ProductoBaseAdmin[];
}

/// Todo el catálogo de una marca de una vez: cada producto con el nombre/SKU de
/// esa marca y el PVP de la tarifa. Solo entra lo que tiene nombre en la marca
/// (o es para todos los partners) y precio; lo demás se asigna a mano.
export function propuestaCatalogoDeMarca(productos: ProductoBaseAdmin[], familias: string[]): PropuestaCatalogo {
  const items: ItemAsignacion[] = [];
  const sinPrecio: ProductoBaseAdmin[] = [];
  const skusUsados = new Set<string>();
  for (const producto of productos) {
    const [candidato] = candidatosParaPartner(producto, familias);
    if (!candidato) continue;
    const pvp = producto.pvpTarifa ? Number(producto.pvpTarifa) : 0;
    if (!(pvp > 0)) {
      sinPrecio.push(producto);
      continue;
    }
    const sku = candidato.sku || producto.skuIndustrial;
    if (skusUsados.has(sku)) continue;
    skusUsados.add(sku);
    items.push({ productoBaseId: producto.id, skuComercial: sku, nombreComercial: candidato.nombre, pvpBase: pvp });
  }
  return { items, sinPrecio };
}

/// Nombre/SKU iniciales para el formulario manual de un partner concreto. Vacíos
/// (para que el admin los escriba) si el producto tiene nombres de marca pero
/// ninguno es del partner: nunca se rellena con el nombre técnico multimarca.
export function sugerenciaManual(
  producto: ProductoBaseAdmin,
  partner: Pick<Partner, "marcaCatalogo"> | null,
): { nombre: string; sku: string } {
  const familias = partner ? familiasDelPartner(partner) : [];
  const [primero] = candidatosParaPartner(producto, familias);
  return primero ? { nombre: primero.nombre, sku: primero.sku } : { nombre: "", sku: "" };
}

export function tieneCodigos(producto: ProductoBaseAdmin): boolean {
  return referenciasDe(producto).some((r) => !!r.gtin);
}

export function numPartners(producto: ProductoBaseAdmin): number {
  return producto._count?.representaciones ?? 0;
}

/// "Pulsar (Wave4 / ICON4 / ICON MINI)" -> "Pulsar", para chips y etiquetas.
export function etiquetaCortaGrupo(grupo: string): string {
  return grupo.split(" (")[0];
}

/// Color de muestra para el punto de color de cada fila.
export function muestraDeColor(color: string | null | undefined): string {
  const c = (color ?? "").toLowerCase();
  if (c.startsWith("blanco")) return "#ffffff";
  if (c.startsWith("negro")) return "#171717";
  if (c.startsWith("inox") || c.startsWith("plata")) return "linear-gradient(135deg,#e5e5e5,#9ca3af)";
  if (c.startsWith("antracita")) return "#3f4348";
  if (c.startsWith("marr")) return "#6b4423";
  if (c.startsWith("especial")) return "linear-gradient(135deg,#f59e0b,#8b5cf6)";
  return "transparent";
}

export interface Modelo {
  clave: string;
  nombre: string;
  variantes: ProductoBaseAdmin[];
}

/// Nombre del modelo sin el color: "Wave1 / ICON1 Negro" -> "Wave1 / ICON1".
/// Sin expresiones regulares: el color puede llevar símbolos ("Inox/Plata").
function nombreSinColor(producto: ProductoBaseAdmin): string {
  const color = producto.especificacionesJson?.color;
  const nombre = producto.nombreTecnico;
  if (!color) return nombre;
  const inicio = nombre.toLowerCase().indexOf(color.toLowerCase());
  if (inicio < 0) return nombre;
  const sinColor = nombre.slice(0, inicio) + nombre.slice(inicio + color.length);
  return sinColor.replace(/\s+/g, " ").replace(/\s+·/g, " ·").trim();
}

/// Agrupa los productos que solo se diferencian en el color (mismo modelo) para
/// mostrarlos en una sola fila. Al asignar se vuelven a separar por color.
export function agruparPorModelo(productos: ProductoBaseAdmin[], sinGrupo: string): Map<string, Modelo[]> {
  const modelos = new Map<string, Modelo>();
  for (const p of productos) {
    const grupo = p.especificacionesJson?.grupo ?? sinGrupo;
    const nombre = nombreSinColor(p);
    const clave = `${grupo}|${nombre}`;
    const existente = modelos.get(clave);
    if (existente) existente.variantes.push(p);
    else modelos.set(clave, { clave, nombre, variantes: [p] });
  }
  const porGrupo = new Map<string, Modelo[]>();
  for (const m of modelos.values()) {
    const grupo = m.variantes[0].especificacionesJson?.grupo ?? sinGrupo;
    porGrupo.set(grupo, [...(porGrupo.get(grupo) ?? []), m]);
  }
  return porGrupo;
}

/// Especificaciones que verá el partner en la ficha del producto: las mismas
/// que deja pasar el backend (solo lo que cuelga de `publicas`).
export function especificacionesVisibles(producto: ProductoBaseAdmin): [string, string][] {
  const publicas = producto.especificacionesJson?.publicas;
  if (!publicas || typeof publicas !== "object") return [];
  return Object.entries(publicas)
    .filter(([, valor]) => ["string", "number", "boolean"].includes(typeof valor))
    .map(([clave, valor]) => [clave, String(valor)]);
}

export interface ParteNombre {
  texto: string;
  /// Marca a la que pertenece ese nombre, si se reconoce por el prefijo.
  marca: string | null;
}

/// "Connect-1 / Wave-1 / Icon1" -> tres nombres, cada uno con su marca. Un mismo
/// aparato se llama distinto según la empresa; en pantalla se ven por separado.
export function partesDeNombre(nombre: string): ParteNombre[] {
  const dentro = nombre.match(/^(.*?)\s*\((.*)\)\s*(.*)$/);
  const texto = dentro ? [dentro[2], dentro[3]].filter(Boolean).join(" ") : nombre;
  return texto
    .split(" / ")
    .map((t) => t.trim())
    .filter(Boolean)
    .map((t) => {
      const n = t.toLowerCase();
      const marca = n.startsWith("connect")
        ? "MySmartWindow"
        : n.startsWith("wave") || n.startsWith("pulsar")
          ? "VBH"
          : n.startsWith("icon")
            ? "Procomsa"
            : null;
      return { texto: t, marca };
    });
}

/// Clave del apartado "sin marca": productos sin nombre en ninguna marca de
/// partner (mando estándar, pulsadores C-WALL...).
export const SIN_MARCA = "comun";

/// Reparte los productos por marca de partner (VBH, Procomsa, MySmartWindow).
/// Un aparato con nombre en varias marcas aparece en todas ellas.
export function productosPorMarca(productos: ProductoBaseAdmin[]): Map<string, ProductoBaseAdmin[]> {
  const mapa = new Map<string, ProductoBaseAdmin[]>();
  for (const p of productos) {
    const marcas = new Set(referenciasDe(p).map((r) => normalizar(r.marca)));
    const familias = FAMILIAS_DE_MARCA.filter((f) => f.marcas.some((m) => marcas.has(normalizar(m)))).map((f) => f.clave);
    for (const clave of familias.length ? familias : [SIN_MARCA]) mapa.set(clave, [...(mapa.get(clave) ?? []), p]);
  }
  return mapa;
}

/// Nombre del producto en una marca, sin el color ("Pulsador Wave1 blanco" ->
/// "Pulsador Wave1"). Vacío si no tiene nombre en esa marca.
export function nombreEnMarca(producto: ProductoBaseAdmin, familia: string): string {
  const marcas = (FAMILIAS_DE_MARCA.find((f) => f.clave === familia)?.marcas ?? []).map(normalizar);
  const color = producto.especificacionesJson?.color ?? "";
  const nombres = referenciasDe(producto)
    .filter((r) => marcas.includes(normalizar(r.marca)))
    .map((r) => {
      let n = r.nombre;
      for (const parte of color.split("/").filter(Boolean)) {
        const i = n.toLowerCase().indexOf(parte.toLowerCase());
        if (i >= 0) n = n.slice(0, i) + n.slice(i + parte.length);
      }
      return n.replace(/\s+/g, " ").trim();
    });
  return [...new Set(nombres)].join(" / ");
}
