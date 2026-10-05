import { getLocale, getTranslations } from "next-intl/server";
import { LegalNav } from "./legal-nav";
import { ULTIMA_ACTUALIZACION_LEGAL } from "./datos-empresa";

/// Los textos legales están redactados solo en español (es la versión que
/// rige, ver condiciones de uso). En los demás idiomas se traduce el marco de
/// la página y se avisa de ello.
export default async function LegalLayout({ children }: LayoutProps<"/legal">) {
  const locale = await getLocale();
  const t = await getTranslations("legal");

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <LegalNav />
      {locale !== "es" && (
        <p lang={locale} className="rounded-md border border-neutral-200 bg-white px-4 py-3 text-sm text-neutral-600">
          {t("soloEspanol")}
        </p>
      )}
      <article lang="es" className="space-y-8 rounded-2xl border border-neutral-200 bg-white px-6 py-8 text-sm leading-relaxed text-neutral-700 sm:px-10">
        {children}
        <p className="border-t border-neutral-200 pt-4 text-xs text-neutral-500">
          Última actualización: {ULTIMA_ACTUALIZACION_LEGAL}
        </p>
      </article>
    </div>
  );
}
