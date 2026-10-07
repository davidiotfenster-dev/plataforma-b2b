export default () => ({
  port: parseInt(process.env.PORT ?? '3001', 10),
  databaseUrl: process.env.DATABASE_URL,
  jwtSecret: process.env.JWT_SECRET,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? '8h',
  emailVerificationTokenExpiresIn:
    process.env.EMAIL_VERIFICATION_TOKEN_EXPIRES_IN ?? '24h',
  passwordResetTokenExpiresIn: process.env.PASSWORD_RESET_TOKEN_EXPIRES_IN ?? '1h',
  redisUrl: process.env.REDIS_URL,
  resendApiKey: process.env.RESEND_API_KEY,
  emailFrom: process.env.EMAIL_FROM ?? 'pedidos@iotfenster.com',
  emailReplyTo: process.env.EMAIL_REPLY_TO,
  /// Dirección pública (https) del logo de la cabecera de los correos. Sin ella, va el nombre en texto.
  emailLogoUrl: process.env.EMAIL_LOGO_URL,
  /// `ses` para enviar por Amazon SES; vacío, Resend si hay `RESEND_API_KEY`.
  emailProveedor: process.env.EMAIL_PROVEEDOR,
  awsSesRegion: process.env.AWS_SES_REGION ?? 'eu-west-1',
  frontendUrl: process.env.FRONTEND_URL ?? 'http://localhost:3000',
  /// Interruptor del rol COMERCIAL: apagado por defecto (decisión 2026-10-02). Con
  /// `COMERCIAL_ACTIVO=true` el rol vuelve a funcionar tal como estaba, sin tocar datos.
  comercialActivo: process.env.COMERCIAL_ACTIVO === 'true',
  /// API de Partners de IoT FENSTER (AWS API Gateway, stage incluido: `…/v1`). Vacía, no se usa.
  partnersApiUrl: process.env.PARTNERS_API_URL ?? '',
  /// API key de API Gateway (cabecera `x-api-key`), si el API la exige.
  partnersApiKey: process.env.PARTNERS_API_KEY,
  partnersApiTimeoutMs: parseInt(process.env.PARTNERS_API_TIMEOUT_MS ?? '10000', 10),
  /// Reintentos extra, solo en GET y escrituras con Idempotency-Key.
  partnersApiReintentos: parseInt(process.env.PARTNERS_API_REINTENTOS ?? '2', 10),
  /// Copiar también los eventos de auditoría a `POST /v1/audit/events`.
  partnersApiAuditoria: process.env.PARTNERS_API_AUDITORIA === 'true',
});
