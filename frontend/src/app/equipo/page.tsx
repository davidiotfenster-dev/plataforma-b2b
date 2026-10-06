"use client";

import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { api } from "@/lib/api";
import { PartnerAvatar } from "@/components/partner-ui";
import { NuevoUsuario } from "@/components/nuevo-usuario";
import type { Usuario } from "@/lib/types";

/// Usuarios de la propia empresa, para su administrador (PARTNER_ADMIN): los ve
/// y da de alta a los que faltan. Cambiar roles o desactivar sigue siendo cosa
/// de IoT FENSTER.
export default function EquipoPage() {
  const t = useTranslations("equipo");
  const tRoles = useTranslations("roles");
  const { data: usuarios, isLoading, isError } = useQuery<Usuario[]>({
    queryKey: ["mi-empresa-usuarios"],
    queryFn: () => api.get<Usuario[]>("/mi-empresa/usuarios"),
  });

  return (
    <div>
      <h1 className="text-2xl font-semibold text-neutral-900">{t("title")}</h1>
      <p className="mb-6 mt-1 text-sm text-neutral-500">{t("subtitle")}</p>

      <NuevoUsuario endpoint="/mi-empresa/usuarios" invalidar={[["mi-empresa-usuarios"]]} />

      {isLoading ? (
        <p className="text-neutral-500">{t("loading")}</p>
      ) : isError ? (
        <p role="alert" className="text-red-600">{t("loadError")}</p>
      ) : (
        <ul className="rounded-xl border border-neutral-200 bg-white shadow-sm">
          {usuarios?.map((usuario) => (
            <li key={usuario.id} className="flex flex-wrap items-center gap-3 border-t border-neutral-100 px-4 py-3 first:border-t-0">
              <PartnerAvatar nombre={usuario.nombre} />
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium text-neutral-900">{usuario.nombre}</p>
                <p className="truncate text-xs text-neutral-500">{usuario.email}</p>
              </div>
              <span className="text-sm text-neutral-600">{tRoles(usuario.rol)}</span>
              <span
                className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${
                  usuario.activo ? "bg-green-50 text-green-800" : "bg-red-50 text-red-700"
                }`}
              >
                <span className={`size-1.5 rounded-full ${usuario.activo ? "bg-green-500" : "bg-red-500"}`} aria-hidden="true" />
                {usuario.activo ? t("active") : t("inactive")}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
