import { useTranslations } from "next-intl";
import type { EstadoPedido } from "@/lib/types";

const ESTILOS: Record<EstadoPedido, string> = {
  RECIBIDO: "bg-neutral-100 text-neutral-700",
  CONFIRMADO: "bg-blue-100 text-blue-700",
  EN_PREPARACION: "bg-amber-100 text-amber-700",
  PREPARADO: "bg-purple-100 text-purple-700",
  ENVIADO: "bg-green-100 text-green-700",
  CANCELADO: "bg-red-100 text-red-700",
};

export function EstadoBadge({ estado }: { estado: EstadoPedido }) {
  const t = useTranslations("estados");
  return (
    <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${ESTILOS[estado]}`}>{t(estado)}</span>
  );
}
