"use client";

import { useTranslations } from "next-intl";
import { Modal } from "@/components/modal";

/// Confirmación de una acción con consecuencias, explicando qué va a pasar.
/// `peligro` pinta el botón de confirmar en rojo (acciones difíciles de deshacer).
export function ConfirmDialog({
  titulo,
  descripcion,
  confirmar,
  peligro = false,
  cargando = false,
  error,
  onConfirmar,
  onCancelar,
}: {
  titulo: string;
  descripcion: string;
  confirmar: string;
  peligro?: boolean;
  cargando?: boolean;
  error?: string | null;
  onConfirmar: () => void;
  onCancelar: () => void;
}) {
  const t = useTranslations("common");

  return (
    <Modal titulo={titulo} onCerrar={onCancelar} bloqueada={cargando}>
      <p className="text-sm text-neutral-600">{descripcion}</p>
      {error && (
        <p role="alert" className="mt-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}
      <div className="mt-5 flex justify-end gap-2">
        <button
          onClick={onCancelar}
          disabled={cargando}
          className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm text-neutral-700 hover:bg-neutral-50 disabled:opacity-50"
        >
          {t("cancel")}
        </button>
        <button
          onClick={onConfirmar}
          disabled={cargando}
          className={`rounded-md px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50 ${
            peligro ? "bg-red-600 hover:bg-red-700" : "bg-neutral-900 hover:bg-neutral-700"
          }`}
        >
          {cargando ? t("working") : confirmar}
        </button>
      </div>
    </Modal>
  );
}
