import { Module } from '@nestjs/common';
import { AjustesLegalesController } from './ajustes-legales.controller.js';
import { AjustesLegalesService } from './ajustes-legales.service.js';

@Module({
  controllers: [AjustesLegalesController],
  providers: [AjustesLegalesService],
})
export class AjustesLegalesModule {}
