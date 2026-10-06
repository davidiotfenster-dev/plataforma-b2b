import 'reflect-metadata';
import { describe, expect, it } from 'vitest';
import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { ActualizarProductoMarcaDto } from './catalogo-marca.dto.js';

const errores = (pvpBase: unknown) => validateSync(plainToInstance(ActualizarProductoMarcaDto, { pvpBase })).length;

describe('PVP al editar un producto de marca', () => {
  it('acepta un PVP normal con hasta dos decimales', () => {
    expect(errores(82)).toBe(0);
    expect(errores(73.8)).toBe(0);
  });

  it('rechaza cero, negativos, más de dos decimales y un PVP disparatado', () => {
    expect(errores(0)).toBeGreaterThan(0);
    expect(errores(-5)).toBeGreaterThan(0);
    expect(errores(10.123)).toBeGreaterThan(0);
    expect(errores(820_000)).toBeGreaterThan(0);
  });
});
