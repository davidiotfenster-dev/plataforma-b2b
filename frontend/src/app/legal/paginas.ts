/// Páginas legales, en el orden en que se enlazan desde el pie y desde la
/// navegación de /legal. `clave` es la del namespace "legal" de messages/*.json.
export const PAGINAS_LEGALES = [
  { href: "/legal/aviso-legal", clave: "avisoLegal" },
  { href: "/legal/privacidad", clave: "privacidad" },
  { href: "/legal/cookies", clave: "cookies" },
  { href: "/legal/condiciones", clave: "condiciones" },
] as const;
