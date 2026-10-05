import { Body, Controller, Get, HttpCode, HttpStatus, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../common/guards/roles.guard.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { CurrentUser, type UsuarioAutenticado } from '../common/decorators/current-user.decorator.js';
import { RolUsuario } from '../generated/prisma/enums.js';
import { UsuariosService } from './usuarios.service.js';
import { CrearUsuarioDto } from './dto/crear-usuario.dto.js';

/// El administrador de una empresa ve y da de alta a los usuarios de SU
/// empresa. La empresa sale siempre de la sesión, nunca de la petición, así
/// que no hay forma de tocar los usuarios de otra.
@Controller('mi-empresa/usuarios')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(RolUsuario.PARTNER_ADMIN)
export class MiEmpresaController {
  constructor(private readonly usuariosService: UsuariosService) {}

  @Get()
  async listar(@CurrentUser() usuario: UsuarioAutenticado) {
    return this.usuariosService.listarPorPartner(usuario.partnerId!);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async crear(@CurrentUser() usuario: UsuarioAutenticado, @Body() dto: CrearUsuarioDto) {
    return this.usuariosService.crear(usuario.partnerId!, dto);
  }
}
