import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NotFoundException } from '@nestjs/common';
import { CarritoService } from './carrito.service.js';
import { CANTIDAD_MAXIMA_POR_LINEA } from './dto/agregar-item.dto.js';
import { Prisma } from '../generated/prisma/client.js';
import type { PrismaService } from '../prisma/prisma.service.js';

const PARTNER_ID = 'partner-1';
const USER_ID = 'user-1';

function linea(id: string, repId: string | null, cantidad: number, precioNeto: number) {
  return {
    id: `linea-${id}`,
    representacionPartnerId: repId,
    nombreProducto: `Producto ${id}`,
    cantidad,
    precioNetoUnitario: new Prisma.Decimal(precioNeto),
  };
}

function representacion(id: string, pvpBase: number) {
  return {
    id,
    skuComercial: `SKU-${id}`,
    nombreComercial: `Producto ${id}`,
    imagenUrl: null,
    pvpBase: new Prisma.Decimal(pvpBase),
    descuentoOverride: null,
  };
}

describe('CarritoService.repetirPedido', () => {
  let prisma: {
    order: { findUnique: ReturnType<typeof vi.fn> };
    cart: { upsert: ReturnType<typeof vi.fn> };
    cartItem: {
      findUnique: ReturnType<typeof vi.fn>;
      findMany: ReturnType<typeof vi.fn>;
      create: ReturnType<typeof vi.fn>;
      update: ReturnType<typeof vi.fn>;
    };
    representacionPartner: { findMany: ReturnType<typeof vi.fn> };
    partner: { findUniqueOrThrow: ReturnType<typeof vi.fn> };
  };
  let service: CarritoService;

  beforeEach(() => {
    prisma = {
      order: { findUnique: vi.fn() },
      cart: { upsert: vi.fn().mockResolvedValue({ id: 'cart-1' }) },
      cartItem: {
        findUnique: vi.fn().mockResolvedValue(null),
        findMany: vi.fn().mockResolvedValue([]),
        create: vi.fn().mockResolvedValue({}),
        update: vi.fn().mockResolvedValue({}),
      },
      representacionPartner: { findMany: vi.fn() },
      partner: { findUniqueOrThrow: vi.fn().mockResolvedValue({ descuentoPorcentaje: new Prisma.Decimal(0) }) },
    };
    service = new CarritoService(prisma as unknown as PrismaService);
  });

  it('responde 404 opaco si el pedido es de otro partner', async () => {
    prisma.order.findUnique.mockResolvedValue({ id: 'o1', partnerId: 'otro', items: [] });

    await expect(service.repetirPedido(PARTNER_ID, USER_ID, 'o1')).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.cartItem.create).not.toHaveBeenCalled();
  });

  it('responde 404 opaco si el pedido no existe', async () => {
    prisma.order.findUnique.mockResolvedValue(null);

    await expect(service.repetirPedido(PARTNER_ID, USER_ID, 'o1')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('mete en el carrito las líneas disponibles y avisa de las que ya no se pueden pedir', async () => {
    prisma.order.findUnique.mockResolvedValue({
      id: 'o1',
      partnerId: PARTNER_ID,
      items: [linea('A', 'rep-A', 2, 100), linea('B', 'rep-B', 1, 50), linea('C', null, 3, 10)],
    });
    /// Solo rep-A sigue a la venta; rep-B fue retirado y C perdió su enlace con el catálogo.
    prisma.representacionPartner.findMany.mockResolvedValue([{ id: 'rep-A' }]);
    prisma.cartItem.findMany.mockResolvedValue([
      { id: 'i1', cantidad: 2, representacionPartner: representacion('rep-A', 100) },
    ]);

    const resultado = await service.repetirPedido(PARTNER_ID, USER_ID, 'o1');

    expect(prisma.cartItem.create).toHaveBeenCalledTimes(1);
    expect(prisma.cartItem.create).toHaveBeenCalledWith({
      data: { cartId: 'cart-1', representacionPartnerId: 'rep-A', cantidad: 2 },
    });
    expect(resultado.agregadas).toBe(1);
    expect(resultado.noDisponibles).toEqual(['Producto B', 'Producto C']);
    expect(resultado.preciosCambiados).toEqual([]);
  });

  it('suma a lo que ya hay en el carrito y respeta el tope por línea', async () => {
    prisma.order.findUnique.mockResolvedValue({
      id: 'o1',
      partnerId: PARTNER_ID,
      items: [linea('A', 'rep-A', 5, 100)],
    });
    prisma.representacionPartner.findMany.mockResolvedValue([{ id: 'rep-A' }]);
    prisma.cartItem.findUnique.mockResolvedValue({ id: 'existente', cantidad: CANTIDAD_MAXIMA_POR_LINEA - 2 });
    prisma.cartItem.findMany.mockResolvedValue([]);

    await service.repetirPedido(PARTNER_ID, USER_ID, 'o1');

    expect(prisma.cartItem.update).toHaveBeenCalledWith({
      where: { id: 'existente' },
      data: { cantidad: CANTIDAD_MAXIMA_POR_LINEA },
    });
    expect(prisma.cartItem.create).not.toHaveBeenCalled();
  });

  it('avisa cuando el precio neto actual es distinto del que se pagó en el pedido', async () => {
    prisma.order.findUnique.mockResolvedValue({
      id: 'o1',
      partnerId: PARTNER_ID,
      items: [linea('A', 'rep-A', 1, 80), linea('B', 'rep-B', 1, 50)],
    });
    prisma.representacionPartner.findMany.mockResolvedValue([{ id: 'rep-A' }, { id: 'rep-B' }]);
    prisma.cartItem.findMany.mockResolvedValue([
      { id: 'i1', cantidad: 1, representacionPartner: representacion('rep-A', 100) },
      { id: 'i2', cantidad: 1, representacionPartner: representacion('rep-B', 50) },
    ]);

    const resultado = await service.repetirPedido(PARTNER_ID, USER_ID, 'o1');

    expect(resultado.preciosCambiados).toEqual([{ nombre: 'Producto A', anterior: '80', actual: '100' }]);
  });
});
