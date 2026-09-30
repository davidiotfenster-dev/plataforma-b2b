import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { Injectable, Logger } from '@nestjs/common';
import PDFDocument from 'pdfkit';

export interface LineaPedidoPdf {
  skuComercial: string;
  nombreProducto: string;
  cantidad: number;
  pvpHistorico: string;
  descuentoAplicado: string;
  precioNetoUnitario: string;
  totalLinea: string;
}

export interface DatosPedidoPdf {
  codigoPed: string;
  razonSocialPartner: string;
  direccionEnvio: string;
  poNumber: string;
  notas: string | null;
  items: LineaPedidoPdf[];
  totalNeto: string;
  createdAt: Date;
}

type Documento = InstanceType<typeof PDFDocument>;

const COLOR = {
  marino: '#0F2A3D',
  turquesa: '#009AB4',
  fondo: '#F3F7F9',
  borde: '#DDE5EA',
  texto: '#1F2933',
  suave: '#6B7C88',
  sobreMarino: '#9FB6C6',
  blanco: '#FFFFFF',
};

const ANCHO_PAGINA = 595.28;
const ALTO_PAGINA = 841.89;
const MARGEN = 40;
const ANCHO_UTIL = ANCHO_PAGINA - 2 * MARGEN;
/// Franja inferior reservada al pie de página.
const RESERVA_PIE = 56;
const PADDING_CELDA = 6;

const COLUMNAS = [
  { titulo: 'Referencia', ancho: 82, alinea: 'left' },
  { titulo: 'Producto', ancho: 163, alinea: 'left' },
  { titulo: 'Cant.', ancho: 38, alinea: 'right' },
  { titulo: 'PVP', ancho: 62, alinea: 'right' },
  { titulo: 'Dto.', ancho: 40, alinea: 'right' },
  { titulo: 'Neto ud.', ancho: 62, alinea: 'right' },
  { titulo: 'Total', ancho: 68, alinea: 'right' },
] as const;

const RUTA_LOGO = join(process.cwd(), 'assets', 'logo-iot-fenster.png');

/// 1234.5 -> "1.234,50 €". Con separador de miles siempre: `es-ES` lo omite en
/// los importes de 4 cifras y la columna quedaría desigual.
function euros(valor: string): string {
  const n = Number(valor);
  const [entero, decimales] = Math.abs(n).toFixed(2).split('.');
  return `${n < 0 ? '-' : ''}${entero.replace(/\B(?=(\d{3})+(?!\d))/g, '.')},${decimales} €`;
}

function porcentaje(valor: string): string {
  const n = Number(valor);
  return n > 0 ? `${n.toLocaleString('es-ES', { maximumFractionDigits: 2 })} %` : '—';
}

@Injectable()
export class PedidoPdfService {
  private readonly logger = new Logger(PedidoPdfService.name);
  private logo: Buffer | null | undefined;

  /// El logo se lee una vez. Si falta el archivo, el PDF se genera igual con la
  /// marca escrita en texto: un logo perdido nunca debe impedir un pedido.
  private cargarLogo(): Buffer | null {
    if (this.logo === undefined) {
      try {
        this.logo = readFileSync(RUTA_LOGO);
      } catch (error) {
        this.logger.warn(`No se ha podido leer el logo del PDF (${RUTA_LOGO}): ${(error as Error).message}`);
        this.logo = null;
      }
    }
    return this.logo;
  }

  async generar(pedido: DatosPedidoPdf): Promise<Buffer> {
    const doc = new PDFDocument({
      size: 'A4',
      margin: MARGEN,
      bufferPages: true,
      info: { Title: `Pedido ${pedido.codigoPed}`, Author: 'IoT FENSTER', Subject: 'Resumen de pedido' },
    });
    const chunks: Buffer[] = [];

    const finalizado = new Promise<Buffer>((resolve, reject) => {
      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);
    });

    let y = this.cabecera(doc, pedido, false);
    y = this.datosPedido(doc, pedido, y);
    if (pedido.notas) {
      y = this.notas(doc, pedido.notas, y);
    }

    y = this.encabezadoTabla(doc, y);
    pedido.items.forEach((linea, indice) => {
      const celdas = this.celdas(linea);
      const alto = this.altoFila(doc, celdas);
      if (y + alto > ALTO_PAGINA - RESERVA_PIE) {
        doc.addPage();
        y = this.encabezadoTabla(doc, this.cabecera(doc, pedido, true));
      }
      y = this.fila(doc, celdas, y, alto, indice % 2 === 1);
    });

    if (y + 70 > ALTO_PAGINA - RESERVA_PIE) {
      doc.addPage();
      y = this.cabecera(doc, pedido, true);
    }
    this.total(doc, pedido, y);
    this.pies(doc);

