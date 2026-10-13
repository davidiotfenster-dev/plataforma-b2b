/// Siglas y marcas que se escriben siempre en mayúsculas.
const SIGLAS = new Set(['ICON', 'EVO', 'C-WALL', 'PVC', 'LED', 'RGB', 'GTIN']);

/// Colores que a veces llegan en minúsculas ("Wave2 blanco").
const COLORES = new Set(['blanco', 'negro', 'inox', 'plata', 'antracita', 'marron', 'marrón', 'especial']);

function cuidarParte(parte: string): string {
  if (!parte) return parte;
  const mayusculas = parte.toUpperCase();
  if (SIGLAS.has(mayusculas)) return mayusculas;
  // ICON1, ICON2+: la marca va en mayúsculas.
  if (/^ICON\d/i.test(parte)) return mayusculas;
  // 1, 2S, 2S+, 1,5: modelos y medidas se dejan como llegan.
  if (/^\d/.test(parte)) return parte;
  const soloMayusculas = parte === mayusculas && /[A-ZÁÉÍÓÚÑ]/.test(parte);
  if (soloMayusculas || COLORES.has(parte)) return parte.charAt(0).toUpperCase() + parte.slice(1).toLowerCase();
  // Mezclas como "GreenteQ", "bluConnect" o "Funksender" son el nombre de la marca: no se tocan.
  return parte;
}

/// Unifica cómo se escriben los nombres con que una marca vende sus productos:
/// "CONNECT 1 + BLANCO" -> "Connect 1+ Blanco", "Dispositivo Wave2 blanco" ->
/// "Dispositivo Wave2 Blanco", "cable 1.6m" -> "cable 1,6 m". No cambia las
/// palabras (los nombres de marca siguen siendo los suyos), solo mayúsculas,
/// espacios y el formato de las medidas. Aplicarlo dos veces da lo mismo.
export function cuidarNombreComercial(nombre: string): string {
  const base = nombre
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\s*\+/g, '+')
    .replace(/(\d)\.(\d)\s*m\b/gi, '$1,$2 m')
    .replace(/(\d),(\d)m\b/gi, '$1,$2 m');
  return base
    .split(' ')
    .map((palabra) => palabra.split('/').map(cuidarParte).join('/'))
    .join(' ');
}
