import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthService } from './auth.service.js';
import {
  asuntoCuentaAprobada,
  asuntoCuentaRechazada,
  asuntoNuevaSolicitud,
  asuntoVerificacionEmail,
  cuerpoCuentaAprobada,
  cuerpoCuentaRechazada,
  cuerpoNuevaSolicitud,
  cuerpoVerificacionEmail,
} from '../common/email/plantillas-email.js';
import { Idioma } from '../generated/prisma/enums.js';
import type { RegistroPartnerDto } from './dto/registro-partner.dto.js';
import type { PrismaService } from '../prisma/prisma.service.js';
import type { JwtService } from '@nestjs/jwt';
import type { ConfigService } from '@nestjs/config';
import type { EmailService } from '../common/email/email.service.js';
import type { CatalogoMarcaService } from '../catalogo-marca/catalogo-marca.service.js';

const FRONTEND = 'https://portal.test';

describe('AuthService — correos del alta de empresas', () => {
  let prisma: {
    user: {
      findUnique: ReturnType<typeof vi.fn>;
      findMany: ReturnType<typeof vi.fn>;
      create: ReturnType<typeof vi.fn>;
      update: ReturnType<typeof vi.fn>;
      updateMany: ReturnType<typeof vi.fn>;
    };
    partner: {
      findUnique: ReturnType<typeof vi.fn>;
      create: ReturnType<typeof vi.fn>;
      update: ReturnType<typeof vi.fn>;
    };
    $transaction: ReturnType<typeof vi.fn>;
  };
  let email: { enviar: ReturnType<typeof vi.fn> };
  let service: AuthService;

  const alta = (idioma?: Idioma) =>
    ({
      razonSocial: 'Nueva S.L.',
      cif: 'B1',
      direccionFiscal: 'Calle 1',
      pais: 'España',
      dominioWeb: 'nueva.com',
      nombreAdmin: 'Ana',
      emailAdmin: 'ana@nueva.com',
      passwordAdmin: 'clave-muy-larga-123',
      aceptaCondiciones: true,
      idioma,
    }) as RegistroPartnerDto;

  beforeEach(() => {
    prisma = {
      user: {
        findUnique: vi.fn(),
        findMany: vi.fn().mockResolvedValue([]),
        create: vi.fn().mockResolvedValue({ id: 'user-1' }),
        update: vi.fn().mockResolvedValue({}),
        updateMany: vi.fn().mockResolvedValue({}),
      },
      partner: {
        findUnique: vi.fn(),
        create: vi.fn().mockResolvedValue({ id: 'partner-1' }),
        update: vi.fn().mockResolvedValue({}),
      },
      $transaction: vi.fn(async (arg: unknown) =>
        typeof arg === 'function' ? arg(prisma) : Promise.all(arg as Promise<unknown>[]),
      ),
    };
    email = { enviar: vi.fn().mockResolvedValue(undefined) };
    const jwt = {
      signAsync: vi.fn().mockResolvedValue('tok-123'),
      decode: vi.fn().mockReturnValue({ exp: Math.floor(Date.now() / 1000) + 3600 }),
      verifyAsync: vi.fn().mockResolvedValue({ sub: 'user-1' }),
    };
    const config = {
      get: vi.fn((clave: string) =>
        ({ frontendUrl: FRONTEND, emailVerificationTokenExpiresIn: '24h', jwtSecret: 's' })[clave],
      ),
    };
    service = new AuthService(
      prisma as unknown as PrismaService,
      jwt as unknown as JwtService,
      config as unknown as ConfigService,
      email as unknown as EmailService,
      { sincronizarEmpresa: vi.fn().mockResolvedValue({}) } as unknown as CatalogoMarcaService,
    );
  });

  describe('registro', () => {
    it('envía el correo de verificación con el enlace al frontend, en el idioma elegido', async () => {
      const resultado = await service.registrarPartner(alta(Idioma.DE));

      expect(email.enviar).toHaveBeenCalledTimes(1);
      const [destino, asunto, cuerpo] = email.enviar.mock.calls[0];
      expect(destino).toBe('ana@nueva.com');
      expect(asunto).toBe(asuntoVerificacionEmail(Idioma.DE));
      expect(cuerpo).toContain(`${FRONTEND}/verificar-email?token=tok-123`);
      /// El token solo viaja por el correo, nunca en la respuesta.
      expect(JSON.stringify(resultado)).not.toContain('tok-123');
    });

    it('sin idioma usa español', async () => {
      await service.registrarPartner(alta());
      expect(email.enviar.mock.calls[0][1]).toBe(asuntoVerificacionEmail(Idioma.ES));
    });

    it('guarda cuándo se aceptaron las condiciones de uso y la privacidad', async () => {
      await service.registrarPartner(alta());
      expect(prisma.user.create.mock.calls[0][0].data.condicionesAceptadasEn).toBeInstanceOf(Date);
    });
  });

  describe('reenviar verificación', () => {
    const pendiente = (overrides: Record<string, unknown> = {}) => ({
      id: 'user-1',
      email: 'ana@nueva.com',
      idioma: Idioma.IT,
      emailVerificadoEn: null,
      partner: { estado: 'PENDIENTE_VERIFICACION_EMAIL' },
      ...overrides,
    });

    it('emite un token nuevo y lo reenvía', async () => {
      prisma.user.findUnique.mockResolvedValue(pendiente());

      await service.reenviarVerificacion('ana@nueva.com');

      expect(prisma.user.update.mock.calls[0][0].data.tokenVerificacion).toBe('tok-123');
      expect(email.enviar.mock.calls[0][1]).toBe(asuntoVerificacionEmail(Idioma.IT));
    });

    it.each([
      ['el email no existe', null],
      ['ya está verificado', pendiente({ emailVerificadoEn: new Date() })],
      ['la empresa ya está pendiente de aprobación', pendiente({ partner: { estado: 'PENDIENTE_APROBACION' } })],
      ['la empresa ya está activa', pendiente({ partner: { estado: 'ACTIVO' } })],
      ['no tiene empresa (personal interno)', pendiente({ partner: null })],
    ])('no hace nada ni lo dice si %s', async (_caso, usuario) => {
      prisma.user.findUnique.mockResolvedValue(usuario);

      await expect(service.reenviarVerificacion('x@y.com')).resolves.toBeUndefined();

      expect(prisma.user.update).not.toHaveBeenCalled();
      expect(email.enviar).not.toHaveBeenCalled();
    });
  });

  describe('verificar email', () => {
    function usuarioConToken() {
      return {
        id: 'user-1',
        tokenVerificacion: 'tok-123',
        tokenVerificacionExpira: new Date(Date.now() + 3600_000),
        partnerId: 'partner-1',
        partner: { id: 'partner-1', razonSocial: 'Nueva <b>S.L.</b>', pais: 'España' },
      };
    }

    it('avisa por correo a cada administrador activo, con el enlace a la solicitud', async () => {
      prisma.user.findUnique.mockResolvedValue(usuarioConToken());
      prisma.user.findMany.mockResolvedValue([{ email: 'admin1@fenster.test' }, { email: 'admin2@fenster.test' }]);

      const resultado = await service.verificarEmail('tok-123');

      expect(resultado).toEqual({ partnerId: 'partner-1' });
      expect(prisma.user.findMany.mock.calls[0][0].where).toEqual({ rol: 'ADMIN_FENSTER', activo: true });
      expect(email.enviar).toHaveBeenCalledTimes(2);
      const [destino, asunto, cuerpo] = email.enviar.mock.calls[0];
      expect(destino).toBe('admin1@fenster.test');
      expect(asunto).toContain('Nueva solicitud de alta');
      expect(cuerpo).toContain(`${FRONTEND}/admin/partners/partner-1`);
      /// Lo que escribe el usuario no puede meter etiquetas en el correo.
      expect(cuerpo).not.toContain('<b>');
    });

    it('si falla el aviso a los administradores, la verificación del usuario sigue siendo correcta', async () => {
      prisma.user.findUnique.mockResolvedValue(usuarioConToken());
      prisma.user.findMany.mockRejectedValue(new Error('BD caída'));

      await expect(service.verificarEmail('tok-123')).resolves.toEqual({ partnerId: 'partner-1' });
    });
  });

  describe('aprobar y rechazar', () => {
    beforeEach(() => {
      prisma.partner.findUnique.mockResolvedValue({ id: 'partner-1', estado: 'PENDIENTE_APROBACION' });
      prisma.user.findMany.mockResolvedValue([
        { email: 'ana@nueva.com', idioma: Idioma.ES },
        { email: 'hans@nueva.com', idioma: Idioma.DE },
      ]);
    });

    it('al aprobar avisa a los usuarios de la empresa, cada uno en su idioma', async () => {
      await service.aprobarPartner('partner-1', { marcaComercial: 'X', tarifa: 'T', descuentoPorcentaje: 5 });

      expect(prisma.user.findMany.mock.calls[0][0].where).toEqual({
        partnerId: 'partner-1',
        emailVerificadoEn: { not: null },
      });
      expect(email.enviar).toHaveBeenCalledTimes(2);
      expect(email.enviar.mock.calls[0][1]).toBe(asuntoCuentaAprobada(Idioma.ES));
      expect(email.enviar.mock.calls[1][1]).toBe(asuntoCuentaAprobada(Idioma.DE));
      expect(email.enviar.mock.calls[0][2]).toContain(`${FRONTEND}/login`);
    });

    it('al rechazar avisa a los usuarios', async () => {
      await service.rechazarPartner('partner-1');

      expect(email.enviar).toHaveBeenCalledTimes(2);
      expect(email.enviar.mock.calls[0][1]).toBe(asuntoCuentaRechazada(Idioma.ES));
    });

    it('si falla el aviso, aprobar sigue funcionando', async () => {
      prisma.user.findMany.mockRejectedValue(new Error('BD caída'));

      await expect(
        service.aprobarPartner('partner-1', { marcaComercial: 'X', tarifa: 'T', descuentoPorcentaje: 5 }),
      ).resolves.toBeUndefined();
      expect(prisma.partner.update).toHaveBeenCalled();
    });
  });
});

