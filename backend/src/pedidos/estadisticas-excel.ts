import ExcelJS from 'exceljs';
import type { Prisma } from '../generated/prisma/client.js';
import type { EstadoPedido, MarcaCatalogo } from '../generated/prisma/enums.js';

const FORMATO_EUROS = '#,##0.00 "€"';
const FORMATO_PORCENTAJE = '0.0%';

const NOMBRE_ESTADO: Record<EstadoPedido, string> = {
  RECIBIDO: 'Recibido',
  CONFIRMADO: 'Confirmado',
  EN_PREPARACION: 'En preparación',
  PREPARADO: 'Preparado',
  ENVIADO: 'Enviado',
  CANCELADO: 'Cancelado',
};

const ORDEN_ESTADOS = Object.keys(NOMBRE_ESTADO) as EstadoPedido[];

const NOMBRE_MARCA: Record<MarcaCatalogo, string> = {
  VBH: 'VBH · Wave',
  PROCOMSA: 'Procomsa · ICON',
  MYSMARTWINDOW: 'MySmartWindow · Connect',
};

const NOMBRE_GRANULARIDAD = {
  day: 'Día',
  week: 'Semana (desde el lunes)',
  month: 'Mes',
} as const;

/// Lo que devuelve `PedidosService.calcularEstadisticas` (sin límite de filas).
export interface DatosEstadisticas {
  periodo: {
    desde: string;
    hasta: string;
    granularidad: keyof typeof NOMBRE_GRANULARIDAD;
  };
  kpis: {
    pedidos: number;
    facturado: number;
    ticketMedio: number;
    sinEnviar: number;
    cancelados: number;
  };
  periodoAnterior: { pedidos: number; facturado: number };
  serie: { tramo: string; pedidos: number; facturado: number }[];
  porEstado: { estado: EstadoPedido; cantidad: number; facturado: number }[];
  porMarca: { marca: string; pedidos: number; facturado: number }[];
  topEmpresas: {
    razonSocial: string;
    marca: MarcaCatalogo | null;
    pedidos: number;
    facturado: number;
  }[];
  topProductos: {
    sku: string;
    nombre: string;
    unidades: number;
    facturado: number;
  }[];
}

export interface PedidoExportado {
  codigoPed: string;
  createdAt: Date;
  estado: EstadoPedido;
  poNumber: string;
  totalNeto: Prisma.Decimal;
  partner: { razonSocial: string; marcaCatalogo: MarcaCatalogo };
  _count: { items: number };
}

const fecha = (iso: string) => new Date(`${iso}T00:00:00.000Z`);
const marca = (m: string | null) =>
  m ? (NOMBRE_MARCA[m as MarcaCatalogo] ?? m) : '';

/// Hoja con cabecera fija, autofiltro y formato por columna.
function hojaTabla(
  libro: ExcelJS.Workbook,
  nombre: string,
  columnas: { header: string; key: string; width: number; numFmt?: string }[],
  filas: Record<string, unknown>[],
) {
  const hoja = libro.addWorksheet(nombre, {
    views: [{ state: 'frozen', ySplit: 1 }],
  });
  hoja.columns = columnas.map((c) => ({
    header: c.header,
    key: c.key,
    width: c.width,
    style: c.numFmt ? { numFmt: c.numFmt } : {},
  }));
  hoja.getRow(1).font = { bold: true };
  hoja.addRows(filas);
  hoja.autoFilter = {
    from: { row: 1, column: 1 },
    to: { row: 1, column: columnas.length },
  };
  return hoja;
}

