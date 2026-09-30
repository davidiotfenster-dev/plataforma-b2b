"use client";

import { useId, type InputHTMLAttributes, type ReactNode, type TextareaHTMLAttributes } from "react";

export const CLASE_INPUT =
  "w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-neutral-500 focus:outline-none focus:ring-1 focus:ring-neutral-300 disabled:bg-neutral-50 disabled:text-neutral-500";

/// Campo de formulario con su etiqueta asociada (clic en la etiqueta enfoca el
/// campo, y los lectores de pantalla leen qué campo es), texto de ayuda y marca
/// de obligatorio.
export function Campo({
  etiqueta,
  ayuda,
  obligatorio = false,
  className = "",
  ...input
}: {
  etiqueta: string;
  ayuda?: string;
  obligatorio?: boolean;
  className?: string;
} & InputHTMLAttributes<HTMLInputElement>) {
  const id = useId();
  return (
    <div className={className}>
      <label htmlFor={id} className="mb-1 block text-sm font-medium text-neutral-700">
        {etiqueta}
        {obligatorio && <span className="ml-0.5 text-red-500" aria-hidden="true">*</span>}
      </label>
      <input id={id} required={obligatorio} aria-describedby={ayuda ? `${id}-ayuda` : undefined} className={CLASE_INPUT} {...input} />
      {ayuda && (
        <p id={`${id}-ayuda`} className="mt-1 text-xs text-neutral-500">
          {ayuda}
        </p>
      )}
    </div>
  );
}

export function CampoTexto({
  etiqueta,
  ayuda,
  className = "",
  ...area
}: {
  etiqueta: string;
  ayuda?: string;
  className?: string;
} & TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const id = useId();
  return (
    <div className={className}>
      <label htmlFor={id} className="mb-1 block text-sm font-medium text-neutral-700">
        {etiqueta}
      </label>
      <textarea id={id} aria-describedby={ayuda ? `${id}-ayuda` : undefined} className={CLASE_INPUT} {...area} />
      {ayuda && (
        <p id={`${id}-ayuda`} className="mt-1 text-xs text-neutral-500">
          {ayuda}
        </p>
      )}
    </div>
  );
}

/// Bloque con título para agrupar campos de un formulario largo.
export function Seccion({ titulo, descripcion, children }: { titulo: string; descripcion?: string; children: ReactNode }) {
  return (
    <section className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm">
      <h2 className="text-sm font-semibold text-neutral-900">{titulo}</h2>
      {descripcion && <p className="mt-0.5 text-xs text-neutral-500">{descripcion}</p>}
      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-6">{children}</div>
    </section>
  );
}
