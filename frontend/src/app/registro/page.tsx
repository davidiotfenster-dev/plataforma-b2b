"use client";

import { useState, type FormEvent } from "react";
import { useLocale, useTranslations } from "next-intl";
import { api, ApiError } from "@/lib/api";
import { locales, localeNames, type Locale } from "@/i18n/locales";

export default function RegistroPage() {
  const t = useTranslations("registro");
  const tCommon = useTranslations("common");
  const localeActual = useLocale() as Locale;

  const CAMPOS: { name: string; label: string; type?: string; placeholder?: string }[] = [
    { name: "razonSocial", label: t("razonSocial") },
    { name: "cif", label: t("cif") },
    { name: "direccionFiscal", label: t("direccionFiscal") },
    { name: "pais", label: t("pais") },
    { name: "dominioWeb", label: t("dominioWeb"), placeholder: t("dominioWebPlaceholder") },
    { name: "nombreAdmin", label: t("nombreAdmin") },
    { name: "emailAdmin", label: t("emailAdmin"), type: "email" },
    { name: "passwordAdmin", label: t("passwordAdmin"), type: "password" },
  ];

  const [form, setForm] = useState<Record<string, string>>({});
  const [idioma, setIdioma] = useState<Locale>(localeActual);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState(false);
  const [cargando, setCargando] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setCargando(true);
    try {
      await api.post("/auth/registro-partner", { ...form, idioma: idioma.toUpperCase() });
      setOk(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : tCommon("unexpectedError"));
    } finally {
      setCargando(false);
    }
  }

  if (ok) {
    return (
      <div className="mx-auto max-w-md text-center">
        <h1 className="text-2xl font-semibold text-neutral-900">{t("doneTitle")}</h1>
        <p className="mt-3 text-neutral-600">{t("doneBody")}</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg">
      <h1 className="mb-6 text-2xl font-semibold text-neutral-900">{t("title")}</h1>
      <form onSubmit={onSubmit} className="space-y-4">
        {CAMPOS.map((campo) => (
          <div key={campo.name}>
            <label htmlFor={`registro-${campo.name}`} className="mb-1 block text-sm font-medium text-neutral-700">
              {campo.label}
            </label>
            <input
              id={`registro-${campo.name}`}
              type={campo.type ?? "text"}
              placeholder={campo.placeholder}
              required
              minLength={campo.name === "passwordAdmin" ? 10 : undefined}
              value={form[campo.name] ?? ""}
              onChange={(e) => setForm((f) => ({ ...f, [campo.name]: e.target.value }))}
              className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-500 focus:outline-none"
            />
          </div>
        ))}
        <div>
          <label htmlFor="registro-idioma" className="mb-1 block text-sm font-medium text-neutral-700">
            {t("idioma")}
          </label>
          <select
            id="registro-idioma"
            value={idioma}
            onChange={(e) => setIdioma(e.target.value as Locale)}
            className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-500 focus:outline-none"
          >
            {locales.map((l) => (
              <option key={l} value={l}>
                {localeNames[l]}
              </option>
            ))}
          </select>
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
