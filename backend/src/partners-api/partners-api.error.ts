import { HttpException, HttpStatus } from '@nestjs/common';

/// Códigos de error del contrato v1 (sección 10 del documento de la API).
export type CodigoErrorPartnersApi =
  | 'NO_ENCONTRADO'
  | 'DUPLICADO'
  | 'CONFLICTO_ESTADO'
  | 'CONFLICTO_VERSION'
  | 'PRECIOS_CAMBIADOS'
  | 'PRODUCTOS_NO_DISPONIBLES'
  | 'CARRITO_YA_CONFIRMADO'
  | 'TIENE_PEDIDOS'
  /// Misma `Idempotency-Key` con un cuerpo distinto (409, desde la v1.3).
  | 'IDEMPOTENCY_KEY_REUSED'
  /// Ya hay un `apply-rate` real en curso para esa marca (409, desde la v1.4).
  | 'JOB_ALREADY_RUNNING'
  | 'VALIDACION'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NO_DISPONIBLE'
  | (string & {});

export interface CuerpoErrorPartnersApi {
  codigo?: string;
  mensaje?: string;
  campo?: string | null;
}

/// Error de la API de Partners ya traducido a la respuesta que da NestJS al frontend:
/// 404 opaco, 409/422 con `codigo` y `mensaje` del contrato, y cualquier fallo del
/// servicio (caído, timeout, credenciales de la API mal puestas) como 503 sin detalles.
export class PartnersApiError extends HttpException {
  constructor(
    readonly codigo: CodigoErrorPartnersApi,
    estadoNest: number,
    mensaje: string,
    readonly campo: string | null = null,
    /// Estado HTTP que devolvió AWS (0 si no hubo respuesta: red o timeout).
    readonly estadoRemoto = 0,
  ) {
    super({ statusCode: estadoNest, codigo, message: mensaje, campo }, estadoNest);
  }

  static desdeRespuesta(estado: number, cuerpo: CuerpoErrorPartnersApi | null): PartnersApiError {
    const codigo = cuerpo?.codigo;
    const mensaje = cuerpo?.mensaje;
    const campo = cuerpo?.campo ?? null;
    if (estado === 404) {
      // Opaco a propósito: no decir si no existe o si es de otra empresa (zero data leak).
      return new PartnersApiError('NO_ENCONTRADO', HttpStatus.NOT_FOUND, 'Recurso no encontrado', null, estado);
    }
    if (estado === 409) {
      return new PartnersApiError(codigo ?? 'CONFLICTO_ESTADO', HttpStatus.CONFLICT, mensaje ?? 'Conflicto', campo, estado);
    }
    if (estado === 400 || estado === 422) {
      return new PartnersApiError(codigo ?? 'VALIDACION', HttpStatus.UNPROCESSABLE_ENTITY, mensaje ?? 'Datos no válidos', campo, estado);
    }
    return PartnersApiError.noDisponible(estado);
  }

  static noDisponible(estadoRemoto = 0): PartnersApiError {
    return new PartnersApiError(
      'NO_DISPONIBLE',
      HttpStatus.SERVICE_UNAVAILABLE,
      'El servicio no está disponible en este momento. Inténtelo de nuevo en unos minutos.',
      null,
      estadoRemoto,
    );
  }
}
