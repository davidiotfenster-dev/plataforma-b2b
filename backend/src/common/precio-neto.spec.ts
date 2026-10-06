import { describe, expect, it } from 'vitest';
import { Prisma } from '../generated/prisma/client.js';
import { calcularPrecioNeto } from './precio-neto.js';

const D = (n: number | string) => new Prisma.Decimal(n);

describe('calcularPrecioNeto', () => {
  it('resta el descuento al PVP', () => {
    expect(calcularPrecioNeto(D(98), D(50)).toString()).toBe('49');
    expect(calcularPrecioNeto(D(82), D(10)).toString()).toBe('73.8');
  });

  it('sin descuento es el PVP, y con 100 % es cero', () => {
    expect(calcularPrecioNeto(D(20), D(0)).toString()).toBe('20');
    expect(calcularPrecioNeto(D(20), D(100)).toString()).toBe('0');
  });

  it('redondea a 2 decimales', () => {
    expect(calcularPrecioNeto(D('33.33'), D('7.5')).toString()).toBe('30.83');
  });
});
