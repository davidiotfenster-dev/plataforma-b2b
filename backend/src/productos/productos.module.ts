import { Module } from '@nestjs/common';
import { ImagenesModule } from '../imagenes/imagenes.module.js';
import { ProductosController } from './productos.controller.js';
import { ProductosBaseController } from './productos-base.controller.js';
import { ProductosService } from './productos.service.js';

@Module({
  imports: [ImagenesModule],
  controllers: [ProductosController, ProductosBaseController],
  providers: [ProductosService],
})
export class ProductosModule {}
