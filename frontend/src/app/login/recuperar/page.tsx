"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { api, ApiError } from "@/lib/api";

export default function RecuperarPasswordPage() {
  const t = useTranslations("recuperarPassword");
  const tCommon = useTranslations("common");
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState(false);
  const [cargando, setCargando] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setCargando(true);
    try {
      await api.post("/auth/olvide-password", { email });
      setOk(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : tCommon("unexpectedError"));
    } finally {
      setCargando(false);
    }
  }

  if (ok) {
    return (
      <div className="mx-auto max-w-sm text-center">
        <h1 className="text-2xl font-semibold text-neutral-900">{t("doneTitle")}</h1>
        <p className="mt-3 text-neutral-600">{t("doneBody")}</p>
        <Link href="/login" className="mt-6 inline-block text-sm text-neutral-500 hover:text-neutral-700">
          {t("backToLogin")}
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-sm">
      <h1 className="mb-2 text-2xl font-semibold text-neutral-900">{t("title")}</h1>
      <p className="mb-6 text-sm text-neutral-500">{t("description")}</p>
      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label htmlFor="recuperar-email" className="mb-1 block text-sm font-medium text-neutral-700">
            {t("email")}
          </label>
          <input
            id="recuperar-email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-500 focus:outline-none"
          />
        </div>
        {error && (
          <p role="alert" className="text-sm text-red-600">
            {error}
          </p>
        )}
        <button
          type="submit"
          disabled={cargando}
          className="w-full rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-700 disabled:opacity-50"
        >
          {cargando ? t("submitting") : t("submit")}
        </button>
        <Link href="/login" className="block text-center text-sm text-neutral-500 hover:text-neutral-700">
          {t("backToLogin")}
        </Link>
      </form>
    </div>
  );
}
