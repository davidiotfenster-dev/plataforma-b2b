import { Module } from '@nestjs/common';
import { PedidosController } from './pedidos.controller.js';
import { PedidosService } from './pedidos.service.js';

@Module({
  controllers: [PedidosController],
  providers: [PedidosService],
})
export class PedidosModule {}
