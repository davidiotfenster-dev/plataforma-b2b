import { describe, expect, it } from 'vitest';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { RegistroPartnerDto } from './registro-partner.dto.js';

const base = {
  razonSocial: 'Nueva S.L.',
  cif: 'B1',
  direccionFiscal: 'Calle 1',
  pais: 'España',
  dominioWeb: 'nueva.com',
  nombreAdmin: 'Ana',
  emailAdmin: 'ana@nueva.com',
  passwordAdmin: 'clave-muy-larga-123',
};

async function errores(body: Record<string, unknown>) {
  const errs = await validate(plainToInstance(RegistroPartnerDto, body));
  return errs.map((e) => e.property);
}

describe('RegistroPartnerDto', () => {
  it('exige aceptar las condiciones de uso y la privacidad', async () => {
    expect(await errores(base)).toContain('aceptaCondiciones');
    expect(await errores({ ...base, aceptaCondiciones: false })).toContain('aceptaCondiciones');
    expect(await errores({ ...base, aceptaCondiciones: 'true' })).toContain('aceptaCondiciones');
    expect(await errores({ ...base, aceptaCondiciones: true })).toEqual([]);
  });
});
