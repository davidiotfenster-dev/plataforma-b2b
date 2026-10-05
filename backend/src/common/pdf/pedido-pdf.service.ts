import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { Injectable, Logger } from '@nestjs/common';
import PDFDocument from 'pdfkit';
import type { Idioma } from '../../generated/prisma/enums.js';
import { formatearEuros, formatearPorcentaje, textosPdf, type TextosPdf } from './pedido-pdf.textos.js';

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
  /// Idioma de los rótulos y del formato de fechas e importes; español si no se indica.
  idioma?: Idioma;
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

/// Los títulos de las columnas vienen del idioma (ver `pedido-pdf.textos.ts`).
const COLUMNAS = [
  { ancho: 82, alinea: 'left' },
  { ancho: 163, alinea: 'left' },
  { ancho: 38, alinea: 'right' },
  { ancho: 62, alinea: 'right' },
  { ancho: 40, alinea: 'right' },
  { ancho: 62, alinea: 'right' },
  { ancho: 68, alinea: 'right' },
] as const;

const RUTA_LOGO = join(process.cwd(), 'assets', 'logo-iot-fenster.png');

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
    const t = textosPdf(pedido.idioma);
    const doc = new PDFDocument({
      size: 'A4',
      margin: MARGEN,
      bufferPages: true,
      info: { Title: t.tituloDocumento(pedido.codigoPed), Author: 'IoT FENSTER' },
    });
    const chunks: Buffer[] = [];

    const finalizado = new Promise<Buffer>((resolve, reject) => {
      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);
    });

    let y = this.cabecera(doc, pedido, t, false);
    y = this.datosPedido(doc, pedido, t, y);
    if (pedido.notas) {
      y = this.notas(doc, pedido.notas, t, y);
    }

    y = this.encabezadoTabla(doc, t, y);
    pedido.items.forEach((linea, indice) => {
      const celdas = this.celdas(linea, t);
      const alto = this.altoFila(doc, celdas);
      if (y + alto > ALTO_PAGINA - RESERVA_PIE) {
        doc.addPage();
        y = this.encabezadoTabla(doc, t, this.cabecera(doc, pedido, t, true));
      }
      y = this.fila(doc, celdas, y, alto, indice % 2 === 1);
    });

    if (y + 70 > ALTO_PAGINA - RESERVA_PIE) {
      doc.addPage();
      y = this.cabecera(doc, pedido, t, true);
    }
    this.total(doc, pedido, t, y);
    this.pies(doc, t);

    doc.end();
    return finalizado;
  }

  /// Banda oscura con el logo (sus letras "FENSTER" son blancas) y el código del pedido.
  /// La versión compacta se repite en las páginas siguientes. Devuelve la Y donde empieza el contenido.
  private cabecera(doc: Documento, pedido: DatosPedidoPdf, t: TextosPdf, compacta: boolean): number {
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
      doc.text(t.cabecera, MARGEN, 30, { width: ANCHO_UTIL, align: 'right', characterSpacing: 1.4, lineBreak: false });
      doc.font('Helvetica-Bold').fontSize(24).fillColor(COLOR.blanco);
      doc.text(pedido.codigoPed, MARGEN, 46, { width: ANCHO_UTIL, align: 'right', lineBreak: false });
    }

    return alto + (compacta ? 2 : 3) + (compacta ? 20 : 26);
  }

  /// Panel con cliente, PO Number, fecha y dirección de envío.
  private datosPedido(doc: Documento, pedido: DatosPedidoPdf, t: TextosPdf, y: number): number {
    const relleno = 14;
    const anchoIzquierda = 215;
    const xDerecha = MARGEN + relleno + anchoIzquierda + 20;
    const anchoDerecha = MARGEN + ANCHO_UTIL - relleno - xDerecha;
    const fecha = pedido.createdAt.toLocaleString(t.locale, { dateStyle: 'long', timeStyle: 'short', timeZone: 'Europe/Madrid' });

    const izquierda = [
      [t.cliente, pedido.razonSocialPartner],
      [t.poNumber, pedido.poNumber],
      [t.fecha, fecha],
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

    this.etiqueta(doc, t.direccion, xDerecha, y + relleno);
    doc.font('Helvetica').fontSize(10.5).fillColor(COLOR.texto);
    doc.text(pedido.direccionEnvio, xDerecha, y + relleno + 12, { width: anchoDerecha });

    return y + alto + 16;
  }

  private notas(doc: Documento, notas: string, t: TextosPdf, y: number): number {
    const relleno = 12;
    doc.font('Helvetica').fontSize(9.5);
    const alto = 12 + doc.heightOfString(notas, { width: ANCHO_UTIL - 2 * relleno }) + 2 * relleno;

    doc.roundedRect(MARGEN, y, ANCHO_UTIL, alto, 6).lineWidth(0.8).strokeColor(COLOR.borde).stroke();
    this.etiqueta(doc, t.notas, MARGEN + relleno, y + relleno);
    doc.font('Helvetica').fontSize(9.5).fillColor(COLOR.texto);
    doc.text(notas, MARGEN + relleno, y + relleno + 12, { width: ANCHO_UTIL - 2 * relleno });

    return y + alto + 16;
  }

  private etiqueta(doc: Documento, texto: string, x: number, y: number): void {
    doc.font('Helvetica-Bold').fontSize(7).fillColor(COLOR.suave);
    doc.text(texto, x, y, { characterSpacing: 0.9, lineBreak: false });
  }

  private encabezadoTabla(doc: Documento, t: TextosPdf, y: number): number {
    const alto = 22;
    doc.rect(MARGEN, y, ANCHO_UTIL, alto).fill(COLOR.marino);
    doc.font('Helvetica-Bold').fontSize(8).fillColor(COLOR.blanco);

    let x = MARGEN;
    COLUMNAS.forEach((columna, i) => {
      doc.text(t.columnas[i], x + PADDING_CELDA, y + 7, {
        width: columna.ancho - 2 * PADDING_CELDA,
        align: columna.alinea,
        lineBreak: false,
      });
      x += columna.ancho;
    });
    return y + alto;
  }

  private celdas(linea: LineaPedidoPdf, t: TextosPdf): string[] {
    return [
      linea.skuComercial,
      linea.nombreProducto,
      String(linea.cantidad),
      formatearEuros(linea.pvpHistorico, t),
      formatearPorcentaje(linea.descuentoAplicado, t),
      formatearEuros(linea.precioNetoUnitario, t),
      formatearEuros(linea.totalLinea, t),
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

  private total(doc: Documento, pedido: DatosPedidoPdf, t: TextosPdf, y: number): void {
    const unidades = pedido.items.reduce((suma, linea) => suma + linea.cantidad, 0);
    const lineas = pedido.items.length;
    const inicio = y + 18;

    doc.font('Helvetica').fontSize(9).fillColor(COLOR.suave);
    doc.text(
      `${lineas} ${t.linea[lineas === 1 ? 0 : 1]} · ${unidades} ${t.unidad[unidades === 1 ? 0 : 1]}`,
      MARGEN,
      inicio + 4,
      { lineBreak: false },
    );

    const ancho = 210;
    const x = MARGEN + ANCHO_UTIL - ancho;
    doc.rect(x, inicio, ancho, 3).fill(COLOR.turquesa);
    doc.rect(x, inicio + 3, ancho, 46).fill(COLOR.fondo);
    doc.font('Helvetica-Bold').fontSize(7).fillColor(COLOR.suave);
    doc.text(t.totalNeto, x + 12, inicio + 13, { characterSpacing: 0.9, lineBreak: false });
    doc.font('Helvetica-Bold').fontSize(18).fillColor(COLOR.marino);
    doc.text(formatearEuros(pedido.totalNeto, t), x + 12, inicio + 25, { width: ancho - 24, align: 'right', lineBreak: false });
  }

  /// Pie en todas las páginas (una vez conocido el total): descripción y "Página x de y".
  private pies(doc: Documento, t: TextosPdf): void {
    const { start, count } = doc.bufferedPageRange();
    for (let i = start; i < start + count; i++) {
      doc.switchToPage(i);
      // El pie va dentro del margen inferior: sin esto PDFKit añadiría una página nueva al escribirlo.
      doc.page.margins.bottom = 0;
      const y = ALTO_PAGINA - 38;
      doc.moveTo(MARGEN, y - 8).lineTo(MARGEN + ANCHO_UTIL, y - 8).lineWidth(0.5).strokeColor(COLOR.borde).stroke();
      doc.font('Helvetica').fontSize(8).fillColor(COLOR.suave);
      doc.text(t.pie, MARGEN, y, {
        width: ANCHO_UTIL - 90,
        lineBreak: false,
      });
      doc.text(t.pagina(i - start + 1, count), MARGEN, y, { width: ANCHO_UTIL, align: 'right', lineBreak: false });
    }
  }
}
