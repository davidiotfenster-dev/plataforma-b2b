/// Borra todo lo generado por seed-demo.ts (partners, usuarios, catálogo y
/// pedidos de prueba), localizándolo por el prefijo `DEMO` en el CIF y
/// `DEMO-IND-` en el SKU industrial. No toca ningún dato real.
///
/// Uso:
///   npm run seed:demo:cleanup
import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client.js';

async function main() {
  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });

  try {
    const partners = await prisma.partner.findMany({ where: { cif: { startsWith: 'DEMO' } }, select: { id: true } });

    if (partners.length === 0) {
      console.log('No hay partners de demo que borrar.');
      return;
    }

    const ids = partners.map((p) => p.id);

    /// Order → Partner es `onDelete: Restrict`: hay que borrar los pedidos
    /// de demo antes de poder borrar los partners.
    const { count: pedidosBorrados } = await prisma.order.deleteMany({ where: { partnerId: { in: ids } } });
    console.log(`Pedidos de demo borrados: ${pedidosBorrados}`);

    const { count: partnersBorrados } = await prisma.partner.deleteMany({ where: { id: { in: ids } } });
    console.log(`Partners de demo borrados: ${partnersBorrados} (usuarios y catálogo asociados se borran en cascada)`);

    const { count: productosBorrados } = await prisma.productoBase.deleteMany({
      where: { skuIndustrial: { startsWith: 'DEMO-IND-' } },
    });
    console.log(`Productos base de demo borrados: ${productosBorrados}`);
  } finally {
    await prisma.$disconnect();
  }
}

main();
