import { describe, expect, it, vi } from 'vitest';
import { siguienteCodigoPedido } from './codigo-pedido.js';
import type { Prisma } from '../generated/prisma/client.js';

const tx = (ultimo: number | null) =>
  ({
    $executeRaw: vi.fn().mockResolvedValue(1),
    $queryRaw: vi.fn().mockResolvedValue([{ ultimo }]),
  }) as unknown as Prisma.TransactionClient & { $executeRaw: ReturnType<typeof vi.fn> };

describe('siguienteCodigoPedido', () => {
  it('sigue al último pedido existente, sin huecos', async () => {
    expect(await siguienteCodigoPedido(tx(6))).toBe('PED-000007');
  });

  it('empieza en PED-000001 si no hay pedidos', async () => {
    expect(await siguienteCodigoPedido(tx(null))).toBe('PED-000001');
  });

  it('bloquea la numeración antes de leer el último número', async () => {
    const t = tx(41);
    await siguienteCodigoPedido(t);
    expect(t.$executeRaw).toHaveBeenCalledTimes(1);
    expect(t.$executeRaw.mock.invocationCallOrder[0]).toBeLessThan(
      (t.$queryRaw as unknown as ReturnType<typeof vi.fn>).mock.invocationCallOrder[0],
    );
  });

  it('pasa de 6 cifras sin romperse', async () => {
    expect(await siguienteCodigoPedido(tx(999_999))).toBe('PED-1000000');
  });
});
