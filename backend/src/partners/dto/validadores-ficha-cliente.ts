/// Patrones de validación reutilizados por `CrearPartnerDto` y
/// `ActualizarPartnerDto` para reducir errores de tecleo en la ficha de
/// cliente. Deliberadamente permisivos (aceptan formatos internacionales y
/// los placeholders `PENDIENTE-*`/`*.pendiente.test` ya usados en el
/// import de partners reales) en vez de exigir un formato estricto por país.

/// Teléfono: dígitos, espacios, guiones, paréntesis y un "+" inicial
/// opcional (prefijo internacional). Rechaza letras y cadenas demasiado
/// cortas/largas para ser un teléfono real.
export const TELEFONO_REGEX = /^[+]?[0-9()\-\s]{6,20}$/;
export const TELEFONO_MENSAJE = 'Debe ser un teléfono válido (solo dígitos, espacios, guiones o un + inicial)';

/// Dominio web: al menos un punto, sin espacios ni protocolo (para que no
/// se cuele por error una URL completa o el nombre de la empresa).
export const DOMINIO_REGEX = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/i;
export const DOMINIO_MENSAJE = 'Debe ser un dominio válido (ej. empresa.com, sin "http://" ni espacios)';

/// Código postal: alfanumérico corto (cubre los formatos de ES/DE/IT/PT).
export const CODIGO_POSTAL_REGEX = /^[A-Za-z0-9\s-]{3,10}$/;
export const CODIGO_POSTAL_MENSAJE = 'Debe ser un código postal válido';

export const TIPOS_EMPRESA = ['PARTNER', 'CLIENTE'] as const;
export const MARCAS_CATALOGO = ['VBH', 'PROCOMSA', 'MYSMARTWINDOW'] as const;
