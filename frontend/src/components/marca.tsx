import type { ReactNode } from "react";

/// Nombre de marca ("IoT FENSTER" + subtítulo pequeño). Un solo sitio para que
/// la tipografía sea idéntica en la barra superior, el login y el pie.
export function Marca({
  subtitulo,
  tamano = "md",
  className = "",
}: {
  subtitulo: ReactNode;
  tamano?: "md" | "lg";
  className?: string;
}) {
  const grande = tamano === "lg";
  return (
    <span className={`whitespace-nowrap font-semibold tracking-tight text-neutral-900 ${grande ? "text-2xl" : "text-lg"} ${className}`}>
      IoT FENSTER <span className={`font-normal text-neutral-500 ${grande ? "text-base" : "text-sm"}`}>{subtitulo}</span>
    </span>
  );
}
