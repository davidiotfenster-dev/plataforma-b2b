/// Lleva el PVP de la tarifa (`ProductoBase.pvpTarifa`, el que carga
/// `npm run import:dispositivos`) a los catálogos de marca y de ahí a todas sus
/// empresas. El precio neto de cada empresa sale solo de ese PVP y su descuento.
/// Sin `--aplicar` solo enseña qué cambiaría.
///
/// Uso:
///   npm run tarifa:marcas             (ver cambios)
///   npm run tarifa:marcas -- --aplicar
import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client.js';
import { MarcaCatalogo } from '../src/generated/prisma/enums.js';
import { CatalogoMarcaService } from '../src/catalogo-marca/catalogo-marca.service.js';
import type { PrismaService } from '../src/prisma/prisma.service.js';

async function main() {
  const aplicar = process.argv.includes('--aplicar');
  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });
  const servicio = new CatalogoMarcaService(prisma as unknown as PrismaService);
  try {
    for (const marca of Object.values(MarcaCatalogo)) {
      const { cambios, sincronizacion } = await servicio.aplicarTarifa(marca, aplicar);
      console.log(`${marca}: ${cambios.length} productos con PVP distinto de la tarifa`);
      for (const c of cambios) console.log(`  ${c.skuComercial}: ${c.antes.toString()} -> ${c.despues.toString()}`);
      if (sincronizacion) {
        console.log(`  empresas: ${sincronizacion.actualizados} productos actualizados` +
          (sincronizacion.conflictos.length ? ` · CONFLICTOS de SKU: ${sincronizacion.conflictos.join(', ')}` : ''));
      }
    }
    if (!aplicar) console.log('\nNo se ha cambiado nada. Para aplicarlo: npm run tarifa:marcas -- --aplicar');
  } finally {
    await prisma.$disconnect();
  }
}

main();
