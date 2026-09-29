import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../common/guards/roles.guard.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { RolUsuario } from '../generated/prisma/enums.js';
import { AuthService } from '../auth/auth.service.js';
import { UsuariosService } from './usuarios.service.js';
import { ActualizarRolUsuarioDto } from './dto/actualizar-rol-usuario.dto.js';

/// Herramientas de control de cuenta desde el panel admin (bloque D del
/// backlog de frontend): rol, activo/inactivo, cierre de sesión forzado,
/// disparo de reseteo de contraseña y auditoría, todo scoped a un usuario
/// concreto. Controlador separado de `PartnersController` (que gestiona el
/// partner, no sus usuarios) para no ambiguar rutas de 2-3 segmentos ya
/// existentes ahí (`/partners/:id`, `/partners/:id/suspender`, ...).
@Controller('partners/usuarios')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(RolUsuario.ADMIN_FENSTER)
export class UsuariosController {
  constructor(
    private readonly usuariosService: UsuariosService,
    private readonly authService: AuthService,
  ) {}

  @Patch(':id/rol')
  async cambiarRol(@Param('id', ParseUUIDPipe) id: string, @Body() dto: ActualizarRolUsuarioDto) {
    return this.usuariosService.cambiarRol(id, dto);
  }

  @Post(':id/activar')
  @HttpCode(HttpStatus.OK)
  async activar(@Param('id', ParseUUIDPipe) id: string) {
    return this.usuariosService.activar(id);
  }

  @Post(':id/desactivar')
  @HttpCode(HttpStatus.OK)
  async desactivar(@Param('id', ParseUUIDPipe) id: string) {
    return this.usuariosService.desactivar(id);
  }

  @Post(':id/forzar-logout')
  @HttpCode(HttpStatus.OK)
  async forzarLogout(@Param('id', ParseUUIDPipe) id: string) {
    await this.authService.forzarLogout(id);
    return { mensaje: 'Sesión del usuario invalidada' };
  }

  @Post(':id/enviar-reset-password')
  @HttpCode(HttpStatus.OK)
  async enviarResetPassword(@Param('id', ParseUUIDPipe) id: string) {
    await this.authService.dispararResetPassword(id);
    return { mensaje: 'Email de restablecimiento de contraseña enviado' };
  }

  @Get(':id/auditoria')
  async auditoria(@Param('id', ParseUUIDPipe) id: string) {
    return this.usuariosService.auditoria(id);
  }
}
