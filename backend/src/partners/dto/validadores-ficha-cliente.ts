import { ValidateBy } from 'class-validator';

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

/// Dominios de correo gratuito: una empresa no tiene "gmail.com" como web, y un
/// alta con un correo así no se puede verificar como corporativo.
const DOMINIOS_CORREO_GRATUITO = new Set([
  'gmail.com', 'googlemail.com', 'hotmail.com', 'hotmail.es', 'outlook.com', 'outlook.es', 'live.com', 'msn.com',
  'yahoo.com', 'yahoo.es', 'ymail.com', 'icloud.com', 'me.com', 'mac.com', 'aol.com', 'gmx.com', 'gmx.es', 'gmx.de',
  'web.de', 't-online.de', 'libero.it', 'virgilio.it', 'tiscali.it', 'alice.it', 'sapo.pt', 'proton.me', 'protonmail.com',
  'mail.com', 'zoho.com', 'yandex.com', 'telefonica.net', 'terra.es',
]);
export const DOMINIO_GRATUITO_MENSAJE = 'Indica el dominio de la empresa (p. ej. empresa.com), no un correo gratuito como gmail.com o outlook.com';

export function esDominioGratuito(dominio: string): boolean {
  return DOMINIOS_CORREO_GRATUITO.has(dominio.trim().toLowerCase());
}

/// Rechaza los dominios de correo gratuito en un campo de dominio de empresa.
export function DominioCorporativo(): PropertyDecorator {
  return ValidateBy({
    name: 'dominioCorporativo',
    validator: {
      validate: (valor: unknown) => typeof valor !== 'string' || !esDominioGratuito(valor),
      defaultMessage: () => DOMINIO_GRATUITO_MENSAJE,
    },
  });
}

/// CIF/NIF/VAT: de 4 a 20 caracteres, letras, dígitos y separadores habituales.
/// Cubre los formatos de ES/DE/IT/PT (y los `PENDIENTE-*` del import) sin
/// exigir un algoritmo distinto por país, pero rechaza cadenas sueltas como "1".
export const CIF_REGEX = /^[A-Za-z0-9][A-Za-z0-9 .\-/]{2,18}[A-Za-z0-9]$/;
export const CIF_MENSAJE = 'Debe ser un CIF/NIF válido (de 4 a 20 letras o dígitos, p. ej. B12345678)';

/// Código postal: alfanumérico corto (cubre los formatos de ES/DE/IT/PT).
export const CODIGO_POSTAL_REGEX = /^[A-Za-z0-9\s-]{3,10}$/;
export const CODIGO_POSTAL_MENSAJE = 'Debe ser un código postal válido';

export const TIPOS_EMPRESA = ['PARTNER', 'DISTRIBUIDOR'] as const;
export const MARCAS_CATALOGO = ['VBH', 'PROCOMSA', 'MYSMARTWINDOW'] as const;
