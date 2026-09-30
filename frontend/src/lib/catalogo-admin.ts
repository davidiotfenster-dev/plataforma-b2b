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
  { clave: "mysmartwindow", etiqueta: "MySmartWindow · Connect", marcas: ["MYSMARTWINDOW"] },
];

function normalizar(texto: string): string {
  return texto
    .toUpperCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^A-Z0-9]/g, "");
}

/// Palabras sueltas de un texto ("VBH Ibérica S.L." -> VBH, IBERICA, S, L), para
/// comparar por palabra completa y no por prefijo ("ICONOS S.L." no es ICON).
function palabras(texto: string): string[] {
  return texto
    .toUpperCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .split(/[^A-Z0-9]+/)
    .filter(Boolean);
}

/// Familias de marca que se deducen de la ficha del partner (su marca comercial
/// y, si no, su razón social). Vacío si no se reconoce ninguna: entonces el
/// admin la elige a mano en el panel.
export function familiasDelPartner(partner: Pick<Partner, "razonSocial" | "marcaComercial">): string[] {
  const textos = [partner.marcaComercial, partner.razonSocial].filter((t): t is string => !!t);
  const halladas = new Set<string>();
  for (const familia of FAMILIAS_DE_MARCA) {
    const marcas = familia.marcas.map(normalizar);
    if (textos.some((t) => palabras(t).some((palabra) => marcas.includes(palabra)))) halladas.add(familia.clave);
    // También cuando la marca comercial es la marca a secas, aunque lleve símbolos.
    if (partner.marcaComercial && marcas.includes(normalizar(partner.marcaComercial))) halladas.add(familia.clave);
  }
  return [...halladas];
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
  partner: Pick<Partner, "razonSocial" | "marcaComercial"> | null,
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
