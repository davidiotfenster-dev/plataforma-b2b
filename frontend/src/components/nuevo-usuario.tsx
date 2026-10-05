"use client";

import { useState, type FormEvent } from "react";
import { useMutation, useQueryClient, type QueryKey } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import { UserPlus } from "lucide-react";
import { api, ApiError } from "@/lib/api";
import { Campo, CLASE_INPUT } from "@/components/campo";
import { localeNames, locales, type Locale } from "@/i18n/locales";
import type { Usuario } from "@/lib/types";

const ROLES = ["PARTNER_COMPRADOR", "PARTNER_CONSULTA", "PARTNER_ADMIN"] as const;

/// Botón «Añadir usuario» y su formulario. Lo usan IoT FENSTER (ficha de la
/// empresa) y el administrador de la empresa (su página de usuarios); cambia
/// solo a qué ruta se manda. El usuario nuevo no recibe contraseña de nadie:
/// le llega un correo para crearla. `invalidar`: las consultas que cambian con
/// el alta (la lista de usuarios y, en la ficha, el contador de la pestaña).
export function NuevoUsuario({ endpoint, invalidar }: { endpoint: string; invalidar: QueryKey[] }) {
  const t = useTranslations("nuevoUsuario");
  const tRoles = useTranslations("roles");
  const tCommon = useTranslations("common");
  const locale = useLocale() as Locale;
  const queryClient = useQueryClient();
  const [abierto, setAbierto] = useState(false);
  const [nombre, setNombre] = useState("");
  const [email, setEmail] = useState("");
  const [rol, setRol] = useState<(typeof ROLES)[number]>("PARTNER_COMPRADOR");
  const [idioma, setIdioma] = useState<Locale>(locale);
  const [invitado, setInvitado] = useState<string | null>(null);

  const crear = useMutation({
    mutationFn: () =>
      api.post<Usuario>(endpoint, { nombre: nombre.trim(), email: email.trim(), rol, idioma: idioma.toUpperCase() }),
    onSuccess: (usuario) => {
      for (const queryKey of invalidar) queryClient.invalidateQueries({ queryKey });
      setInvitado(usuario.email);
      setAbierto(false);
      setNombre("");
      setEmail("");
      setRol("PARTNER_COMPRADOR");
    },
  });

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    crear.mutate();
  }

  const error = crear.error instanceof ApiError ? crear.error.message : crear.error ? tCommon("unexpectedError") : null;

  return (
    <div className="mb-4">
      {!abierto && (
        <button
          type="button"
          onClick={() => {
            setInvitado(null);
            crear.reset();
            setAbierto(true);
          }}
          className="inline-flex items-center gap-2 rounded-md bg-neutral-900 px-3 py-2 text-sm font-medium text-white hover:bg-neutral-700"
        >
          <UserPlus className="size-4" aria-hidden /> {t("add")}
        </button>
      )}

      {invitado && (
        <p role="status" className="mt-3 rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-800">
          {t("invited", { email: invitado })}
        </p>
      )}

      {abierto && (
        <form onSubmit={onSubmit} className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
          <h2 className="font-medium text-neutral-900">{t("title")}</h2>
          <p className="mt-1 text-sm text-neutral-500">{t("help")}</p>
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Campo etiqueta={t("name")} obligatorio value={nombre} onChange={(e) => setNombre(e.target.value)} autoComplete="off" />
            <Campo
              etiqueta={t("email")}
              obligatorio
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="off"
            />
            <div>
              <label htmlFor="nuevo-usuario-rol" className="mb-1 block text-sm font-medium text-neutral-700">
                {t("role")}
              </label>
              <select
                id="nuevo-usuario-rol"
                value={rol}
                onChange={(e) => setRol(e.target.value as (typeof ROLES)[number])}
                className={CLASE_INPUT}
              >
                {ROLES.map((r) => (
                  <option key={r} value={r}>
                    {tRoles(r)}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-xs text-neutral-500">{t(`roleHelp.${rol}`)}</p>
            </div>
            <div>
              <label htmlFor="nuevo-usuario-idioma" className="mb-1 block text-sm font-medium text-neutral-700">
                {t("language")}
              </label>
              <select
                id="nuevo-usuario-idioma"
                value={idioma}
                onChange={(e) => setIdioma(e.target.value as Locale)}
                className={CLASE_INPUT}
              >
                {locales.map((l) => (
                  <option key={l} value={l}>
                    {localeNames[l]}
                  </option>
                ))}
              </select>
            </div>
          </div>
          {error && (
            <p role="alert" className="mt-3 text-sm text-red-600">
              {error}
            </p>
          )}
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="submit"
              disabled={crear.isPending || !nombre.trim() || !email.trim()}
              className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-700 disabled:opacity-50"
            >
              {crear.isPending ? t("submitting") : t("submit")}
            </button>
            <button
              type="button"
              onClick={() => setAbierto(false)}
              className="rounded-md border border-neutral-300 px-4 py-2 text-sm text-neutral-700 hover:bg-neutral-50"
            >
              {t("cancel")}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
