import type { Prisma } from '../generated/prisma/client.js';

/// Clave del bloqueo de PostgreSQL que serializa la numeración de pedidos.
const BLOQUEO_NUMERACION_PEDIDOS = 7_310_001;

/// Siguiente código legible de pedido ("PED-000123"): el último número
/// existente + 1, sin huecos. Debe llamarse DENTRO de la transacción que crea
/// el pedido: el bloqueo (`pg_advisory_xact_lock`) dura hasta que esta termina,
/// así que dos confirmaciones simultáneas no pueden sacar el mismo número, y
/// si la transacción falla no se "gasta" ninguno (una secuencia de PostgreSQL
/// sí los gastaría). `codigoPed` es único, así que un choque nunca pasa
/// desapercibido.
export async function siguienteCodigoPedido(tx: Prisma.TransactionClient): Promise<string> {
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(${BLOQUEO_NUMERACION_PEDIDOS})`;
  const [{ ultimo }] = await tx.$queryRaw<{ ultimo: number | null }[]>`
    SELECT MAX(CAST(SUBSTRING("codigoPed" FROM 5) AS INTEGER)) AS ultimo
    FROM "Order"
    WHERE "codigoPed" ~ '^PED-[0-9]+$'`;
  return `PED-${String((ultimo ?? 0) + 1).padStart(6, '0')}`;
}
