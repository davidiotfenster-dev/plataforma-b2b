import { describe, expect, it } from 'vitest';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { ConfirmarPedidoDto } from './confirmar-pedido.dto.js';
import { ActualizarEstadoDto } from './actualizar-estado.dto.js';

async function validar<T extends object>(clase: new () => T, body: Record<string, unknown>) {
  const dto = plainToInstance(clase, body);
  const errores = await validate(dto);
  return { dto, propiedades: errores.map((e) => e.property) };
}

describe('ConfirmarPedidoDto', () => {
  it('rechaza dirección de envío y PO Number escritos solo con espacios', async () => {
    const { propiedades } = await validar(ConfirmarPedidoDto, { direccionEnvio: '   ', poNumber: ' \n\t ' });
    expect(propiedades).toEqual(expect.arrayContaining(['direccionEnvio', 'poNumber']));
  });

  it('guarda los textos sin los espacios sobrantes', async () => {
    const { dto, propiedades } = await validar(ConfirmarPedidoDto, {
      direccionEnvio: '  Calle Mayor 1, Madrid \n',
      poNumber: ' PO-2026-01 ',
      notas: '   ',
    });
    expect(propiedades).toEqual([]);
    expect(dto.direccionEnvio).toBe('Calle Mayor 1, Madrid');
    expect(dto.poNumber).toBe('PO-2026-01');
    expect(dto.notas).toBe('');
  });
});

describe('ActualizarEstadoDto', () => {
  it('no da por enviado un pedido con transportista o expedición en blanco', async () => {
    const { propiedades } = await validar(ActualizarEstadoDto, {
      estado: 'ENVIADO',
      transportista: '  ',
      numeroExpedicion: ' ',
      trackingUrl: ' https://seur.es/t/1 ',
    });
    expect(propiedades).toEqual(['transportista', 'numeroExpedicion']);
  });

  it('no cancela un pedido con el motivo en blanco', async () => {
    const { propiedades } = await validar(ActualizarEstadoDto, { estado: 'CANCELADO', motivoCancelacion: '   ' });
    expect(propiedades).toEqual(['motivoCancelacion']);
  });
});
