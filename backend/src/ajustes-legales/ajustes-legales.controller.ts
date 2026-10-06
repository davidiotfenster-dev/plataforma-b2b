import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../common/guards/roles.guard.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { RolUsuario } from '../generated/prisma/enums.js';
import { AjustesLegalesService } from './ajustes-legales.service.js';
import { ActualizarAjustesLegalesDto } from './dto/actualizar-ajustes-legales.dto.js';

/// Datos de los textos legales. La lectura es pública (las páginas de aviso
/// legal, privacidad y condiciones se ven sin sesión); solo ADMIN_FENSTER
/// puede cambiarlos.
@Controller('ajustes-legales')
export class AjustesLegalesController {
  constructor(private readonly ajustes: AjustesLegalesService) {}

  @Get()
  obtener() {
    return this.ajustes.obtener();
  }

  @Patch()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RolUsuario.ADMIN_FENSTER)
  actualizar(@Body() dto: ActualizarAjustesLegalesDto) {
    return this.ajustes.actualizar(dto);
  }
}
