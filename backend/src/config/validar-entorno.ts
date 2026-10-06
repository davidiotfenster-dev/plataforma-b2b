/// Comprueba al arrancar las variables sin las que el API no puede funcionar, para
/// fallar con un mensaje claro en vez de a mitad de una petición. Lo opcional
/// (Redis, correo) solo avisa: la aplicación funciona sin ello.
export function validarEntorno(env: NodeJS.ProcessEnv = process.env): { errores: string[]; avisos: string[] } {
  const errores: string[] = [];
  const avisos: string[] = [];

  const proveedorCorreo = env.EMAIL_PROVEEDOR?.trim().toLowerCase();
  if (!env.DATABASE_URL) errores.push('DATABASE_URL no está definida.');
  if (!env.JWT_SECRET) {
    errores.push('JWT_SECRET no está definida.');
  } else if (env.JWT_SECRET.length < 32) {
    errores.push('JWT_SECRET debe tener al menos 32 caracteres aleatorios.');
  }
  if (env.TRUST_PROXY !== undefined && !/^\d+$/.test(env.TRUST_PROXY)) {
    errores.push('TRUST_PROXY debe ser el número de proxies delante del API (p. ej. 1).');
  }

  if (proveedorCorreo && proveedorCorreo !== 'ses') {
    errores.push('EMAIL_PROVEEDOR solo admite "ses" (o déjala vacía para usar Resend).');
  }
  if (proveedorCorreo === 'ses' && !env.EMAIL_FROM) {
    avisos.push('EMAIL_FROM no está definida: SES rechazará los envíos si pedidos@iotfenster.com no está verificado en SES.');
  }
  if (env.EMAIL_LOGO_URL && !/^https:\/\//i.test(env.EMAIL_LOGO_URL)) {
    avisos.push('EMAIL_LOGO_URL debe empezar por https:// para que el logo se vea en los correos.');
  }

  if (!env.REDIS_URL) avisos.push('REDIS_URL no está definida: se usará redis://localhost:6379 (sin caché si no responde).');
  if (!env.FRONTEND_URL) avisos.push('FRONTEND_URL no está definida: los enlaces de los correos apuntarán a http://localhost:3000.');
  if (!env.RESEND_API_KEY && proveedorCorreo !== 'ses') avisos.push('Sin proveedor de correo: los emails solo se escriben en el log.');

  return { errores, avisos };
}
