import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'node:crypto';
import { requestIdActual } from './contexto-peticion.js';
import { PartnersApiError, type CuerpoErrorPartnersApi } from './partners-api.error.js';

export type MetodoHttp = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export type ValorQuery = string | number | boolean | null | undefined;

/// Quién hace una escritura: va en `X-Actor-User-Id` / `X-Actor-Partner-Id`.
/// Un admin de IoT FENSTER no tiene empresa: `partnerId` null y la cabecera no se manda.
export interface Actor {
  userId: string;
  partnerId?: string | null;
}

export interface OpcionesPeticion {
  query?: Record<string, ValorQuery>;
  body?: unknown;
  /// Obligatorio en escrituras (sección 3 del contrato).
  actor?: Actor;
  /// Escrituras [Idem]: `true` genera una clave nueva para esta operación; un string
  /// reutiliza una clave ya generada (p. ej. el usuario reintenta confirmar el mismo pedido).
  idempotente?: boolean | string;
}

const ESTADOS_REINTENTABLES = new Set([429, 502, 503, 504]);

/// Cliente HTTP de la API de Partners de IoT FENSTER (AWS API Gateway → Lambda Partner
/// Manager). Pone las cabeceras comunes del contrato v1, corta por timeout y solo
/// reintenta lo que se puede repetir sin efectos dobles: GET y escrituras con
/// `Idempotency-Key` (la misma clave en todos los intentos).
@Injectable()
export class PartnersApiClient {
  private readonly logger = new Logger('PartnersApi');
  private readonly baseUrl: string;
  private readonly apiKey?: string;
  private readonly timeoutMs: number;
  private readonly reintentos: number;
  private readonly esperaBaseMs: number;

  constructor(config: ConfigService) {
    this.baseUrl = (config.get<string>('partnersApiUrl') ?? '').trim().replace(/\/+$/, '');
    this.apiKey = config.get<string>('partnersApiKey') || undefined;
    this.timeoutMs = config.get<number>('partnersApiTimeoutMs') ?? 10_000;
    this.reintentos = config.get<number>('partnersApiReintentos') ?? 2;
    this.esperaBaseMs = config.get<number>('partnersApiEsperaReintentoMs') ?? 300;
  }

  /// Sin `PARTNERS_API_URL` la plataforma sigue funcionando entera con su base de datos.
  get configurada(): boolean {
    return this.baseUrl.length > 0;
  }

  get<T>(ruta: string, query?: Record<string, ValorQuery>): Promise<T> {
    return this.peticion<T>('GET', ruta, { query });
  }

  async peticion<T>(metodo: MetodoHttp, ruta: string, opciones: OpcionesPeticion = {}): Promise<T> {
    if (!this.configurada) {
      this.logger.error(`PARTNERS_API_URL no está definida: no se puede llamar a ${metodo} ${ruta}`);
      throw PartnersApiError.noDisponible();
    }

    const url = this.baseUrl + ruta + this.queryString(opciones.query);
    const idempotencyKey =
      typeof opciones.idempotente === 'string' ? opciones.idempotente : opciones.idempotente ? randomUUID() : undefined;
    const cabeceras = this.cabeceras(metodo, opciones, idempotencyKey);
    const cuerpo = opciones.body === undefined ? undefined : JSON.stringify(opciones.body);
    const reintentable = metodo === 'GET' || idempotencyKey !== undefined;
    const intentos = reintentable ? this.reintentos + 1 : 1;

    for (let intento = 1; ; intento++) {
      const inicio = Date.now();
      let respuesta: Response;
      try {
        respuesta = await fetch(url, {
          method: metodo,
          headers: cabeceras,
          body: cuerpo,
          signal: AbortSignal.timeout(this.timeoutMs),
        });
      } catch (error) {
        const motivo = (error as Error).name === 'TimeoutError' ? `timeout de ${this.timeoutMs} ms` : (error as Error).message;
        this.log(metodo, ruta, cabeceras, 0, inicio, `${motivo} (intento ${intento}/${intentos})`);
        if (intento < intentos) {
          await this.esperar(intento);
          continue;
        }
        throw PartnersApiError.noDisponible();
      }

      this.log(metodo, ruta, cabeceras, respuesta.status, inicio, intento > 1 ? `intento ${intento}/${intentos}` : '');
      if (respuesta.ok) {
        const texto = await respuesta.text();
        return (texto ? JSON.parse(texto) : undefined) as T;
      }
      if (ESTADOS_REINTENTABLES.has(respuesta.status) && intento < intentos) {
        await respuesta.body?.cancel();
        await this.esperar(intento);
        continue;
      }
      const error = PartnersApiError.desdeRespuesta(respuesta.status, await this.leerError(respuesta));
      if (error.estadoRemoto === 401 || error.estadoRemoto === 403) {
        // API Gateway contesta 403 si la ruta no existe o falta/no vale la API key: es configuración, no del usuario.
        this.logger.error(`La API de Partners rechazó ${metodo} ${ruta} con ${respuesta.status}: revise PARTNERS_API_URL y PARTNERS_API_KEY`);
      }
      throw error;
    }
  }

  private cabeceras(metodo: MetodoHttp, opciones: OpcionesPeticion, idempotencyKey?: string): Record<string, string> {
    const cabeceras: Record<string, string> = {
      Accept: 'application/json',
      'X-Request-Id': requestIdActual() ?? randomUUID(),
    };
    if (opciones.body !== undefined) cabeceras['Content-Type'] = 'application/json';
    if (this.apiKey) cabeceras['x-api-key'] = this.apiKey;
    if (metodo !== 'GET' && opciones.actor) {
      cabeceras['X-Actor-User-Id'] = opciones.actor.userId;
      if (opciones.actor.partnerId) cabeceras['X-Actor-Partner-Id'] = opciones.actor.partnerId;
    }
    if (idempotencyKey) cabeceras['Idempotency-Key'] = idempotencyKey;
    return cabeceras;
  }

  private queryString(query?: Record<string, ValorQuery>): string {
    if (!query) return '';
    const params = new URLSearchParams();
    for (const [clave, valor] of Object.entries(query)) {
      if (valor !== undefined && valor !== null && valor !== '') params.set(clave, String(valor));
    }
    const texto = params.toString();
    return texto ? `?${texto}` : '';
  }

  private async leerError(respuesta: Response): Promise<CuerpoErrorPartnersApi | null> {
    try {
      return (await respuesta.json()) as CuerpoErrorPartnersApi;
    } catch {
      return null;
    }
  }

  private esperar(intento: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, this.esperaBaseMs * 2 ** (intento - 1)));
  }

  /// Una línea JSON por llamada, sin cuerpos (llevan hashes, tokens y datos personales).
  private log(metodo: MetodoHttp, ruta: string, cabeceras: Record<string, string>, estado: number, inicio: number, nota: string) {
    const linea = JSON.stringify({
      evento: 'PARTNERS_API',
      metodo,
      ruta,
      estado,
      duracionMs: Date.now() - inicio,
      requestId: cabeceras['X-Request-Id'],
      ...(nota ? { nota } : {}),
    });
    if (estado >= 200 && estado < 400) this.logger.debug(linea);
    else this.logger.warn(linea);
  }
}

/// Codifica un id para meterlo en la ruta (`/companies/{companyId}/…`).
export function segmento(valor: string): string {
  return encodeURIComponent(valor);
}
