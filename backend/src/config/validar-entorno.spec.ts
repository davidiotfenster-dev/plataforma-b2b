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
});
