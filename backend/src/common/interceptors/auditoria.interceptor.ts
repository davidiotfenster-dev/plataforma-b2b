import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { Observable, catchError, tap, throwError } from 'rxjs';
import { PrismaService } from '../../prisma/prisma.service.js';
import type { UsuarioAutenticado } from '../decorators/current-user.decorator.js';

interface HttpErrorConSatus {
  status?: number;
  getStatus?: () => number;
}

/// Interceptor global: registra en `AuditLog` (JSON estructurado) todo
/// acceso HTTP autenticado — login, confirmación de pedido, actualización
/// de expediciones, accesos a recursos — sin bloquear ni poder romper la
/// respuesta si la escritura de auditoría falla (best-effort, ver CLAUDE.md
/// requisito 5).
@Injectable()
export class AuditoriaInterceptor implements NestInterceptor {
  private readonly logger = new Logger('Auditoria');

  constructor(private readonly prisma: PrismaService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<Request & { user?: UsuarioAutenticado }>();
    const response = context.switchToHttp().getResponse<Response>();
    const inicio = Date.now();

    return next.handle().pipe(
      tap(() => this.registrar(request, response.statusCode, inicio)),
      catchError((error: HttpErrorConSatus) => {
        const statusCode = error.getStatus?.() ?? error.status ?? 500;
        this.registrar(request, statusCode, inicio);
        return throwError(() => error);
      }),
    );
  }

  private registrar(request: Request & { user?: UsuarioAutenticado }, statusCode: number, inicio: number): void {
    const usuario = request.user;
    const eventType = `${request.method} ${request.route?.path ?? request.path}`;
    const duracionMs = Date.now() - inicio;

    const entrada = {
      level: statusCode >= 500 ? 'error' : statusCode >= 400 ? 'warn' : 'info',
      eventType,
      userId: usuario?.userId ?? null,
      partnerId: usuario?.partnerId ?? null,
      ipAddress: request.ip ?? null,
      userAgent: request.get('user-agent') ?? null,
      endpoint: request.originalUrl,
      method: request.method,
      statusCode,
      payload: { duracionMs },
    };

    this.logger.log(JSON.stringify(entrada));

    /// Fire-and-forget: un fallo al escribir auditoría nunca debe afectar
    /// la respuesta HTTP ya resuelta.
    this.prisma.auditLog.create({ data: entrada }).catch((error: Error) => {
      this.logger.error(`No se pudo persistir el registro de auditoría: ${error.message}`);
    });
  }
}
