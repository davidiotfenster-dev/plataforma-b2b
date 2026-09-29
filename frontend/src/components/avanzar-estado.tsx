"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { api, ApiError } from "@/lib/api";
import type { EstadoPedido, Order } from "@/lib/types";

const SIGUIENTE_ESTADO: Record<EstadoPedido, EstadoPedido | null> = {
  RECIBIDO: "CONFIRMADO",
  CONFIRMADO: "EN_PREPARACION",
  EN_PREPARACION: "PREPARADO",
  PREPARADO: "ENVIADO",
  ENVIADO: null,
  CANCELADO: null,
};

export function AvanzarEstado({ order, invalidateKeys }: { order: Order; invalidateKeys: unknown[][] }) {
  const queryClient = useQueryClient();
  const t = useTranslations("avanzarEstado");
  const tEstados = useTranslations("estados");
  const siguiente = SIGUIENTE_ESTADO[order.estado];
  const [mostrarExpedicion, setMostrarExpedicion] = useState(false);
  const [transportista, setTransportista] = useState("");
  const [numeroExpedicion, setNumeroExpedicion] = useState("");
  const [trackingUrl, setTrackingUrl] = useState("");
  const [error, setError] = useState<string | null>(null);

  const avanzar = useMutation({
    mutationFn: () =>
      api.patch(`/pedidos/${order.id}/estado`, {
        estado: siguiente,
        ...(siguiente === "ENVIADO" ? { transportista, numeroExpedicion, trackingUrl } : {}),
      }),
    onSuccess: () => {
      invalidateKeys.forEach((queryKey) => queryClient.invalidateQueries({ queryKey }));
      setMostrarExpedicion(false);
    },
    onError: (err) => setError(err instanceof ApiError ? err.message : t("advanceError")),
  });

  if (!siguiente) return null;

  if (siguiente === "ENVIADO" && mostrarExpedicion) {
    return (
      <div
        onClick={(e) => e.stopPropagation()}
        className="mt-2 grid grid-cols-1 gap-2 rounded-md bg-neutral-50 p-3 sm:grid-cols-4"
      >
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
        <button
          onClick={() => {
            setError(null);
            avanzar.mutate();
          }}
          disabled={avanzar.isPending || !transportista || !numeroExpedicion || !trackingUrl}
          className="rounded-md bg-neutral-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-neutral-700 disabled:opacity-50"
        >
          {t("markAsShipped")}
        </button>
        {error && <p className="col-span-4 text-sm text-red-600">{error}</p>}
      </div>
    );
  }

  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        if (siguiente === "ENVIADO") {
          setMostrarExpedicion(true);
        } else {
          avanzar.mutate();
        }
      }}
      disabled={avanzar.isPending}
      className="rounded-md border border-neutral-300 px-3 py-1.5 text-xs font-medium text-neutral-700 hover:bg-neutral-50 disabled:opacity-50"
    >
      {t("advanceTo", { estado: tEstados(siguiente) })}
    </button>
  );
}