describe('plantillas del alta de empresas', () => {
  const idiomas = Object.values(Idioma);

  it.each(idiomas)('todas existen y llevan el enlace en %s', (idioma) => {
    const enlace = 'https://portal.test/x?token=abc';
    for (const texto of [
      asuntoVerificacionEmail(idioma),
      cuerpoVerificacionEmail(idioma, enlace),
      asuntoCuentaAprobada(idioma),
      cuerpoCuentaAprobada(idioma, enlace),
      asuntoCuentaRechazada(idioma),
      cuerpoCuentaRechazada(idioma),
    ]) {
      expect(texto.trim().length).toBeGreaterThan(10);
    }
    expect(cuerpoVerificacionEmail(idioma, enlace)).toContain(enlace);
    expect(cuerpoCuentaAprobada(idioma, enlace)).toContain(enlace);
  });

  it('el aviso interno escapa el HTML y no deja saltos de línea en el asunto', () => {
    const cuerpo = cuerpoNuevaSolicitud('<script>alert(1)</script> S.L.', 'ES"', 'https://portal.test/a');
    expect(cuerpo).not.toContain('<script>');
    expect(cuerpo).toContain('&lt;script&gt;');
    expect(asuntoNuevaSolicitud('Mala\r\nBcc: x@y.com')).not.toMatch(/[\r\n]/);
  });
});
