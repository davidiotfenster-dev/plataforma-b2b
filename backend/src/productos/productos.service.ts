import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { Prisma } from '../generated/prisma/client.js';
import { EstadoPartner } from '../generated/prisma/enums.js';
import { especificacionesParaPartner, varianteParaPartner } from './especificaciones-partner.js';
import { calcularPrecioNeto } from '../common/precio-neto.js';
import { REPRESENTACION_VISIBLE } from '../catalogo-marca/catalogo-marca.service.js';
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
    return this.prisma.productoBase.findMany({
      orderBy: { nombreTecnico: 'asc' },
      include: { _count: { select: { representaciones: true } } },
    });
  }

  async crearBase(dto: CrearProductoBaseDto) {
    const existente = await this.prisma.productoBase.findUnique({ where: { skuIndustrial: dto.skuIndustrial } });
    if (existente) {
      throw new ConflictException(`Ya existe un producto base con SKU industrial "${dto.skuIndustrial}"`);
    }
    return this.prisma.productoBase.create({
      data: { ...dto, especificacionesJson: dto.especificacionesJson as Prisma.InputJsonValue | undefined },
    });
  }

  async actualizarBase(id: string, dto: ActualizarProductoBaseDto) {
    const producto = await this.prisma.productoBase.findUnique({ where: { id } });
    if (!producto) {
      throw new NotFoundException('Producto base no encontrado');
    }
    return this.prisma.productoBase.update({
      where: { id },
      data: { ...dto, especificacionesJson: dto.especificacionesJson as Prisma.InputJsonValue | undefined },
    });
  }

  /// Qué partners tienen asignado este producto base y con qué nombre/precio,
  /// para el panel de detalle del admin.
  async listarRepresentacionesDeBase(id: string) {
    const producto = await this.prisma.productoBase.findUnique({ where: { id }, select: { id: true } });
    if (!producto) {
      throw new NotFoundException('Producto base no encontrado');
    }
    return this.prisma.representacionPartner.findMany({
      where: { productoBaseId: id },
      orderBy: { partner: { razonSocial: 'asc' } },
      include: { partner: { select: { id: true, razonSocial: true, marcaComercial: true, estado: true } } },
    });
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
            where: { id: { in: dto.partnerIds }, estado: EstadoPartner.ACTIVO, archivadoEn: null },
            select: { id: true },
          })
        : await this.prisma.partner.findMany({ where: { estado: EstadoPartner.ACTIVO, archivadoEn: null }, select: { id: true } });

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

  /// Lo que ve un partner de un producto de SU catálogo. Lista explícita de
  /// campos: nunca se devuelve la fila entera, porque `productoBaseId` es el
  /// mismo en todos los partners y el nombre/SKU técnico puede nombrar a otras
  /// marcas (Zero Data Leak).
  private static readonly CAMPOS_CATALOGO_PARTNER = {
    id: true,
    skuComercial: true,
    nombreComercial: true,
    imagenUrl: true,
    documentacionUrl: true,
    pvpBase: true,
    /// Para calcular el precio neto del cliente; no se devuelve tal cual.
    descuentoOverride: true,
    activo: true,
  } as const;

  /// Añade al producto el descuento y el precio neto de ESTE cliente (el del
  /// producto si lo tiene, si no el general de su empresa), calculados con la
  /// misma fórmula que luego usan el carrito y el pedido.
  private conPrecioNeto<T extends { pvpBase: Prisma.Decimal; descuentoOverride: Prisma.Decimal | null }>(
    { descuentoOverride, ...producto }: T,
    descuentoGeneral: Prisma.Decimal,
  ) {
    const descuentoAplicado = descuentoOverride ?? descuentoGeneral;
    return {
      ...producto,
      descuentoPorcentaje: descuentoAplicado.toString(),
      precioNeto: calcularPrecioNeto(producto.pvpBase, descuentoAplicado).toString(),
    };
  }

  private async descuentoGeneral(partnerId: string): Promise<Prisma.Decimal> {
    const { descuentoPorcentaje } = await this.prisma.partner.findUniqueOrThrow({
      where: { id: partnerId },
      select: { descuentoPorcentaje: true },
    });
    return descuentoPorcentaje;
  }

  async listarCatalogo(partnerId: string) {
    const descuentoGeneral = await this.descuentoGeneral(partnerId);
    const filas = await this.prisma.representacionPartner.findMany({
      where: { partnerId, ...REPRESENTACION_VISIBLE },
      select: {
        ...ProductosService.CAMPOS_CATALOGO_PARTNER,
        productoBase: { select: { nombreTecnico: true, especificacionesJson: true, imagenUrl: true } },
      },
      orderBy: { nombreComercial: 'asc' },
    });
    // Color y modelo (opaco) para agrupar las variantes de color en una sola tarjeta.
    return filas.map(({ productoBase, ...producto }) => ({
      ...this.conPrecioNeto(producto, descuentoGeneral),
      imagenUrl: producto.imagenUrl ?? productoBase.imagenUrl,
      ...varianteParaPartner(productoBase.especificacionesJson, productoBase.nombreTecnico, partnerId),
    }));
  }

  async obtenerRepresentacion(partnerId: string, id: string) {
    /// El filtro por `partnerId` va en la propia consulta: un producto de otro
    /// partner y uno inexistente son indistinguibles (mismo 404).
    const descuentoGeneral = await this.descuentoGeneral(partnerId);
    const representacion = await this.prisma.representacionPartner.findFirst({
      where: { id, partnerId, ...REPRESENTACION_VISIBLE },
      select: {
        ...ProductosService.CAMPOS_CATALOGO_PARTNER,
        productoBase: { select: { especificacionesJson: true, imagenUrl: true } },
      },
    });

    if (!representacion) {
      throw NO_ENCONTRADO();
    }

    const { productoBase, ...producto } = representacion;
    return {
      ...this.conPrecioNeto(producto, descuentoGeneral),
      imagenUrl: producto.imagenUrl ?? productoBase.imagenUrl,
      productoBase: { especificacionesJson: especificacionesParaPartner(productoBase.especificacionesJson) },
    };
  }
}
