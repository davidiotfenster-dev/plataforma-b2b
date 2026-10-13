import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getTranslations } from "next-intl/server";
import "./globals.css";
import { Providers } from "@/lib/providers";
import { NavegacionMovil, Navbar } from "@/components/navbar";
import { ControlAcceso } from "@/components/control-acceso";
import { Marca } from "@/components/marca";
import { AyudaBurbuja } from "@/components/ayuda/ayuda-burbuja";
import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { PAGINAS_LEGALES } from "./legal/paginas";

/// Web de la empresa, la misma a la que ya enlazan los textos legales.
const WEB_EMPRESA = { url: "https://www.iotfenster.com", texto: "www.iotfenster.com" };

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "IoT FENSTER — Portal Partner",
  description: "Plataforma B2B de pedidos y portal partner para IoT FENSTER",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const locale = await getLocale();
  const tNav = await getTranslations("nav");
  const tLegal = await getTranslations("legal");

  return (
    <html
      lang={locale}
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-neutral-50 font-sans text-neutral-900">
        <NextIntlClientProvider>
          <Providers>
            <Navbar />
            <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-8">
              <ControlAcceso>{children}</ControlAcceso>
            </main>
            <footer className="border-t border-neutral-200 bg-white">
              <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2 px-6 pb-16 pt-4 text-sm text-neutral-500">
                <Marca subtitulo={tNav("subtitle")} className="!text-sm" />
                <nav aria-label={tLegal("navLabel")} className="flex flex-wrap gap-x-4 gap-y-1">
                  {PAGINAS_LEGALES.map(({ href, clave }) => (
                    <Link key={href} href={href} className="hover:text-neutral-900">
                      {tLegal(clave)}
                    </Link>
                  ))}
                </nav>
                <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <span>© {new Date().getFullYear()} IoT FENSTER</span>
                  <a
                    href={WEB_EMPRESA.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 hover:text-neutral-900"
                  >
                    {WEB_EMPRESA.texto}
                    <ExternalLink className="size-3" aria-hidden />
                  </a>
                </span>
              </div>
            </footer>
            <NavegacionMovil />
            <AyudaBurbuja />
          </Providers>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
