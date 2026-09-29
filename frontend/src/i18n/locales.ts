export const locales = ["es", "en", "de", "it", "pt"] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = "es";
export const localeCookieName = "NEXT_LOCALE";

export const localeNames: Record<Locale, string> = {
  es: "Español",
  en: "English",
  de: "Deutsch",
  it: "Italiano",
  pt: "Português",
};

export function esLocaleValida(valor: string | undefined | null): valor is Locale {
  return !!valor && (locales as readonly string[]).includes(valor);
}
