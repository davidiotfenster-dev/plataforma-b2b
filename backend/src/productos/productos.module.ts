import { Module } from '@nestjs/common';
import { ProductosController } from './productos.controller.js';
import { ProductosBaseController } from './productos-base.controller.js';
import { ProductosService } from './productos.service.js';

@Module({
  controllers: [ProductosController, ProductosBaseController],
  providers: [ProductosService],
})
export class ProductosModule {}
