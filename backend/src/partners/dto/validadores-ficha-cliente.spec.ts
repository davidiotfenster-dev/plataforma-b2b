import 'reflect-metadata';
import { describe, expect, it } from 'vitest';
import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { CIF_REGEX, esDominioGratuito } from './validadores-ficha-cliente.js';
import { CrearPartnerDto } from './crear-partner.dto.js';

describe('CIF', () => {
  it.each(['B12345678', 'ESB-12345678', 'DE 123456789', 'IT01234567890', 'PENDIENTE-3F2A'])('acepta %s', (cif) => {
    expect(CIF_REGEX.test(cif)).toBe(true);
  });
  it.each(['1', 'B1', '---', 'ab', 'B123 <script>', ''])('rechaza «%s»', (cif) => {
    expect(CIF_REGEX.test(cif)).toBe(false);
  });
});

describe('dominios de correo gratuito', () => {
  it('detecta los habituales sin importar mayúsculas', () => {
    expect(esDominioGratuito('gmail.com')).toBe(true);
    expect(esDominioGratuito('Outlook.com')).toBe(true);
    expect(esDominioGratuito('iotfenster.com')).toBe(false);
  });

  it('el alta de una empresa rechaza gmail.com como dominio y un CIF absurdo', () => {
    const dto = plainToInstance(CrearPartnerDto, {
      razonSocial: 'X', cif: ' 1 ', direccionFiscal: 'C/ 1', pais: 'ES', dominioWeb: 'gmail.com',
      nombreUsuario: 'Ana', emailUsuario: 'ana@x.com', passwordUsuario: 'clave-larga-1',
    });
    const campos = validateSync(dto).map((e) => e.property);
    expect(campos).toEqual(expect.arrayContaining(['cif', 'dominioWeb']));
  });
});
