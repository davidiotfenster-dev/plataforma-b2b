import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { UsuariosService } from './usuarios.service.js';
import { CrearUsuarioDto } from './dto/crear-usuario.dto.js';
import type { PrismaService } from '../prisma/prisma.service.js';
import type { AuthService } from '../auth/auth.service.js';

describe('UsuariosService.crear — añadir un usuario a una empresa', () => {
  let prisma: {
    partner: { findUnique: ReturnType<typeof vi.fn> };
    user: { findFirst: ReturnType<typeof vi.fn>; create: ReturnType<typeof vi.fn> };
  };
  let auth: { invitarUsuario: ReturnType<typeof vi.fn> };
  let service: UsuariosService;
  const dto = { nombre: 'Ana', email: 'ana@hausen.es', rol: 'PARTNER_COMPRADOR' as const };

  beforeEach(() => {
    prisma = {
      partner: { findUnique: vi.fn().mockResolvedValue({ razonSocial: 'Hausen S.L.', estado: 'ACTIVO', archivadoEn: null }) },
      user: {
        findFirst: vi.fn().mockResolvedValue(null),
        create: vi.fn().mockImplementation(({ data }) => Promise.resolve({ id: 'u1', idioma: 'ES', activo: true, ...data })),
      },
    };
    auth = { invitarUsuario: vi.fn().mockResolvedValue(undefined) };
    service = new UsuariosService(prisma as unknown as PrismaService, auth as unknown as AuthService);
  });

  it('lo crea en esa empresa, ya verificado y sin una contraseña conocida, y le manda la invitación', async () => {
    await service.crear('p1', dto);

    const { data } = prisma.user.create.mock.calls[0][0];
    expect(data).toMatchObject({ email: 'ana@hausen.es', partnerId: 'p1', rol: 'PARTNER_COMPRADOR', activo: true });
    expect(data.emailVerificadoEn).toBeInstanceOf(Date);
    expect(data.passwordHash).toMatch(/^\$2[aby]\$/);
    expect(auth.invitarUsuario).toHaveBeenCalledWith(expect.objectContaining({ id: 'u1', email: 'ana@hausen.es' }), 'Hausen S.L.');
  });

  it('no repite un email ya usado, aunque cambien las mayúsculas', async () => {
    prisma.user.findFirst.mockResolvedValue({ id: 'otro' });

    await expect(service.crear('p1', { ...dto, email: 'Ana@Hausen.es' })).rejects.toBeInstanceOf(ConflictException);
    expect(prisma.user.findFirst.mock.calls[0][0].where.email).toEqual({ equals: 'Ana@Hausen.es', mode: 'insensitive' });
    expect(prisma.user.create).not.toHaveBeenCalled();
    expect(auth.invitarUsuario).not.toHaveBeenCalled();
  });

  it.each([
    ['suspendida', { estado: 'SUSPENDIDO', archivadoEn: null }],
    ['pendiente de aprobar', { estado: 'PENDIENTE_APROBACION', archivadoEn: null }],
    ['archivada', { estado: 'ACTIVO', archivadoEn: new Date() }],
  ])('no añade usuarios a una empresa %s (nunca podrían entrar)', async (_caso, partner) => {
    prisma.partner.findUnique.mockResolvedValue({ razonSocial: 'X', ...partner });

    await expect(service.crear('p1', dto)).rejects.toBeInstanceOf(ConflictException);
    expect(prisma.user.create).not.toHaveBeenCalled();
  });

  it('responde 404 si la empresa no existe', async () => {
    prisma.partner.findUnique.mockResolvedValue(null);

    await expect(service.crear('p1', dto)).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.user.create).not.toHaveBeenCalled();
  });
});

describe('CrearUsuarioDto', () => {
  it('quita espacios, pasa el email a minúsculas y no admite nombre en blanco, email inválido ni roles internos', async () => {
    const errores = await validate(
      plainToInstance(CrearUsuarioDto, { nombre: '   ', email: 'no-es-email', rol: 'ADMIN_FENSTER' }),
    );
    expect(errores.map((e) => e.property).sort()).toEqual(['email', 'nombre', 'rol']);

    const bueno = plainToInstance(CrearUsuarioDto, { nombre: ' Ana ', email: ' Ana@Hausen.ES ', rol: 'PARTNER_CONSULTA' });
    expect(await validate(bueno)).toEqual([]);
    expect([bueno.nombre, bueno.email]).toEqual(['Ana', 'ana@hausen.es']);
  });
});
