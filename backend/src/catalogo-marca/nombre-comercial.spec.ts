import { describe, expect, it } from 'vitest';
import { cuidarNombreComercial } from './nombre-comercial.js';

describe('cuidarNombreComercial', () => {
  it.each([
    ['CONNECT 1 BLANCO', 'Connect 1 Blanco'],
    ['CONNECT 1 + BLANCO', 'Connect 1+ Blanco'],
    ['CONNECT 2 SECURITY NEGRO', 'Connect 2 Security Negro'],
    ['Dispositivo Wave2 blanco', 'Dispositivo Wave2 Blanco'],
    ['Pulsador Wave1+ negro', 'Pulsador Wave1+ Negro'],
    ['Dispositivo WAVE4+ Inox', 'Dispositivo Wave4+ Inox'],
    ['Dispositivo ICON2+ Negro', 'Dispositivo ICON2+ Negro'],
    ['ICON MINI + PLATA', 'ICON Mini+ Plata'],
    ['GreenteQ Funksender WAVE 2S+ BLANCO', 'GreenteQ Funksender Wave 2S+ Blanco'],
    ['GreenteQ Funksender WAVE 3 AIR PLATA', 'GreenteQ Funksender Wave 3 Air Plata'],
    ['C-WALL SHUTTER Inox/Plata', 'C-WALL Shutter Inox/Plata'],
    ['WAVE BLUE', 'Wave Blue'],
    ['ICON BLUE', 'ICON Blue'],
    ['Dispositivo PULSAR+ Inox cable 1.6m', 'Dispositivo Pulsar+ Inox cable 1,6 m'],
    ['Cable datos EVO 1,5 m', 'Cable datos EVO 1,5 m'],
    ['EVO Plus Marrón', 'EVO Plus Marrón'],
    ['Mando Connect (estándar)', 'Mando Connect (estándar)'],
    ['bluConnect', 'bluConnect'],
    ['Botón suelto Pulsar', 'Botón suelto Pulsar'],
  ])('%s -> %s', (entrada, esperado) => {
    expect(cuidarNombreComercial(entrada)).toBe(esperado);
  });

  it('da lo mismo si se aplica dos veces', () => {
    const una = cuidarNombreComercial('CONNECT 1 + BLANCO');
    expect(cuidarNombreComercial(una)).toBe(una);
  });

  it('quita espacios de más', () => {
    expect(cuidarNombreComercial('  CONNECT 1   BLANCO ')).toBe('Connect 1 Blanco');
  });
});
