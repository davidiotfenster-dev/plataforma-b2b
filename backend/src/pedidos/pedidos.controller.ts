import { Body, Controller, Get, NotFoundException, Param, ParseUUIDPipe, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../common/guards/roles.guard.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { CurrentUser, type UsuarioAutenticado } from '../common/decorators/current-user.decorator.js';
import { RolUsuario } from '../generated/prisma/enums.js';
import { exigirPuedeComprar } from '../common/permisos-partner.js';
import { PedidosService } from './pedidos.service.js';
import { ConfirmarPedidoDto } from './dto/confirmar-pedido.dto.js';
import { ActualizarEstadoDto } from './dto/actualizar-estado.dto.js';
import { ListarPedidosAdminQueryDto } from './dto/listar-pedidos-admin-query.dto.js';

@Controller('pedidos')
@UseGuards(JwtAuthGuard)
export class PedidosController {
  constructor(private readonly pedidosService: PedidosService) {}

  @Post('confirmar')
  async confirmar(@CurrentUser() usuario: UsuarioAutenticado, @Body() dto: ConfirmarPedidoDto) {
    const [partnerId, userId] = this.identificar(usuario);
    exigirPuedeComprar(usuario);
    return this.pedidosService.confirmar(partnerId, userId, dto);
  }

  @Get()
  async listar(@CurrentUser() usuario: UsuarioAutenticado) {
    const [partnerId] = this.identificar(usuario);
    return this.pedidosService.listar(partnerId);
  }

  /// Panel de fulfillment de IoT FENSTER: pedidos de todos los partners.
  @Get('admin/todos')
  @UseGuards(RolesGuard)
  @Roles(RolUsuario.ADMIN_FENSTER)
  async listarTodos() {
    return this.pedidosService.listarTodos();
  }

  /// Deben declararse antes de `admin/:id`: de lo contrario Express
  /// interpretaría "estadisticas"/"resumen-por-partner" como el parámetro
  /// `:id`.
  @Get('admin/estadisticas')
  @UseGuards(RolesGuard)
  @Roles(RolUsuario.ADMIN_FENSTER)
  async estadisticas() {
    return this.pedidosService.estadisticas();
  }

  /// Panel de fulfillment escalable: un partner por fila (paginado,
  /// buscable), en vez de traer todos los pedidos de todos los partners de
  /// golpe (ver `listarTodos` más abajo, que se mantiene por compatibilidad).
  /// Un COMERCIAL solo ve pedidos de los partners que él mismo ha dado de
  /// alta (sin dashboard de estadísticas, eso sigue siendo solo admin).
  private restriccion(usuario: UsuarioAutenticado): string | undefined {
    return usuario.rol === RolUsuario.COMERCIAL ? usuario.userId : undefined;
  }

  @Get('admin/resumen-por-partner')
  @UseGuards(RolesGuard)
  @Roles(RolUsuario.ADMIN_FENSTER, RolUsuario.COMERCIAL)
  async resumenPorPartner(@CurrentUser() usuario: UsuarioAutenticado, @Query() query: ListarPedidosAdminQueryDto) {
    return this.pedidosService.resumenPorPartner(query, this.restriccion(usuario));
  }

  @Get('admin/por-partner/:partnerId')
  @UseGuards(RolesGuard)
  @Roles(RolUsuario.ADMIN_FENSTER, RolUsuario.COMERCIAL)
  async porPartnerAdmin(
    @CurrentUser() usuario: UsuarioAutenticado,
    @Param('partnerId', ParseUUIDPipe) partnerId: string,
  ) {
    return this.pedidosService.listarPorPartnerAdmin(partnerId, this.restriccion(usuario));
  }

  @Get('admin/:id')
  @UseGuards(RolesGuard)
  @Roles(RolUsuario.ADMIN_FENSTER, RolUsuario.COMERCIAL)
  async obtenerAdmin(@CurrentUser() usuario: UsuarioAutenticado, @Param('id', ParseUUIDPipe) id: string) {
    return this.pedidosService.obtenerAdmin(id, this.restriccion(usuario));
  }

  @Get(':id')
  async obtener(@CurrentUser() usuario: UsuarioAutenticado, @Param('id', ParseUUIDPipe) id: string) {
    const [partnerId] = this.identificar(usuario);
    return this.pedidosService.obtener(partnerId, id);
  }

  @Patch(':id/estado')
  @UseGuards(RolesGuard)
  @Roles(RolUsuario.ADMIN_FENSTER)
  async actualizarEstado(
    @CurrentUser() usuario: UsuarioAutenticado,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ActualizarEstadoDto,
  ) {
    return this.pedidosService.actualizarEstado(id, usuario.userId, dto);
  }

  /// ADMIN_FENSTER no tiene pedidos propios (no está ligado a un partner):
  /// se responde con el mismo 404 opaco en vez de un 403.
  private identificar(usuario: UsuarioAutenticado): [string, string] {
    if (!usuario.partnerId) {
      throw new NotFoundException('Recurso no encontrado');
    }
    return [usuario.partnerId, usuario.userId];
  }
}
