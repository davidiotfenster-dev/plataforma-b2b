import { ArgumentsHost, Catch, HttpException } from '@nestjs/common';
import { BaseExceptionFilter, HttpAdapterHost } from '@nestjs/core';
import type { Request } from 'express';
import { AuditoriaService } from '../../auditoria/auditoria.service.js';

/// Estados de rechazo que se auditan aunque el guard corte la petición antes de
/// llegar al interceptor: sin sesión (401), sin permiso (403) y demasiadas
/// peticiones (429). Un 404 no, para que quien rastrea rutas inexistentes no
/// llene la tabla.
const RECHAZOS_AUDITABLES = new Set([401, 403, 429]);

/// Registra los accesos rechazados (logins fallidos, rutas de admin pedidas por un
/// comprador…) y deja que Nest responda como siempre.
@Catch(HttpException)
export class AuditoriaFilter extends BaseExceptionFilter {
  constructor(
    adapterHost: HttpAdapterHost,
    private readonly auditoria: AuditoriaService,
  ) {
    super(adapterHost.httpAdapter);
  }

  catch(exception: HttpException, host: ArgumentsHost): void {
    const status = exception.getStatus();
    if (host.getType() === 'http' && RECHAZOS_AUDITABLES.has(status)) {
      const request = host.switchToHttp().getRequest<Request>();
      this.auditoria.registrar(request, status, this.datosDelIntento(request));
    }
    super.catch(exception, host);
  }

  /// En un login fallido interesa saber a qué cuenta se intentó entrar (nunca la contraseña).
  private datosDelIntento(request: Request): Record<string, unknown> {
    const email = (request.body as { email?: unknown } | undefined)?.email;
    if (request.path === '/auth/login' && typeof email === 'string') {
      return { emailIntentado: email.trim().toLowerCase().slice(0, 254) };
    }
    return {};
  }
}
