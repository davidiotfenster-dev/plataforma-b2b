import {
  Body,
  Controller,
  Delete,
  Get,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { CurrentUser, type UsuarioAutenticado } from '../common/decorators/current-user.decorator.js';
import { exigirPuedeComprar } from '../common/permisos-partner.js';
import { CarritoService } from './carrito.service.js';
import { AgregarItemDto } from './dto/agregar-item.dto.js';
import { ActualizarCantidadDto } from './dto/actualizar-cantidad.dto.js';

@Controller('carrito')
@UseGuards(JwtAuthGuard)
export class CarritoController {
  constructor(private readonly carritoService: CarritoService) {}

  @Get()
  async obtener(@CurrentUser() usuario: UsuarioAutenticado) {
    return this.carritoService.obtenerResumen(...this.identificar(usuario));
  }

  @Get('resumen')
  async resumen(@CurrentUser() usuario: UsuarioAutenticado) {
    return this.carritoService.obtenerResumen(...this.identificar(usuario));
  }

  @Post('items')
  async agregar(@CurrentUser() usuario: UsuarioAutenticado, @Body() dto: AgregarItemDto) {
    const [partnerId, userId] = this.identificarComprador(usuario);
    return this.carritoService.agregarItem(partnerId, userId, dto.representacionPartnerId, dto.cantidad);
  }

  @Patch('items/:id')
  async actualizar(
    @CurrentUser() usuario: UsuarioAutenticado,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ActualizarCantidadDto,
  ) {
    const [partnerId, userId] = this.identificarComprador(usuario);
    return this.carritoService.actualizarCantidad(partnerId, userId, id, dto.cantidad);
  }

  @Delete('items/:id')
  async eliminar(@CurrentUser() usuario: UsuarioAutenticado, @Param('id', ParseUUIDPipe) id: string) {
    const [partnerId, userId] = this.identificarComprador(usuario);
    return this.carritoService.eliminarItem(partnerId, userId, id);
  }

  /// ADMIN_FENSTER no tiene carrito propio (no está ligado a un partner):
  /// se responde con el mismo 404 opaco en vez de un 403.
  private identificar(usuario: UsuarioAutenticado): [string, string] {
    if (!usuario.partnerId) {
      throw new NotFoundException('Recurso no encontrado');
    }
    return [usuario.partnerId, usuario.userId];
  }

  /// Igual que `identificar`, pero además exige un rol que pueda comprar
  /// (no `PARTNER_CONSULTA`). Para las operaciones que modifican el carrito.
  private identificarComprador(usuario: UsuarioAutenticado): [string, string] {
    const ids = this.identificar(usuario);
    exigirPuedeComprar(usuario);
    return ids;
  }
}
