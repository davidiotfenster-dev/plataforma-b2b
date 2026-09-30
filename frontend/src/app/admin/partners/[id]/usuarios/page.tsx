"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { api, ApiError } from "@/lib/api";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { MenuAcciones, type AccionMenu } from "@/components/menu-acciones";
import { PartnerAvatar } from "@/components/partner-ui";
import type { AuditLogEntry, Usuario } from "@/lib/types";
import { PartnerHeader } from "../../partner-header";

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
  const [confirmando, setConfirmando] = useState<"desactivar" | "logout" | null>(null);

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

  const acciones: AccionMenu[] = [
    usuario.activo
      ? { clave: "desactivar", etiqueta: t("deactivate"), peligro: true, onSeleccionar: () => setConfirmando("desactivar") }
      : { clave: "activar", etiqueta: t("activate"), onSeleccionar: () => activar.mutate() },
    { clave: "logout", etiqueta: t("forceLogout"), onSeleccionar: () => setConfirmando("logout") },
    { clave: "reset", etiqueta: t("sendResetPassword"), onSeleccionar: () => enviarReset.mutate() },
    { clave: "auditoria", etiqueta: mostrarAuditoria ? t("hideAuditLog") : t("viewAuditLog"), onSeleccionar: () => setMostrarAuditoria((v) => !v) },
  ];

  return (
    <div className="border-t border-neutral-100 px-4 py-3 first:border-t-0">
      <div className="flex flex-wrap items-center gap-3">
        <PartnerAvatar nombre={usuario.nombre} />
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium text-neutral-900">{usuario.nombre}</p>
          <p className="truncate text-xs text-neutral-500">
            {usuario.email}
            {!usuario.emailVerificadoEn && ` · ${t("unverified")}`}
          </p>
        </div>
        <select
          value={usuario.rol}
          aria-label={t("role")}
          disabled={usuario.rol === "ADMIN_FENSTER" || accionEnCurso}
          onChange={(e) => {
            setMensaje(null);
            cambiarRol.mutate(e.target.value);
          }}
          className="rounded-md border border-neutral-300 bg-white px-2 py-1.5 text-sm disabled:opacity-50"
        >
          {usuario.rol === "ADMIN_FENSTER" && <option value="ADMIN_FENSTER">ADMIN_FENSTER</option>}
          <option value="PARTNER_ADMIN">{tRoles("PARTNER_ADMIN")}</option>
          <option value="PARTNER_COMPRADOR">{tRoles("PARTNER_COMPRADOR")}</option>
          <option value="PARTNER_CONSULTA">{tRoles("PARTNER_CONSULTA")}</option>
        </select>
        <span
          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${
            usuario.activo ? "bg-green-50 text-green-800" : "bg-red-50 text-red-700"
          }`}
        >
          <span className={`size-1.5 rounded-full ${usuario.activo ? "bg-green-500" : "bg-red-500"}`} aria-hidden="true" />
          {usuario.activo ? t("active") : t("inactive")}
        </span>
        <MenuAcciones acciones={acciones} etiqueta={t("moreActions")} />
      </div>
      {error && <p role="alert" className="mt-2 text-xs text-red-600">{error}</p>}
      {mensaje && <p role="status" className="mt-2 text-xs text-green-700">{mensaje}</p>}
      {mostrarAuditoria && <AuditLogPanel userId={usuario.id} />}

      {confirmando && (
        <ConfirmDialog
          titulo={confirmando === "logout" ? t("forceLogout") : t("deactivate")}
          descripcion={confirmando === "logout" ? t("forceLogoutConfirm") : t("deactivateConfirm")}
          confirmar={confirmando === "logout" ? t("forceLogout") : t("deactivate")}
          peligro
          cargando={forzarLogout.isPending || desactivar.isPending}
          onConfirmar={() => {
            setMensaje(null);
            const accion = confirmando === "logout" ? forzarLogout : desactivar;
            accion.mutate(undefined, { onSettled: () => setConfirmando(null) });
          }}
          onCancelar={() => setConfirmando(null)}
        />
      )}
    </div>
  );
}

export default function AdminPartnerUsuariosPage() {
  const params = useParams<{ id: string }>();
  const partnerId = params.id;
  const t = useTranslations("adminUsuarios");

  const { data: usuarios, isLoading } = useQuery<Usuario[]>({
    queryKey: ["admin-partner-usuarios", partnerId],
    queryFn: () => api.get<Usuario[]>(`/partners/${partnerId}/usuarios`),
  });

  return (
    <div>
      <PartnerHeader partnerId={partnerId} activa="usuarios" />
      {isLoading ? (
        <p className="text-neutral-500">{t("loading")}</p>
      ) : usuarios && usuarios.length > 0 ? (
        <div className="rounded-xl border border-neutral-200 bg-white shadow-sm">
          {usuarios.map((usuario) => (
            <UsuarioRow key={usuario.id} usuario={usuario} partnerId={partnerId} />
          ))}
        </div>
      ) : (
        <p className="rounded-xl border border-dashed border-neutral-300 bg-white p-6 text-center text-neutral-500">{t("empty")}</p>
      )}
    </div>
  );
}
