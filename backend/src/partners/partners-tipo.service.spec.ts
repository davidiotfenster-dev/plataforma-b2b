import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ValidationPipe } from '@nestjs/common';
import { PartnersService } from './partners.service.js';
import { ActualizarPartnerDto } from './dto/actualizar-partner.dto.js';
import type { CrearPartnerDto } from './dto/crear-partner.dto.js';
import { RolUsuario } from '../generated/prisma/enums.js';
import type { PrismaService } from '../prisma/prisma.service.js';
import type { CatalogoMarcaService } from '../catalogo-marca/catalogo-marca.service.js';

describe('PartnersService — distribuidor y partner (solo el admin promociona)', () => {
  const ID = 'partner-1';
  let prisma: {
    partner: {
      findUnique: ReturnType<typeof vi.fn>;
      update: ReturnType<typeof vi.fn>;
      create: ReturnType<typeof vi.fn>;
    };
    user: { create: ReturnType<typeof vi.fn> };
    order: { count: ReturnType<typeof vi.fn> };
    orderItem: { aggregate: ReturnType<typeof vi.fn> };
    auditLog: { create: ReturnType<typeof vi.fn> };
    $transaction: ReturnType<typeof vi.fn>;
  };
  let service: PartnersService;

  function empresa(overrides: Record<string, unknown> = {}) {
    return {
      id: ID,
      razonSocial: 'Distribuidor de prueba S.L.',
      tipo: 'DISTRIBUIDOR',
      estado: 'ACTIVO',
      archivadoEn: null,
      creadoPorUsuarioId: 'comercial-1',
      _count: { usuarios: 1, representaciones: 3, ordenes: 4 },
      ...overrides,
    };
  }

  const alta = (tipo?: 'PARTNER' | 'DISTRIBUIDOR') =>
    ({
      razonSocial: 'Nueva S.L.',
      cif: 'B1',
      tipo,
      passwordUsuario: 'secreto-123',
      emailUsuario: 'a@b.es',
      nombreUsuario: 'A',
    }) as CrearPartnerDto;

  beforeEach(() => {
    prisma = {
      partner: {
        findUnique: vi.fn().mockResolvedValue(empresa()),
        update: vi.fn().mockResolvedValue({ id: ID }),
        create: vi.fn().mockResolvedValue({ id: ID }),
      },
      user: { create: vi.fn().mockResolvedValue({}) },
      order: { count: vi.fn().mockResolvedValue(4) },
      orderItem: { aggregate: vi.fn().mockResolvedValue({ _sum: { cantidad: 120 } }) },
      auditLog: { create: vi.fn().mockResolvedValue({}) },
      // Con callback (alta) lo ejecuta contra este mismo mock; con array (cambio de tipo) devuelve sus resultados.
      $transaction: vi.fn(async (arg: unknown) =>
        typeof arg === 'function' ? arg(prisma) : Promise.all(arg as Promise<unknown>[]),
      ),
    };
    service = new PartnersService(prisma as unknown as PrismaService, {
      sincronizarEmpresa: vi.fn().mockResolvedValue({}),
    } as unknown as CatalogoMarcaService);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  describe('crear', () => {
    it('un comercial no puede dar de alta un PARTNER: 403 explícito y no se crea nada', async () => {
      await expect(service.crear(alta('PARTNER'), 'comercial-1', RolUsuario.COMERCIAL)).rejects.toThrow(/Solo un administrador/);
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it('un comercial da de alta distribuidores (sin tipo la empresa nace DISTRIBUIDOR por defecto)', async () => {
      await service.crear(alta(), 'comercial-1', RolUsuario.COMERCIAL);
      expect(prisma.partner.create.mock.calls[0][0].data.tipo).toBeUndefined();

      await service.crear(alta('DISTRIBUIDOR'), 'comercial-1', RolUsuario.COMERCIAL);
      expect(prisma.partner.create.mock.calls[1][0].data.tipo).toBe('DISTRIBUIDOR');
    });

    it('un admin sí puede dar de alta un PARTNER directamente', async () => {
      await service.crear(alta('PARTNER'), 'admin-1', RolUsuario.ADMIN_FENSTER);
      expect(prisma.partner.create.mock.calls[0][0].data.tipo).toBe('PARTNER');
    });
  });

  describe('editar (PATCH)', () => {
    const pipe = new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true });
    const validar = (cuerpo: object) => pipe.transform(cuerpo, { type: 'body', metatype: ActualizarPartnerDto });

    it('rechaza `tipo` con un 400 (también al admin): el tipo solo cambia con promocionar/degradar', async () => {
      await expect(validar({ tipo: 'PARTNER' })).rejects.toMatchObject({
        status: 400,
        response: { message: ['property tipo should not exist'] },
      });
    });

    it('sigue aceptando el resto de campos', async () => {
      await expect(validar({ razonSocial: 'Otra S.L.' })).resolves.toMatchObject({ razonSocial: 'Otra S.L.' });
    });
  });

  describe('promocionar y degradar', () => {
    it('promociona a Partner y deja en la auditoría quién, qué y el volumen que lo justificó', async () => {
      await service.promocionar(ID, 'admin-1');

      expect(prisma.partner.update).toHaveBeenCalledWith({ where: { id: ID }, data: { tipo: 'PARTNER' } });
      expect(prisma.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          eventType: 'PARTNER_PROMOCIONADO',
          userId: 'admin-1',
          partnerId: ID,
          payload: expect.objectContaining({ tipoAnterior: 'DISTRIBUIDOR', tipoNuevo: 'PARTNER', unidadesCompradas: 120, pedidos: 4 }),
        }),
      });
    });

    it('no promociona una empresa que ya es Partner', async () => {
      prisma.partner.findUnique.mockResolvedValue(empresa({ tipo: 'PARTNER' }));
      await expect(service.promocionar(ID, 'admin-1')).rejects.toThrow(/ya es Partner/);
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it('no promociona una empresa suspendida, pendiente o archivada', async () => {
      prisma.partner.findUnique.mockResolvedValue(empresa({ estado: 'SUSPENDIDO' }));
      await expect(service.promocionar(ID, 'admin-1')).rejects.toThrow(/activa y no archivada/);

      prisma.partner.findUnique.mockResolvedValue(empresa({ archivadoEn: new Date() }));
      await expect(service.promocionar(ID, 'admin-1')).rejects.toThrow(/activa y no archivada/);
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it('degrada un Partner a Distribuidor y también lo audita', async () => {
      prisma.partner.findUnique.mockResolvedValue(empresa({ tipo: 'PARTNER' }));
      await service.degradar(ID, 'admin-1');

      expect(prisma.partner.update).toHaveBeenCalledWith({ where: { id: ID }, data: { tipo: 'DISTRIBUIDOR' } });
      expect(prisma.auditLog.create.mock.calls[0][0].data.eventType).toBe('PARTNER_DEGRADADO');
    });

    it('no degrada a quien ya es Distribuidor', async () => {
      await expect(service.degradar(ID, 'admin-1')).rejects.toThrow(/ya es Distribuidor/);
    });

    it('una empresa que no existe da 404', async () => {
      prisma.partner.findUnique.mockResolvedValue(null);
      await expect(service.promocionar(ID, 'admin-1')).rejects.toThrow(/no encontrado/);
    });
  });

  describe('volumen de compra en la ficha', () => {
    it('suma las unidades y pedidos sin contar los cancelados', async () => {
      const ficha = await service.obtener(ID);

      expect(ficha.volumen).toMatchObject({ unidades: 120, pedidos: 4 });
      expect(prisma.order.count.mock.calls[0][0].where).toEqual({ partnerId: ID, estado: { not: 'CANCELADO' } });
    });

    it('sin pedidos devuelve 0 unidades', async () => {
      prisma.orderItem.aggregate.mockResolvedValue({ _sum: { cantidad: null } });
      expect((await service.obtener(ID)).volumen.unidades).toBe(0);
    });

    it('el umbral de aviso sale de PARTNER_UMBRAL_UNIDADES y es nulo si no está puesto o no es válido', async () => {
      expect((await service.obtener(ID)).volumen.umbralPromocion).toBeNull();

      vi.stubEnv('PARTNER_UMBRAL_UNIDADES', '100');
      expect((await service.obtener(ID)).volumen.umbralPromocion).toBe(100);

      vi.stubEnv('PARTNER_UMBRAL_UNIDADES', 'mucho');
      expect((await service.obtener(ID)).volumen.umbralPromocion).toBeNull();
    });
  });
});
