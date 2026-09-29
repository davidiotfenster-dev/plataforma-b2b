import { IsIn } from 'class-validator';
import { RolUsuario } from '../../generated/prisma/enums.js';

/// Este endpoint solo gestiona usuarios de un partner: ADMIN_FENSTER no es un
/// rol asignable aquí (no está atado a ningún partnerId).
export const ROLES_ASIGNABLES_PARTNER = [
  RolUsuario.PARTNER_ADMIN,
  RolUsuario.PARTNER_COMPRADOR,
  RolUsuario.PARTNER_CONSULTA,
] as const;

export class ActualizarRolUsuarioDto {
  @IsIn(ROLES_ASIGNABLES_PARTNER)
  rol!: (typeof ROLES_ASIGNABLES_PARTNER)[number];
}
