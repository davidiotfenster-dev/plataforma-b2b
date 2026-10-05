import { UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthService } from './auth.service.js';
import { RolUsuario } from '../generated/prisma/enums.js';
import type { PrismaService } from '../prisma/prisma.service.js';
import type { JwtService } from '@nestjs/jwt';
import type { ConfigService } from '@nestjs/config';
import type { EmailService } from '../common/email/email.service.js';
import type { CatalogoMarcaService } from '../catalogo-marca/catalogo-marca.service.js';

/// El rol COMERCIAL está apagado por ahora (COMERCIAL_ACTIVO): el login lo dice con un
/// mensaje claro, y solo después de acertar la contraseña.
describe('AuthService.validarCredenciales — rol COMERCIAL', () => {
  const PASSWORD = 'clave-muy-larga-123';
  let findUnique: ReturnType<typeof vi.fn>;
  let comercialActivo: boolean;
  let service: AuthService;
  let passwordHash: string;

  const usuario = (rol: RolUsuario) => ({
    id: 'user-1',
    rol,
    partnerId: null,
    partner: null,
    activo: true,
    passwordHash,
    emailVerificadoEn: new Date(),
  });

  beforeEach(async () => {
    passwordHash = await bcrypt.hash(PASSWORD, 4);
    findUnique = vi.fn();
    comercialActivo = false;
    const config = { get: (clave: string) => (clave === 'comercialActivo' ? comercialActivo : undefined) };
    service = new AuthService(
      { user: { findUnique } } as unknown as PrismaService,
      {} as unknown as JwtService,
      config as unknown as ConfigService,
      {} as unknown as EmailService,
      {} as unknown as CatalogoMarcaService,
    );
  });

  describe('cuenta de empresa que aún no puede entrar', () => {
    const partnerUser = (estado: string, extra: Record<string, unknown> = {}) => ({
      ...usuario(RolUsuario.PARTNER_COMPRADOR),
      partnerId: 'p1',
      partner: { estado, archivadoEn: null },
      ...extra,
    });
    const codigoDe = async (usuarioEncontrado: unknown, password = PASSWORD) => {
      findUnique.mockResolvedValue(usuarioEncontrado);
      const error = (await service.validarCredenciales('x@y.com', password).catch((e: unknown) => e)) as {
        getResponse?: () => { codigo?: string; message?: string };
      };
      return error.getResponse?.();
    };

    it.each([
      ['correo sin verificar', () => partnerUser('PENDIENTE_VERIFICACION_EMAIL', { emailVerificadoEn: null }), 'CUENTA_EMAIL_SIN_VERIFICAR'],
      ['pendiente de aprobación', () => partnerUser('PENDIENTE_APROBACION'), 'CUENTA_PENDIENTE_APROBACION'],
      ['rechazada', () => partnerUser('RECHAZADO'), 'CUENTA_RECHAZADA'],
      ['suspendida', () => partnerUser('SUSPENDIDO'), 'CUENTA_EMPRESA_SUSPENDIDA'],
      ['archivada', () => partnerUser('ACTIVO', { partner: { estado: 'ACTIVO', archivadoEn: new Date() } }), 'CUENTA_EMPRESA_SUSPENDIDA'],
      ['usuario desactivado', () => partnerUser('ACTIVO', { activo: false }), 'CUENTA_DESACTIVADA'],
    ])('con la contraseña correcta explica el motivo: %s', async (_caso, encontrado, codigo) => {
      expect((await codigoDe(encontrado()))?.codigo).toBe(codigo);
    });

    it('con la contraseña equivocada no revela nada de la cuenta', async () => {
      const respuesta = await codigoDe(partnerUser('PENDIENTE_APROBACION'), 'otra-clave');
      // Solo el código genérico: no distingue una cuenta pendiente de una que no existe.
      expect(respuesta?.codigo).toBe('CREDENCIALES_INVALIDAS');
      expect(respuesta?.message).toBe('Credenciales inválidas');
    });

    it('una empresa activa y verificada entra', async () => {
      findUnique.mockResolvedValue(partnerUser('ACTIVO'));
      await expect(service.validarCredenciales('x@y.com', PASSWORD)).resolves.toMatchObject({ partnerId: 'p1' });
    });
  });

  it('con el rol apagado el comercial no entra, y el mensaje lo explica', async () => {
    findUnique.mockResolvedValue(usuario(RolUsuario.COMERCIAL));
    await expect(service.validarCredenciales('c@fenster.test', PASSWORD)).rejects.toThrow(/desactivado por ahora/);
  });

  it('con una contraseña equivocada no revela que es un comercial', async () => {
    findUnique.mockResolvedValue(usuario(RolUsuario.COMERCIAL));
    const error = await service.validarCredenciales('c@fenster.test', 'otra-clave').catch((e: unknown) => e);
    expect(error).toBeInstanceOf(UnauthorizedException);
    expect((error as Error).message).toBe('Credenciales inválidas');
  });

  it('con el rol encendido el comercial entra como antes', async () => {
    comercialActivo = true;
    findUnique.mockResolvedValue(usuario(RolUsuario.COMERCIAL));
    await expect(service.validarCredenciales('c@fenster.test', PASSWORD)).resolves.toEqual({
      id: 'user-1',
      partnerId: null,
      rol: RolUsuario.COMERCIAL,
    });
  });

  it('el administrador entra con el rol de comercial apagado', async () => {
    findUnique.mockResolvedValue(usuario(RolUsuario.ADMIN_FENSTER));
    await expect(service.validarCredenciales('a@fenster.test', PASSWORD)).resolves.toMatchObject({ rol: RolUsuario.ADMIN_FENSTER });
  });
});
