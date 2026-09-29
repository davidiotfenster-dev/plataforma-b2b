import { createParamDecorator, type ExecutionContext } from '@nestjs/common';
import type { RolUsuario } from '../../generated/prisma/enums.js';

/// Forma del usuario autenticado, extraída y validada en servidor a partir
/// del JWT (nunca de un partnerId enviado por el cliente).
export interface UsuarioAutenticado {
  userId: string;
  partnerId: string | null;
  rol: RolUsuario;
}

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): UsuarioAutenticado => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;
  },
);
