import { ForbiddenException } from '@nestjs/common';
import { RolUsuario } from '../generated/prisma/enums.js';
import type { UsuarioAutenticado } from './decorators/current-user.decorator.js';

/// Roles de partner que pueden modificar el carrito y confirmar pedidos.
/// `PARTNER_CONSULTA` es de solo lectura.
const ROLES_QUE_PUEDEN_COMPRAR = new Set<RolUsuario>([RolUsuario.PARTNER_ADMIN, RolUsuario.PARTNER_COMPRADOR]);

/// Se llama DESPUÉS de comprobar que el usuario tiene partner (quien no lo
/// tiene recibe el 404 opaco de siempre). Aquí ya está dentro de su propio
/// tenant, así que un 403 claro no filtra nada.
export function exigirPuedeComprar(usuario: UsuarioAutenticado): void {
  if (!ROLES_QUE_PUEDEN_COMPRAR.has(usuario.rol)) {
    throw new ForbiddenException('Tu usuario es de solo consulta: no puede modificar el carrito ni confirmar pedidos.');
  }
}
