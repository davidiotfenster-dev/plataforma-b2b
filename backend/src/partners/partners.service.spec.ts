import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PartnersService } from './partners.service.js';
import type { PrismaService } from '../prisma/prisma.service.js';
import type { CatalogoMarcaService } from '../catalogo-marca/catalogo-marca.service.js';
import type { EmailService } from '../common/email/email.service.js';
import type { ConfigService } from '@nestjs/config';

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
    service = new PartnersService(prisma as unknown as PrismaService, {} as unknown as CatalogoMarcaService, {} as EmailService, {} as ConfigService);
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

      const propias = { AND: [{ creadoPorUsuarioId: 'comercial-1' }, { archivadoEn: null }] };
      expect(prisma.partner.groupBy).toHaveBeenCalledWith(expect.objectContaining({ where: propias }));
      const filtroDatos = prisma.partner.count.mock.calls[0][0].where.AND;
      expect(filtroDatos[0]).toEqual(propias);
    });

    it('no cuenta las archivadas en las pestañas, pero las cuenta aparte', async () => {
      await service.resumen();

      expect(prisma.partner.groupBy.mock.calls[0][0].where).toEqual({ AND: [{}, { archivadoEn: null }] });
      const dondeArchivadas = prisma.partner.count.mock.calls[1][0].where;
      expect(dondeArchivadas).toEqual({ AND: [{}, { archivadoEn: { not: null } }] });
    });
  });

  describe('listar', () => {
    it('combina alcance, estado, búsqueda y "datos por completar" con AND (sin pisarse los OR)', async () => {
      await service.listar({ estado: 'ACTIVO', busqueda: 'vbh', datosPorCompletar: true, page: 1, limit: 20 }, 'comercial-1');

      const { where } = prisma.partner.findMany.mock.calls[0][0];
      expect(where.AND).toHaveLength(5);
      expect(where.AND[0]).toEqual({ creadoPorUsuarioId: 'comercial-1' });
      expect(where.AND[1]).toEqual({ archivadoEn: null });
      expect(where.AND[2]).toEqual({ estado: 'ACTIVO' });
      // La búsqueda también encuentra por código de cliente.
      expect(JSON.stringify(where.AND[3])).toContain('codigoCliente');
      expect(JSON.stringify(where.AND[4])).toContain('PENDIENTE');
    });

    it('por defecto oculta las archivadas', async () => {
      await service.listar({ page: 1, limit: 20 });

      expect(prisma.partner.findMany.mock.calls[0][0].where).toEqual({ AND: [{ archivadoEn: null }] });
    });

    it('con archivadas=true lista solo las archivadas', async () => {
      await service.listar({ archivadas: true, page: 1, limit: 20 });

      expect(prisma.partner.findMany.mock.calls[0][0].where).toEqual({ AND: [{ archivadoEn: { not: null } }] });
    });

    it('trae los contadores de usuarios, catálogo y pedidos sin cargar las filas', async () => {
      await service.listar({ page: 1, limit: 20 });

      expect(prisma.partner.findMany.mock.calls[0][0].include).toEqual({
        _count: { select: { usuarios: true, representaciones: true, ordenes: true } },
      });
    });
  });
});

