"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { api, ApiError } from "@/lib/api";
import type { AuditLogEntry, Partner, Usuario } from "@/lib/types";

function AuditLogPanel({ userId }: { userId: string }) {
  const t = useTranslations("adminUsuarios");
  const { data, isLoading } = useQuery<AuditLogEntry[]>({
    queryKey: ["admin-usuario-auditoria", userId],
    queryFn: () => api.get<AuditLogEntry[]>(`/partners/usuarios/${userId}/auditoria`),
  });

  if (isLoading) return <p className="text-xs text-neutral-500">{t("loading")}</p>;
  if (!data || data.length === 0) return <p className="text-xs text-neutral-500">{t("auditLogEmpty")}</p>;

  return (
    <div className="mt-2 max-h-64 overflow-y-auto rounded-md border border-neutral-200">
      <table className="w-full text-left text-xs">
        <thead className="bg-neutral-50 text-neutral-500">
          <tr>
            <th className="px-2 py-1">{t("auditLogDate")}</th>
            <th className="px-2 py-1">{t("auditLogEvent")}</th>
          </tr>
        </thead>
        <tbody>
          {data.map((entry) => (
            <tr key={entry.id} className="border-t border-neutral-100">
              <td className="whitespace-nowrap px-2 py-1 text-neutral-500">
                {new Date(entry.timestamp).toLocaleString()}
              </td>
              <td className="px-2 py-1 text-neutral-700">
                {entry.eventType}
                {entry.statusCode ? ` · ${entry.statusCode}` : ""}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function UsuarioRow({ usuario, partnerId }: { usuario: Usuario; partnerId: string }) {
  const t = useTranslations("adminUsuarios");
  const tRoles = useTranslations("roles");
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [mostrarAuditoria, setMostrarAuditoria] = useState(false);

  function refrescar() {
    setError(null);
    queryClient.invalidateQueries({ queryKey: ["admin-partner-usuarios", partnerId] });
  }

  function manejarError(err: unknown) {
    setMensaje(null);
    setError(err instanceof ApiError ? err.message : t("genericError"));
  }

  const cambiarRol = useMutation({
    mutationFn: (rol: string) => api.patch(`/partners/usuarios/${usuario.id}/rol`, { rol }),
    onSuccess: refrescar,
    onError: manejarError,
  });
  const activar = useMutation({
    mutationFn: () => api.post(`/partners/usuarios/${usuario.id}/activar`),
    onSuccess: refrescar,
    onError: manejarError,
  });
  const desactivar = useMutation({
    mutationFn: () => api.post(`/partners/usuarios/${usuario.id}/desactivar`),
    onSuccess: refrescar,
    onError: manejarError,
  });
  const forzarLogout = useMutation({
    mutationFn: () => api.post(`/partners/usuarios/${usuario.id}/forzar-logout`),
    onSuccess: () => {
      setError(null);
      setMensaje(t("forceLogoutDone"));
    },
    onError: manejarError,
  });
  const enviarReset = useMutation({
    mutationFn: () => api.post(`/partners/usuarios/${usuario.id}/enviar-reset-password`),
    onSuccess: () => {
      setError(null);
      setMensaje(t("resetPasswordSent"));
    },
    onError: manejarError,
  });

  const accionEnCurso =
    cambiarRol.isPending || activar.isPending || desactivar.isPending || forzarLogout.isPending || enviarReset.isPending;

  return (
    <div className="rounded-lg border border-neutral-200 bg-white p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="font-medium text-neutral-900">{usuario.nombre}</p>
          <p className="text-xs text-neutral-400">{usuario.email}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={usuario.rol}
            disabled={usuario.rol === "ADMIN_FENSTER" || accionEnCurso}
            onChange={(e) => {
              setMensaje(null);
              cambiarRol.mutate(e.target.value);
            }}
            className="rounded-md border border-neutral-300 px-2 py-1.5 text-xs disabled:opacity-50"
          >
            {usuario.rol === "ADMIN_FENSTER" && <option value="ADMIN_FENSTER">ADMIN_FENSTER</option>}
            <option value="PARTNER_ADMIN">{tRoles("PARTNER_ADMIN")}</option>
            <option value="PARTNER_COMPRADOR">{tRoles("PARTNER_COMPRADOR")}</option>
            <option value="PARTNER_CONSULTA">{tRoles("PARTNER_CONSULTA")}</option>
          </select>
          <span
            className={`rounded-full px-2.5 py-1 text-xs font-medium ${
              usuario.activo ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
            }`}
          >
            {usuario.activo ? t("active") : t("inactive")}
          </span>
          {usuario.activo ? (
            <button
              onClick={() => {
                setMensaje(null);
                desactivar.mutate();
              }}
              disabled={accionEnCurso}
              className="rounded-md border border-red-300 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
            >
              {t("deactivate")}
            </button>
          ) : (
            <button
              onClick={() => {
                setMensaje(null);
                activar.mutate();
              }}
              disabled={accionEnCurso}
              className="rounded-md border border-green-300 px-3 py-1.5 text-xs font-medium text-green-700 hover:bg-green-50 disabled:opacity-50"
            >
              {t("activate")}
            </button>
          )}
          <button
            onClick={() => {
              if (window.confirm(t("forceLogoutConfirm"))) {
                setMensaje(null);
                forzarLogout.mutate();
              }
            }}
            disabled={accionEnCurso}
            className="rounded-md border border-neutral-300 px-3 py-1.5 text-xs font-medium text-neutral-700 hover:bg-neutral-50 disabled:opacity-50"
          >
            {t("forceLogout")}
          </button>
          <button
            onClick={() => {
              setMensaje(null);
              enviarReset.mutate();
            }}
            disabled={accionEnCurso}
            className="rounded-md border border-neutral-300 px-3 py-1.5 text-xs font-medium text-neutral-700 hover:bg-neutral-50 disabled:opacity-50"
          >
            {t("sendResetPassword")}
          </button>
          <button
            onClick={() => setMostrarAuditoria((v) => !v)}
            className="rounded-md border border-neutral-300 px-3 py-1.5 text-xs font-medium text-neutral-700 hover:bg-neutral-50"
          >
            {mostrarAuditoria ? t("hideAuditLog") : t("viewAuditLog")}
          </button>
        </div>
      </div>
      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
      {mensaje && <p className="mt-2 text-xs text-green-700">{mensaje}</p>}
      {mostrarAuditoria && <AuditLogPanel userId={usuario.id} />}
    </div>
  );
}

export default function AdminPartnerUsuariosPage() {
  const params = useParams<{ id: string }>();
  const partnerId = params.id;
  const t = useTranslations("adminUsuarios");

  const { data: partner } = useQuery<Partner>({
    queryKey: ["admin-partner", partnerId],
    queryFn: () => api.get<Partner>(`/partners/${partnerId}`),
  });

  const { data: usuarios, isLoading } = useQuery<Usuario[]>({
    queryKey: ["admin-partner-usuarios", partnerId],
    queryFn: () => api.get<Usuario[]>(`/partners/${partnerId}/usuarios`),
  });

  return (
    <div>
      <Link href="/admin/partners" className="mb-4 inline-block text-sm text-neutral-500 hover:text-neutral-700">
        ← {t("back")}
      </Link>
      <h1 className="mb-6 text-2xl font-semibold text-neutral-900">
        {t("title", { partner: partner?.razonSocial ?? "…" })}
      </h1>
      {isLoading ? (
        <p className="text-neutral-500">{t("loading")}</p>
      ) : (
        <div className="space-y-3">
          {usuarios?.map((usuario) => (
            <UsuarioRow key={usuario.id} usuario={usuario} partnerId={partnerId} />
          ))}
          {usuarios?.length === 0 && <p className="text-neutral-500">{t("empty")}</p>}
        </div>
      )}
    </div>
  );
}
