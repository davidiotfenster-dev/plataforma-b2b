import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, type StrategyOptions } from 'passport-jwt';
import type { Request } from 'express';
import { PrismaService } from '../../prisma/prisma.service.js';
import type { UsuarioAutenticado } from '../../common/decorators/current-user.decorator.js';
import { EstadoPartner } from '../../generated/prisma/enums.js';

export const JWT_COOKIE_NAME = 'fenster_session';

/// 'strict' en local/producción normales. Solo se pone a 'none' cuando front
/// y back se sirven en dominios distintos (p. ej. demo por túnel de Cloudflare),
/// caso en el que el navegador no envía cookies "strict" entre subdominios.
export const cookieSameSite = (): 'strict' | 'lax' | 'none' => {
  const valor = process.env.COOKIE_SAME_SITE;
  return valor === 'none' || valor === 'lax' ? valor : 'strict';
};

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
    /// que desactivar un usuario, forzar su cierre de sesión, cambiarle el rol
    /// o suspender a su partner desde el panel admin tenga efecto inmediato,
    /// sin esperar a que expire el JWT (hasta 8h por defecto). Por eso el rol
    /// y el partner se leen de la BD y NO de lo que diga el token.
    const usuario = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: {
        activo: true,
        sesionInvalidadaEn: true,
        rol: true,
        partnerId: true,
        partner: { select: { estado: true, archivadoEn: true } },
      },
    });

    if (!usuario || !usuario.activo) {
      throw new UnauthorizedException();
    }

    if (usuario.sesionInvalidadaEn && payload.iat * 1000 < usuario.sesionInvalidadaEn.getTime()) {
      throw new UnauthorizedException();
    }

    /// Un usuario de partner deja de poder operar en cuanto su partner deja de
    /// estar ACTIVO (suspendido, rechazado...), aunque su cookie siga viva.
    if (usuario.partnerId && (usuario.partner?.estado !== EstadoPartner.ACTIVO || usuario.partner.archivadoEn)) {
      throw new UnauthorizedException();
    }

    return {
      userId: payload.sub,
      partnerId: usuario.partnerId,
      rol: usuario.rol,
    };
  }
}
