"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { api, ApiError } from "@/lib/api";
import type { Perfil } from "@/lib/types";
import { localeCookieName } from "@/i18n/locales";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);
  const router = useRouter();
  const queryClient = useQueryClient();
  const t = useTranslations("login");
  const tCommon = useTranslations("common");

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setCargando(true);
    try {
      await api.post("/auth/login", { email, password });
      const perfil = await api.get<Perfil>("/auth/me");
      queryClient.setQueryData(["me"], perfil);
      /// Sincroniza el idioma de la interfaz con la preferencia guardada del
      /// usuario (útil si inicia sesión desde un navegador/dispositivo nuevo
      /// sin la cookie de idioma ya puesta).
      document.cookie = `${localeCookieName}=${perfil.idioma.toLowerCase()}; path=/; max-age=31536000; SameSite=Lax`;
      router.push(perfil.rol === "ADMIN_FENSTER" ? "/admin/pedidos" : "/catalogo");
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : tCommon("unexpectedError"));
    } finally {
      setCargando(false);
    }
  }

  return (
    <div className="mx-auto max-w-sm">
      <h1 className="mb-6 text-2xl font-semibold text-neutral-900">{t("title")}</h1>
      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-neutral-700">{t("email")}</label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-500 focus:outline-none"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-neutral-700">{t("password")}</label>
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-500 focus:outline-none"
          />
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={cargando}
          className="w-full rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-700 disabled:opacity-50"
        >
          {cargando ? t("submitting") : t("submit")}
        </button>
        <Link href="/login/recuperar" className="block text-center text-sm text-neutral-500 hover:text-neutral-700">
          {t("forgotPassword")}
        </Link>
      </form>
    </div>
  );
}