describe('PartnersService — archivar y eliminar empresas', () => {
  const ID = 'partner-1';
  let prisma: {
    partner: {
      findUnique: ReturnType<typeof vi.fn>;
      update: ReturnType<typeof vi.fn>;
      delete: ReturnType<typeof vi.fn>;
    };
    order: { count: ReturnType<typeof vi.fn> };
    auditLog: { create: ReturnType<typeof vi.fn> };
    $transaction: ReturnType<typeof vi.fn>;
  };
  let catalogoMarca: { sincronizarEmpresa: ReturnType<typeof vi.fn> };
  let service: PartnersService;

  function empresa(overrides: Record<string, unknown> = {}, pedidos = 0) {
    return {
      id: ID,
      razonSocial: 'Cliente de prueba S.L.',
      cif: 'B12345678',
      archivadoEn: null,
      creadoPorUsuarioId: 'admin-1',
      _count: { usuarios: 2, representaciones: 5, ordenes: pedidos },
      ...overrides,
    };
  }

  beforeEach(() => {
    prisma = {
      partner: {
        findUnique: vi.fn().mockResolvedValue(empresa()),
        update: vi.fn().mockResolvedValue({}),
        delete: vi.fn().mockResolvedValue({}),
      },
      order: { count: vi.fn().mockResolvedValue(0) },
      auditLog: { create: vi.fn().mockResolvedValue({}) },
      $transaction: vi.fn().mockResolvedValue([]),
    };
    catalogoMarca = { sincronizarEmpresa: vi.fn().mockResolvedValue({}) };
    service = new PartnersService(
      prisma as unknown as PrismaService,
      catalogoMarca as unknown as CatalogoMarcaService,
      {} as EmailService,
      {} as ConfigService,
    );
  });

  describe('archivar', () => {
    it('archiva una empresa sin pedidos pendientes y lo deja en la auditoría', async () => {
      await service.archivar(ID, 'admin-1');

      expect(prisma.partner.update.mock.calls[0][0].data.archivadoEn).toBeInstanceOf(Date);
      expect(prisma.auditLog.create.mock.calls[0][0].data.eventType).toBe('PARTNER_ARCHIVADO');
    });

    it('no archiva si tiene pedidos sin enviar', async () => {
      prisma.order.count.mockResolvedValue(2);

      await expect(service.archivar(ID, 'admin-1')).rejects.toThrow(/2 pedidos sin enviar/);
      expect(prisma.partner.update).not.toHaveBeenCalled();
    });

    it('rechaza archivar una empresa ya archivada', async () => {
      prisma.partner.findUnique.mockResolvedValue(empresa({ archivadoEn: new Date() }));

      await expect(service.archivar(ID, 'admin-1')).rejects.toThrow(/ya está archivada/);
    });

    it('un comercial no puede archivar la empresa de otro (404 opaco)', async () => {
      await expect(service.archivar(ID, 'comercial-2', 'comercial-2')).rejects.toThrow(/no encontrado/);
    });
  });

  describe('desarchivar', () => {
    it('la devuelve a las listas y resincroniza su catálogo', async () => {
      prisma.partner.findUnique.mockResolvedValue(empresa({ archivadoEn: new Date() }));

      await service.desarchivar(ID, 'admin-1');

      expect(prisma.partner.update).toHaveBeenCalledWith({ where: { id: ID }, data: { archivadoEn: null } });
      expect(catalogoMarca.sincronizarEmpresa).toHaveBeenCalledWith(ID);
    });

    it('rechaza desarchivar una empresa que no está archivada', async () => {
      await expect(service.desarchivar(ID, 'admin-1')).rejects.toThrow(/no está archivada/);
    });
  });

  describe('eliminar', () => {
    it('elimina una empresa sin pedidos si se escribe su razón social, y deja constancia', async () => {
      const resultado = await service.eliminar(ID, { confirmarRazonSocial: ' Cliente de prueba S.L. ' }, 'admin-1');

      expect(resultado).toEqual({ eliminada: true });
      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
      expect(prisma.partner.delete).toHaveBeenCalledWith({ where: { id: ID } });
      expect(prisma.auditLog.create.mock.calls[0][0].data.eventType).toBe('PARTNER_ELIMINADO');
    });

    it('no elimina si la razón social escrita no coincide', async () => {
      await expect(service.eliminar(ID, { confirmarRazonSocial: 'otra' }, 'admin-1')).rejects.toThrow(/no coincide/);
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it('no elimina una empresa con pedidos y sugiere archivarla', async () => {
      prisma.partner.findUnique.mockResolvedValue(empresa({}, 3));

      await expect(
        service.eliminar(ID, { confirmarRazonSocial: 'Cliente de prueba S.L.' }, 'admin-1'),
      ).rejects.toThrow(/3 pedidos.*Archívala/);
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });
  });
});
