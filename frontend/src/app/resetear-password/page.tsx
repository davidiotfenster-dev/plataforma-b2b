"use client";

import { Suspense, useState, type FormEvent } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { api, ApiError } from "@/lib/api";

function ResetearPasswordForm() {
  const t = useTranslations("resetearPassword");
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const [passwordNueva, setPasswordNueva] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState(false);
  const [cargando, setCargando] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!token) return;
    setError(null);
    setCargando(true);
    try {
      await api.post("/auth/resetear-password", { token, passwordNueva });
      setOk(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("genericError"));
    } finally {
      setCargando(false);
    }
  }

  if (!token) {
    return (
      <div className="mx-auto max-w-sm text-center">
        <p className="text-red-600">{t("missingToken")}</p>
        <Link href="/login/recuperar" className="mt-4 inline-block text-sm text-neutral-500 hover:text-neutral-700">
          {t("backToLogin")}
        </Link>
      </div>
    );
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
      <h1 className="mb-6 text-2xl font-semibold text-neutral-900">{t("title")}</h1>
      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label htmlFor="resetear-password" className="mb-1 block text-sm font-medium text-neutral-700">
            {t("newPassword")}
          </label>
          <input
            id="resetear-password"
            type="password"
            autoComplete="new-password"
            required
            minLength={10}
            value={passwordNueva}
            onChange={(e) => setPasswordNueva(e.target.value)}
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
      </form>
    </div>
  );
}

export default function ResetearPasswordPage() {
  const tCommon = useTranslations("common");
  return (
    <Suspense fallback={<p className="text-neutral-500">{tCommon("loading")}</p>}>
      <ResetearPasswordForm />
    </Suspense>
  );
}
