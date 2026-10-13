import type { MarcaCatalogo } from '../generated/prisma/enums.js';
import { cuidarNombreComercial } from './nombre-comercial.js';

/// Marcas del Excel de dispositivos que pertenecen a cada submarca (VBH vende
/// como Wave/Greenteq, Procomsa como ICON, MySmartWindow como Connect y C-WALL).
/// Debe coincidir con `FAMILIAS_DE_MARCA` del frontend.
export const MARCAS_DEL_EXCEL: Record<MarcaCatalogo, string[]> = {
  VBH: ['VBH', 'GREENTEQ', 'WAVE'],
  PROCOMSA: ['PROCOMSA', 'ICON'],
  MYSMARTWINDOW: ['MYSMARTWINDOW', 'CWALL'],
};

export const normalizar = (t: string) =>
  t
    .toUpperCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^A-Z0-9]/g, '');

interface Referencia {
  marca: string;
  nombre: string;
  refInterna: string | null;
}

export interface ProductoParaPropuesta {
  id: string;
  skuIndustrial: string;
  nombreTecnico: string;
  especificacionesJson: unknown;
  pvpTarifa: { toString(): string } | null;
}

export interface Propuesta {
  productoBaseId: string;
  skuComercial: string;
  nombreComercial: string;
  pvpBase: number;
}

function nombreConColor(nombre: string, color: string | null | undefined) {
  const limpio = nombre.replace(/\s+/g, ' ').trim();
  if (!color) return limpio;
  const yaLoDice = color.split('/').some((parte) => normalizar(limpio).includes(normalizar(parte)));
  return yaLoDice ? limpio : `${limpio} ${color}`;
}

/// Nombre y SKU con que una marca vende un producto base, o `null` si el
/// producto solo tiene nombres de otras marcas. Los productos "para todos" sin
/// nombre propio usan el primero que tengan; los que no tienen nombres de
/// marca (mando estándar), el técnico.
export function nombreEnMarca(p: ProductoParaPropuesta, marca: MarcaCatalogo): { nombre: string; sku: string } | null {
  const json = (p.especificacionesJson ?? {}) as { referencias?: Referencia[]; color?: string | null; ambito?: string };
  const refs = json.referencias ?? [];
  if (refs.length === 0) return { nombre: p.nombreTecnico, sku: p.skuIndustrial };
  const marcas = MARCAS_DEL_EXCEL[marca];
  const elegida = refs.find((r) => marcas.includes(normalizar(r.marca))) ?? (json.ambito === 'todos' ? refs[0] : undefined);
  if (!elegida) return null;
  return { nombre: cuidarNombreComercial(nombreConColor(elegida.nombre, json.color)), sku: elegida.refInterna || p.skuIndustrial };
}

/// Propuesta de catálogo de una marca a partir de los productos base: los que
/// son de la marca y tienen PVP de tarifa, sin SKU repetidos.
export function propuestaDeMarca(productos: ProductoParaPropuesta[], marca: MarcaCatalogo): Propuesta[] {
  const skus = new Set<string>();
  const items: Propuesta[] = [];
  for (const p of productos) {
    const nombre = nombreEnMarca(p, marca);
    const pvp = p.pvpTarifa ? Number(p.pvpTarifa.toString()) : 0;
    if (!nombre || !(pvp > 0) || skus.has(nombre.sku)) continue;
    skus.add(nombre.sku);
    items.push({ productoBaseId: p.id, skuComercial: nombre.sku, nombreComercial: nombre.nombre, pvpBase: pvp });
  }
  return items;
}
