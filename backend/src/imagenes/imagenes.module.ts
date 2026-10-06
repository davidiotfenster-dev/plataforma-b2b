import { Module } from '@nestjs/common';
import { ImagenesController } from './imagenes.controller.js';
import { ImagenesService } from './imagenes.service.js';

@Module({
  controllers: [ImagenesController],
  providers: [ImagenesService],
  exports: [ImagenesService],
})
export class ImagenesModule {}
