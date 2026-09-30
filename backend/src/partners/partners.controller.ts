import { Body, Controller, Get, HttpCode, HttpStatus, Param, ParseUUIDPipe, Patch, Post, Query, UseGuards, Delete } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../common/guards/roles.guard.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { CurrentUser, type UsuarioAutenticado } from '../common/decorators/current-user.decorator.js';
import { RolUsuario } from '../generated/prisma/enums.js';
import { PartnersService } from './partners.service.js';
import { UsuariosService } from './usuarios.service.js';
import { CrearPartnerDto } from './dto/crear-partner.dto.js';
import { ActualizarPartnerDto } from './dto/actualizar-partner.dto.js';
import { AsignarProductosDto } from './dto/asignar-productos.dto.js';
import { ActualizarRepresentacionDto } from './dto/actualizar-representacion.dto.js';
import { ListarPartnersQueryDto } from './dto/listar-partners-query.dto.js';

@Controller('partners')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(RolUsuario.ADMIN_FENSTER)
export class PartnersController {
  constructor(
    private readonly partnersService: PartnersService,
    private readonly usuariosService: UsuariosService,
  ) {}

  /// Un COMERCIAL solo ve/gestiona los partners que él mismo ha dado de
  /// alta: esto devuelve su `userId` para acotar la consulta, o `undefined`
  /// (sin restricción) para ADMIN_FENSTER.
  private restriccion(usuario: UsuarioAutenticado): string | undefined {
    return usuario.rol === RolUsuario.COMERCIAL ? usuario.userId : undefined;
  }

  @Post()
  @Roles(RolUsuario.ADMIN_FENSTER, RolUsuario.COMERCIAL)
  @HttpCode(HttpStatus.CREATED)
  async crear(@CurrentUser() usuario: UsuarioAutenticado, @Body() dto: CrearPartnerDto) {
    return this.partnersService.crear(dto, usuario.userId);
  }

  @Get()
  @Roles(RolUsuario.ADMIN_FENSTER, RolUsuario.COMERCIAL)
  async listar(@CurrentUser() usuario: UsuarioAutenticado, @Query() query: ListarPartnersQueryDto) {
    return this.partnersService.listar(query, this.restriccion(usuario));
  }

  /// Debe declararse ANTES de `:id`: si no, "resumen" se interpretaría como un id.
  @Get('resumen')
  @Roles(RolUsuario.ADMIN_FENSTER, RolUsuario.COMERCIAL)
  async resumen(@CurrentUser() usuario: UsuarioAutenticado) {
    return this.partnersService.resumen(this.restriccion(usuario));
  }

  @Get(':id')
  @Roles(RolUsuario.ADMIN_FENSTER, RolUsuario.COMERCIAL)
  async obtener(@CurrentUser() usuario: UsuarioAutenticado, @Param('id', ParseUUIDPipe) id: string) {
    return this.partnersService.obtener(id, this.restriccion(usuario));
  }

  @Patch(':id')
  @Roles(RolUsuario.ADMIN_FENSTER, RolUsuario.COMERCIAL)
  async actualizar(
    @CurrentUser() usuario: UsuarioAutenticado,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ActualizarPartnerDto,
  ) {
    return this.partnersService.actualizar(id, dto, this.restriccion(usuario));
  }

  @Post(':id/suspender')
  @Roles(RolUsuario.ADMIN_FENSTER, RolUsuario.COMERCIAL)
  @HttpCode(HttpStatus.OK)
  async suspender(@CurrentUser() usuario: UsuarioAutenticado, @Param('id', ParseUUIDPipe) id: string) {
    return this.partnersService.suspender(id, this.restriccion(usuario));
  }

  @Post(':id/reactivar')
  @Roles(RolUsuario.ADMIN_FENSTER, RolUsuario.COMERCIAL)
  @HttpCode(HttpStatus.OK)
  async reactivar(@CurrentUser() usuario: UsuarioAutenticado, @Param('id', ParseUUIDPipe) id: string) {
    return this.partnersService.reactivar(id, this.restriccion(usuario));
  }

  /// Gestión de usuarios (activar/desactivar, forzar logout, reset de
  /// contraseña, auditoría) queda solo para ADMIN_FENSTER: son acciones
  /// sensibles de cuenta, fuera del alcance pedido para COMERCIAL.
  @Get(':id/usuarios')
  async usuarios(@Param('id', ParseUUIDPipe) id: string) {
    return this.usuariosService.listarPorPartner(id);
  }

  @Get(':id/catalogo')
  @Roles(RolUsuario.ADMIN_FENSTER, RolUsuario.COMERCIAL)
  async catalogo(@CurrentUser() usuario: UsuarioAutenticado, @Param('id', ParseUUIDPipe) id: string) {
    return this.partnersService.listarCatalogo(id, this.restriccion(usuario));
  }

  @Post(':id/catalogo')
  @Roles(RolUsuario.ADMIN_FENSTER, RolUsuario.COMERCIAL)
  async asignarProductos(
    @CurrentUser() usuario: UsuarioAutenticado,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AsignarProductosDto,
  ) {
    return this.partnersService.asignarProductos(id, dto, this.restriccion(usuario));
  }

  @Patch(':id/catalogo/:repId')
  @Roles(RolUsuario.ADMIN_FENSTER, RolUsuario.COMERCIAL)
  async actualizarRepresentacion(
    @CurrentUser() usuario: UsuarioAutenticado,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('repId', ParseUUIDPipe) repId: string,
    @Body() dto: ActualizarRepresentacionDto,
  ) {
    return this.partnersService.actualizarRepresentacion(id, repId, dto, this.restriccion(usuario));
  }

  @Delete(':id/catalogo/:repId')
  @Roles(RolUsuario.ADMIN_FENSTER, RolUsuario.COMERCIAL)
  async eliminarRepresentacion(
    @CurrentUser() usuario: UsuarioAutenticado,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('repId', ParseUUIDPipe) repId: string,
  ) {
    return this.partnersService.eliminarRepresentacion(id, repId, this.restriccion(usuario));
  }
}
