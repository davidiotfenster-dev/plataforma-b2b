import { ForbiddenException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';
import { exigirPuedeComprar } from './permisos-partner.js';
import { RolUsuario } from '../generated/prisma/enums.js';

describe('exigirPuedeComprar', () => {
  const usuario = (rol: RolUsuario) => ({ userId: 'u', partnerId: 'p', rol });

  it('permite comprar a PARTNER_ADMIN y PARTNER_COMPRADOR', () => {
    expect(() => exigirPuedeComprar(usuario(RolUsuario.PARTNER_ADMIN))).not.toThrow();
    expect(() => exigirPuedeComprar(usuario(RolUsuario.PARTNER_COMPRADOR))).not.toThrow();
  });

  it('prohíbe a PARTNER_CONSULTA (solo lectura) modificar el carrito o confirmar pedidos', () => {
    expect(() => exigirPuedeComprar(usuario(RolUsuario.PARTNER_CONSULTA))).toThrow(ForbiddenException);
  });
});
