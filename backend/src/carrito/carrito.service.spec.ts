import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CarritoService } from './carrito.service.js';
import { Prisma } from '../generated/prisma/client.js';
import type { PrismaService } from '../prisma/prisma.service.js';
import type { RedisService } from '../common/redis/redis.service.js';

/// Cobertura del cálculo de precio/descuento del carrito: mismo motor que
/// `PedidosService.confirmar` (ver pedidos.service.spec.ts), pero antes de
/// congelar el pedido — el partner ve este número antes de confirmar, así
/// que tiene que coincidir con lo que luego se factura.
describe('CarritoService.obtenerResumen — cálculo de precio y descuento', () => {
  let prisma: {
    cart: { upsert: ReturnType<typeof vi.fn> };
    cartItem: { findMany: ReturnType<typeof vi.fn> };
    partner: { findUniqueOrThrow: ReturnType<typeof vi.fn> };
  };
  let redis: { get: ReturnType<typeof vi.fn>; setEx: ReturnType<typeof vi.fn> };
  let service: CarritoService;

  const PARTNER_ID = 'partner-1';
  const USER_ID = 'user-1';

  function representacion(overrides: Partial<{ id: string; pvpBase: number; descuentoOverride: number | null }> = {}) {
    return {
      id: overrides.id ?? 'rep-1',
      skuComercial: 'SKU-1',
      nombreComercial: 'Producto de prueba',
      imagenUrl: null,
      pvpBase: new Prisma.Decimal(overrides.pvpBase ?? 100),
      descuentoOverride:
        overrides.descuentoOverride === undefined || overrides.descuentoOverride === null
          ? null
          : new Prisma.Decimal(overrides.descuentoOverride),
    };
  }

  beforeEach(() => {
    prisma = {
      cart: { upsert: vi.fn().mockResolvedValue({ id: 'cart-1' }) },
      cartItem: { findMany: vi.fn() },
      partner: { findUniqueOrThrow: vi.fn() },
    };
    redis = { get: vi.fn().mockResolvedValue(null), setEx: vi.fn().mockResolvedValue(undefined) };
    service = new CarritoService(prisma as unknown as PrismaService, redis as unknown as RedisService);
  });

  it('aplica el descuento general del partner cuando el producto no tiene descuento propio', async () => {
    prisma.cartItem.findMany.mockResolvedValue([
      { id: 'item-1', cantidad: 2, representacionPartner: representacion({ pvpBase: 100, descuentoOverride: null }) },
    ]);
    prisma.partner.findUniqueOrThrow.mockResolvedValue({ descuentoPorcentaje: new Prisma.Decimal(10) });

    const resumen = await service.obtenerResumen(PARTNER_ID, USER_ID);

    expect(resumen.items[0].descuentoPorcentaje).toBe('10');
    expect(resumen.items[0].precioNetoUnitario).toBe('90');
    expect(resumen.items[0].totalLinea).toBe('180');
    expect(resumen.totalPedido).toBe('180');
  });

  it('aplica el descuento específico del producto en vez del general cuando existe', async () => {
    prisma.cartItem.findMany.mockResolvedValue([
      { id: 'item-1', cantidad: 1, representacionPartner: representacion({ pvpBase: 100, descuentoOverride: 25 }) },
    ]);
    prisma.partner.findUniqueOrThrow.mockResolvedValue({ descuentoPorcentaje: new Prisma.Decimal(10) });

    const resumen = await service.obtenerResumen(PARTNER_ID, USER_ID);

    expect(resumen.items[0].descuentoPorcentaje).toBe('25');
    expect(resumen.items[0].precioNetoUnitario).toBe('75');
  });

  it('suma correctamente varias líneas con descuentos distintos', async () => {
    prisma.cartItem.findMany.mockResolvedValue([
      { id: 'item-1', cantidad: 1, representacionPartner: representacion({ id: 'rep-1', pvpBase: 100, descuentoOverride: null }) },
      { id: 'item-2', cantidad: 3, representacionPartner: representacion({ id: 'rep-2', pvpBase: 200, descuentoOverride: 50 }) },
    ]);
    prisma.partner.findUniqueOrThrow.mockResolvedValue({ descuentoPorcentaje: new Prisma.Decimal(10) });

    const resumen = await service.obtenerResumen(PARTNER_ID, USER_ID);

    // línea 1: 90 * 1 = 90 · línea 2: 100 * 3 = 300 · total = 390
    expect(resumen.totalPedido).toBe('390');
  });

  it('usa el resumen cacheado en Redis sin volver a consultar la base de datos', async () => {
    const cacheado = { cartId: 'cart-1', items: [], totalPedido: '0' };
    redis.get.mockResolvedValue(JSON.stringify(cacheado));

    const resumen = await service.obtenerResumen(PARTNER_ID, USER_ID);

    expect(resumen).toEqual(cacheado);
    expect(prisma.cartItem.findMany).not.toHaveBeenCalled();
  });
});
