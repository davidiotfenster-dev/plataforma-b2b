import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { EstadoPartner } from '../generated/prisma/enums.js';
import type { CrearProductoBaseDto } from './dto/crear-producto-base.dto.js';
import type { ActualizarProductoBaseDto } from './dto/actualizar-producto-base.dto.js';
import type { AsignarMasivoDto } from './dto/asignar-masivo.dto.js';

/// Mensaje opaco: idéntico exista o no el recurso, o pertenezca a otro
/// partner. Nunca debe distinguirse una cosa de otra (Zero Data Leak).
const NO_ENCONTRADO = () => new NotFoundException('Recurso no encontrado');

@Injectable()
export class ProductosService {
  constructor(private readonly prisma: PrismaService) {}

  /// Gestión del catálogo global de ADMIN_FENSTER (productos base, sin
  /// datos comerciales de ningún partner en concreto).
  async listarBase() {
    return this.prisma.productoBase.findMany({ orderBy: { nombreTecnico: 'asc' } });
  }

  async crearBase(dto: CrearProductoBaseDto) {
    const existente = await this.prisma.productoBase.findUnique({ where: { skuIndustrial: dto.skuIndustrial } });
    if (existente) {
      throw new ConflictException(`Ya existe un producto base con SKU industrial "${dto.skuIndustrial}"`);
    }
    return this.prisma.productoBase.create({ data: dto });
  }

  async actualizarBase(id: string, dto: ActualizarProductoBaseDto) {
    const producto = await this.prisma.productoBase.findUnique({ where: { id } });
    if (!producto) {
      throw new NotFoundException('Producto base no encontrado');
    }
    return this.prisma.productoBase.update({ where: { id }, data: dto });
  }

  /// Asigna un producto base a varios/todos los partners activos de una
  /// vez, con un SKU/nombre/precio/descuento por defecto compartido (el
  /// admin puede afinar cada uno después desde `admin/partners/:id/catalogo`).
  /// Los partners que ya tuvieran este producto se omiten (no falla la
  /// operación entera por unos pocos duplicados).
  async asignarMasivo(productoBaseId: string, dto: AsignarMasivoDto) {
    const producto = await this.prisma.productoBase.findUnique({ where: { id: productoBaseId } });
    if (!producto) {
      throw new NotFoundException('Producto base no encontrado');
    }

    const partnersObjetivo =
      dto.partnerIds && dto.partnerIds.length > 0
        ? await this.prisma.partner.findMany({
            where: { id: { in: dto.partnerIds }, estado: EstadoPartner.ACTIVO },
            select: { id: true },
          })
        : await this.prisma.partner.findMany({ where: { estado: EstadoPartner.ACTIVO }, select: { id: true } });

    if (partnersObjetivo.length === 0) {
      return { asignados: 0, omitidos: 0 };
    }

    const yaAsignados = await this.prisma.representacionPartner.findMany({
      where: { productoBaseId, partnerId: { in: partnersObjetivo.map((p) => p.id) } },
      select: { partnerId: true },
    });
    const yaAsignadosSet = new Set(yaAsignados.map((r) => r.partnerId));
    const pendientes = partnersObjetivo.filter((p) => !yaAsignadosSet.has(p.id));

    if (pendientes.length > 0) {
      await this.prisma.representacionPartner.createMany({
        data: pendientes.map((p) => ({
          productoBaseId,
          partnerId: p.id,
          skuComercial: dto.skuComercial,
          nombreComercial: dto.nombreComercial,
          pvpBase: dto.pvpBase,
          descuentoOverride: dto.descuentoOverride,
        })),
      });
    }

    return { asignados: pendientes.length, omitidos: partnersObjetivo.length - pendientes.length };
  }

  async listarCatalogo(partnerId: string) {
    return this.prisma.representacionPartner.findMany({
      where: { partnerId, activo: true },
      orderBy: { nombreComercial: 'asc' },
    });
  }

  async obtenerRepresentacion(partnerId: string, id: string) {
    const representacion = await this.prisma.representacionPartner.findUnique({
      where: { id },
      include: {
        productoBase: {
          select: { skuIndustrial: true, nombreTecnico: true, especificacionesJson: true },
        },
      },
    });

    if (!representacion || representacion.partnerId !== partnerId || !representacion.activo) {
      throw NO_ENCONTRADO();
    }

    return representacion;
  }
}
