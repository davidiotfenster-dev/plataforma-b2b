import { Global, Module } from '@nestjs/common';
import { PedidoPdfService } from './pedido-pdf.service.js';

@Global()
@Module({
  providers: [PedidoPdfService],
  exports: [PedidoPdfService],
})
export class PdfModule {}
