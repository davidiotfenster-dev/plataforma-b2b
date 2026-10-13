import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ConfigService } from '@nestjs/config';
import { PartnersApiClient } from './partners-api.client.js';
import { PartnersApiAdminRepository } from './partners-api-admin.repository.js';
import { PartnersApiEmpresasRepository } from './partners-api-empresas.repository.js';
import { PartnersApiError } from './partners-api.error.js';
import { ejecutarConRequestId } from './contexto-peticion.js';

const URL_API = 'https://abc.execute-api.eu-west-1.amazonaws.com/v1';
const fetchMock = vi.fn();

function cliente(config: Record<string, unknown> = {}) {
  const valores: Record<string, unknown> = { partnersApiUrl: URL_API + '/', partnersApiEsperaReintentoMs: 0, ...config };
  return new PartnersApiClient({ get: (clave: string) => valores[clave] } as unknown as ConfigService);
}

function json(estado: number, cuerpo: unknown) {
  return new Response(JSON.stringify(cuerpo), { status: estado, headers: { 'Content-Type': 'application/json' } });
}

function llamada(n = 0) {
  const [url, init] = fetchMock.mock.calls[n] as [string, RequestInit & { headers: Record<string, string> }];
  return { url, ...init };
}

describe('PartnersApiClient', () => {
  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
  });
  afterEach(() => vi.unstubAllGlobals());

  it('GET: URL con query, X-Request-Id UUID v4 y sin cabeceras de escritura', async () => {
    fetchMock.mockResolvedValue(json(200, { activo: true }));
    await expect(cliente().get('/auth/session/user-001', { profile: true, vacio: undefined })).resolves.toEqual({ activo: true });

    const { url, method, headers, body } = llamada();
    expect(url).toBe(`${URL_API}/auth/session/user-001?profile=true`);
    expect(method).toBe('GET');
    expect(headers['X-Request-Id']).toMatch(/^[0-9a-f-]{36}$/);
    expect(headers['X-Actor-User-Id']).toBeUndefined();
    expect(headers['Idempotency-Key']).toBeUndefined();
    expect(headers['Content-Type']).toBeUndefined();
    expect(body).toBeUndefined();
  });

  it('propaga el X-Request-Id de la petición en curso y la API key si está configurada', async () => {
    fetchMock.mockResolvedValue(json(200, {}));
    const requestId = '123e4567-e89b-42d3-a456-426614174001';
    await ejecutarConRequestId(requestId, () => cliente({ partnersApiKey: 'clave' }).get('/admin/stats'));

    expect(llamada().headers['X-Request-Id']).toBe(requestId);
    expect(llamada().headers['x-api-key']).toBe('clave');
  });

  it('escritura [Idem]: JSON, actor e Idempotency-Key; la misma clave en cada reintento', async () => {
    fetchMock.mockResolvedValueOnce(json(503, {})).mockResolvedValueOnce(json(201, { codigoPed: 'PED-000123' }));
    const repo = new PartnersApiEmpresasRepository(cliente());
    const pedido = await repo.confirmarPedido(
      'company-001',
      { userId: 'user-001', direccionEnvio: 'Calle Mayor 10', poNumber: 'PO-1', notas: null, totalEsperado: '1250.00' },
      { userId: 'user-001', partnerId: 'company-001' },
    );

    expect(pedido.codigoPed).toBe('PED-000123');
    expect(fetchMock).toHaveBeenCalledTimes(2);
    const primera = llamada(0);
    expect(primera.url).toBe(`${URL_API}/companies/company-001/orders`);
    expect(primera.method).toBe('POST');
    expect(primera.headers['Content-Type']).toBe('application/json');
    expect(primera.headers['X-Actor-User-Id']).toBe('user-001');
    expect(primera.headers['X-Actor-Partner-Id']).toBe('company-001');
    expect(JSON.parse(primera.body as string)).toMatchObject({ poNumber: 'PO-1', totalEsperado: '1250.00' });
    expect(primera.headers['Idempotency-Key']).toMatch(/^[0-9a-f-]{36}$/);
    expect(llamada(1).headers['Idempotency-Key']).toBe(primera.headers['Idempotency-Key']);
  });

  it('una escritura sin Idempotency-Key no se reintenta (quitar una línea del carrito)', async () => {
    fetchMock.mockResolvedValue(json(503, {}));
    const repo = new PartnersApiEmpresasRepository(cliente());
    await expect(
      repo.accionCarrito('company-001', 'user-001', { action: 'remove', itemId: 'i' }, { userId: 'user-001' }),
    ).rejects.toMatchObject({ codigo: 'NO_DISPONIBLE' });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(llamada().headers['Idempotency-Key']).toBeUndefined();
  });

  it('añadir al carrito lleva Idempotency-Key y se reintenta con la misma clave (no suma dos veces)', async () => {
    fetchMock.mockResolvedValueOnce(json(503, {})).mockResolvedValueOnce(json(200, { items: [] }));
    const repo = new PartnersApiEmpresasRepository(cliente());
    await repo.accionCarrito('company-001', 'user-001', { action: 'add', repId: 'r', cantidad: 1 }, { userId: 'user-001', partnerId: 'company-001' });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(llamada(0).headers['Idempotency-Key']).toMatch(/^[0-9a-f-]{36}$/);
    expect(llamada(1).headers['Idempotency-Key']).toBe(llamada(0).headers['Idempotency-Key']);
  });

  it('apply-rate: el job real lleva Idempotency-Key y la simulación no', async () => {
    fetchMock.mockImplementation(() => Promise.resolve(json(202, { jobId: 'job-vbh-1', status: 'QUEUED' })));
    const repo = new PartnersApiAdminRepository(cliente());
    await repo.procesoMarca('VBH', { action: 'apply-rate', simulate: true }, { userId: 'user-001' });
    await repo.procesoMarca('VBH', { action: 'apply-rate', simulate: false }, { userId: 'user-001' });

    expect(llamada(0).headers['Idempotency-Key']).toBeUndefined();
    expect(llamada(1).headers['Idempotency-Key']).toMatch(/^[0-9a-f-]{36}$/);
    // El admin de IoT FENSTER no tiene empresa: no se manda X-Actor-Partner-Id en /admin/*.
    expect(llamada(1).headers['X-Actor-User-Id']).toBe('user-001');
    expect(llamada(1).headers['X-Actor-Partner-Id']).toBeUndefined();
    expect(JSON.parse(llamada(1).body as string)).toEqual({ action: 'apply-rate', simulate: false });
  });

  it('un segundo job real de la marca (409 JOB_ALREADY_RUNNING) conserva el código del contrato', async () => {
    fetchMock.mockResolvedValue(json(409, { codigo: 'JOB_ALREADY_RUNNING', mensaje: 'Ya existe un job real en curso' }));
    const error = (await new PartnersApiAdminRepository(cliente())
      .procesoMarca('VBH', { action: 'apply-rate', simulate: false }, { userId: 'user-001' })
      .catch((e: unknown) => e)) as PartnersApiError;
    expect(error.getStatus()).toBe(409);
    expect(error.codigo).toBe('JOB_ALREADY_RUNNING');
  });

  it('GET se reintenta tras un fallo de red y se rinde con 503 tras agotar los intentos', async () => {
    fetchMock.mockRejectedValue(new TypeError('fetch failed'));
    const error = await cliente({ partnersApiReintentos: 2 }).get('/admin/orders').catch((e: unknown) => e);
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(error).toBeInstanceOf(PartnersApiError);
    expect((error as PartnersApiError).getStatus()).toBe(503);
  });

  it('404 de la API → 404 opaco, sin el mensaje de la API', async () => {
    fetchMock.mockResolvedValue(json(404, { codigo: 'NO_ENCONTRADO', mensaje: 'El pedido es de otra empresa', campo: null }));
    const error = (await cliente().get('/companies/c/orders/o').catch((e: unknown) => e)) as PartnersApiError;
    expect(error.getStatus()).toBe(404);
    expect(JSON.stringify(error.getResponse())).not.toContain('otra empresa');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('409 y 422 conservan codigo, mensaje y campo del contrato', async () => {
    fetchMock.mockResolvedValueOnce(json(409, { codigo: 'PRECIOS_CAMBIADOS', mensaje: 'El total ha cambiado', campo: 'totalEsperado' }));
    const conflicto = (await cliente().peticion('POST', '/companies/c/orders', { body: {}, idempotente: true }).catch((e: unknown) => e)) as PartnersApiError;
    expect(conflicto.getStatus()).toBe(409);
    expect(conflicto.getResponse()).toMatchObject({ codigo: 'PRECIOS_CAMBIADOS', message: 'El total ha cambiado', campo: 'totalEsperado' });

    fetchMock.mockResolvedValueOnce(json(422, { codigo: 'VALIDACION', mensaje: 'CIF no válido', campo: 'cif' }));
    const validacion = (await cliente().peticion('POST', '/admin/companies', { body: {} }).catch((e: unknown) => e)) as PartnersApiError;
    expect(validacion.getStatus()).toBe(422);
    expect(validacion.campo).toBe('cif');
  });

  it('un 403 de API Gateway (API key mala o ruta inexistente) no llega al usuario como 403', async () => {
    fetchMock.mockResolvedValue(json(403, { message: 'Forbidden' }));
    const error = (await cliente().get('/admin/stats').catch((e: unknown) => e)) as PartnersApiError;
    expect(error.getStatus()).toBe(503);
    expect(error.estadoRemoto).toBe(403);
  });

  it('sin PARTNERS_API_URL no llama a nada y responde 503', async () => {
    const api = cliente({ partnersApiUrl: '' });
    expect(api.configurada).toBe(false);
    await expect(api.get('/admin/stats')).rejects.toMatchObject({ codigo: 'NO_DISPONIBLE' });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('codifica los ids en la ruta', async () => {
    fetchMock.mockResolvedValue(json(200, {}));
    await new PartnersApiEmpresasRepository(cliente()).pedido('company-001', '../admin/stats');
    expect(llamada().url).toBe(`${URL_API}/companies/company-001/orders/..%2Fadmin%2Fstats`);
  });
});
