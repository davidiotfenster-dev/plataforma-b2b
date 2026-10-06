import { Prisma } from '../generated/prisma/client.js';

/// Precio neto unitario = PVP − descuento, calculado siempre en el servidor
/// (nunca se confía en un precio enviado por el cliente), con redondeo a 2
/// decimales (moneda). Es la única fórmula: catálogo, carrito y pedido la
/// comparten para que el cliente vea el mismo precio que luego se le congela.
export function calcularPrecioNeto(pvpBase: Prisma.Decimal, descuentoPorcentaje: Prisma.Decimal): Prisma.Decimal {
  const factor = new Prisma.Decimal(1).minus(descuentoPorcentaje.dividedBy(100));
  return pvpBase.times(factor).toDecimalPlaces(2);
}
