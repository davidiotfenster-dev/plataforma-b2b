import { beforeEach, describe, expect, it, vi } from 'vitest';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { AjustesLegalesService } from './ajustes-legales.service.js';
import { ActualizarAjustesLegalesDto } from './dto/actualizar-ajustes-legales.dto.js';
import type { PrismaService } from '../prisma/prisma.service.js';

describe('AjustesLegalesService', () => {
  let prisma: {
    ajustesLegales: {
      findUnique: ReturnType<typeof vi.fn>;
      upsert: ReturnType<typeof vi.fn>;
    };
  };
  let service: AjustesLegalesService;

  beforeEach(() => {
    prisma = {
      ajustesLegales: {
        findUnique: vi.fn(),
        upsert: vi.fn().mockResolvedValue({}),
      },
    };
    service = new AjustesLegalesService(prisma as unknown as PrismaService);
  });

  it('sin fila guardada devuelve todos los campos como pendientes', async () => {
    prisma.ajustesLegales.findUnique.mockResolvedValue(null);
    const ajustes = await service.obtener();
    expect(ajustes.razonSocial).toBeNull();
    expect(ajustes.portes).toBeNull();
    expect(ajustes.updatedAt).toBeNull();
  });

  it('solo toca los campos enviados y guarda el vacío como nulo', async () => {
    await service.actualizar({
      portes: 'Portes pagados desde 300 €',
      registroMercantil: '',
    });
    const { update, create } = prisma.ajustesLegales.upsert.mock.calls[0][0];
    expect(update).toEqual({
      portes: 'Portes pagados desde 300 €',
      registroMercantil: null,
    });
    expect(create).toMatchObject({
      unica: true,
      portes: 'Portes pagados desde 300 €',
    });
  });
});

describe('ActualizarAjustesLegalesDto', () => {
  const errores = async (body: Record<string, unknown>) =>
    (await validate(plainToInstance(ActualizarAjustesLegalesDto, body))).map(
      (e) => e.property,
    );

  it('acepta un email vacío (vuelve a pendiente) pero no uno mal escrito', async () => {
    expect(await errores({ emailContacto: '' })).toEqual([]);
    expect(await errores({ emailContacto: 'no-es-un-email' })).toContain(
      'emailContacto',
    );
    expect(await errores({ emailPrivacidad: ' info@iotfenster.com ' })).toEqual(
      [],
    );
  });
});
