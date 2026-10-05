import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { PedidosService } from './pedidos.service.js';
import { Prisma } from '../generated/prisma/client.js';
import type { PrismaService } from '../prisma/prisma.service.js';
import type { RedisService } from '../common/redis/redis.service.js';
import type { PedidoPdfService } from '../common/pdf/pedido-pdf.service.js';
import type { EmailService } from '../common/email/email.service.js';
import type { ConfigService } from '@nestjs/config';

const PARTNER_ID = 'partner-1';

function pedido(overrides: Record<string, unknown> = {}) {
  return {
    id: 'o1',
    codigoPed: 'PED-000001',
    partnerId: PARTNER_ID,
    userId: 'user-1',
    estado: 'RECIBIDO',
    totalNeto: new Prisma.Decimal(100),
    createdAt: new Date('2026-09-01T10:00:00Z'),
    items: [
      { nombreProducto: 'Uno', cantidad: 2 },
      { nombreProducto: 'Dos', cantidad: 1 },
      { nombreProducto: 'Tres', cantidad: 4 },
      { nombreProducto: 'Cuatro', cantidad: 5 },
    ],
    ...overrides,
  };
}

describe('PedidosService — Mis pedidos del cliente', () => {
  let prisma: {
    order: {
      count: ReturnType<typeof vi.fn>;
      findMany: ReturnType<typeof vi.fn>;
      findUnique: ReturnType<typeof vi.fn>;
      groupBy: ReturnType<typeof vi.fn>;
    };
    pedidoEstadoHistorial: { count: ReturnType<typeof vi.fn> };
    user: { findUnique: ReturnType<typeof vi.fn> };
  };
  let pdfService: { generar: ReturnType<typeof vi.fn> };
  let service: PedidosService;

  beforeEach(() => {
    prisma = {
      order: {
        count: vi.fn().mockResolvedValue(1),
        findMany: vi.fn().mockResolvedValue([pedido()]),
        findUnique: vi.fn(),
        groupBy: vi.fn().mockResolvedValue([{ estado: 'RECIBIDO', _count: { _all: 3 } }]),
      },
      pedidoEstadoHistorial: { count: vi.fn().mockResolvedValue(2) },
      user: { findUnique: vi.fn().mockResolvedValue({ idioma: 'DE' }) },
    };
    pdfService = { generar: vi.fn().mockResolvedValue(Buffer.from('pdf')) };
    service = new PedidosService(
      prisma as unknown as PrismaService,
      {} as RedisService,
      pdfService as unknown as PedidoPdfService,
      {} as EmailService,
      {} as ConfigService,
    );
  });

  describe('listar', () => {
    it('siempre acota por el partner del usuario', async () => {
      await service.listar(PARTNER_ID, {});

      expect(prisma.order.findMany.mock.calls[0][0].where).toEqual({ partnerId: PARTNER_ID });
      expect(prisma.order.count.mock.calls[0][0].where).toEqual({ partnerId: PARTNER_ID });
    });

    it('resume los productos (máximo 3), cuenta los artículos y no expone partnerId ni userId', async () => {
      const { data } = await service.listar(PARTNER_ID, {});

      expect(data[0].articulos).toBe(12);
      expect(data[0].productos).toEqual([
        { nombre: 'Uno', cantidad: 2 },
        { nombre: 'Dos', cantidad: 1 },
        { nombre: 'Tres', cantidad: 4 },
      ]);
      expect(data[0].productosRestantes).toBe(1);
      expect(data[0]).not.toHaveProperty('partnerId');
      expect(data[0]).not.toHaveProperty('userId');
      expect(data[0]).not.toHaveProperty('items');
    });

    it('devuelve el resumen del conjunto completo del partner, sin los filtros de la búsqueda', async () => {
      const resultado = await service.listar(PARTNER_ID, { estado: 'ENVIADO', busqueda: 'x' });

      expect(prisma.order.groupBy.mock.calls[0][0].where).toEqual({ partnerId: PARTNER_ID });
      expect(resultado.resumen).toEqual({ porEstado: { RECIBIDO: 3 }, enviadosUltimos7Dias: 2 });
    });

    it('busca por código, PO Number y producto sin distinguir mayúsculas', async () => {
      await service.listar(PARTNER_ID, { busqueda: '  connect ' });

      const contiene = { contains: 'connect', mode: 'insensitive' };
      expect(prisma.order.findMany.mock.calls[0][0].where.OR).toEqual([
        { codigoPed: contiene },
        { poNumber: contiene },
        { items: { some: { OR: [{ nombreProducto: contiene }, { skuComercial: contiene }] } } },
      ]);
    });

    it('filtra por estado y por un rango de fechas con el último día incluido', async () => {
      await service.listar(PARTNER_ID, { estado: 'ENVIADO', desde: '2026-09-01', hasta: '2026-09-30' });

      const where = prisma.order.findMany.mock.calls[0][0].where;
      expect(where.estado).toBe('ENVIADO');
      expect(where.createdAt.gte).toEqual(new Date('2026-09-01T00:00:00Z'));
      expect(where.createdAt.lt).toEqual(new Date('2026-10-01T00:00:00Z'));
    });

    it('rechaza una fecha imposible', async () => {
      await expect(service.listar(PARTNER_ID, { desde: '2026-13-45' })).rejects.toBeInstanceOf(BadRequestException);
    });

    it('ordena por total y pagina', async () => {
      await service.listar(PARTNER_ID, { orden: 'total', sentido: 'asc', page: 3, limit: 10 });

      const args = prisma.order.findMany.mock.calls[0][0];
      expect(args.orderBy).toEqual([{ totalNeto: 'asc' }, { id: 'asc' }]);
      expect(args.skip).toBe(20);
      expect(args.take).toBe(10);
    });
  });

  describe('obtener', () => {
    const linea = (id: string, representacionPartner: unknown) => ({ id, nombreProducto: id, representacionPartner });

    it('pone en cada línea la foto del producto: la de la empresa, la del aparato o ninguna', async () => {
      prisma.order.findUnique.mockResolvedValue({
        ...pedido(),
        historial: [],
        items: [
          linea('propia', { imagenUrl: '/imagenes/propia.png', productoBase: { imagenUrl: '/imagenes/base.png' } }),
          linea('base', { imagenUrl: null, productoBase: { imagenUrl: '/imagenes/base.png' } }),
          linea('retirado', null),
        ],
      });

      const { items } = await service.obtener(PARTNER_ID, 'o1');

      expect(items.map((i) => i.imagenUrl)).toEqual(['/imagenes/propia.png', '/imagenes/base.png', null]);
      expect(items[0]).not.toHaveProperty('representacionPartner');
    });

    it('responde 404 opaco si el pedido es de otro partner', async () => {
      prisma.order.findUnique.mockResolvedValue({ ...pedido({ partnerId: 'otro' }), historial: [], items: [] });

      await expect(service.obtener(PARTNER_ID, 'o1')).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('generarPdf', () => {
    it('genera el PDF de un pedido propio', async () => {
      prisma.order.findUnique.mockResolvedValue({
        ...pedido(),
        notas: null,
        poNumber: 'PO-1',
        direccionEnvio: 'Calle 1',
        items: [],
        partner: { razonSocial: 'Cliente S.L.' },
      });

      const { codigoPed, contenido } = await service.generarPdf(PARTNER_ID, 'user-1', 'o1', 'EN');

      expect(codigoPed).toBe('PED-000001');
      expect(contenido).toEqual(Buffer.from('pdf'));
      expect(pdfService.generar.mock.calls[0][0].razonSocialPartner).toBe('Cliente S.L.');
    });

    it('usa el idioma que elige el usuario al descargar', async () => {
      prisma.order.findUnique.mockResolvedValue({ ...pedido(), items: [], partner: { razonSocial: 'X' } });

      await service.generarPdf(PARTNER_ID, 'user-1', 'o1', 'IT');

      expect(pdfService.generar.mock.calls[0][0].idioma).toBe('IT');
      expect(prisma.user.findUnique).not.toHaveBeenCalled();
    });

    it('si no elige idioma, usa el que el usuario tiene guardado', async () => {
      prisma.order.findUnique.mockResolvedValue({ ...pedido(), items: [], partner: { razonSocial: 'X' } });

      await service.generarPdf(PARTNER_ID, 'user-1', 'o1');

      expect(pdfService.generar.mock.calls[0][0].idioma).toBe('DE');
    });

    it('responde 404 opaco si el pedido es de otro partner y no genera nada', async () => {
      prisma.order.findUnique.mockResolvedValue({ ...pedido({ partnerId: 'otro' }), partner: { razonSocial: 'X' } });

      await expect(service.generarPdf(PARTNER_ID, 'user-1', 'o1', 'ES')).rejects.toBeInstanceOf(NotFoundException);
      expect(pdfService.generar).not.toHaveBeenCalled();
    });
  });

  describe('generarPdfAdmin', () => {
    it('IoT FENSTER descarga el PDF de un pedido de cualquier empresa, en su idioma', async () => {
      prisma.order.findUnique.mockResolvedValue({
        ...pedido({ partnerId: 'otro' }),
        items: [],
        partner: { razonSocial: 'Cliente S.L.', creadoPorUsuarioId: null },
      });

      const { codigoPed } = await service.generarPdfAdmin('o1', 'admin-1');

      expect(codigoPed).toBe('PED-000001');
      expect(prisma.user.findUnique).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 'admin-1' } }));
      expect(pdfService.generar.mock.calls[0][0]).toMatchObject({ razonSocialPartner: 'Cliente S.L.', idioma: 'DE' });
    });

    it('un comercial no descarga pedidos de empresas que no dio de alta', async () => {
      prisma.order.findUnique.mockResolvedValue({
        ...pedido(),
        items: [],
        partner: { razonSocial: 'X', creadoPorUsuarioId: 'otro-comercial' },
      });

      await expect(service.generarPdfAdmin('o1', 'comercial-1', 'ES', 'comercial-1')).rejects.toBeInstanceOf(
        NotFoundException,
      );
      expect(pdfService.generar).not.toHaveBeenCalled();
    });
  });
});
