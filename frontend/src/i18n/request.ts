import { getRequestConfig } from "next-intl/server";
import { cookies } from "next/headers";
import { defaultLocale, esLocaleValida, localeCookieName } from "./locales";

/// Sin enrutado por locale (sin prefijos /en, /de...): el idioma se decide
/// por cookie, no por la URL, para no reestructurar todas las rutas ya
/// existentes de la app. Ver PROGRESO.md (bloque E del backlog de frontend).
export default getRequestConfig(async () => {
  const cookieStore = await cookies();
  const cookieLocale = cookieStore.get(localeCookieName)?.value;
  const locale = esLocaleValida(cookieLocale) ? cookieLocale : defaultLocale;

  return {
    locale,
    messages: (await import(`../../messages/${locale}.json`)).default,
  };
});
