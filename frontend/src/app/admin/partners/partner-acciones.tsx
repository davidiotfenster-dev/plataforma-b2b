"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { CheckCircle2 } from "lucide-react";
import { api, ApiError } from "@/lib/api";
import { Campo } from "@/components/campo";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { Modal } from "@/components/modal";
import type { Partner } from "@/lib/types";

type TipoAccion = "rechazar" | "suspender" | "reactivar";

const RUTA_ACCION: Record<TipoAccion, (id: string) => string> = {
  rechazar: (id) => `/auth/partners/${id}/rechazar`,
  suspender: (id) => `/partners/${id}/suspender`,
  reactivar: (id) => `/partners/${id}/reactivar`,
};

/// Todo lo que se puede hacer con el estado de un partner (aprobar, rechazar,
/// suspender, reactivar), con sus ventanas de confirmación. Lo usan a la vez el
/// listado y la ficha, así que se comportan igual en los dos sitios.
///
/// Devuelve funciones para abrir cada acción y `dialogos`, que hay que pintar
/// una vez en la pantalla.
export function usePartnerAcciones(onHecho?: (mensaje: string) => void) {
  const t = useTranslations("adminPartners");
  const queryClient = useQueryClient();
  const [aprobando, setAprobando] = useState<Partner | null>(null);
  const [confirmando, setConfirmando] = useState<{ tipo: TipoAccion; partner: Partner } | null>(null);
  const [error, setError] = useState<string | null>(null);

  function refrescar(partnerId: string) {
    queryClient.invalidateQueries({ queryKey: ["admin-partners"] });
    queryClient.invalidateQueries({ queryKey: ["admin-partners-resumen"] });
    queryClient.invalidateQueries({ queryKey: ["admin-partner", partnerId] });
  }

  const accion = useMutation({
    mutationFn: ({ tipo, partner }: { tipo: TipoAccion; partner: Partner }) => api.post(RUTA_ACCION[tipo](partner.id)),
    onSuccess: (_datos, { tipo, partner }) => {
      refrescar(partner.id);
      setConfirmando(null);
      onHecho?.(t(`done.${tipo}`, { partner: partner.razonSocial }));
    },
    onError: (err) => setError(err instanceof ApiError ? err.message : t("genericError")),
  });

  function pedirConfirmacion(tipo: TipoAccion, partner: Partner) {
    setError(null);
    setConfirmando({ tipo, partner });
  }

  const dialogos: ReactNode = (
    <>
      {aprobando && (
        <AprobarDialog
          partner={aprobando}
          onCerrar={() => setAprobando(null)}
          onAprobado={() => refrescar(aprobando.id)}
        />
      )}
      {confirmando && (
        <ConfirmDialog
          titulo={t(`confirm.${confirmando.tipo}.title`, { partner: confirmando.partner.razonSocial })}
          descripcion={t(`confirm.${confirmando.tipo}.body`)}
          confirmar={t(`confirm.${confirmando.tipo}.button`)}
          peligro={confirmando.tipo !== "reactivar"}
          cargando={accion.isPending}
          error={error}
          onConfirmar={() => accion.mutate(confirmando)}
          onCancelar={() => setConfirmando(null)}
        />
      )}
    </>
  );

  return {
    pedirAprobar: (partner: Partner) => setAprobando(partner),
    pedirRechazar: (partner: Partner) => pedirConfirmacion("rechazar", partner),
    pedirSuspender: (partner: Partner) => pedirConfirmacion("suspender", partner),
    pedirReactivar: (partner: Partner) => pedirConfirmacion("reactivar", partner),
    dialogos,
  };
}

/// Aprobar un partner = fijar sus condiciones comerciales. Al terminar propone
/// el paso natural siguiente: asignarle su catálogo.
function AprobarDialog({ partner, onCerrar, onAprobado }: { partner: Partner; onCerrar: () => void; onAprobado: () => void }) {
  const t = useTranslations("adminPartners");
  const [marcaComercial, setMarcaComercial] = useState(partner.marcaComercial ?? "");
  const [tarifa, setTarifa] = useState(partner.tarifa ?? "");
  const [descuento, setDescuento] = useState(String(Number(partner.descuentoPorcentaje ?? 0)));
  const [hecho, setHecho] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const aprobar = useMutation({
    mutationFn: () =>
      api.post(`/auth/partners/${partner.id}/aprobar`, {
        marcaComercial: marcaComercial.trim(),
        tarifa: tarifa.trim(),
        descuentoPorcentaje: Number(descuento),
      }),
    onSuccess: () => {
      onAprobado();
      setHecho(true);
    },
    onError: (err) => setError(err instanceof ApiError ? err.message : t("approveError")),
  });

  if (hecho) {
    return (
      <Modal titulo={t("approveDoneTitle", { partner: partner.razonSocial })} onCerrar={onCerrar}>
        <div className="flex items-start gap-3">
          <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-green-600" />
          <p className="text-sm text-neutral-600">{t("approveDoneBody")}</p>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <button
            onClick={onCerrar}
            className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm text-neutral-700 hover:bg-neutral-50"
          >
            {t("later")}
          </button>
          <Link
            href={`/admin/partners/${partner.id}/catalogo`}
            className="rounded-md bg-neutral-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-neutral-700"
          >
            {t("assignCatalog")}
          </Link>
        </div>
      </Modal>
    );
  }

  const valido = marcaComercial.trim() && tarifa.trim() && descuento !== "" && Number(descuento) >= 0 && Number(descuento) <= 100;

  return (
    <Modal titulo={t("approveTitle", { partner: partner.razonSocial })} onCerrar={onCerrar} bloqueada={aprobar.isPending}>
      <p className="mb-4 text-sm text-neutral-600">{t("approveIntro")}</p>
      <div className="space-y-4">
        <Campo
          etiqueta={t("fields.marcaComercial")}
          ayuda={t("approveBrandHint")}
          obligatorio
          value={marcaComercial}
          onChange={(e) => setMarcaComercial(e.target.value)}
        />
        <div className="grid grid-cols-2 gap-4">
          <Campo etiqueta={t("fields.tarifa")} obligatorio value={tarifa} onChange={(e) => setTarifa(e.target.value)} />
          <Campo
            etiqueta={t("fields.descuentoPorcentaje")}
            type="number"
            min={0}
            max={100}
            step="0.01"
            obligatorio
            value={descuento}
            onChange={(e) => setDescuento(e.target.value)}
          />
        </div>
      </div>
      {error && (
        <p role="alert" className="mt-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}
      <div className="mt-5 flex justify-end gap-2">
        <button
          onClick={onCerrar}
          disabled={aprobar.isPending}
          className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm text-neutral-700 hover:bg-neutral-50 disabled:opacity-50"
        >
          {t("cancel")}
        </button>
        <button
          onClick={() => {
            setError(null);
            aprobar.mutate();
          }}
          disabled={aprobar.isPending || !valido}
          className="rounded-md bg-neutral-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-neutral-700 disabled:opacity-50"
        >
          {aprobar.isPending ? t("working") : t("confirmApproval")}
        </button>
      </div>
    </Modal>
  );
}
