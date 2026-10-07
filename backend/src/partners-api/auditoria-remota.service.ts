import { Injectable, Logger, type OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'node:crypto';
import { requestIdActual } from './contexto-peticion.js';
import { PartnersApiAuditoriaRepository } from './partners-api-auditoria.repository.js';
import type { EventoAuditoria } from './partners-api.tipos.js';

const TAMANO_LOTE = 25;
const MAX_EN_COLA = 1_000;

export interface EntradaAuditoria {
  level: string;
  eventType: string;
  userId: string | null;
  partnerId: string | null;
  endpoint: string;
  method: string;
  statusCode: number;
}

/// Copia los eventos de auditoría a la API de Partners (`POST /v1/audit/events`) en
/// lotes, además de guardarlos en `AuditLog` como siempre. Solo con
/// `PARTNERS_API_AUDITORIA=true`. Best-effort: si la API no responde, el lote se
/// reintenta en el siguiente envío y nunca afecta a la petición del usuario.
@Injectable()
export class AuditoriaRemotaService implements OnModuleDestroy {
  private readonly logger = new Logger('AuditoriaRemota');
  private readonly activa: boolean;
  private readonly intervaloMs: number;
  private cola: EventoAuditoria[] = [];
  private temporizador?: NodeJS.Timeout;
  private enviando = false;

  constructor(
    config: ConfigService,
    private readonly repositorio: PartnersApiAuditoriaRepository,
  ) {
    this.activa = config.get<boolean>('partnersApiAuditoria') === true && Boolean(config.get<string>('partnersApiUrl'));
    this.intervaloMs = config.get<number>('partnersApiAuditoriaIntervaloMs') ?? 5_000;
  }

  encolar(entrada: EntradaAuditoria): void {
    if (!this.activa) return;
    this.cola.push({
      eventId: randomUUID(),
      timestamp: new Date().toISOString(),
      eventType: entrada.eventType,
      level: entrada.level.toUpperCase() as EventoAuditoria['level'],
      userId: entrada.userId,
      partnerId: entrada.partnerId,
      requestId: requestIdActual() ?? null,
      endpoint: entrada.endpoint,
      method: entrada.method,
      statusCode: entrada.statusCode,
    });
    if (this.cola.length > MAX_EN_COLA) {
      // Con la API caída mucho rato no se acumula memoria sin límite: se pierden los más antiguos (siguen en AuditLog).
      this.cola.splice(0, this.cola.length - MAX_EN_COLA);
    }
    if (this.cola.length >= TAMANO_LOTE) void this.enviar();
    else this.programar();
  }

  async enviar(): Promise<void> {
    if (this.enviando || this.cola.length === 0) return;
    this.enviando = true;
    clearTimeout(this.temporizador);
    this.temporizador = undefined;
    const lote = this.cola.splice(0, TAMANO_LOTE);
    try {
      await this.repositorio.enviarEventos(lote);
    } catch (error) {
      this.logger.warn(`No se pudieron enviar ${lote.length} eventos de auditoría a la API de Partners: ${(error as Error).message}`);
      this.cola.unshift(...lote);
    } finally {
      this.enviando = false;
    }
    if (this.cola.length > 0) this.programar();
  }

  async onModuleDestroy(): Promise<void> {
    clearTimeout(this.temporizador);
    await this.enviar();
  }

  private programar(): void {
    if (this.temporizador) return;
    this.temporizador = setTimeout(() => {
      this.temporizador = undefined;
      void this.enviar();
    }, this.intervaloMs);
    this.temporizador.unref();
  }
}
