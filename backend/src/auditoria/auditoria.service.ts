import { Injectable, Logger } from '@nestjs/common';
import type { Request } from 'express';
import { PrismaService } from '../prisma/prisma.service.js';
import type { UsuarioAutenticado } from '../common/decorators/current-user.decorator.js';

type PeticionAuditable = Omit<Request, 'user'> & { user?: UsuarioAutenticado; auditada?: boolean };

/// Escribe en `AuditLog` (JSON estructurado, también al log del servidor) un
/// acceso HTTP. Lo usan el interceptor (peticiones que llegan al controlador) y
/// el filtro de excepciones (las que un guard rechaza antes: login fallido,
/// 401/403/429). Es best-effort: un fallo al escribir nunca afecta la respuesta.
@Injectable()
export class AuditoriaService {
  private readonly logger = new Logger('Auditoria');

  constructor(private readonly prisma: PrismaService) {}

  registrar(peticion: Request, statusCode: number, extra: Record<string, unknown> = {}, persistir = true): void {
    const request = peticion as unknown as PeticionAuditable;
    /// Una petición se registra una sola vez aunque pase por interceptor y filtro.
    if (request.auditada) return;
    request.auditada = true;

    const usuario = request.user;
    const entrada = {
      level: statusCode >= 500 ? 'error' : statusCode >= 400 ? 'warn' : 'info',
      eventType: `${request.method} ${request.route?.path ?? request.path}`,
      /// En el login `request.user` viene de LocalStrategy (`id`), no del JWT (`userId`).
      userId: usuario?.userId ?? (usuario as { id?: string } | undefined)?.id ?? null,
      partnerId: usuario?.partnerId ?? null,
      ipAddress: request.ip ?? null,
      userAgent: request.get('user-agent')?.slice(0, 300) ?? null,
      /// Sin la query string: ahí viajan tokens de un solo uso (`?token=`) que no deben quedar guardados.
      endpoint: request.originalUrl.split('?')[0].slice(0, 300),
      method: request.method,
      statusCode,
      payload: extra,
    };

    this.logger.log(JSON.stringify(entrada));
    if (!persistir) return;

    /// Fire-and-forget: un fallo al escribir auditoría nunca debe afectar
    /// la respuesta HTTP ya resuelta.
    this.prisma.auditLog.create({ data: entrada as never }).catch((error: Error) => {
      this.logger.error(`No se pudo persistir el registro de auditoría: ${error.message}`);
    });
  }
}
