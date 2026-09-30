/// `ProductoBase.especificacionesJson` mezcla datos INTERNOS de IoT FENSTER
/// (grupo, color, referencias y GTIN de todas las marcas...) con las
/// especificaciones técnicas que sí puede ver el partner. El partner solo debe
/// recibir las segundas: los nombres y códigos de otras marcas son datos de
/// otros partners (Zero Data Leak).
///
/// Lista BLANCA: el partner solo ve lo que cuelga de la clave `publicas`. Lo
/// que se añada al JSON en el futuro es interno por defecto; para publicarlo
/// hay que ponerlo explícitamente ahí.
export const CLAVE_ESPECIFICACIONES_PUBLICAS = 'publicas';

type ValorSimple = string | number | boolean;

/// Devuelve solo los pares clave/valor simples de `publicas`, o `null` si no
/// hay ninguno.
export function especificacionesParaPartner(json: unknown): Record<string, ValorSimple> | null {
  if (!json || typeof json !== 'object' || Array.isArray(json)) return null;
  const publicas = (json as Record<string, unknown>)[CLAVE_ESPECIFICACIONES_PUBLICAS];
  if (!publicas || typeof publicas !== 'object' || Array.isArray(publicas)) return null;

  const visibles: Record<string, ValorSimple> = {};
  for (const [clave, valor] of Object.entries(publicas)) {
    if (typeof valor === 'string' || typeof valor === 'number' || typeof valor === 'boolean') {
      visibles[clave] = valor;
    }
  }
  return Object.keys(visibles).length > 0 ? visibles : null;
}
