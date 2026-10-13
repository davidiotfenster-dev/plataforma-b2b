import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ConfigService } from '@nestjs/config';
import { PartnersApiClient } from './partners-api.client.js';
import { PartnersApiAjustesLegalesRepository } from './partners-api-ajustes-legales.repository.js';

const URL_API = 'https://abc.execute-api.eu-west-1.amazonaws.com/v1';
const USER = '0b1c0000-0000-4000-8000-000000000001';
const fetchMock = vi.fn();

function repo() {
  const valores: Record<string, unknown> = { partnersApiUrl: URL_API, partnersApiEsperaReintentoMs: 0 };
  const api = new PartnersApiClient({ get: (clave: string) => valores[clave] } as unknown as ConfigService);
  return new PartnersApiAjustesLegalesRepository(api);
}

function json(estado: number, cuerpo: unknown) {
  return new Response(JSON.stringify(cuerpo), { status: estado, headers: { 'Content-Type': 'application/json' } });
}

function llamada(n = 0) {
  const [url, init] = fetchMock.mock.calls[n] as [string, RequestInit & { headers: Record<string, string> }];
  return { url, ...init };
}

describe('PartnersApiAjustesLegalesRepository', () => {
  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('GET /legal-settings es pública: sin cabeceras de actor ni clave de idempotencia', async () => {
    fetchMock.mockResolvedValueOnce(json(200, { id: null, updatedAt: null }));
    await repo().obtener();
    const { url, method, headers } = llamada();
    expect(url).toBe(`${URL_API}/legal-settings`);
    expect(method).toBe('GET');
    expect(headers['X-Actor-User-Id']).toBeUndefined();
    expect(headers['Idempotency-Key']).toBeUndefined();
    expect(headers['X-Request-Id']).toBeTruthy();
  });

  it('PUT manda el actor y el bloqueo optimista, sin Idempotency-Key', async () => {
    fetchMock.mockResolvedValueOnce(json(200, { id: 'x', updatedAt: '2026-10-13T09:00:00.000Z' }));
    await repo().guardar({ expectedUpdatedAt: '2026-10-08T14:04:31.496Z', telefono: '+34 600 000 000' }, { userId: USER });
    const { url, method, headers, body } = llamada();
    expect(url).toBe(`${URL_API}/admin/legal-settings`);
    expect(method).toBe('PUT');
    expect(headers['X-Actor-User-Id']).toBe(USER);
    expect(headers['X-Actor-Partner-Id']).toBeUndefined();
    expect(headers['Idempotency-Key']).toBeUndefined();
    expect(JSON.parse(body as string)).toEqual({ expectedUpdatedAt: '2026-10-08T14:04:31.496Z', telefono: '+34 600 000 000' });
  });

  it('un 409 CONFLICTO_VERSION llega con su código para que quien llama relea', async () => {
    fetchMock.mockResolvedValueOnce(json(409, { codigo: 'CONFLICTO_VERSION', mensaje: 'Otra persona modificó los ajustes legales antes.' }));
    await expect(repo().guardar({ expectedUpdatedAt: '2026-10-01T00:00:00.000Z' }, { userId: USER })).rejects.toMatchObject({ codigo: 'CONFLICTO_VERSION' });
  });

  it('una escritura sin clave no se reintenta ante un 503', async () => {
    fetchMock.mockResolvedValue(json(503, {}));
    await expect(repo().guardar({ expectedUpdatedAt: null, telefono: 'x' }, { userId: USER })).rejects.toMatchObject({ codigo: 'NO_DISPONIBLE' });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
