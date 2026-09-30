import { describe, expect, it } from 'vitest';
import { Idioma } from '../../generated/prisma/enums.js';
import { formatearEuros, formatearPorcentaje, textosPdf } from './pedido-pdf.textos.js';

describe('textos del PDF del pedido', () => {
  it('tiene todos los rótulos en cada idioma, con las 7 columnas de la tabla', () => {
    for (const idioma of Object.values(Idioma)) {
      const t = textosPdf(idioma);
      expect(t.columnas).toHaveLength(7);
      expect(t.cabecera).not.toBe('');
      expect(t.pagina(2, 5)).toContain('2');
      expect(t.tituloDocumento('PED-000001')).toContain('PED-000001');
    }
  });

  it('usa español si no se indica idioma', () => {
    expect(textosPdf(undefined).cabecera).toBe('CONFIRMACIÓN DE PEDIDO');
  });

  it('formatea los importes con los separadores de cada idioma, siempre con separador de miles', () => {
    expect(formatearEuros('1234.5', textosPdf(Idioma.ES))).toBe('1.234,50 €');
    expect(formatearEuros('1234.5', textosPdf(Idioma.DE))).toBe('1.234,50 €');
    expect(formatearEuros('1234.5', textosPdf(Idioma.EN))).toBe('€1,234.50');
    expect(formatearEuros('999', textosPdf(Idioma.ES))).toBe('999,00 €');
    expect(formatearEuros('12345678.9', textosPdf(Idioma.IT))).toBe('12.345.678,90 €');
    expect(formatearEuros('-5', textosPdf(Idioma.EN))).toBe('-€5.00');
  });

  it('formatea el descuento y enseña un guion cuando no hay', () => {
    expect(formatearPorcentaje('10.00', textosPdf(Idioma.ES))).toBe('10 %');
    expect(formatearPorcentaje('12.5', textosPdf(Idioma.ES))).toBe('12,5 %');
    expect(formatearPorcentaje('12.5', textosPdf(Idioma.EN))).toBe('12.5%');
    expect(formatearPorcentaje('0.00', textosPdf(Idioma.DE))).toBe('—');
  });
});
