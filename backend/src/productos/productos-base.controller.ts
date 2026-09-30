import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../common/guards/roles.guard.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { RolUsuario } from '../generated/prisma/enums.js';
import { ImagenesService, type ArchivoSubido } from '../imagenes/imagenes.service.js';
import { ProductosService } from './productos.service.js';
import { CrearProductoBaseDto } from './dto/crear-producto-base.dto.js';
import { ActualizarProductoBaseDto } from './dto/actualizar-producto-base.dto.js';
import { AsignarMasivoDto } from './dto/asignar-masivo.dto.js';

/// Catálogo global de productos base gestionado por IoT FENSTER: es la
/// materia prima a partir de la cual se asignan `RepresentacionPartner` a
/// cada partner (ver PartnersController). No expone datos comerciales.
@Controller('productos-base')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(RolUsuario.ADMIN_FENSTER)
export class ProductosBaseController {
  constructor(
    private readonly productosService: ProductosService,
    private readonly imagenes: ImagenesService,
  ) {}

  /// Lectura también para COMERCIAL: necesita ver los productos disponibles
  /// para asignarlos al catálogo de sus partners.
  @Get()
  @Roles(RolUsuario.ADMIN_FENSTER, RolUsuario.COMERCIAL)
  async listar() {
    return this.productosService.listarBase();
  }

  @Post()
  async crear(@Body() dto: CrearProductoBaseDto) {
    return this.productosService.crearBase(dto);
  }

  /// Cambia la foto de uno o varios productos a la vez (`ids`: JSON con la lista
  /// de ids). El archivo se valida por sus bytes, no por lo que diga el cliente.
  @Post('imagen')
  @UseInterceptors(FileInterceptor('archivo', { limits: { fileSize: 3 * 1024 * 1024, files: 1 } }))
  async subirImagen(@Body('ids') ids: string, @UploadedFile() archivo: ArchivoSubido | undefined) {
    let lista: unknown = [];
    try {
      lista = JSON.parse(ids);
    } catch {
      /* lista inválida: la rechaza el servicio */
    }
    return this.imagenes.asignar(lista, archivo);
  }

  @Delete('imagen')
  async quitarImagen(@Body('ids') ids: unknown) {
    return this.imagenes.quitar(ids);
  }

  @Get(':id/representaciones')
  async representaciones(@Param('id', ParseUUIDPipe) id: string) {
    return this.productosService.listarRepresentacionesDeBase(id);
  }

  @Patch(':id')
  async actualizar(@Param('id', ParseUUIDPipe) id: string, @Body() dto: ActualizarProductoBaseDto) {
    return this.productosService.actualizarBase(id, dto);
  }

  @Post(':id/asignar-masivo')
  async asignarMasivo(@Param('id', ParseUUIDPipe) id: string, @Body() dto: AsignarMasivoDto) {
    return this.productosService.asignarMasivo(id, dto);
  }
}
