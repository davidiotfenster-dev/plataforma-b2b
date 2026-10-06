import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { CatalogoMarcaModule } from '../catalogo-marca/catalogo-marca.module.js';
import { PartnersController } from './partners.controller.js';
import { PartnersService } from './partners.service.js';
import { UsuariosController } from './usuarios.controller.js';
import { UsuariosService } from './usuarios.service.js';
import { MiEmpresaController } from './mi-empresa.controller.js';

@Module({
  imports: [AuthModule, CatalogoMarcaModule],
  controllers: [PartnersController, UsuariosController, MiEmpresaController],
  providers: [PartnersService, UsuariosService],
})
export class PartnersModule {}
