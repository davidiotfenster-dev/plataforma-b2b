import { describe, expect, it } from 'vitest';
import { representacionDisponible } from './catalogo-marca.service.js';

describe('representacionDisponible', () => {
  it('está disponible si ni la empresa, ni el producto base, ni la marca lo han ocultado', () => {
    expect(representacionDisponible({ activo: true, productoBase: { activo: true }, productoMarca: { activo: true } })).toBe(true);
    expect(representacionDisponible({ activo: true, productoBase: { activo: true }, productoMarca: null })).toBe(true);
  });

  it.each([
    ['la empresa lo oculta', { activo: false, productoBase: { activo: true }, productoMarca: null }],
    ['se desactiva el producto base', { activo: true, productoBase: { activo: false }, productoMarca: null }],
    ['se desactiva en la marca', { activo: true, productoBase: { activo: true }, productoMarca: { activo: false } }],
  ])('no lo está si %s', (_caso, rep) => {
    expect(representacionDisponible(rep)).toBe(false);
  });
});
