import { describe, expect, it } from 'vitest';
import { especificacionesParaPartner, varianteParaPartner } from './especificaciones-partner.js';

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

describe('varianteParaPartner', () => {
  const json = (color: string) => ({ grupo: 'Connect-1 / Wave-1 / Icon1', color });
  it('agrupa los colores del mismo modelo y no filtra texto de otras marcas', () => {
    const b = varianteParaPartner(json('Blanco'), 'Connect-1 / Wave-1 / Icon1 Blanco', 'p1');
    const n = varianteParaPartner(json('Negro'), 'Connect-1 / Wave-1 / Icon1 Negro', 'p1');
    expect(b.modeloId).toBe(n.modeloId);
    expect(b.color).toBe('Blanco');
    expect(b.modeloId).not.toMatch(/wave|connect|icon/i);
  });
  it('el identificador cambia de un partner a otro', () => {
    const a = varianteParaPartner(json('Blanco'), 'X Blanco', 'p1');
    const b = varianteParaPartner(json('Blanco'), 'X Blanco', 'p2');
    expect(a.modeloId).not.toBe(b.modeloId);
  });
});
