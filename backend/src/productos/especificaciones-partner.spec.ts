import { describe, expect, it } from 'vitest';
import { especificacionesParaPartner } from './especificaciones-partner.js';

describe('especificacionesParaPartner (lista blanca)', () => {
  it('solo devuelve lo que cuelga de `publicas`', () => {
    const resultado = especificacionesParaPartner({
      grupo: 'Wave1 / ICON1',
      color: 'Negro',
      pendiente: 'Sin GTIN',
      referencias: [{ marca: 'PROCOMSA', nombre: 'ICON1', refInterna: 'ICON1N', gtin: '8437025278176' }],
      publicas: { Botones: '2' },
    });
    expect(resultado).toEqual({ Botones: '2' });
  });

  it('lo interno es privado por defecto: una clave nueva fuera de `publicas` no se filtra', () => {
    expect(especificacionesParaPartner({ Botones: '2', gtin: '8437025278176', codigoErp: '3579' })).toBeNull();
  });

  it('descarta valores que no son simples (objetos, arrays) dentro de `publicas`', () => {
    expect(especificacionesParaPartner({ publicas: { Tension: 230, Extra: { a: 1 }, Lista: [1] } })).toEqual({ Tension: 230 });
  });

  it('devuelve null si no queda nada visible o la entrada no es un objeto', () => {
    expect(especificacionesParaPartner({ grupo: 'X' })).toBeNull();
    expect(especificacionesParaPartner({ publicas: {} })).toBeNull();
    expect(especificacionesParaPartner({ publicas: ['a'] })).toBeNull();
    expect(especificacionesParaPartner(null)).toBeNull();
    expect(especificacionesParaPartner(['a'])).toBeNull();
  });
});
