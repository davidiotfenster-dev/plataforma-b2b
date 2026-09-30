import { describe, expect, it } from 'vitest';
import { PedidoPdfService, type DatosPedidoPdf, type LineaPedidoPdf } from './pedido-pdf.service.js';

function linea(i: number): LineaPedidoPdf {
  return {
    skuComercial: `SKU-${i}`,
    nombreProducto: `Producto de prueba número ${i}`,
    cantidad: i,
    pvpHistorico: '100.00',
    descuentoAplicado: '10.00',
    precioNetoUnitario: '90.00',
    totalLinea: String(90 * i),
  };
}

function pedido(lineas: number, notas: string | null = null): DatosPedidoPdf {
  return {
    codigoPed: 'PED-000123',
    razonSocialPartner: 'Cliente de prueba S.L.',
    direccionEnvio: 'Calle Falsa 123\n28001 Madrid',
    poNumber: 'PO-1',
    notas,
    items: Array.from({ length: lineas }, (_, i) => linea(i + 1)),
    totalNeto: '1234.50',
    createdAt: new Date('2026-09-30T10:00:00Z'),
  };
}

/// Número de páginas leyendo los objetos `/Type /Page` del PDF (sin comprimir el árbol de páginas).
function paginas(pdf: Buffer): number {
  return (pdf.toString('latin1').match(/\/Type \/Page\b(?!s)/g) ?? []).length;
}

describe('PedidoPdfService', () => {
  const servicio = new PedidoPdfService();

  it('genera un PDF válido de una página para un pedido corto', async () => {
    const pdf = await servicio.generar(pedido(3, 'Entregar por la mañana'));

    expect(pdf.subarray(0, 5).toString()).toBe('%PDF-');
    expect(paginas(pdf)).toBe(1);
  });

  it('reparte un pedido largo en varias páginas', async () => {
    const pdf = await servicio.generar(pedido(60));

    expect(paginas(pdf)).toBeGreaterThan(1);
  });

  it('se genera igual si no se puede leer el logo', async () => {
    const sinLogo = new PedidoPdfService();
    (sinLogo as unknown as { logo: null }).logo = null;

    const pdf = await sinLogo.generar(pedido(2));

    expect(pdf.subarray(0, 5).toString()).toBe('%PDF-');
  });
});
