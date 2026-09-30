"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { AlertTriangle, Archive, ArrowLeft, CheckCircle2, X } from "lucide-react";
import { api } from "@/lib/api";
import { EstadoPartnerBadge, PartnerAvatar, tieneDatosPorCompletar } from "@/components/partner-ui";
import { useMe } from "@/hooks/use-me";
import { InsigniaMarca } from "@/lib/marcas";
import type { Partner } from "@/lib/types";
import { usePartnerAcciones } from "./partner-acciones";

export type PestanaPartner = "datos" | "usuarios" | "catalogo";

/// Cabecera común de la ficha de un partner (datos, usuarios y catálogo): quién
/// es, en qué estado está, qué se puede hacer con él y las pestañas para moverse
/// entre sus apartados.
export function PartnerHeader({ partnerId, activa }: { partnerId: string; activa: PestanaPartner }) {
  const t = useTranslations("adminPartners");
  const { data: perfil } = useMe();
  const esAdmin = perfil?.rol === "ADMIN_FENSTER";
  const [mensaje, setMensaje] = useState<string | null>(null);
  const router = useRouter();
  // Al eliminar la empresa, su ficha deja de existir: se vuelve a la lista.
  const acciones = usePartnerAcciones(setMensaje, () => router.push("/admin/partners"));

  const { data: partner, isError } = useQuery<Partner>({
    queryKey: ["admin-partner", partnerId],
    queryFn: () => api.get<Partner>(`/partners/${partnerId}`),
  });

  if (isError) {
    return (
      <div className="mb-6">
        <Link href="/admin/partners" className="inline-flex items-center gap-1 text-sm text-neutral-500 hover:text-neutral-800">
          <ArrowLeft size={14} /> {t("backToList")}
        </Link>
        <p className="mt-4 rounded-md border border-neutral-200 bg-white px-4 py-6 text-neutral-600">{t("notFound")}</p>
      </div>
    );
  }

  const pestanas: { clave: PestanaPartner; href: string; etiqueta: string; cuenta?: number }[] = [
    { clave: "datos", href: `/admin/partners/${partnerId}`, etiqueta: t("tabs.datos") },
    ...(esAdmin
      ? [{ clave: "usuarios" as const, href: `/admin/partners/${partnerId}/usuarios`, etiqueta: t("tabs.usuarios"), cuenta: partner?._count?.usuarios }]
      : []),
    { clave: "catalogo", href: `/admin/partners/${partnerId}/catalogo`, etiqueta: t("tabs.catalogo"), cuenta: partner?._count?.representaciones },
  ];

  return (
    <div className="mb-6">
      <Link href="/admin/partners" className="inline-flex items-center gap-1 text-sm text-neutral-500 hover:text-neutral-800">
        <ArrowLeft size={14} /> {t("backToList")}
      </Link>

      <div className="mt-3 flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          {partner ? <PartnerAvatar nombre={partner.razonSocial} tamano="lg" /> : <span className="size-12 animate-pulse rounded-lg bg-neutral-200" />}
          <div>
            {partner ? (
              <>
                <div className="flex flex-wrap items-center gap-3">
                  <h1 className="text-2xl font-semibold text-neutral-900">{partner.razonSocial}</h1>
                  <EstadoPartnerBadge estado={partner.estado} />
                  {partner.archivadoEn && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-neutral-200 px-2.5 py-1 text-xs font-medium text-neutral-700">
                      <Archive size={11} /> {t("archivedBadge")}
                    </span>
                  )}
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-semibold uppercase tracking-wide ${
                      partner.tipo === "PARTNER" ? "bg-neutral-900 text-white" : "bg-neutral-100 text-neutral-600"
                    }`}
                  >
                    {t(partner.tipo === "PARTNER" ? "typePartner" : "typeClient")}
                  </span>
                  <InsigniaMarca marca={partner.marcaCatalogo} />
                </div>
                <p className="mt-0.5 text-sm text-neutral-500">
                  {[partner.cif, partner.codigoCliente && t("clientCode", { codigo: partner.codigoCliente }), partner.pais]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
              </>
            ) : (
              <span className="block h-8 w-64 animate-pulse rounded bg-neutral-200" />
            )}
          </div>
        </div>

        {partner && (
          <div className="flex flex-wrap gap-2">
            {!partner.archivadoEn && esAdmin && partner.estado === "PENDIENTE_APROBACION" && (
              <>
                <button
                  onClick={() => acciones.pedirAprobar(partner)}
                  className="rounded-md bg-neutral-900 px-3 py-2 text-sm font-medium text-white hover:bg-neutral-700"
                >
                  {t("approve")}
                </button>
                <button
                  onClick={() => acciones.pedirRechazar(partner)}
                  className="rounded-md border border-red-200 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
                >
                  {t("reject")}
                </button>
              </>
            )}
            {!partner.archivadoEn && partner.estado === "ACTIVO" && (
              <button
                onClick={() => acciones.pedirSuspender(partner)}
                className="rounded-md border border-neutral-300 px-3 py-2 text-sm font-medium text-neutral-700 hover:border-red-300 hover:bg-red-50 hover:text-red-600"
              >
                {t("suspend")}
              </button>
            )}
            {!partner.archivadoEn && partner.estado === "SUSPENDIDO" && (
              <button
                onClick={() => acciones.pedirReactivar(partner)}
                className="rounded-md border border-green-300 px-3 py-2 text-sm font-medium text-green-700 hover:bg-green-50"
              >
                {t("reactivate")}
              </button>
            )}
            <button
              onClick={() => (partner.archivadoEn ? acciones.pedirDesarchivar(partner) : acciones.pedirArchivar(partner))}
              className="rounded-md border border-neutral-300 px-3 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
            >
              {partner.archivadoEn ? t("unarchive") : t("archive")}
            </button>
            {/* Solo sin pedidos: con pedidos se archiva (el servidor también lo exige). */}
            {esAdmin && partner._count?.ordenes === 0 && (
              <button
                onClick={() => acciones.pedirEliminar(partner)}
                className="rounded-md border border-red-200 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
              >
                {t("deleteAction")}
              </button>
            )}
          </div>
        )}
      </div>

      {partner?.archivadoEn && (
        <p className="mt-4 flex items-center gap-2 rounded-md border border-neutral-300 bg-neutral-100 px-3 py-2 text-sm text-neutral-700">
          <Archive size={16} className="shrink-0" />
          {t("archivedBanner")}
        </p>
      )}

      {mensaje && (
        <p role="status" className="mt-4 flex items-center justify-between gap-3 rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-800">
          <span className="inline-flex items-center gap-2">
            <CheckCircle2 size={16} /> {mensaje}
          </span>
          <button onClick={() => setMensaje(null)} aria-label={t("dismissMessage")} className="text-green-700 hover:text-green-900">
            <X size={14} />
          </button>
        </p>
      )}

      {partner && tieneDatosPorCompletar(partner) && (
        <p className="mt-4 flex flex-wrap items-center gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          <AlertTriangle size={16} className="shrink-0" />
          <span>{t("incompleteBanner")}</span>
          {activa !== "datos" && (
            <Link href={`/admin/partners/${partnerId}`} className="font-medium underline">
              {t("completeData")}
            </Link>
          )}
        </p>
      )}

      <nav aria-label={t("tabsLabel")} className="mt-5 flex gap-1 border-b border-neutral-200">
        {pestanas.map((p) => (
          <Link
            key={p.clave}
            href={p.href}
            aria-current={p.clave === activa ? "page" : undefined}
            className={`-mb-px border-b-2 px-4 py-2.5 text-sm ${
              p.clave === activa
                ? "border-neutral-900 font-medium text-neutral-900"
                : "border-transparent text-neutral-500 hover:border-neutral-300 hover:text-neutral-800"
            }`}
          >
            {p.etiqueta}
            {p.cuenta !== undefined && (
              <span className="ml-1.5 rounded-full bg-neutral-100 px-1.5 py-0.5 text-xs text-neutral-600">{p.cuenta}</span>
            )}
          </Link>
        ))}
      </nav>

      {acciones.dialogos}
    </div>
  );
}
