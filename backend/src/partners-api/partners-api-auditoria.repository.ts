import { Injectable } from '@nestjs/common';
import { PartnersApiClient } from './partners-api.client.js';
import type { EventoAuditoria } from './partners-api.tipos.js';

/// Ruta 38 del contrato v1: envío de eventos de auditoría en lote. Cada evento lleva
/// su `eventId` (UUID v4), así que reenviar un lote es seguro: la API cuenta los
/// repetidos en `duplicates` en vez de duplicarlos.
@Injectable()
export class PartnersApiAuditoriaRepository {
  constructor(private readonly api: PartnersApiClient) {}

  enviarEventos(events: EventoAuditoria[]): Promise<{ accepted: number; duplicates: number }> {
    return this.api.peticion('POST', '/audit/events', { body: { events }, idempotente: true });
  }
}
