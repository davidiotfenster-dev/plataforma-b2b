"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { api, ApiError } from "@/lib/api";
import type { Order } from "@/lib/types";

export function CancelarPedido({ order, invalidateKeys }: { order: Order; invalidateKeys: unknown[][] }) {
  const queryClient = useQueryClient();
  const t = useTranslations("cancelarPedido");
  const [abierto, setAbierto] = useState(false);
  const [motivo, setMotivo] = useState("");
  const [error, setError] = useState<string | null>(null);

  const cancelar = useMutation({
    mutationFn: () => api.patch(`/pedidos/${order.id}/estado`, { estado: "CANCELADO", motivoCancelacion: motivo }),
    onSuccess: () => {
      invalidateKeys.forEach((queryKey) => queryClient.invalidateQueries({ queryKey }));
      setAbierto(false);
      setMotivo("");
    },
    onError: (err) => setError(err instanceof ApiError ? err.message : t("error")),
  });

  const reactivar = useMutation({
    mutationFn: () => api.patch(`/pedidos/${order.id}/estado`, { estado: "RECIBIDO", forzar: true }),
    onSuccess: () => invalidateKeys.forEach((queryKey) => queryClient.invalidateQueries({ queryKey })),
    onError: (err) => setError(err instanceof ApiError ? err.message : t("error")),
  });

  if (order.estado === "ENVIADO") return null;

  if (order.estado === "CANCELADO") {
    return (
      <button
        onClick={(e) => {
          e.stopPropagation();
          setError(null);
          reactivar.mutate();
        }}
        disabled={reactivar.isPending}
        className="rounded-md border border-neutral-300 px-3 py-1.5 text-xs font-medium text-neutral-700 hover:bg-neutral-50 disabled:opacity-50"
      >
        {reactivar.isPending ? t("reactivating") : t("reactivate")}
      </button>
    );
  }

  if (!abierto) {
    return (
      <button
        onClick={(e) => {
          e.stopPropagation();
          setAbierto(true);
        }}
        className="rounded-md border border-red-200 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-50"
      >
        {t("cancel")}
      </button>
    );
  }

  return (
    <div onClick={(e) => e.stopPropagation()} className="mt-2 w-full rounded-md border border-red-200 bg-red-50 p-3">
      <p className="mb-2 text-xs font-medium text-red-900">{t("reasonPrompt")}</p>
      <textarea
        value={motivo}
        onChange={(e) => setMotivo(e.target.value)}
        rows={2}
        className="mb-2 w-full rounded-md border border-red-200 px-2 py-1.5 text-sm"
        placeholder={t("reasonPlaceholder")}
      />
      {error && <p className="mb-2 text-xs text-red-600">{error}</p>}
      <div className="flex gap-2">
        <button
          onClick={() => {
            setError(null);
            cancelar.mutate();
          }}
          disabled={cancelar.isPending || !motivo.trim()}
          className="rounded-md bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-700 disabled:opacity-50"
        >
          {cancelar.isPending ? t("cancelling") : t("confirm")}
        </button>
        <button
          onClick={() => setAbierto(false)}
          className="rounded-md border border-neutral-300 px-3 py-1.5 text-xs text-neutral-700 hover:bg-neutral-50"
        >
          {t("dismiss")}
        </button>
      </div>
    </div>
  );
}
