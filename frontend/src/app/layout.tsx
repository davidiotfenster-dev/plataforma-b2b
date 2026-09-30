import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getTranslations } from "next-intl/server";
import "./globals.css";
import { Providers } from "@/lib/providers";
import { Navbar } from "@/components/navbar";
import { Marca } from "@/components/marca";

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

  return (
    <html
      lang={locale}
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-neutral-50 font-sans text-neutral-900">
        <NextIntlClientProvider>
          <Providers>
            <Navbar />
            <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-8">{children}</main>
            <footer className="border-t border-neutral-200 bg-white">
              <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2 px-6 py-4 text-sm text-neutral-500">
                <Marca subtitulo={tNav("subtitle")} className="!text-sm" />
                <span>© {new Date().getFullYear()} IoT FENSTER</span>
              </div>
            </footer>
          </Providers>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
