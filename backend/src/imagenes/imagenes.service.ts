import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { mkdir, readFile, unlink, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { PrismaService } from '../prisma/prisma.service.js';

export interface ArchivoSubido {
  buffer: Buffer;
  size: number;
}

const TAMANO_MAXIMO = 3 * 1024 * 1024;
const MAX_PRODUCTOS_POR_LLAMADA = 200;
const NOMBRE_VALIDO = /^[\w-]{1,80}\.(png|jpg|webp)$/;
const PREFIJO = '/imagenes/';
const TIPOS: Record<string, string> = { png: 'image/png', jpg: 'image/jpeg', webp: 'image/webp' };

/// Tipo real según los primeros bytes (no se fía del nombre ni del Content-Type
/// que manda el cliente). SVG queda fuera a propósito: puede llevar scripts.
function detectarTipo(b: Buffer): 'png' | 'jpg' | 'webp' | null {
  if (b.length > 12 && b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'png';
  if (b.length > 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return 'jpg';
  if (b.length > 12 && b.subarray(0, 4).toString('latin1') === 'RIFF' && b.subarray(8, 12).toString('latin1') === 'WEBP') return 'webp';
  return null;
}

/// Fotos de los productos base: se guardan en disco (`UPLOADS_DIR`, por defecto
/// `uploads/productos`) con nombre aleatorio (UUID v4, no adivinable) y se
/// enlazan desde `ProductoBase.imagenUrl`. Las de serie (`default-*`) nunca se
/// borran del disco.
@Injectable()
export class ImagenesService {
  private readonly directorio = process.env.UPLOADS_DIR ?? join(process.cwd(), 'uploads', 'productos');

  constructor(private readonly prisma: PrismaService) {}

  /// Lee una imagen por nombre; `null` si el nombre no es válido o no existe.
  async leer(nombre: string): Promise<{ datos: Buffer; tipo: string; deSerie: boolean } | null> {
    if (!NOMBRE_VALIDO.test(nombre)) return null;
    try {
      const datos = await readFile(join(this.directorio, nombre));
      return { datos, tipo: TIPOS[nombre.split('.').pop()!], deSerie: nombre.startsWith('default-') };
    } catch {
      return null;
    }
  }

  private validarIds(ids: unknown): string[] {
    const lista = Array.isArray(ids) ? ids : [];
    const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (lista.length === 0 || lista.length > MAX_PRODUCTOS_POR_LLAMADA || !lista.every((i) => typeof i === 'string' && uuid.test(i))) {
      throw new BadRequestException('Lista de productos no válida');
    }
    return [...new Set(lista as string[])];
  }

  private async existentes(ids: string[]) {
    const productos = await this.prisma.productoBase.findMany({ where: { id: { in: ids } }, select: { id: true, imagenUrl: true } });
    if (productos.length !== ids.length) throw new NotFoundException('Producto base no encontrado');
    return productos;
  }

  /// Pone la misma imagen a varios productos (mismo aparato en varios colores o marcas).
  async asignar(idsBrutos: unknown, archivo: ArchivoSubido | undefined) {
    const ids = this.validarIds(idsBrutos);
    if (!archivo) throw new BadRequestException('Falta el archivo de imagen');
    if (archivo.size > TAMANO_MAXIMO) throw new BadRequestException('La imagen supera los 3 MB');
    const tipo = detectarTipo(archivo.buffer);
    if (!tipo) throw new BadRequestException('Formato no válido: usa PNG, JPG o WEBP');

    const productos = await this.existentes(ids);
    const nombre = `${randomUUID()}.${tipo}`;
    await mkdir(this.directorio, { recursive: true });
    await writeFile(join(this.directorio, nombre), archivo.buffer);
    const imagenUrl = `${PREFIJO}${nombre}`;
    await this.prisma.productoBase.updateMany({ where: { id: { in: ids } }, data: { imagenUrl } });
    await this.limpiar(productos.map((p) => p.imagenUrl));
    return { actualizados: ids.length, imagenUrl };
  }

  async quitar(idsBrutos: unknown) {
    const ids = this.validarIds(idsBrutos);
    const productos = await this.existentes(ids);
    await this.prisma.productoBase.updateMany({ where: { id: { in: ids } }, data: { imagenUrl: null } });
    await this.limpiar(productos.map((p) => p.imagenUrl));
    return { actualizados: ids.length };
  }

  /// Borra del disco las imágenes subidas que ya no usa ningún producto ni partner.
  private async limpiar(urls: (string | null)[]) {
    for (const url of new Set(urls)) {
      if (!url?.startsWith(PREFIJO)) continue;
      const nombre = url.slice(PREFIJO.length);
      if (!NOMBRE_VALIDO.test(nombre) || nombre.startsWith('default-')) continue;
      const [enBase, enPartners] = await Promise.all([
        this.prisma.productoBase.count({ where: { imagenUrl: url } }),
        this.prisma.representacionPartner.count({ where: { imagenUrl: url } }),
      ]);
      if (enBase + enPartners === 0) await unlink(join(this.directorio, nombre)).catch(() => undefined);
    }
  }
}
