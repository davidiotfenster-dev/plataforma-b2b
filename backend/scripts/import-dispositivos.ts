/// Carga en `ProductoBase` el catálogo de dispositivos IoT (Wave/ICON/Pulsar/
/// Connect/mandos/Evo) a partir de `scripts/data/dispositivos.json`, que sale
/// del Excel de GTINs (DISPOSITIVOSIOT) agrupado por aparato físico: un mismo
/// aparato con nombres distintos según partner (Wave4 en VBH = ICON4 en
/// Procomsa) es UN ProductoBase; los GTIN y nombres por marca van en
/// `especificacionesJson.referencias`.
/// Actualiza nombre y ficha si ya existen. No crea `RepresentacionPartner` (no hay PVP por partner todavía): la
/// asignación con precio se hace desde `admin/catalogo`.
/// Idempotente: upsert por `skuIndustrial`.
///
/// Uso:
///   npm run import:dispositivos
import 'dotenv/config';
import { readFileSync } from 'node:fs';
import { PrismaPg } from '@prisma/adapter-pg';
import { Prisma, PrismaClient } from '../src/generated/prisma/client.js';

interface Dispositivo {
  skuIndustrial: string;
  nombreTecnico: string;
  grupo: string;
  color: string | null;
  referencias: { marca: string; nombre: string; refInterna: string; gtin: string | null }[];
  pendiente?: string;
  /// PVP de la tarifa oficial (columna `ProductoBase.pvpTarifa`), no va en el JSON de especificaciones.
  pvpTarifa?: number | null;
  /// 'todos' = se asigna a cualquier partner aunque no tenga nombre en su marca (mandos, EVO, cables...).
  ambito?: string;
  /// Foto de serie (`/imagenes/default-*.png`). Solo se pone al CREAR el producto:
  /// después la gestiona el admin desde el catálogo y la importación no la toca.
  imagen?: string;
}

/// SKU que ya no existen en el catálogo (fusionados con otro aparato o
/// sustituidos). Solo se borran si no tienen asignaciones a partners.
const RETIRADOS = [
  'CONNECT1BL', 'CONNECT1N', 'CONNECT1PBL', 'CONNECT1PN', 'CONNECT2BL', 'CONNECT2N',
  'CONNECT2PBL', 'CONNECT2PN', 'CONNECT2SBL', 'CONNECT2SN', 'EVO',
];

async function main() {
  const datos: Dispositivo[] = JSON.parse(
    readFileSync(new URL('./data/dispositivos.json', import.meta.url), 'utf-8'),
  );
  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });
  let creados = 0;
  let actualizados = 0;

  try {
    for (const { skuIndustrial, nombreTecnico, pvpTarifa, imagen, ...resto } of datos) {
      const especificacionesJson = resto as unknown as Prisma.InputJsonValue;
      const existente = await prisma.productoBase.findUnique({ where: { skuIndustrial } });
      await prisma.productoBase.upsert({
        where: { skuIndustrial },
        update: { nombreTecnico, especificacionesJson, pvpTarifa: pvpTarifa ?? null },
        create: { skuIndustrial, nombreTecnico, especificacionesJson, pvpTarifa: pvpTarifa ?? null, imagenUrl: imagen ?? null },
      });
      if (existente) actualizados++;
      else creados++;
    }
    let borrados = 0;
    for (const sku of RETIRADOS) {
      const p = await prisma.productoBase.findUnique({ where: { skuIndustrial: sku }, include: { _count: { select: { representaciones: true } } } });
      if (!p) continue;
      if (p._count.representaciones > 0) {
        console.log(`  ${sku}: tiene ${p._count.representaciones} asignaciones, NO se borra.`);
        continue;
      }
      await prisma.productoBase.delete({ where: { id: p.id } });
      borrados++;
    }
    console.log(`Retirados: ${borrados} borrados.`);
    console.log(`Dispositivos: ${creados} creados, ${actualizados} actualizados (total ${datos.length}).`);
  } finally {
    await prisma.$disconnect();
  }
}

main();
