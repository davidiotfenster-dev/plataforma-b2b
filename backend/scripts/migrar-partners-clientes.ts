/// Separa las empresas en partners y distribuidores (entonces «clientes») (2026-09-30):
///  - VBH y Procomsa pasan a PARTNER con su marca (Wave / ICON).
///  - Se crea el partner MySmartWindow (marca Connect) con datos provisionales
///    ("PENDIENTE-...", salen como "datos por completar" en el panel) y se le
///    asigna el catálogo de su marca con el PVP de tarifa.
///  - El resto de empresas quedan como DISTRIBUIDOR (entonces CLIENTE) con marca MySmartWindow (valor
///    por defecto de la columna).
/// Idempotente: se puede volver a ejecutar sin duplicar nada.
///
/// Uso:
///   npx tsx scripts/migrar-partners-clientes.ts
import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { EstadoPartner, MarcaCatalogo, PrismaClient, TipoEmpresa } from '../src/generated/prisma/client.js';

const normalizar = (t: string) => t.toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^A-Z0-9]/g, '');

/// Marcas del Excel que pertenecen a la submarca Connect (MySmartWindow vende
/// los pulsadores de pared como C-WALL).
const MARCAS_MSW = ['MYSMARTWINDOW', 'CWALL'];

interface Referencia {
  marca: string;
  nombre: string;
  refInterna: string | null;
}

function nombreConColor(nombre: string, color: string | null | undefined) {
  const limpio = nombre.replace(/\s+/g, ' ').trim();
  if (!color) return limpio;
  const yaLoDice = color.split('/').some((parte) => normalizar(nombre).includes(normalizar(parte)));
  return yaLoDice ? limpio : `${limpio} ${color}`;
}

async function main() {
  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });
  try {
    const vbh = await prisma.partner.updateMany({
      where: { razonSocial: 'VBH' },
      data: { tipo: TipoEmpresa.PARTNER, marcaCatalogo: MarcaCatalogo.VBH },
    });
    const procomsa = await prisma.partner.updateMany({
      where: { marcaComercial: 'PROCOMSA' },
      data: { tipo: TipoEmpresa.PARTNER, marcaCatalogo: MarcaCatalogo.PROCOMSA },
    });
    console.log(`VBH: ${vbh.count} · Procomsa: ${procomsa.count} marcados como partner`);

    const msw = await prisma.partner.upsert({
      where: { cif: 'PENDIENTE-MYSMARTWINDOW' },
      update: { tipo: TipoEmpresa.PARTNER, marcaCatalogo: MarcaCatalogo.MYSMARTWINDOW },
      create: {
        razonSocial: 'MySmartWindow',
        cif: 'PENDIENTE-MYSMARTWINDOW',
        direccionFiscal: 'Pendiente de completar',
        pais: 'España',
        dominioWeb: 'mysmartwindow.pendiente.test',
        marcaComercial: 'MySmartWindow',
        estado: EstadoPartner.ACTIVO,
        tipo: TipoEmpresa.PARTNER,
        marcaCatalogo: MarcaCatalogo.MYSMARTWINDOW,
      },
    });

    // Catálogo Connect: productos con nombre en MySmartWindow, los "para todos"
    // y los que no tienen nombres de marca; solo con precio de tarifa.
    const productos = await prisma.productoBase.findMany({ where: { activo: true }, orderBy: { skuIndustrial: 'asc' } });
    const yaAsignados = new Set(
      (await prisma.representacionPartner.findMany({ where: { partnerId: msw.id }, select: { productoBaseId: true, skuComercial: true } })).flatMap(
        (r) => [r.productoBaseId, `sku:${r.skuComercial}`],
      ),
    );
    let asignados = 0;
    let sinPrecio = 0;
    for (const p of productos) {
      if (yaAsignados.has(p.id)) continue;
      const json = (p.especificacionesJson ?? {}) as { referencias?: Referencia[]; color?: string | null; ambito?: string };
      const refs = json.referencias ?? [];
      const suya = refs.find((r) => MARCAS_MSW.includes(normalizar(r.marca)));
      const elegida = suya ?? (refs.length === 0 ? null : json.ambito === 'todos' ? refs[0] : undefined);
      if (elegida === undefined) continue; // tiene nombres, pero de otras marcas
      if (!p.pvpTarifa || Number(p.pvpTarifa) <= 0) {
        sinPrecio++;
        continue;
      }
      const sku = elegida?.refInterna || p.skuIndustrial;
      if (yaAsignados.has(`sku:${sku}`)) continue;
      yaAsignados.add(`sku:${sku}`);
      await prisma.representacionPartner.create({
        data: {
          partnerId: msw.id,
          productoBaseId: p.id,
          skuComercial: sku,
          nombreComercial: elegida ? nombreConColor(elegida.nombre, json.color) : p.nombreTecnico,
          pvpBase: p.pvpTarifa,
        },
      });
      asignados++;
    }
    console.log(`MySmartWindow (${msw.id}): ${asignados} productos asignados, ${sinPrecio} sin precio`);

    const resumen = await prisma.partner.groupBy({ by: ['tipo', 'marcaCatalogo'], _count: { _all: true } });
    for (const r of resumen) console.log(`  ${r.tipo} · ${r.marcaCatalogo}: ${r._count._all}`);
  } finally {
    await prisma.$disconnect();
  }
}

main();
