"use client";

import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { Languages } from "lucide-react";
import { locales, localeNames, localeCookieName, type Locale } from "@/i18n/locales";
import { useMe } from "@/hooks/use-me";
import { api } from "@/lib/api";

/// `compacto`: solo el código del idioma (ES, EN…), para la barra del móvil.
export function LanguageSwitcher({ compacto = false }: { compacto?: boolean }) {
  const locale = useLocale() as Locale;
  const router = useRouter();
  const { data: perfil } = useMe();
  const t = useTranslations("nav");

  function cambiar(nuevo: Locale) {
    document.cookie = `${localeCookieName}=${nuevo}; path=/; max-age=31536000; SameSite=Lax`;
    if (perfil) {
      api.post("/auth/idioma", { idioma: nuevo.toUpperCase() }).catch(() => {});
    }
    router.refresh();
  }

  return (
    <label className="flex items-center gap-1 text-neutral-500">
      <Languages className="size-4" />
      <select
        value={locale}
        aria-label={t("language")}
        onChange={(e) => cambiar(e.target.value as Locale)}
        className="rounded-md border border-neutral-200 bg-transparent py-1 pl-1 pr-6 text-sm text-neutral-600 hover:border-neutral-300 focus:outline-none"
      >
        {locales.map((l) => (
          <option key={l} value={l}>
            {compacto ? l.toUpperCase() : localeNames[l]}
          </option>
        ))}
      </select>
    </label>
  );
}
