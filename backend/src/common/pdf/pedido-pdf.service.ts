import { Injectable } from '@nestjs/common';
import PDFDocument from 'pdfkit';

export interface LineaPedidoPdf {
  skuComercial: string;
  nombreProducto: string;
  cantidad: number;
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

@Injectable()
export class PedidoPdfService {
  async generar(pedido: DatosPedidoPdf): Promise<Buffer> {
    const doc = new PDFDocument({ margin: 50 });
    const chunks: Buffer[] = [];

    const finalizado = new Promise<Buffer>((resolve, reject) => {
      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);
    });

    doc.fontSize(18).text('IoT FENSTER — Confirmación de pedido', { align: 'left' });
    doc.moveDown(0.5);
    doc.fontSize(12).text(`Pedido: ${pedido.codigoPed}`);
    doc.text(`Fecha: ${pedido.createdAt.toLocaleString('es-ES')}`);
    doc.text(`Cliente: ${pedido.razonSocialPartner}`);
    doc.text(`PO Number: ${pedido.poNumber}`);
    doc.text(`Dirección de envío: ${pedido.direccionEnvio}`);
    if (pedido.notas) {
      doc.text(`Notas: ${pedido.notas}`);
    }
    doc.moveDown();

    doc.fontSize(13).text('Líneas del pedido', { underline: true });
    doc.moveDown(0.3);
    doc.fontSize(10);
    for (const item of pedido.items) {
      doc.text(
        `${item.skuComercial}  ·  ${item.nombreProducto}  ·  cant. ${item.cantidad}  ·  ` +
          `neto unitario ${item.precioNetoUnitario} €  ·  total ${item.totalLinea} €`,
      );
    }

    doc.moveDown();
    doc.fontSize(12).text(`Total neto del pedido: ${pedido.totalNeto} €`, { align: 'right' });

    doc.end();
    return finalizado;
  }
}
