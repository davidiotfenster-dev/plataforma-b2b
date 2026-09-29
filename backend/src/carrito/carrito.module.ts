import { Module } from '@nestjs/common';
import { CarritoController } from './carrito.controller.js';
import { CarritoService } from './carrito.service.js';

@Module({
  controllers: [CarritoController],
  providers: [CarritoService],
  exports: [CarritoService],
})
export class CarritoModule {}
