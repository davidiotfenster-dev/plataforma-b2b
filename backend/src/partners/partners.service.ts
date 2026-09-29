import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { Prisma } from '../generated/prisma/client.js';
import { EstadoPartner } from '../generated/prisma/enums.js';
import type { ActualizarPartnerDto } from './dto/actualizar-partner.dto.js';
import type { AsignarProductosDto } from './dto/asignar-productos.dto.js';
import type { ActualizarRepresentacionDto } from './dto/actualizar-representacion.dto.js';
import type { ListarPartnersQueryDto } from './dto/listar-partners-query.dto.js';

@Injectable()
export class PartnersService {
  constructor(private readonly prisma: PrismaService) {}

  async listar(query: ListarPartnersQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const where: Prisma.PartnerWhereInput = {
      ...(query.estado ? { estado: query.estado } : {}),
      ...(query.busqueda
        ? {
            OR: [
              { razonSocial: { contains: query.busqueda, mode: 'insensitive' } },
              { cif: { contains: query.busqueda, mode: 'insensitive' } },
              { dominioWeb: { contains: query.busqueda, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [data, total] = await Promise.all([
      this.prisma.partner.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.partner.count({ where }),
    ]);

    return { data, total, page, limit };
  }

  private async obtenerOFallar(id: string) {
    const partner = await this.prisma.partner.findUnique({ where: { id } });
    if (!partner) {
      throw new NotFoundException('Partner no encontrado');
    }
    return partner;
  }

  async obtener(id: string) {
    return this.obtenerOFallar(id);
  }

  async actualizar(id: string, dto: ActualizarPartnerDto) {
    await this.obtenerOFallar(id);

    try {
      return await this.prisma.partner.update({
        where: { id },
        data: {
          razonSocial: dto.razonSocial,
          cif: dto.cif,
          direccionFiscal: dto.direccionFiscal,
          pais: dto.pais,
          dominioWeb: dto.dominioWeb,
          codigoCliente: dto.codigoCliente,
          marcaComercial: dto.marcaComercial,
          tarifa: dto.tarifa,
          descuentoPorcentaje: dto.descuentoPorcentaje,
          notas: dto.notas,
        },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        const campo = (error.meta?.target as string[] | undefined)?.join(', ') ?? 'campo único';
        throw new ConflictException(`Ya existe otro partner con ese valor en: ${campo}`);
      }
      throw error;
    }
  }

  async suspender(id: string) {
    const partner = await this.obtenerOFallar(id);
    if (partner.estado !== EstadoPartner.ACTIVO) {
      throw new ConflictException(`Solo se puede suspender un partner ACTIVO (estado actual: ${partner.estado})`);
    }
    return this.prisma.partner.update({ where: { id }, data: { estado: EstadoPartner.SUSPENDIDO } });
  }

  async reactivar(id: string) {
    const partner = await this.obtenerOFallar(id);
    if (partner.estado !== EstadoPartner.SUSPENDIDO) {
      throw new ConflictException(`Solo se puede reactivar un partner SUSPENDIDO (estado actual: ${partner.estado})`);
    }
    return this.prisma.partner.update({ where: { id }, data: { estado: EstadoPartner.ACTIVO } });
  }

  /// Vista de administración del catálogo asignado a un partner (incluye
  /// productos desactivados, a diferencia de `ProductosService.listarCatalogo`
  /// que es la vista propia del partner).
  async listarCatalogo(id: string) {
    await this.obtenerOFallar(id);
    return this.prisma.representacionPartner.findMany({
      where: { partnerId: id },
      include: { productoBase: { select: { id: true, skuIndustrial: true, nombreTecnico: true } } },
      orderBy: { nombreComercial: 'asc' },
    });
  }

  /// Da de alta en el catálogo del partner uno o varios productos base ya
  /// existentes, con su SKU/nombre/PVP comercial y (opcionalmente) un
  /// descuento específico. Puede hacerse en cualquier momento, no solo al
  /// aprobar el partner.
  async asignarProductos(id: string, dto: AsignarProductosDto) {
    await this.obtenerOFallar(id);

    try {
      return await this.prisma.$transaction(
        dto.items.map((item) =>
          this.prisma.representacionPartner.create({
            data: {
              partnerId: id,
              productoBaseId: item.productoBaseId,
              skuComercial: item.skuComercial,
              nombreComercial: item.nombreComercial,
              pvpBase: item.pvpBase,
              descuentoOverride: item.descuentoOverride,
            },
          }),
        ),
      );
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('Ya existe un producto con ese SKU comercial en el catálogo de este partner.');
      }
      throw error;
    }
  }

  private async obtenerRepresentacionOFallar(partnerId: string, repId: string) {
    const representacion = await this.prisma.representacionPartner.findUnique({ where: { id: repId } });
    if (!representacion || representacion.partnerId !== partnerId) {
      throw new NotFoundException('Producto no encontrado en el catálogo de este partner');
    }
    return representacion;
  }

  async actualizarRepresentacion(partnerId: string, repId: string, dto: ActualizarRepresentacionDto) {
    await this.obtenerRepresentacionOFallar(partnerId, repId);

    try {
      return await this.prisma.representacionPartner.update({
        where: { id: repId },
        data: {
          skuComercial: dto.skuComercial,
          nombreComercial: dto.nombreComercial,
          pvpBase: dto.pvpBase,
          descuentoOverride: dto.descuentoOverride,
          activo: dto.activo,
        },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('Ya existe un producto con ese SKU comercial en el catálogo de este partner.');
      }
      throw error;
    }
  }
}
