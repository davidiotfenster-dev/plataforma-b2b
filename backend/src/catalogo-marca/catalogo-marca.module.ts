import { Module } from '@nestjs/common';
import { CatalogoMarcaController } from './catalogo-marca.controller.js';
import { CatalogoMarcaService } from './catalogo-marca.service.js';

@Module({
  controllers: [CatalogoMarcaController],
  providers: [CatalogoMarcaService],
  exports: [CatalogoMarcaService],
})
export class CatalogoMarcaModule {}
