import { describe, expect, it } from 'vitest';
import { direccionEnvioPorDefecto } from './auth.service.js';

const vacia = { direccionEnvioDefecto: null, codigoPostalEnvio: null, localidadEnvio: null, provinciaEnvio: null, paisEnvio: null };

describe('direccionEnvioPorDefecto', () => {
  it('sin calle guardada no propone nada', () => {
    expect(direccionEnvioPorDefecto(vacia)).toBeNull();
    expect(direccionEnvioPorDefecto({ ...vacia, direccionEnvioDefecto: '   ', localidadEnvio: 'Murcia' })).toBeNull();
  });

  it('escribe la ficha en líneas y se salta lo que falta', () => {
    expect(
      direccionEnvioPorDefecto({ direccionEnvioDefecto: 'C/ Mayor 1', codigoPostalEnvio: '30001', localidadEnvio: 'Murcia', provinciaEnvio: 'Murcia', paisEnvio: 'España' }),
    ).toBe('C/ Mayor 1\n30001 Murcia\nMurcia España');
    expect(direccionEnvioPorDefecto({ ...vacia, direccionEnvioDefecto: 'C/ Mayor 1', paisEnvio: 'España' })).toBe('C/ Mayor 1\nEspaña');
  });
});
