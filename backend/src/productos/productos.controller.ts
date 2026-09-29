import { Controller, Get, NotFoundException, Param, ParseUUIDPipe, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { CurrentUser, type UsuarioAutenticado } from '../common/decorators/current-user.decorator.js';
import { ProductosService } from './productos.service.js';

@Controller('catalogo')
@UseGuards(JwtAuthGuard)
export class ProductosController {
  constructor(private readonly productosService: ProductosService) {}

  @Get()
  async listar(@CurrentUser() usuario: UsuarioAutenticado) {
    this.requierePartner(usuario);
    return this.productosService.listarCatalogo(usuario.partnerId!);
  }

  @Get(':id')
  async obtener(
    @CurrentUser() usuario: UsuarioAutenticado,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    this.requierePartner(usuario);
    return this.productosService.obtenerRepresentacion(usuario.partnerId!, id);
  }

  /// ADMIN_FENSTER no tiene catálogo propio (no está ligado a un partner):
  /// se responde con el mismo 404 opaco en vez de un 403 que confirmaría
  /// que el recurso podría existir para otro tenant.
  private requierePartner(usuario: UsuarioAutenticado): void {
    if (!usuario.partnerId) {
      throw new NotFoundException('Recurso no encontrado');
    }
  }
}
