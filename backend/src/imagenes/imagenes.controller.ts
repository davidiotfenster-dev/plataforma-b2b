import { Controller, Get, Header, NotFoundException, Param, Res, StreamableFile } from '@nestjs/common';
import type { Response } from 'express';
import { ImagenesService } from './imagenes.service.js';

/// Sirve las fotos de producto. Es público a propósito (una etiqueta <img> del
/// portal no lleva cabeceras propias): los nombres son UUID v4 no adivinables y
/// las fotos son de catálogo, sin datos de ningún partner.
@Controller('imagenes')
export class ImagenesController {
  constructor(private readonly imagenes: ImagenesService) {}

  @Get(':archivo')
  @Header('X-Content-Type-Options', 'nosniff')
  @Header('Cross-Origin-Resource-Policy', 'cross-origin')
  async ver(@Param('archivo') archivo: string, @Res({ passthrough: true }) res: Response) {
    const imagen = await this.imagenes.leer(archivo);
    if (!imagen) throw new NotFoundException('Recurso no encontrado');
    res.setHeader('Content-Type', imagen.tipo);
    // Las subidas tienen nombre único y nunca cambian; las de serie sí pueden cambiar.
    res.setHeader('Cache-Control', imagen.deSerie ? 'public, max-age=3600' : 'public, max-age=31536000, immutable');
    return new StreamableFile(imagen.datos);
  }
}
