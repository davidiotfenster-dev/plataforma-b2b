import { describe, expect, it } from 'vitest';
import { validarEntorno } from './validar-entorno.js';

const BASE = {
  DATABASE_URL: 'postgresql://u:p@localhost:5432/db',
  JWT_SECRET: 'x'.repeat(32),
  REDIS_URL: 'redis://localhost:6379',
  FRONTEND_URL: 'https://portal.example',
  RESEND_API_KEY: 're_test',
};

describe('validarEntorno', () => {
  it('no da errores ni avisos con todo configurado', () => {
    expect(validarEntorno(BASE)).toEqual({ errores: [], avisos: [] });
  });

  it('exige DATABASE_URL y un JWT_SECRET largo', () => {
    const { errores } = validarEntorno({ ...BASE, DATABASE_URL: undefined, JWT_SECRET: 'corto' });
    expect(errores).toHaveLength(2);
  });

  it('rechaza un TRUST_PROXY que no sea un número', () => {
    expect(validarEntorno({ ...BASE, TRUST_PROXY: 'true' }).errores).toHaveLength(1);
    expect(validarEntorno({ ...BASE, TRUST_PROXY: '1' }).errores).toHaveLength(0);
  });

  it('solo avisa si falta Redis o el correo', () => {
    const r = validarEntorno({ ...BASE, REDIS_URL: undefined, RESEND_API_KEY: undefined });
    expect(r.errores).toHaveLength(0);
    expect(r.avisos).toHaveLength(2);
  });

  it('con SES basta EMAIL_PROVEEDOR=ses: no avisa de falta de proveedor, y pide EMAIL_FROM', () => {
    const r = validarEntorno({ ...BASE, RESEND_API_KEY: undefined, EMAIL_PROVEEDOR: 'SES' });
    expect(r.errores).toHaveLength(0);
    expect(r.avisos).toHaveLength(1);
    expect(r.avisos[0]).toMatch(/EMAIL_FROM/);
    expect(validarEntorno({ ...BASE, RESEND_API_KEY: undefined, EMAIL_PROVEEDOR: 'ses', EMAIL_FROM: 'a@b.com' }).avisos).toEqual([]);
  });

  it('un EMAIL_PROVEEDOR mal escrito para el arranque, y un logo sin https avisa', () => {
    expect(validarEntorno({ ...BASE, EMAIL_PROVEEDOR: 'sess' }).errores).toHaveLength(1);
    expect(validarEntorno({ ...BASE, EMAIL_LOGO_URL: 'http://x/logo.png' }).avisos).toHaveLength(1);
    expect(validarEntorno({ ...BASE, EMAIL_LOGO_URL: 'https://x/logo.png' }).avisos).toEqual([]);
  });
});
