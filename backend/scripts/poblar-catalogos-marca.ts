/// Rellena el catálogo de cada submarca (Wave, ICON, Connect) con los
/// productos que vende, con su nombre, SKU y PVP de tarifa, y deja el catálogo
/// de cada empresa (partner o cliente) al día con el de su marca. Los productos
/// que una empresa ya tenía se enlazan a su marca conservando su descuento y si
/// estaban ocultos. Idempotente: añade solo lo que falta.
///
/// Uso:
///   npx tsx scripts/poblar-catalogos-marca.ts
import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client.js';
import { MarcaCatalogo } from '../src/generated/prisma/enums.js';
import { CatalogoMarcaService } from '../src/catalogo-marca/catalogo-marca.service.js';
import type { PrismaService } from '../src/prisma/prisma.service.js';

async function main() {
  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });
  const servicio = new CatalogoMarcaService(prisma as unknown as PrismaService);
  try {
    for (const marca of Object.values(MarcaCatalogo)) {
      const { anadidos, sincronizacion } = await servicio.rellenar(marca);
      const s = sincronizacion;
      console.log(
        `${marca}: ${anadidos} productos añadidos a la marca · empresas: ${s.creados} creados, ${s.actualizados} actualizados, ${s.retirados} retirados` +
          (s.conflictos.length ? ` · CONFLICTOS de SKU: ${s.conflictos.join(', ')}` : ''),
      );
    }
    const sinEnlazar = await prisma.representacionPartner.count({ where: { productoMarcaId: null } });
    console.log(`Productos extra (asignados a mano, fuera del catálogo de su marca): ${sinEnlazar}`);
  } finally {
    await prisma.$disconnect();
  }
}

main();
