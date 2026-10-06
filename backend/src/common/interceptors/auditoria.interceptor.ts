import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import type { Request, Response } from 'express';
import { Observable, catchError, tap, throwError } from 'rxjs';
import { AuditoriaService } from '../../auditoria/auditoria.service.js';

interface HttpErrorConSatus {
  status?: number;
  getStatus?: () => number;
}

/// Interceptor global: registra en `AuditLog` todo acceso HTTP que llega a un
/// controlador — login correcto, confirmación de pedido, actualización de
/// expediciones, accesos a recursos — sin bloquear ni poder romper la respuesta
/// si la escritura de auditoría falla (best-effort, ver CLAUDE.md requisito 5).
/// Lo que un guard rechaza antes de llegar aquí lo registra `AuditoriaFilter`.
@Injectable()
export class AuditoriaInterceptor implements NestInterceptor {
  constructor(private readonly auditoria: AuditoriaService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<Request>();
    const response = context.switchToHttp().getResponse<Response>();
    const inicio = Date.now();

    return next.handle().pipe(
      tap(() => this.auditoria.registrar(request, response.statusCode, { duracionMs: Date.now() - inicio })),
      catchError((error: HttpErrorConSatus) => {
        const statusCode = error.getStatus?.() ?? error.status ?? 500;
        this.auditoria.registrar(request, statusCode, { duracionMs: Date.now() - inicio });
        return throwError(() => error);
      }),
    );
  }
}
