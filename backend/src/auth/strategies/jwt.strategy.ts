import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, type StrategyOptions } from 'passport-jwt';
import type { Request } from 'express';
import { PrismaService } from '../../prisma/prisma.service.js';
import type { UsuarioAutenticado } from '../../common/decorators/current-user.decorator.js';

export const JWT_COOKIE_NAME = 'fenster_session';

export interface JwtPayload {
  sub: string;
  partnerId: string | null;
  rol: UsuarioAutenticado['rol'];
}

/// El payload que llega a `validate()` es el que se firmó más las claims
/// estándar que añade `jsonwebtoken` automáticamente. Se usa `iat` para
/// comparar contra `User.sesionInvalidadaEn` y rechazar tokens emitidos antes
/// de un cierre de sesión forzado o un reseteo de contraseña.
type JwtPayloadVerificado = JwtPayload & { iat: number };

function extraerJwtDeCookie(req: Request): string | null {
  return req?.cookies?.[JWT_COOKIE_NAME] ?? null;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    const secret = configService.get<string>('jwtSecret');
    if (!secret) {
      throw new Error('JWT_SECRET no configurado');
    }

    super({
      jwtFromRequest: extraerJwtDeCookie,
      ignoreExpiration: false,
      secretOrKey: secret,
    } satisfies StrategyOptions);
  }

  async validate(payload: JwtPayloadVerificado): Promise<UsuarioAutenticado> {
    if (!payload?.sub) {
      throw new UnauthorizedException();
    }

    /// Verificación en BD en cada request (no solo firma/expiración): permite
    /// que desactivar un usuario o forzar su cierre de sesión desde el panel
    /// admin tenga efecto inmediato, sin esperar a que expire el JWT (hasta
    /// 8h por defecto).
    const usuario = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: { activo: true, sesionInvalidadaEn: true },
    });

    if (!usuario || !usuario.activo) {
      throw new UnauthorizedException();
    }

    if (usuario.sesionInvalidadaEn && payload.iat * 1000 < usuario.sesionInvalidadaEn.getTime()) {
      throw new UnauthorizedException();
    }

    return {
      userId: payload.sub,
      partnerId: payload.partnerId,
      rol: payload.rol,
    };
  }
}
