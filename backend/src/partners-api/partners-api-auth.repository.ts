import { Injectable } from '@nestjs/common';
import { PartnersApiClient, segmento, type Actor } from './partners-api.client.js';
import type {
  AccionCuenta,
  CuentaEncontrada,
  EmailVerificado,
  LoginContexto,
  NuevoRegistro,
  RegistroCreado,
  Sesion,
} from './partners-api.tipos.js';

/// Rutas 1-7 del contrato v1: autenticación y cuentas. La contraseña nunca viaja:
/// NestJS compara/genera el hash bcrypt y la API solo guarda o devuelve el hash.
@Injectable()
export class PartnersApiAuthRepository {
  constructor(private readonly api: PartnersApiClient) {}

  /// 1. Datos para validar un login (hash incluido) a partir del email.
  contextoLogin(email: string): Promise<LoginContexto> {
    return this.api.peticion('POST', '/auth/login-context', { body: { email } });
  }

  /// 2. Estado de la sesión (para el guard JWT) y, con `perfil`, los datos de "mi cuenta".
  sesion(userId: string, perfil = false): Promise<Sesion> {
    return this.api.get(`/auth/session/${segmento(userId)}`, perfil ? { profile: true } : undefined);
  }

  /// 3. Búsqueda de cuenta para "olvidé mi contraseña" y reenvío de verificación.
  buscarCuenta(email: string): Promise<CuentaEncontrada> {
    return this.api.peticion('POST', '/auth/account-lookup', { body: { email } });
  }

  /// 4. Registro público de empresa [Idem].
  registrar(datos: NuevoRegistro, idempotencyKey: string | true = true): Promise<RegistroCreado> {
    return this.api.peticion('POST', '/auth/registrations', {
      body: datos,
      actor: { userId: datos.userId, partnerId: datos.partnerId },
      idempotente: idempotencyKey,
    });
  }

  /// 5. Verificación del correo con el token de 24 h.
  verificarEmail(userId: string, token: string): Promise<EmailVerificado> {
    return this.api.peticion('POST', '/auth/email-verification', { body: { userId, token }, actor: { userId } });
  }

  /// 6. Cambio de contraseña con token de restablecimiento.
  restablecerPassword(userId: string, token: string, passwordHash: string): Promise<{ updated: boolean; sessionsInvalidated: boolean }> {
    return this.api.peticion('POST', '/auth/password-reset', { body: { userId, token, passwordHash }, actor: { userId } });
  }

  /// 7. Acciones sobre la cuenta: invalidar sesiones, cambiar idioma, guardar token.
  accionCuenta(userId: string, accion: AccionCuenta, actor: Actor): Promise<Record<string, unknown>> {
    return this.api.peticion('POST', `/auth/users/${segmento(userId)}/account`, { body: accion, actor });
  }
}
