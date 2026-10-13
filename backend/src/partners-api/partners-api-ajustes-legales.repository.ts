import { Injectable } from '@nestjs/common';
import { PartnersApiClient, type Actor } from './partners-api.client.js';
import type { ActualizarAjustesLegalesApi, AjustesLegalesApi } from './partners-api.tipos.js';

/// Rutas `/legal-settings` y `PUT /admin/legal-settings` del contrato v1 (MOCK v1.5,
/// especificadas en AJUSTES_LEGALES_API.md). Son las únicas que no están en la lista de
/// 38: el GET es público y el PUT no lleva `Idempotency-Key`.
@Injectable()
export class PartnersApiAjustesLegalesRepository {
  constructor(private readonly api: PartnersApiClient) {}

  /// Pública: sin cabeceras de actor.
  obtener(): Promise<AjustesLegalesApi> {
    return this.api.get('/legal-settings');
  }

  /// Bloqueo optimista: si `expectedUpdatedAt` no coincide, la API responde 409
  /// `CONFLICTO_VERSION` y no cambia nada; quien llama debe releer y pedir reintentar.
  /// Sin `idempotente`, el cliente no reintenta una escritura que no lleva clave.
  guardar(cambios: ActualizarAjustesLegalesApi, actor: Actor): Promise<AjustesLegalesApi> {
    return this.api.peticion('PUT', '/admin/legal-settings', { body: cambios, actor });
  }
}
