import { UnauthorizedException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { JwtStrategy } from './jwt.strategy.js';
import { EstadoPartner, RolUsuario } from '../../generated/prisma/enums.js';

/// La sesión no se fía de lo que diga el token sobre el rol o el partner: los
/// lee de la BD en cada petición, así que suspender a un partner o cambiar el
/// rol de un usuario surte efecto al instante y un token manipulado no escala
/// privilegios.
describe('JwtStrategy.validate', () => {
  let findUnique: ReturnType<typeof vi.fn>;
  let strategy: JwtStrategy;

  const ahora = Math.floor(Date.now() / 1000);
  const payload = (extra: Record<string, unknown> = {}) =>
    ({ sub: 'user-1', partnerId: 'partner-1', rol: RolUsuario.ADMIN_FENSTER, iat: ahora, ...extra }) as never;

  beforeEach(() => {
    findUnique = vi.fn();
    strategy = new JwtStrategy({ get: () => 'secreto-de-prueba' } as never, { user: { findUnique } } as never);
  });

  it('usa el rol y el partner de la BD, no los del token', async () => {
    findUnique.mockResolvedValue({
      activo: true,
      sesionInvalidadaEn: null,
      rol: RolUsuario.PARTNER_CONSULTA,
      partnerId: 'partner-real',
      partner: { estado: EstadoPartner.ACTIVO },
    });

    // El token afirma ser ADMIN_FENSTER de otro partner: se ignora.
    const usuario = await strategy.validate(payload());

    expect(usuario).toEqual({ userId: 'user-1', partnerId: 'partner-real', rol: RolUsuario.PARTNER_CONSULTA });
  });

  it('rechaza a un usuario cuyo partner está suspendido, aunque su cookie siga viva', async () => {
    findUnique.mockResolvedValue({
      activo: true,
      sesionInvalidadaEn: null,
      rol: RolUsuario.PARTNER_ADMIN,
      partnerId: 'partner-1',
      partner: { estado: EstadoPartner.SUSPENDIDO },
    });

    await expect(strategy.validate(payload())).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('deja pasar al personal interno, que no tiene partner', async () => {
    findUnique.mockResolvedValue({
      activo: true,
      sesionInvalidadaEn: null,
      rol: RolUsuario.ADMIN_FENSTER,
      partnerId: null,
      partner: null,
    });

    const usuario = await strategy.validate(payload({ partnerId: null }));

    expect(usuario).toEqual({ userId: 'user-1', partnerId: null, rol: RolUsuario.ADMIN_FENSTER });
  });

  it('rechaza usuarios desactivados y sesiones anteriores a un cierre forzado', async () => {
    findUnique.mockResolvedValueOnce({ activo: false, sesionInvalidadaEn: null, rol: RolUsuario.PARTNER_ADMIN, partnerId: 'p', partner: { estado: EstadoPartner.ACTIVO } });
    await expect(strategy.validate(payload())).rejects.toBeInstanceOf(UnauthorizedException);

    findUnique.mockResolvedValueOnce({
      activo: true,
      sesionInvalidadaEn: new Date((ahora + 60) * 1000),
      rol: RolUsuario.PARTNER_ADMIN,
      partnerId: 'p',
      partner: { estado: EstadoPartner.ACTIVO },
    });
    await expect(strategy.validate(payload())).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
