/// Genera datos de prueba (30 partners, catálogo y pedidos variados en
/// estado y fecha) para probar el comportamiento del panel de admin y las
/// gráficas del dashboard. Totalmente temporal: usar `npm run seed:demo:cleanup`
/// para borrarlo todo sin tocar datos reales.
///
/// Uso:
///   npm run seed:demo
import 'dotenv/config';
import * as bcrypt from 'bcrypt';
import { PrismaPg } from '@prisma/adapter-pg';
import { Prisma, PrismaClient } from '../src/generated/prisma/client.js';
import { EstadoPartner, EstadoPedido, RolUsuario } from '../src/generated/prisma/enums.js';

const SALT_ROUNDS = 12;
const NUM_PARTNERS = 30;
const DEMO_PASSWORD = 'Demo2026!';
/// Prefijo que marca todo lo generado por este script, para poder
/// localizarlo y borrarlo de forma segura (ver seed-demo-cleanup.ts).
const PREFIJO_CIF = 'DEMO';
const PREFIJO_SKU_INDUSTRIAL = 'DEMO-IND-';

const PAISES = ['España', 'Francia', 'Italia', 'Portugal', 'Alemania'];
const MARCAS = ['Fenster Home', 'Fenster Pro', 'Fenster Basic'];
const TARIFAS = ['Estandar', 'Premium'];

const PRODUCTOS_DEMO = [
  { skuIndustrial: `${PREFIJO_SKU_INDUSTRIAL}VC-100`, nombreTecnico: 'Ventana Corredera 100x120' },
  { skuIndustrial: `${PREFIJO_SKU_INDUSTRIAL}VC-150`, nombreTecnico: 'Ventana Corredera 150x120' },
  { skuIndustrial: `${PREFIJO_SKU_INDUSTRIAL}VB-080`, nombreTecnico: 'Ventana Batiente 80x100' },
  { skuIndustrial: `${PREFIJO_SKU_INDUSTRIAL}PU-090`, nombreTecnico: 'Puerta Practicable 90x210' },
  { skuIndustrial: `${PREFIJO_SKU_INDUSTRIAL}PC-240`, nombreTecnico: 'Puerta Corredera 240x210' },
  { skuIndustrial: `${PREFIJO_SKU_INDUSTRIAL}MX-060`, nombreTecnico: 'Mosquitera Enrollable 60x120' },
];

/// Pesado hacia ENVIADO para que el catálogo de estados parezca un flujo
/// real, con algo de CANCELADO para poder ver ese caso en el dashboard.
const ESTADOS_PEDIDO_DEMO: EstadoPedido[] = [
  EstadoPedido.RECIBIDO,
  EstadoPedido.CONFIRMADO,
  EstadoPedido.EN_PREPARACION,
  EstadoPedido.PREPARADO,
  EstadoPedido.ENVIADO,
  EstadoPedido.ENVIADO,
  EstadoPedido.ENVIADO,
  EstadoPedido.CANCELADO,
];

function aleatorio<T>(lista: T[]): T {
  return lista[Math.floor(Math.random() * lista.length)];
}

