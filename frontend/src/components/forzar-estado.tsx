"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { api, ApiError } from "@/lib/api";
import { ESTADOS_PEDIDO, type EstadoPedido, type Order } from "@/lib/types";

export function ForzarEstado({ order, invalidateKeys }: { order: Order; invalidateKeys: unknown[][] }) {
  const queryClient = useQueryClient();
  const t = useTranslations("forzarEstado");
  const tEstados = useTranslations("estados");
  const tCommon = useTranslations("common");
  const [seleccionado, setSeleccionado] = useState<EstadoPedido>(order.estado);
  const [confirmando, setConfirmando] = useState(false);
  const [transportista, setTransportista] = useState("");
  const [numeroExpedicion, setNumeroExpedicion] = useState("");
  const [trackingUrl, setTrackingUrl] = useState("");
  const [error, setError] = useState<string | null>(null);

  const requiereExpedicion = seleccionado === "ENVIADO";

  const forzar = useMutation({
    mutationFn: () =>
      api.patch(`/pedidos/${order.id}/estado`, {
        estado: seleccionado,
        forzar: true,
        ...(requiereExpedicion ? { transportista, numeroExpedicion, trackingUrl } : {}),
      }),
    onSuccess: () => {
      invalidateKeys.forEach((queryKey) => queryClient.invalidateQueries({ queryKey }));
      setConfirmando(false);
    },
    onError: (err) => setError(err instanceof ApiError ? err.message : t("forceError")),
  });

  return (
    // Es una herramienta excepcional: va plegada para que no compita con el flujo normal.
    <details className="group rounded-lg border border-amber-200 bg-amber-50/60 px-4 py-2.5" open={confirmando || undefined}>
      <summary className="cursor-pointer text-sm font-medium text-amber-900">{t("title")}</summary>
      <p className="mb-3 mt-2 text-xs text-amber-700">{t("description")}</p>
      <div className="flex flex-wrap items-center gap-2">
        <select
          value={seleccionado}
          onChange={(e) => setSeleccionado(e.target.value as EstadoPedido)}
          className="rounded-md border border-amber-300 bg-white px-2 py-1.5 text-sm"
        >
          {ESTADOS_PEDIDO.map((estado) => (
            <option key={estado} value={estado}>
              {tEstados(estado)}
            </option>
          ))}
        </select>
        <button
          onClick={() => {
            setError(null);
            setConfirmando(true);
          }}
          disabled={seleccionado === order.estado}
          className="rounded-md border border-amber-400 px-3 py-1.5 text-xs font-medium text-amber-900 hover:bg-amber-100 disabled:opacity-50"
        >
          {t("forceButton")}
        </button>
      </div>

      {confirmando && (
        <div className="mt-3 rounded-md border border-amber-300 bg-white p-3">
          <p className="mb-2 text-sm text-neutral-900">
            {t.rich("confirmText", {
              codigo: order.codigoPed,
              desde: tEstados(order.estado),
              hasta: tEstados(seleccionado),
              b: (chunks) => <strong>{chunks}</strong>,
            })}
          </p>
          {requiereExpedicion && (
            <div className="mb-2 grid grid-cols-1 gap-2 sm:grid-cols-3">
              <input
                placeholder={t("carrierPlaceholder")}
                value={transportista}
                onChange={(e) => setTransportista(e.target.value)}
                className="rounded-md border border-neutral-300 px-2 py-1.5 text-sm"
              />
              <input
                placeholder={t("trackingNumberPlaceholder")}
                value={numeroExpedicion}
                onChange={(e) => setNumeroExpedicion(e.target.value)}
                className="rounded-md border border-neutral-300 px-2 py-1.5 text-sm"
              />
              <input
                placeholder={t("trackingUrlPlaceholder")}
                value={trackingUrl}
                onChange={(e) => setTrackingUrl(e.target.value)}
                className="rounded-md border border-neutral-300 px-2 py-1.5 text-sm"
              />
            </div>
          )}
          {error && <p className="mb-2 text-sm text-red-600">{error}</p>}
          <div className="flex gap-2">
            <button
              onClick={() => forzar.mutate()}
              disabled={forzar.isPending || (requiereExpedicion && (!transportista || !numeroExpedicion || !trackingUrl))}
              className="rounded-md bg-amber-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-amber-700 disabled:opacity-50"
            >
              {forzar.isPending ? t("applying") : t("confirmYes")}
            </button>
            <button
              onClick={() => setConfirmando(false)}
              className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm text-neutral-700 hover:bg-neutral-50"
            >
              {tCommon("cancel")}
            </button>
          </div>
        </div>
      )}
    </details>
  );
}