export async function generarExcelEstadisticas(
  datos: DatosEstadisticas,
  pedidos: PedidoExportado[],
  filtros: { marca?: MarcaCatalogo; empresa?: string },
): Promise<Buffer> {
  const libro = new ExcelJS.Workbook();
  libro.creator = 'IoT FENSTER · Portal Partner';
  libro.created = new Date();

  const resumen = libro.addWorksheet('Resumen');
  resumen.columns = [{ width: 34 }, { width: 22 }, { width: 22 }];
  const variacion = (actual: number, anterior: number) =>
    anterior > 0 ? (actual - anterior) / anterior : null;
  const ticketAnterior =
    datos.periodoAnterior.pedidos > 0
      ? datos.periodoAnterior.facturado / datos.periodoAnterior.pedidos
      : 0;
  resumen.addRows([
    ['Estadísticas de pedidos · IoT FENSTER'],
    [],
    ['Desde', fecha(datos.periodo.desde)],
    ['Hasta', fecha(datos.periodo.hasta)],
    ['Marca', filtros.marca ? NOMBRE_MARCA[filtros.marca] : 'Todas'],
    ['Empresa', filtros.empresa ?? 'Todas'],
    [],
    ['Cifra', 'Periodo', 'Variación vs periodo anterior'],
    [
      'Facturación',
      datos.kpis.facturado,
      variacion(datos.kpis.facturado, datos.periodoAnterior.facturado),
    ],
    [
      'Pedidos',
      datos.kpis.pedidos,
      variacion(datos.kpis.pedidos, datos.periodoAnterior.pedidos),
    ],
    [
      'Pedido medio',
      datos.kpis.ticketMedio,
      variacion(datos.kpis.ticketMedio, ticketAnterior),
    ],
    ['Pedidos sin enviar', datos.kpis.sinEnviar],
    ['Pedidos cancelados (no cuentan)', datos.kpis.cancelados],
    [],
    [
      'Los pedidos cancelados no suman en facturación, pedidos, evolución, marcas, empresas ni productos.',
    ],
  ]);
  resumen.getCell('A1').font = { bold: true, size: 14 };
  resumen.getRow(8).font = { bold: true };
  resumen.getCell('B3').numFmt = 'dd/mm/yyyy';
  resumen.getCell('B4').numFmt = 'dd/mm/yyyy';
  for (const fila of [9, 11])
    resumen.getCell(`B${fila}`).numFmt = FORMATO_EUROS;
  for (const fila of [9, 10, 11])
    resumen.getCell(`C${fila}`).numFmt = FORMATO_PORCENTAJE;
  resumen.getCell('A15').font = { italic: true, color: { argb: 'FF737373' } };

  hojaTabla(
    libro,
    'Evolución',
    [
      {
        header: NOMBRE_GRANULARIDAD[datos.periodo.granularidad],
        key: 'tramo',
        width: 24,
        numFmt: 'dd/mm/yyyy',
      },
      { header: 'Pedidos', key: 'pedidos', width: 12 },
      {
        header: 'Facturación',
        key: 'facturado',
        width: 16,
        numFmt: FORMATO_EUROS,
      },
    ],
    datos.serie.map((s) => ({ ...s, tramo: fecha(s.tramo) })),
  );

  hojaTabla(
    libro,
    'Por estado',
    [
      { header: 'Estado', key: 'estado', width: 18 },
      { header: 'Pedidos', key: 'cantidad', width: 12 },
      { header: 'Importe', key: 'facturado', width: 16, numFmt: FORMATO_EUROS },
    ],
    [...datos.porEstado]
      .sort(
        (a, b) =>
          ORDEN_ESTADOS.indexOf(a.estado) - ORDEN_ESTADOS.indexOf(b.estado),
      )
      .map((e) => ({ ...e, estado: NOMBRE_ESTADO[e.estado] })),
  );

  hojaTabla(
    libro,
    'Por marca',
    [
      { header: 'Marca', key: 'marca', width: 26 },
      { header: 'Pedidos', key: 'pedidos', width: 12 },
      {
        header: 'Facturación',
        key: 'facturado',
        width: 16,
        numFmt: FORMATO_EUROS,
      },
      {
        header: '% del total',
        key: 'cuota',
        width: 12,
        numFmt: FORMATO_PORCENTAJE,
      },
    ],
    datos.porMarca.map((m) => ({
      ...m,
      marca: marca(m.marca),
      cuota: datos.kpis.facturado > 0 ? m.facturado / datos.kpis.facturado : 0,
    })),
  );

  hojaTabla(
    libro,
    'Empresas',
    [
      { header: 'Empresa', key: 'razonSocial', width: 36 },
      { header: 'Marca', key: 'marca', width: 26 },
      { header: 'Pedidos', key: 'pedidos', width: 12 },
      {
        header: 'Facturación',
        key: 'facturado',
        width: 16,
        numFmt: FORMATO_EUROS,
      },
    ],
    datos.topEmpresas.map((e) => ({ ...e, marca: marca(e.marca) })),
  );

  hojaTabla(
    libro,
    'Productos',
    [
      { header: 'SKU', key: 'sku', width: 22 },
      { header: 'Producto', key: 'nombre', width: 40 },
      { header: 'Unidades', key: 'unidades', width: 12 },
      {
        header: 'Facturación',
        key: 'facturado',
        width: 16,
        numFmt: FORMATO_EUROS,
      },
    ],
    datos.topProductos,
  );

  hojaTabla(
    libro,
    'Pedidos',
    [
      { header: 'Pedido', key: 'codigo', width: 14 },
      { header: 'Fecha', key: 'fecha', width: 18, numFmt: 'dd/mm/yyyy hh:mm' },
      { header: 'Empresa', key: 'empresa', width: 36 },
      { header: 'Marca', key: 'marca', width: 26 },
      { header: 'Estado', key: 'estado', width: 16 },
      { header: 'PO Number', key: 'po', width: 18 },
      { header: 'Líneas', key: 'lineas', width: 10 },
      { header: 'Total neto', key: 'total', width: 16, numFmt: FORMATO_EUROS },
    ],
    pedidos.map((p) => ({
      codigo: p.codigoPed,
      fecha: p.createdAt,
      empresa: p.partner.razonSocial,
      marca: marca(p.partner.marcaCatalogo),
      estado: NOMBRE_ESTADO[p.estado],
      po: p.poNumber,
      lineas: p._count.items,
      total: Number(p.totalNeto),
    })),
  );

  return Buffer.from(await libro.xlsx.writeBuffer());
}
