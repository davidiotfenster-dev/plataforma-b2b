import { Body, Controller, Get, HttpCode, HttpStatus, Param, ParseUUIDPipe, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../common/guards/roles.guard.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { RolUsuario } from '../generated/prisma/enums.js';
import { PartnersService } from './partners.service.js';
import { UsuariosService } from './usuarios.service.js';
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

  @Get()
  async listar(@Query() query: ListarPartnersQueryDto) {
    return this.partnersService.listar(query);
  }

  @Get(':id')
  async obtener(@Param('id', ParseUUIDPipe) id: string) {
    return this.partnersService.obtener(id);
  }

  @Patch(':id')
  async actualizar(@Param('id', ParseUUIDPipe) id: string, @Body() dto: ActualizarPartnerDto) {
    return this.partnersService.actualizar(id, dto);
  }

  @Post(':id/suspender')
  @HttpCode(HttpStatus.OK)
  async suspender(@Param('id', ParseUUIDPipe) id: string) {
    return this.partnersService.suspender(id);
  }

  @Post(':id/reactivar')
  @HttpCode(HttpStatus.OK)
  async reactivar(@Param('id', ParseUUIDPipe) id: string) {
    return this.partnersService.reactivar(id);
  }

  @Get(':id/usuarios')
  async usuarios(@Param('id', ParseUUIDPipe) id: string) {
    return this.usuariosService.listarPorPartner(id);
  }

  @Get(':id/catalogo')
  async catalogo(@Param('id', ParseUUIDPipe) id: string) {
    return this.partnersService.listarCatalogo(id);
  }

  @Post(':id/catalogo')
  async asignarProductos(@Param('id', ParseUUIDPipe) id: string, @Body() dto: AsignarProductosDto) {
    return this.partnersService.asignarProductos(id, dto);
  }

  @Patch(':id/catalogo/:repId')
  async actualizarRepresentacion(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('repId', ParseUUIDPipe) repId: string,
    @Body() dto: ActualizarRepresentacionDto,
  ) {
    return this.partnersService.actualizarRepresentacion(id, repId, dto);
  }
}
