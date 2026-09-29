import type { EstadoPedido } from "@/lib/types";
import { EstadoBadge } from "@/components/estado-badge";

const SECUENCIA: EstadoPedido[] = ["RECIBIDO", "CONFIRMADO", "EN_PREPARACION", "PREPARADO", "ENVIADO"];

export function EstadoLegend({ actual }: { actual: EstadoPedido }) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {SECUENCIA.map((estado, i) => (
        <span key={estado} className="flex items-center gap-1.5">
          <span className={estado === actual ? "" : "opacity-40"}>
            <EstadoBadge estado={estado} />
          </span>
          {i < SECUENCIA.length - 1 && <span className="text-neutral-300">→</span>}
        </span>
      ))}
    </div>
  );
}
