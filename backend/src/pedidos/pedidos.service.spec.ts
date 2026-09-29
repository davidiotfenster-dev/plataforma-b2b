import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PedidosService } from './pedidos.service.js';
import { Prisma } from '../generated/prisma/client.js';
import type { PrismaService } from '../prisma/prisma.service.js';
import type { RedisService } from '../common/redis/redis.service.js';
import type { PedidoPdfService } from '../common/pdf/pedido-pdf.service.js';
import type { EmailService } from '../common/email/email.service.js';

/// Cobertura del cálculo de precio/descuento en `confirmar()`: es la parte
/// del sistema con más riesgo económico (congela precios en `OrderItem`) y
/// la que más ha cambiado (descuento por producto + fotografía histórica).
/// Se prueba a través de la API pública, con Prisma simulado (sin DB real):
/// `tx.order.create` "echa" de vuelta exactamente lo que el servicio calculó,
/// así se puede comprobar el resultado sin reimplementar el motor de Prisma.
describe('PedidosService.confirmar — cálculo de precio y descuento', () => {
  let prisma: {
    $transaction: ReturnType<typeof vi.fn>;
    partner: { findUniqueOrThrow: ReturnType<typeof vi.fn> };
  };
  let tx: {
    cart: { findUnique: ReturnType<typeof vi.fn> };
    partner: { findUniqueOrThrow: ReturnType<typeof vi.fn> };
    $queryRaw: ReturnType<typeof vi.fn>;
    order: { create: ReturnType<typeof vi.fn> };
    cartItem: { deleteMany: ReturnType<typeof vi.fn> };
    auditLog: { create: ReturnType<typeof vi.fn> };
  };
  let redis: RedisService;
  let pdfService: PedidoPdfService;
  let emailService: EmailService;
  let service: PedidosService;

  const PARTNER_ID = 'partner-1';
  const USER_ID = 'user-1';

  function representacion(overrides: Partial<{ pvpBase: number; descuentoOverride: number | null }> = {}) {
    return {
      id: 'rep-1',
      skuComercial: 'SKU-1',
      nombreComercial: 'Producto de prueba',
      pvpBase: new Prisma.Decimal(overrides.pvpBase ?? 100),
      descuentoOverride: overrides.descuentoOverride === undefined ? null : overrides.descuentoOverride === null ? null : new Prisma.Decimal(overrides.descuentoOverride),
    };
  }

  function cartConLinea(cantidad: number, rep: ReturnType<typeof representacion>) {
    return { id: 'cart-1', items: [{ cantidad, representacionPartner: rep }] };
  }

  beforeEach(() => {
    tx = {
      cart: { findUnique: vi.fn() },
      partner: { findUniqueOrThrow: vi.fn() },
      $queryRaw: vi.fn().mockResolvedValue([{ nextval: 1n }]),
      order: {
        create: vi.fn(async ({ data }: { data: Record<string, unknown> }) => {
          const items = (data.items as { createMany: { data: Record<string, unknown>[] } }).createMany.data;
          return {
            id: 'order-1',
            ...data,
            items,
            usuario: { email: 'partner@test.com', idioma: 'ES' },
            createdAt: new Date(),
            updatedAt: new Date(),
          };
        }),
      },
      cartItem: { deleteMany: vi.fn().mockResolvedValue({ count: 1 }) },
      auditLog: { create: vi.fn().mockResolvedValue({}) },
    };

    prisma = {
      $transaction: vi.fn(async (callback: (tx: unknown) => unknown) => callback(tx)),
      partner: { findUniqueOrThrow: tx.partner.findUniqueOrThrow },
    };

    redis = { del: vi.fn().mockResolvedValue(undefined) } as unknown as RedisService;
    pdfService = { generar: vi.fn().mockResolvedValue(Buffer.from('pdf')) } as unknown as PedidoPdfService;
    emailService = { enviar: vi.fn().mockResolvedValue(undefined) } as unknown as EmailService;

    service = new PedidosService(prisma as unknown as PrismaService, redis, pdfService, emailService);
  });

  it('aplica el descuento general del partner cuando el producto no tiene descuento propio', async () => {
    const rep = representacion({ pvpBase: 100, descuentoOverride: null });
    tx.cart.findUnique.mockResolvedValue(cartConLinea(2, rep));
    tx.partner.findUniqueOrThrow.mockResolvedValue({
      id: PARTNER_ID,
      razonSocial: 'Partner de prueba',
      descuentoPorcentaje: new Prisma.Decimal(10),
    });

    const orden = await service.confirmar(PARTNER_ID, USER_ID, { direccionEnvio: 'Calle 1', poNumber: 'PO-1' } as never);

    const linea = orden.items[0] as { descuentoAplicado: Prisma.Decimal; precioNetoUnitario: Prisma.Decimal; totalLinea: Prisma.Decimal; pvpHistorico: Prisma.Decimal };
    expect(linea.descuentoAplicado.toString()).toBe('10');
    expect(linea.precioNetoUnitario.toString()).toBe('90'); // 100 * (1 - 10/100)
    expect(linea.totalLinea.toString()).toBe('180'); // 90 * 2 unidades
    expect(linea.pvpHistorico.toString()).toBe('100');
    expect((orden.totalNeto as Prisma.Decimal).toString()).toBe('180');
  });

  it('aplica el descuento específico del producto en vez del general cuando existe', async () => {
    const rep = representacion({ pvpBase: 100, descuentoOverride: 25 });
    tx.cart.findUnique.mockResolvedValue(cartConLinea(1, rep));
    tx.partner.findUniqueOrThrow.mockResolvedValue({
      id: PARTNER_ID,
      razonSocial: 'Partner de prueba',
      descuentoPorcentaje: new Prisma.Decimal(10),
    });

    const orden = await service.confirmar(PARTNER_ID, USER_ID, { direccionEnvio: 'Calle 1', poNumber: 'PO-1' } as never);

    const linea = orden.items[0] as { descuentoAplicado: Prisma.Decimal; precioNetoUnitario: Prisma.Decimal };
    expect(linea.descuentoAplicado.toString()).toBe('25');
    expect(linea.precioNetoUnitario.toString()).toBe('75'); // 100 * (1 - 25/100), no el 10% general
  });

  it('redondea el precio neto a 2 decimales', async () => {
    const rep = representacion({ pvpBase: 99.99, descuentoOverride: 33 });
    tx.cart.findUnique.mockResolvedValue(cartConLinea(1, rep));
    tx.partner.findUniqueOrThrow.mockResolvedValue({
      id: PARTNER_ID,
      razonSocial: 'Partner de prueba',
      descuentoPorcentaje: new Prisma.Decimal(0),
    });

    const orden = await service.confirmar(PARTNER_ID, USER_ID, { direccionEnvio: 'Calle 1', poNumber: 'PO-1' } as never);

    // 99.99 * (1 - 33/100) = 66.9933 -> redondeado a 66.99
    const linea = orden.items[0] as { precioNetoUnitario: Prisma.Decimal };
    expect(linea.precioNetoUnitario.toString()).toBe('66.99');
  });

  it('suma correctamente el total del pedido con varias líneas y descuentos distintos', async () => {
    const repGeneral = representacion({ pvpBase: 100, descuentoOverride: null }); // -> 90 con 10% general
    const repOverride = { ...representacion({ pvpBase: 200, descuentoOverride: 50 }), id: 'rep-2' }; // -> 100 con 50% propio
    tx.cart.findUnique.mockResolvedValue({
      id: 'cart-1',
      items: [
        { cantidad: 1, representacionPartner: repGeneral },
        { cantidad: 3, representacionPartner: repOverride },
      ],
    });
    tx.partner.findUniqueOrThrow.mockResolvedValue({
      id: PARTNER_ID,
      razonSocial: 'Partner de prueba',
      descuentoPorcentaje: new Prisma.Decimal(10),
    });

    const orden = await service.confirmar(PARTNER_ID, USER_ID, { direccionEnvio: 'Calle 1', poNumber: 'PO-1' } as never);

    // línea 1: 90 * 1 = 90 · línea 2: 100 * 3 = 300 · total = 390
    expect((orden.totalNeto as Prisma.Decimal).toString()).toBe('390');
  });

  it('lanza un error si el carrito está vacío', async () => {
    tx.cart.findUnique.mockResolvedValue({ id: 'cart-1', items: [] });

    await expect(
      service.confirmar(PARTNER_ID, USER_ID, { direccionEnvio: 'Calle 1', poNumber: 'PO-1' } as never),
    ).rejects.toThrow('El carrito está vacío');
  });
});
