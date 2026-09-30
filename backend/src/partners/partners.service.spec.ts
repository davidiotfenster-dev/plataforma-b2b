import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PartnersService } from './partners.service.js';
import type { PrismaService } from '../prisma/prisma.service.js';
import type { CatalogoMarcaService } from '../catalogo-marca/catalogo-marca.service.js';

describe('PartnersService — resumen y filtros del panel', () => {
  let prisma: {
    partner: {
      groupBy: ReturnType<typeof vi.fn>;
      count: ReturnType<typeof vi.fn>;
      findMany: ReturnType<typeof vi.fn>;
    };
  };
  let service: PartnersService;

  beforeEach(() => {
    prisma = {
      partner: {
        groupBy: vi.fn().mockResolvedValue([
          { estado: 'ACTIVO', _count: { _all: 3 } },
          { estado: 'PENDIENTE_APROBACION', _count: { _all: 2 } },
        ]),
        count: vi.fn().mockResolvedValue(4),
        findMany: vi.fn().mockResolvedValue([]),
      },
    };
    service = new PartnersService(prisma as unknown as PrismaService, {} as unknown as CatalogoMarcaService);
  });

  describe('resumen', () => {
    it('cuenta los partners por estado (con ceros en los estados vacíos) y los de datos provisionales', async () => {
      const resumen = await service.resumen();

      expect(resumen.porEstado).toEqual({
        PENDIENTE_VERIFICACION_EMAIL: 0,
        PENDIENTE_APROBACION: 2,
        ACTIVO: 3,
        SUSPENDIDO: 0,
        RECHAZADO: 0,
      });
      expect(resumen.total).toBe(5);
      expect(resumen.datosPorCompletar).toBe(4);
    });

    it('un COMERCIAL solo cuenta los partners que él dio de alta', async () => {
      await service.resumen('comercial-1');

      expect(prisma.partner.groupBy).toHaveBeenCalledWith(
        expect.objectContaining({ where: { creadoPorUsuarioId: 'comercial-1' } }),
      );
      const filtroDatos = prisma.partner.count.mock.calls[0][0].where.AND;
      expect(filtroDatos[0]).toEqual({ creadoPorUsuarioId: 'comercial-1' });
    });
  });

  describe('listar', () => {
    it('combina alcance, estado, búsqueda y "datos por completar" con AND (sin pisarse los OR)', async () => {
      await service.listar({ estado: 'ACTIVO', busqueda: 'vbh', datosPorCompletar: true, page: 1, limit: 20 }, 'comercial-1');

      const { where } = prisma.partner.findMany.mock.calls[0][0];
      expect(where.AND).toHaveLength(4);
      expect(where.AND[0]).toEqual({ creadoPorUsuarioId: 'comercial-1' });
      expect(where.AND[1]).toEqual({ estado: 'ACTIVO' });
      // La búsqueda también encuentra por código de cliente.
      expect(JSON.stringify(where.AND[2])).toContain('codigoCliente');
      expect(JSON.stringify(where.AND[3])).toContain('PENDIENTE');
    });

    it('sin filtros no restringe nada', async () => {
      await service.listar({ page: 1, limit: 20 });

      expect(prisma.partner.findMany.mock.calls[0][0].where).toEqual({});
    });

    it('trae los contadores de usuarios, catálogo y pedidos sin cargar las filas', async () => {
      await service.listar({ page: 1, limit: 20 });

      expect(prisma.partner.findMany.mock.calls[0][0].include).toEqual({
        _count: { select: { usuarios: true, representaciones: true, ordenes: true } },
      });
    });
  });
});