function entero(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function barajar<T>(lista: T[]): T[] {
  return [...lista].sort(() => Math.random() - 0.5);
}

async function main() {
  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });

  try {
    console.log('Creando productos base de demo...');
    const productos = [];
    for (const p of PRODUCTOS_DEMO) {
      const producto = await prisma.productoBase.upsert({ where: { skuIndustrial: p.skuIndustrial }, update: {}, create: p });
      productos.push(producto);
    }

    const passwordHash = await bcrypt.hash(DEMO_PASSWORD, SALT_ROUNDS);

    console.log(`Creando ${NUM_PARTNERS} partners de demo...`);
    for (let i = 1; i <= NUM_PARTNERS; i++) {
      const numero = String(i).padStart(2, '0');
      const cif = `${PREFIJO_CIF}${String(i).padStart(5, '0')}`;

      const existente = await prisma.partner.findUnique({ where: { cif } });
      if (existente) {
        console.log(`  Partner ${cif} ya existe, se omite.`);
        continue;
      }

      /// La mayoría ACTIVO (para tener catálogo y pedidos), y unos pocos en
      /// otros estados para ver el flujo de aprobación en la lista.
      const estado = i <= 25 ? EstadoPartner.ACTIVO : i <= 28 ? EstadoPartner.PENDIENTE_APROBACION : EstadoPartner.SUSPENDIDO;
      const activo = estado === EstadoPartner.ACTIVO;

      const partner = await prisma.partner.create({
        data: {
          razonSocial: `Demo Partner ${numero} S.L.`,
          cif,
          direccionFiscal: `Calle Demo ${i}`,
          pais: aleatorio(PAISES),
          dominioWeb: `demo-partner-${numero}.test`,
          marcaComercial: activo ? aleatorio(MARCAS) : null,
          tarifa: activo ? aleatorio(TARIFAS) : null,
          descuentoPorcentaje: activo ? entero(0, 20) : 0,
          estado,
        },
      });

      const usuario = await prisma.user.create({
        data: {
          email: `demo-partner-${numero}@fenster.test`,
          passwordHash,
          nombre: `Admin Demo ${numero}`,
          rol: RolUsuario.PARTNER_ADMIN,
          partnerId: partner.id,
          activo,
          emailVerificadoEn: estado === EstadoPartner.PENDIENTE_APROBACION ? null : new Date(),
        },
      });

      if (!activo) {
        console.log(`  Partner ${cif} creado (${estado}, sin catálogo/pedidos).`);
        continue;
      }

      const productosAsignados = barajar(productos).slice(0, entero(2, 4));
      const representaciones = [];
      for (const producto of productosAsignados) {
        const sufijo = producto.skuIndustrial.replace(PREFIJO_SKU_INDUSTRIAL, '');
        const rep = await prisma.representacionPartner.create({
          data: {
            productoBaseId: producto.id,
            partnerId: partner.id,
            skuComercial: `${cif}-${sufijo}`,
            nombreComercial: producto.nombreTecnico,
            pvpBase: entero(80, 600),
            descuentoOverride: Math.random() < 0.3 ? entero(5, 25) : null,
          },
        });
        representaciones.push(rep);
      }

      const numPedidos = entero(0, 8);
      for (let j = 0; j < numPedidos; j++) {
        const diasAtras = entero(0, 59);
        const createdAt = new Date(Date.now() - diasAtras * 24 * 60 * 60 * 1000);
        const estadoPedido = aleatorio(ESTADOS_PEDIDO_DEMO);

        const [{ nextval }] = await prisma.$queryRaw<{ nextval: bigint }[]>`SELECT nextval('pedido_codigo_seq')`;
        const codigoPed = `PED-${nextval.toString().padStart(6, '0')}`;

        const lineasRep = barajar(representaciones).slice(0, entero(1, Math.min(3, representaciones.length)));
        let totalNeto = new Prisma.Decimal(0);
        const items = lineasRep.map((rep) => {
          const cantidad = entero(1, 5);
          const descuentoAplicado = rep.descuentoOverride ?? partner.descuentoPorcentaje;
          const factor = new Prisma.Decimal(1).minus(descuentoAplicado.dividedBy(100));
          const precioNetoUnitario = rep.pvpBase.times(factor).toDecimalPlaces(2);
          const totalLinea = precioNetoUnitario.times(cantidad);
          totalNeto = totalNeto.plus(totalLinea);

          return {
            representacionPartnerId: rep.id,
            skuComercial: rep.skuComercial,
            nombreProducto: rep.nombreComercial,
            pvpHistorico: rep.pvpBase,
            descuentoAplicado,
            precioNetoUnitario,
            cantidad,
            totalLinea,
          };
        });

        await prisma.order.create({
          data: {
            codigoPed,
            partnerId: partner.id,
            userId: usuario.id,
            estado: estadoPedido,
            direccionEnvio: `Calle Demo ${i}, ${partner.pais}`,
            poNumber: `PO-DEMO-${i}-${j}`,
            totalNeto,
            motivoCancelacion: estadoPedido === EstadoPedido.CANCELADO ? 'Motivo de prueba (dato de demo)' : null,
            createdAt,
            updatedAt: createdAt,
            items: { createMany: { data: items } },
          },
        });
      }

      console.log(`  Partner ${cif} creado con ${representaciones.length} productos y ${numPedidos} pedidos.`);
    }

    console.log(`\nListo. Todos los usuarios de demo usan la contraseña: ${DEMO_PASSWORD}`);
    console.log('Para borrar todos estos datos de prueba: npm run seed:demo:cleanup');
  } finally {
    await prisma.$disconnect();
  }
}

main();
