"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { ArrowRight, FileText, PackageCheck, Truck } from "lucide-react";
import { useMe } from "@/hooks/use-me";

export default function HomePage() {
  const { data: perfil, isLoading } = useMe();
  const router = useRouter();
  const t = useTranslations("home");
  const tNav = useTranslations("nav");
  const tCommon = useTranslations("common");

  useEffect(() => {
    if (isLoading) return;
    if (!perfil) return;
    if (perfil.rol === "ADMIN_FENSTER") {
      router.replace("/admin/pedidos");
    } else if (perfil.rol === "COMERCIAL") {
      router.replace("/admin/partners");
    } else {
      router.replace("/catalogo");
    }
  }, [perfil, isLoading, router]);

  if (isLoading) {
    return <p className="text-neutral-500">{tCommon("loading")}</p>;
  }

  if (perfil) {
    return null;
  }

  const ventajas = [
    { icono: PackageCheck, titulo: t("f1Title"), texto: t("f1Text") },
    { icono: FileText, titulo: t("f2Title"), texto: t("f2Text") },
    { icono: Truck, titulo: t("f3Title"), texto: t("f3Text") },
  ];

  return (
    <div className="space-y-8">
      <section className="relative isolate overflow-hidden rounded-3xl border border-neutral-200 bg-white px-6 py-12 sm:px-12 sm:py-16">
        <FondoDecorativo />
        <div className="grid items-center gap-10 lg:grid-cols-[1.1fr_1fr]">
          <div className="text-center lg:text-left">
            <span className="inline-flex items-center gap-2 rounded-full border border-teal-600/20 bg-teal-50 px-3 py-1 text-xs font-medium text-teal-700">
              <span className="size-1.5 rounded-full bg-teal-500" />
              {t("badge")}
            </span>
            <h1 className="mt-5 text-3xl font-semibold tracking-tight text-neutral-900 sm:text-4xl">{t("title")}</h1>
            <p className="mx-auto mt-4 max-w-xl text-neutral-600 lg:mx-0">{t("description")}</p>
            <div className="mt-8 flex flex-wrap justify-center gap-3 lg:justify-start">
              <Link
                href="/login"
                className="inline-flex h-11 items-center gap-2 rounded-lg bg-teal-600 px-5 text-sm font-medium text-white shadow-sm transition hover:bg-teal-700"
              >
                {tNav("login")}
                <ArrowRight className="size-4" />
              </Link>
              <Link
                href="/registro"
                className="inline-flex h-11 items-center rounded-lg border border-neutral-300 bg-white px-5 text-sm font-medium text-neutral-800 transition hover:border-neutral-400 hover:bg-neutral-50"
              >
                {tNav("registro")}
              </Link>
            </div>
          </div>
          <IlustracionVentana />
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-3">
        {ventajas.map(({ icono: Icono, titulo, texto }) => (
          <div key={titulo} className="rounded-2xl border border-neutral-200 bg-white p-6">
            <div className="flex size-10 items-center justify-center rounded-xl bg-teal-50 text-teal-700">
              <Icono className="size-5" />
            </div>
            <h2 className="mt-4 font-semibold text-neutral-900">{titulo}</h2>
            <p className="mt-1.5 text-sm leading-relaxed text-neutral-600">{texto}</p>
          </div>
        ))}
      </section>
    </div>
  );
}

/// Cuadrícula tenue y halos de color detrás del bloque principal.
function FondoDecorativo() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
      <div
        className="absolute inset-0 opacity-60 [mask-image:radial-gradient(ellipse_at_center,black_30%,transparent_75%)]"
        style={{
          backgroundImage:
            "linear-gradient(to right, rgb(229 229 229) 1px, transparent 1px), linear-gradient(to bottom, rgb(229 229 229) 1px, transparent 1px)",
          backgroundSize: "32px 32px",
        }}
      />
      <div className="absolute -right-24 -top-24 size-80 rounded-full bg-teal-300/25 blur-3xl" />
      <div className="absolute -bottom-32 -left-20 size-72 rounded-full bg-cyan-200/30 blur-3xl" />
    </div>
  );
}

/// Ventana (FENSTER) con un sensor emitiendo señal: guiño a la marca, sin datos reales.
function IlustracionVentana() {
  const tEstados = useTranslations("estados");
  return (
    <div aria-hidden className="relative mx-auto w-full max-w-sm">
      <svg viewBox="0 0 320 300" className="w-full" fill="none">
        {/* Marco de la ventana */}
        <rect x="50" y="40" width="200" height="230" rx="14" className="fill-white stroke-neutral-300" strokeWidth="3" />
        <rect x="66" y="56" width="168" height="198" rx="6" className="fill-teal-50 stroke-neutral-200" strokeWidth="2" />
        <line x1="150" y1="56" x2="150" y2="254" className="stroke-neutral-300" strokeWidth="6" />
        <line x1="66" y1="150" x2="234" y2="150" className="stroke-neutral-300" strokeWidth="6" />
        {/* Reflejos del cristal */}
        <line x1="80" y1="120" x2="112" y2="72" className="stroke-white" strokeWidth="6" strokeLinecap="round" />
        <line x1="166" y1="228" x2="190" y2="192" className="stroke-white" strokeWidth="6" strokeLinecap="round" />
        {/* Manilla */}
        <rect x="138" y="170" width="8" height="30" rx="4" className="fill-neutral-400" />
        {/* Sensor y ondas de señal */}
        <rect x="226" y="92" width="22" height="34" rx="5" className="fill-teal-600" />
        <circle cx="237" cy="103" r="3" className="fill-white" />
        <path d="M262 94 a20 20 0 0 1 0 30" className="stroke-teal-500" strokeWidth="3" strokeLinecap="round" />
        <path d="M274 84 a34 34 0 0 1 0 50" className="stroke-teal-400" strokeWidth="3" strokeLinecap="round" opacity="0.7" />
        <path d="M286 74 a48 48 0 0 1 0 70" className="stroke-teal-300" strokeWidth="3" strokeLinecap="round" opacity="0.45" />
      </svg>

      {/* Tarjetas flotantes que sugieren el flujo del pedido */}
      <div className="absolute -left-2 top-6 rounded-xl border border-neutral-200 bg-white/90 px-3 py-2 shadow-sm backdrop-blur sm:-left-6">
        <p className="font-mono text-[11px] text-neutral-500">PED-2026-0142</p>
        <p className="mt-0.5 flex items-center gap-1.5 text-xs font-medium text-neutral-800">
          <span className="size-1.5 rounded-full bg-emerald-500" />
          {tEstados("ENVIADO")}
        </p>
      </div>
      <div className="absolute -right-2 bottom-4 flex items-center gap-2 rounded-xl border border-neutral-200 bg-white/90 px-3 py-2 shadow-sm backdrop-blur sm:-right-4">
        <Truck className="size-4 text-teal-600" />
        <span className="text-xs font-medium text-neutral-800">PO 4500-8812</span>
      </div>
    </div>
  );
}