    doc.end();
    return finalizado;
  }

  /// Banda oscura con el logo (sus letras "FENSTER" son blancas) y el código del pedido.
  /// La versión compacta se repite en las páginas siguientes. Devuelve la Y donde empieza el contenido.
  private cabecera(doc: Documento, pedido: DatosPedidoPdf, compacta: boolean): number {
    const alto = compacta ? 44 : 96;
    const altoLogo = compacta ? 20 : 44;
    const yLogo = (alto - altoLogo) / 2;

    doc.rect(0, 0, ANCHO_PAGINA, alto).fill(COLOR.marino);
    doc.rect(0, alto, ANCHO_PAGINA, compacta ? 2 : 3).fill(COLOR.turquesa);

    const logo = this.cargarLogo();
    if (logo) {
      doc.image(logo, MARGEN, yLogo, { height: altoLogo });
    } else {
      doc.font('Helvetica-Bold').fontSize(compacta ? 13 : 20).fillColor(COLOR.blanco);
      doc.text('IoT FENSTER', MARGEN, yLogo + (compacta ? 3 : 10), { lineBreak: false });
    }

    if (compacta) {
      doc.font('Helvetica-Bold').fontSize(11).fillColor(COLOR.blanco);
      doc.text(pedido.codigoPed, MARGEN, 16, { width: ANCHO_UTIL, align: 'right', lineBreak: false });
    } else {
      doc.font('Helvetica').fontSize(8).fillColor(COLOR.sobreMarino);
      doc.text('CONFIRMACIÓN DE PEDIDO', MARGEN, 30, { width: ANCHO_UTIL, align: 'right', characterSpacing: 1.4, lineBreak: false });
      doc.font('Helvetica-Bold').fontSize(24).fillColor(COLOR.blanco);
      doc.text(pedido.codigoPed, MARGEN, 46, { width: ANCHO_UTIL, align: 'right', lineBreak: false });
    }

    return alto + (compacta ? 2 : 3) + (compacta ? 20 : 26);
  }

  /// Panel con cliente, PO Number, fecha y dirección de envío.
  private datosPedido(doc: Documento, pedido: DatosPedidoPdf, y: number): number {
    const relleno = 14;
    const anchoIzquierda = 215;
    const xDerecha = MARGEN + relleno + anchoIzquierda + 20;
    const anchoDerecha = MARGEN + ANCHO_UTIL - relleno - xDerecha;
    const fecha = pedido.createdAt.toLocaleString('es-ES', { dateStyle: 'long', timeStyle: 'short', timeZone: 'Europe/Madrid' });

    const izquierda = [
      ['CLIENTE', pedido.razonSocialPartner],
      ['PO NUMBER', pedido.poNumber],
      ['FECHA DEL PEDIDO', fecha],
    ] as const;

    doc.font('Helvetica-Bold').fontSize(10.5);
    let altoIzquierda = 0;
    for (const [, valor] of izquierda) {
      altoIzquierda += 12 + doc.heightOfString(valor, { width: anchoIzquierda }) + 9;
    }
    const altoDerecha = 12 + doc.heightOfString(pedido.direccionEnvio, { width: anchoDerecha });
    const alto = Math.max(altoIzquierda - 9, altoDerecha) + 2 * relleno;

    doc.roundedRect(MARGEN, y, ANCHO_UTIL, alto, 6).fill(COLOR.fondo);

    let yTexto = y + relleno;
    for (const [etiqueta, valor] of izquierda) {
      this.etiqueta(doc, etiqueta, MARGEN + relleno, yTexto);
      doc.font('Helvetica-Bold').fontSize(10.5).fillColor(COLOR.texto);
      doc.text(valor, MARGEN + relleno, yTexto + 12, { width: anchoIzquierda });
      yTexto += 12 + doc.heightOfString(valor, { width: anchoIzquierda }) + 9;
    }

    this.etiqueta(doc, 'DIRECCIÓN DE ENVÍO', xDerecha, y + relleno);
    doc.font('Helvetica').fontSize(10.5).fillColor(COLOR.texto);
    doc.text(pedido.direccionEnvio, xDerecha, y + relleno + 12, { width: anchoDerecha });

    return y + alto + 16;
  }

  private notas(doc: Documento, notas: string, y: number): number {
    const relleno = 12;
    doc.font('Helvetica').fontSize(9.5);
    const alto = 12 + doc.heightOfString(notas, { width: ANCHO_UTIL - 2 * relleno }) + 2 * relleno;

    doc.roundedRect(MARGEN, y, ANCHO_UTIL, alto, 6).lineWidth(0.8).strokeColor(COLOR.borde).stroke();
    this.etiqueta(doc, 'NOTAS DEL PEDIDO', MARGEN + relleno, y + relleno);
    doc.font('Helvetica').fontSize(9.5).fillColor(COLOR.texto);
    doc.text(notas, MARGEN + relleno, y + relleno + 12, { width: ANCHO_UTIL - 2 * relleno });

    return y + alto + 16;
  }

  private etiqueta(doc: Documento, texto: string, x: number, y: number): void {
    doc.font('Helvetica-Bold').fontSize(7).fillColor(COLOR.suave);
    doc.text(texto, x, y, { characterSpacing: 0.9, lineBreak: false });
  }

  private encabezadoTabla(doc: Documento, y: number): number {
    const alto = 22;
    doc.rect(MARGEN, y, ANCHO_UTIL, alto).fill(COLOR.marino);
    doc.font('Helvetica-Bold').fontSize(8).fillColor(COLOR.blanco);

    let x = MARGEN;
    for (const columna of COLUMNAS) {
      doc.text(columna.titulo, x + PADDING_CELDA, y + 7, {
        width: columna.ancho - 2 * PADDING_CELDA,
        align: columna.alinea,
        lineBreak: false,
      });
      x += columna.ancho;
    }
    return y + alto;
  }

  private celdas(linea: LineaPedidoPdf): string[] {
    return [
      linea.skuComercial,
      linea.nombreProducto,
      String(linea.cantidad),
      euros(linea.pvpHistorico),
      porcentaje(linea.descuentoAplicado),
      euros(linea.precioNetoUnitario),
      euros(linea.totalLinea),
    ];
  }

  /// Alto de una fila: el de su celda más alta (nombres largos se parten en varias líneas).
  private altoFila(doc: Documento, celdas: string[]): number {
    doc.font('Helvetica').fontSize(9);
    const alto = Math.max(
      ...celdas.map((texto, i) => doc.heightOfString(texto, { width: COLUMNAS[i].ancho - 2 * PADDING_CELDA })),
    );
    return Math.max(24, alto + 14);
  }

  private fila(doc: Documento, celdas: string[], y: number, alto: number, franja: boolean): number {
    if (franja) {
      doc.rect(MARGEN, y, ANCHO_UTIL, alto).fill(COLOR.fondo);
    }
    doc.moveTo(MARGEN, y + alto).lineTo(MARGEN + ANCHO_UTIL, y + alto).lineWidth(0.5).strokeColor(COLOR.borde).stroke();

    let x = MARGEN;
    celdas.forEach((texto, i) => {
      const destacada = i === 1 || i === COLUMNAS.length - 1;
      doc.font(destacada ? 'Helvetica-Bold' : 'Helvetica').fontSize(9).fillColor(i === 0 ? COLOR.suave : COLOR.texto);
      doc.text(texto, x + PADDING_CELDA, y + 7, {
        width: COLUMNAS[i].ancho - 2 * PADDING_CELDA,
        align: COLUMNAS[i].alinea,
      });
      x += COLUMNAS[i].ancho;
    });
    return y + alto;
  }

  private total(doc: Documento, pedido: DatosPedidoPdf, y: number): void {
    const unidades = pedido.items.reduce((suma, linea) => suma + linea.cantidad, 0);
    const lineas = pedido.items.length;
    const inicio = y + 18;

    doc.font('Helvetica').fontSize(9).fillColor(COLOR.suave);
    doc.text(
      `${lineas} ${lineas === 1 ? 'línea' : 'líneas'} · ${unidades} ${unidades === 1 ? 'unidad' : 'unidades'}`,
      MARGEN,
      inicio + 4,
      { lineBreak: false },
    );

    const ancho = 210;
    const x = MARGEN + ANCHO_UTIL - ancho;
    doc.rect(x, inicio, ancho, 3).fill(COLOR.turquesa);
    doc.rect(x, inicio + 3, ancho, 46).fill(COLOR.fondo);
    doc.font('Helvetica-Bold').fontSize(7).fillColor(COLOR.suave);
    doc.text('TOTAL NETO DEL PEDIDO', x + 12, inicio + 13, { characterSpacing: 0.9, lineBreak: false });
    doc.font('Helvetica-Bold').fontSize(18).fillColor(COLOR.marino);
    doc.text(euros(pedido.totalNeto), x + 12, inicio + 25, { width: ancho - 24, align: 'right', lineBreak: false });
  }

  /// Pie en todas las páginas (una vez conocido el total): descripción y "Página x de y".
  private pies(doc: Documento): void {
    const { start, count } = doc.bufferedPageRange();
    for (let i = start; i < start + count; i++) {
      doc.switchToPage(i);
      // El pie va dentro del margen inferior: sin esto PDFKit añadiría una página nueva al escribirlo.
      doc.page.margins.bottom = 0;
      const y = ALTO_PAGINA - 38;
      doc.moveTo(MARGEN, y - 8).lineTo(MARGEN + ANCHO_UTIL, y - 8).lineWidth(0.5).strokeColor(COLOR.borde).stroke();
      doc.font('Helvetica').fontSize(8).fillColor(COLOR.suave);
      doc.text('IoT FENSTER · Resumen del pedido generado automáticamente por el Portal Partner', MARGEN, y, {
        width: ANCHO_UTIL - 90,
        lineBreak: false,
      });
      doc.text(`Página ${i - start + 1} de ${count}`, MARGEN, y, { width: ANCHO_UTIL, align: 'right', lineBreak: false });
    }
  }
}
