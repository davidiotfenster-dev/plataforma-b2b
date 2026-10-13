"use client";

import { Suspense, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { AlertCircle, Eye, EyeOff, Info, Languages, Loader2, Lock, Mail, Tag, Truck } from "lucide-react";
import { api, ApiError } from "@/lib/api";
import type { Perfil } from "@/lib/types";
import { destinoTrasLogin } from "@/lib/acceso";
import { localeCookieName } from "@/i18n/locales";

const CAMPO =
  "h-11 w-full rounded-lg border border-neutral-300 bg-white pl-10 pr-3 text-sm text-neutral-900 placeholder:text-neutral-400 transition focus:border-teal-600 focus:outline-none focus:ring-4 focus:ring-teal-600/15";

/// Lo que se cuenta en el panel de bienvenida del login (solo en pantallas anchas).
const BENEFICIOS = [
  { icono: Tag, clave: "benefit1" },
  { icono: Truck, clave: "benefit2" },
  { icono: Languages, clave: "benefit3" },
] as const;

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [verPassword, setVerPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);
  const router = useRouter();
  const queryClient = useQueryClient();
  const t = useTranslations("login");
  const tCommon = useTranslations("common");
  /// Llegada desde una página protegida: `next` es la página a la que volver y
  /// `motivo=caducada` indica que la sesión terminó mientras se usaba el portal.
  const searchParams = useSearchParams();
  const next = searchParams.get("next");
  const aviso = searchParams.get("motivo") === "caducada" ? t("sessionExpired") : next ? t("loginToContinue") : null;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setCargando(true);
    try {
      await api.post("/auth/login", { email, password });
      // Nada de la sesión anterior debe sobrevivir al cambio de usuario.
      queryClient.clear();
      const perfil = await api.get<Perfil>("/auth/me");
      queryClient.setQueryData(["me"], perfil);
      /// Sincroniza el idioma de la interfaz con la preferencia guardada del
      /// usuario (útil si inicia sesión desde un navegador/dispositivo nuevo
      /// sin la cookie de idioma ya puesta).
      document.cookie = `${localeCookieName}=${perfil.idioma.toLowerCase()}; path=/; max-age=31536000; SameSite=Lax`;
      router.push(destinoTrasLogin(next, perfil.rol));
      router.refresh();
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.code && t.has(`errors.${err.code}`)
            ? t(`errors.${err.code}`)
            : err.message
          : tCommon("unexpectedError"),
      );
    } finally {
      setCargando(false);
    }
  }

  return (
    <div className="mx-auto mt-2 w-full max-w-md sm:mt-8 md:max-w-4xl">
      <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm md:grid md:grid-cols-[5fr_6fr]">
        <aside className="relative overflow-hidden bg-[#10263b] px-6 py-6 text-white md:flex md:flex-col md:justify-between md:px-9 md:py-10">
          <div aria-hidden className="pointer-events-none absolute -bottom-28 -right-24 size-80 rounded-full bg-teal-400/10" />
          <div aria-hidden className="pointer-events-none absolute -right-12 -top-12 size-40 rounded-full bg-teal-400/10" />
          <div className="relative">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo-iot-fenster.png" alt="IoT FENSTER" className="h-9 w-auto md:h-11" />
            <h2 className="mt-4 text-lg font-semibold tracking-tight md:mt-12 md:text-2xl md:leading-snug">{t("welcomeTitle")}</h2>
            <p className="mt-3 hidden text-sm leading-relaxed text-slate-300 md:block">{t("welcomeText")}</p>
          </div>
          <ul className="relative mt-10 hidden space-y-3 text-sm text-slate-200 md:block">
            {BENEFICIOS.map(({ icono: Icono, clave }) => (
              <li key={clave} className="flex items-center gap-3">
                <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-teal-400/15 text-teal-300">
                  <Icono className="size-4" aria-hidden />
                </span>
                {t(clave)}
              </li>
            ))}
          </ul>
        </aside>
        <div className="flex flex-col">
        <div className="flex-1 px-6 pb-8 pt-7 sm:px-8 md:px-10 md:pt-10">
          <h1 className="text-2xl font-semibold tracking-tight text-neutral-900">{t("title")}</h1>
          <p className="mt-1.5 text-sm text-neutral-500">{t("subtitle")}</p>

          {aviso && (
            <div role="status" className="mt-5 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm text-amber-800">
              <Info className="mt-0.5 size-4 shrink-0" />
              <span>{aviso}</span>
            </div>
          )}

          <form onSubmit={onSubmit} className="mt-6 space-y-4">
            <div>
              <label htmlFor="login-email" className="mb-1.5 block text-sm font-medium text-neutral-700">
                {t("email")}
              </label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-neutral-400" />
                <input
                  id="login-email"
                  type="email"
                  required
                  autoComplete="email"
                  autoFocus
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={CAMPO}
                />
              </div>
            </div>

            <div>
              <label htmlFor="login-password" className="mb-1.5 block text-sm font-medium text-neutral-700">
                {t("password")}
              </label>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-neutral-400" />
                <input
                  id="login-password"
                  type={verPassword ? "text" : "password"}
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={`${CAMPO} pr-11`}
                />
                <button
                  type="button"
                  onClick={() => setVerPassword((v) => !v)}
                  aria-label={verPassword ? t("hidePassword") : t("showPassword")}
                  aria-pressed={verPassword}
                  className="absolute right-1.5 top-1/2 flex size-8 -translate-y-1/2 items-center justify-center rounded-md text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700"
                >
                  {verPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </div>

            {error && (
              <div role="alert" className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700">
                <AlertCircle className="mt-0.5 size-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={cargando}
              className="flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-neutral-900 text-sm font-medium text-white transition hover:bg-neutral-700 focus:outline-none focus:ring-4 focus:ring-neutral-900/20 disabled:opacity-60"
            >
              {cargando && <Loader2 className="size-4 animate-spin" />}
              {cargando ? t("submitting") : t("submit")}
            </button>

            <Link href="/login/recuperar" className="block text-center text-sm text-neutral-500 hover:text-teal-700">
              {t("forgotPassword")}
            </Link>
          </form>
        </div>

        <div className="border-t border-neutral-100 bg-neutral-50 px-6 py-4 text-center text-sm text-neutral-600 sm:px-8 md:px-10">
          {t("noAccount")}{" "}
          <Link href="/registro" className="font-medium text-teal-700 hover:text-teal-800 hover:underline">
            {t("register")}
          </Link>
        </div>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  const tCommon = useTranslations("common");
  return (
    <Suspense fallback={<p className="text-neutral-500">{tCommon("loading")}</p>}>
      <Login />
    </Suspense>
  );
}
