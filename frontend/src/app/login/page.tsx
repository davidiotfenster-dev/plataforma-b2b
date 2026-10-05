"use client";

import { Suspense, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { AlertCircle, Eye, EyeOff, Info, Loader2, Lock, Mail } from "lucide-react";
import { api, ApiError } from "@/lib/api";
import type { Perfil } from "@/lib/types";
import { destinoTrasLogin } from "@/lib/acceso";
import { localeCookieName } from "@/i18n/locales";

const CAMPO =
  "h-11 w-full rounded-lg border border-neutral-300 bg-white pl-10 pr-3 text-sm text-neutral-900 placeholder:text-neutral-400 transition focus:border-teal-600 focus:outline-none focus:ring-4 focus:ring-teal-600/15";

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
      setError(err instanceof ApiError ? err.message : tCommon("unexpectedError"));
    } finally {
      setCargando(false);
    }
  }

  return (
    <div className="mx-auto mt-6 w-full max-w-md sm:mt-12">
      <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm">
        <div className="h-1 bg-teal-600" />
        <div className="px-6 pb-8 pt-7 sm:px-8">
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

        <div className="border-t border-neutral-100 bg-neutral-50 px-6 py-4 text-center text-sm text-neutral-600 sm:px-8">
          {t("noAccount")}{" "}
          <Link href="/registro" className="font-medium text-teal-700 hover:text-teal-800 hover:underline">
            {t("register")}
          </Link>
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
