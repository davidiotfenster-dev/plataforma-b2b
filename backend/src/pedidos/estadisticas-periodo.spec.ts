import { BadRequestException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';
import { calcularPeriodo, tramosDelPeriodo } from './estadisticas-periodo.js';

describe('calcularPeriodo', () => {
  const ahora = new Date('2026-10-05T15:30:00Z');

  it('sin fechas usa los últimos 30 días, hoy incluido, agrupados por día', () => {
    const p = calcularPeriodo(undefined, undefined, ahora);
    expect(p.desde).toBe('2026-09-06');
    expect(p.hasta).toBe('2026-10-05');
    expect(p.fin.toISOString()).toBe('2026-10-06T00:00:00.000Z');
    expect(p.inicioAnterior.toISOString()).toBe('2026-08-07T00:00:00.000Z');
    expect(p.granularidad).toBe('day');
    expect(tramosDelPeriodo(p)).toHaveLength(30);
  });

  it('agrupa por semana (desde el lunes) en periodos de hasta un año', () => {
    const p = calcularPeriodo('2026-01-01', '2026-10-05', ahora);
    expect(p.granularidad).toBe('week');
    const tramos = tramosDelPeriodo(p);
    expect(tramos[0]).toBe('2025-12-29');
    expect(tramos.at(-1)).toBe('2026-10-05');
  });

  it('agrupa por mes en periodos largos', () => {
    const p = calcularPeriodo('2024-01-15', '2026-10-05', ahora);
    expect(p.granularidad).toBe('month');
    const tramos = tramosDelPeriodo(p);
    expect(tramos[0]).toBe('2024-01-01');
    expect(tramos.at(-1)).toBe('2026-10-01');
    expect(tramos).toHaveLength(34);
  });

  it('rechaza fechas imposibles, invertidas o periodos excesivos', () => {
    expect(() => calcularPeriodo('2026-02-30', undefined, ahora)).toThrow(
      BadRequestException,
    );
    expect(() => calcularPeriodo('2026-10-05', '2026-09-01', ahora)).toThrow(
      BadRequestException,
    );
    expect(() => calcularPeriodo('2010-01-01', '2026-10-05', ahora)).toThrow(
      BadRequestException,
    );
  });
});
