import { Body, Controller, Delete, Get, Param, ParseEnumPipe, ParseUUIDPipe, Patch, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../common/guards/roles.guard.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { MarcaCatalogo, RolUsuario } from '../generated/prisma/enums.js';
import { CatalogoMarcaService } from './catalogo-marca.service.js';
import { ActualizarProductoMarcaDto, AnadirCatalogoMarcaDto } from './dto/catalogo-marca.dto.js';

const marcaPipe = new ParseEnumPipe(MarcaCatalogo);

/// Catálogos de las submarcas: solo ADMIN_FENSTER. Un cambio aquí llega al
/// momento a todas las empresas (partners y clientes) de esa marca.
@Controller('catalogos-marca')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(RolUsuario.ADMIN_FENSTER)
export class CatalogoMarcaController {
  constructor(private readonly catalogo: CatalogoMarcaService) {}

  @Get(':marca')
  listar(@Param('marca', marcaPipe) marca: MarcaCatalogo) {
    return this.catalogo.listar(marca);
  }

  @Post(':marca/productos')
  anadir(@Param('marca', marcaPipe) marca: MarcaCatalogo, @Body() dto: AnadirCatalogoMarcaDto) {
    return this.catalogo.anadir(marca, dto.items);
  }

  @Post(':marca/rellenar')
  rellenar(@Param('marca', marcaPipe) marca: MarcaCatalogo) {
    return this.catalogo.rellenar(marca);
  }

  @Patch('productos/:id')
  actualizar(@Param('id', ParseUUIDPipe) id: string, @Body() dto: ActualizarProductoMarcaDto) {
    return this.catalogo.actualizar(id, dto);
  }

  @Delete('productos/:id')
  eliminar(@Param('id', ParseUUIDPipe) id: string) {
    return this.catalogo.eliminar(id);
  }
}
