import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { PartnersController } from './partners.controller.js';
import { PartnersService } from './partners.service.js';
import { UsuariosController } from './usuarios.controller.js';
import { UsuariosService } from './usuarios.service.js';

@Module({
  imports: [AuthModule],
  controllers: [PartnersController, UsuariosController],
  providers: [PartnersService, UsuariosService],
})
export class PartnersModule {}
