import { describe, expect, it, vi } from 'vitest';
import type { ConfigService } from '@nestjs/config';
import { AuditoriaRemotaService, type EntradaAuditoria } from './auditoria-remota.service.js';
import type { PartnersApiAuditoriaRepository } from './partners-api-auditoria.repository.js';

const ENTRADA: EntradaAuditoria = {
  level: 'info',
  eventType: 'POST /auth/login',
  userId: 'u1',
  partnerId: 'p1',
  endpoint: '/auth/login',
  method: 'POST',
  statusCode: 200,
};

function servicio(activa: boolean, enviarEventos = vi.fn().mockResolvedValue({ accepted: 1, duplicates: 0 })) {
  const valores: Record<string, unknown> = { partnersApiAuditoria: activa, partnersApiUrl: 'https://x/v1', partnersApiAuditoriaIntervaloMs: 60_000 };
  const config = { get: (clave: string) => valores[clave] } as unknown as ConfigService;
  return { servicio: new AuditoriaRemotaService(config, { enviarEventos } as unknown as PartnersApiAuditoriaRepository), enviarEventos };
}

describe('AuditoriaRemotaService', () => {
  it('apagada no envía nada', async () => {
    const { servicio: s, enviarEventos } = servicio(false);
    s.encolar(ENTRADA);
    await s.enviar();
    expect(enviarEventos).not.toHaveBeenCalled();
  });

  it('envía los eventos con el formato del contrato (eventId, nivel en mayúsculas, fecha ISO)', async () => {
    const { servicio: s, enviarEventos } = servicio(true);
    s.encolar(ENTRADA);
    await s.enviar();
    const [eventos] = enviarEventos.mock.calls[0];
    expect(eventos).toHaveLength(1);
    expect(eventos[0]).toMatchObject({ eventType: 'POST /auth/login', level: 'INFO', userId: 'u1', partnerId: 'p1', statusCode: 200 });
    expect(eventos[0].eventId).toMatch(/^[0-9a-f-]{36}$/);
    expect(eventos[0].timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    await s.onModuleDestroy();
  });

  it('si la API falla, el lote vuelve a la cola y sale en el siguiente envío', async () => {
    const enviarEventos = vi.fn().mockRejectedValueOnce(new Error('caída')).mockResolvedValue({ accepted: 1, duplicates: 0 });
    const { servicio: s } = servicio(true, enviarEventos);
    s.encolar(ENTRADA);
    await s.enviar();
    await s.enviar();
    expect(enviarEventos).toHaveBeenCalledTimes(2);
    expect(enviarEventos.mock.calls[1][0][0].eventId).toBe(enviarEventos.mock.calls[0][0][0].eventId);
    await s.onModuleDestroy();
  });
});
