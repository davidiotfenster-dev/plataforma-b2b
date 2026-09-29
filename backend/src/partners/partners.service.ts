import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service.js';
import { Prisma } from '../generated/prisma/client.js';
import { EstadoPartner, RolUsuario } from '../generated/prisma/enums.js';
import type { ActualizarPartnerDto } from './dto/actualizar-partner.dto.js';
import type { CrearPartnerDto } from './dto/crear-partner.dto.js';
import type { AsignarProductosDto } from './dto/asignar-productos.dto.js';
import type { ActualizarRepresentacionDto } from './dto/actualizar-representacion.dto.js';
import type { ListarPartnersQueryDto } from './dto/listar-partners-query.dto.js';

const SALT_ROUNDS = 12;

@Injectable()
export class PartnersService {
  constructor(private readonly prisma: PrismaService) {}

  /// Alta directa (sin registro público ni verificación de email): la usa
  /// ADMIN_FENSTER o COMERCIAL. Queda ACTIVO de inmediato con su primer
  /// usuario ya operativo. `creadoPorUsuarioId` queda grabado siempre (sirve
  /// de rastro de auditoría y es lo que acota la visibilidad de COMERCIAL).
  async crear(dto: CrearPartnerDto, creadoPorUsuarioId: string) {
    const passwordHash = await bcrypt.hash(dto.passwordUsuario, SALT_ROUNDS);

    try {
      return await this.prisma.$transaction(async (tx) => {
        const partner = await tx.partner.create({
          data: {
            razonSocial: dto.razonSocial,
            cif: dto.cif,
            direccionFiscal: dto.direccionFiscal,
            pais: dto.pais,
            dominioWeb: dto.dominioWeb,
            codigoCliente: dto.codigoCliente,
            marcaComercial: dto.marcaComercial,
            tarifa: dto.tarifa,
            descuentoPorcentaje: dto.descuentoPorcentaje ?? 0,
            telefono1: dto.telefono1,
            telefono2: dto.telefono2,
            codigoPostal: dto.codigoPostal,
            localidad: dto.localidad,
            provincia: dto.provincia,
            direccionEnvioDefecto: dto.direccionEnvioDefecto,
            codigoPostalEnvio: dto.codigoPostalEnvio,
            localidadEnvio: dto.localidadEnvio,
            provinciaEnvio: dto.provinciaEnvio,
            paisEnvio: dto.paisEnvio,
            correoContacto1: dto.correoContacto1,
            correoContacto2: dto.correoContacto2,
            correoFacturacion: dto.correoFacturacion,
            formaPago: dto.formaPago,
            divisa: dto.divisa,
            iva: dto.iva,
            notas: dto.notas,
            estado: EstadoPartner.ACTIVO,
            creadoPorUsuarioId,
          },
        });

        await tx.user.create({
          data: {
            email: dto.emailUsuario,
            passwordHash,
            nombre: dto.nombreUsuario,
            rol: RolUsuario.PARTNER_ADMIN,
            partnerId: partner.id,
            activo: true,
            emailVerificadoEn: new Date(),
          },
        });

        return partner;
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        const campo = (error.meta?.target as string[] | undefined)?.join(', ') ?? 'campo único';
        throw new ConflictException(`Ya existe un partner o usuario con ese valor en: ${campo}`);
      }
      throw error;
    }
  }

  async listar(query: ListarPartnersQueryDto, restringirCreadoPorId?: string) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const where: Prisma.PartnerWhereInput = {
      ...(restringirCreadoPorId ? { creadoPorUsuarioId: restringirCreadoPorId } : {}),
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

  /// `restringirCreadoPorId` acota el acceso a un COMERCIAL: si el partner
  /// existe pero pertenece a otro comercial/admin, se responde igual que si
  /// no existiera (404 opaco), nunca un 403 que confirme su existencia.
  private async obtenerOFallar(id: string, restringirCreadoPorId?: string) {
    const partner = await this.prisma.partner.findUnique({ where: { id } });
    if (!partner || (restringirCreadoPorId && partner.creadoPorUsuarioId !== restringirCreadoPorId)) {
      throw new NotFoundException('Partner no encontrado');
    }
    return partner;
  }

  async obtener(id: string, restringirCreadoPorId?: string) {
    return this.obtenerOFallar(id, restringirCreadoPorId);
  }

  async actualizar(id: string, dto: ActualizarPartnerDto, restringirCreadoPorId?: string) {
    await this.obtenerOFallar(id, restringirCreadoPorId);

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
          telefono1: dto.telefono1,
          telefono2: dto.telefono2,
          codigoPostal: dto.codigoPostal,
          localidad: dto.localidad,
          provincia: dto.provincia,
          direccionEnvioDefecto: dto.direccionEnvioDefecto,
          codigoPostalEnvio: dto.codigoPostalEnvio,
          localidadEnvio: dto.localidadEnvio,
          provinciaEnvio: dto.provinciaEnvio,
          paisEnvio: dto.paisEnvio,
          correoContacto1: dto.correoContacto1,
          correoContacto2: dto.correoContacto2,
          correoFacturacion: dto.correoFacturacion,
          formaPago: dto.formaPago,
          divisa: dto.divisa,
          iva: dto.iva,
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

  async suspender(id: string, restringirCreadoPorId?: string) {
    const partner = await this.obtenerOFallar(id, restringirCreadoPorId);
    if (partner.estado !== EstadoPartner.ACTIVO) {
      throw new ConflictException(`Solo se puede suspender un partner ACTIVO (estado actual: ${partner.estado})`);
    }
    return this.prisma.partner.update({ where: { id }, data: { estado: EstadoPartner.SUSPENDIDO } });
  }

  async reactivar(id: string, restringirCreadoPorId?: string) {
    const partner = await this.obtenerOFallar(id, restringirCreadoPorId);
    if (partner.estado !== EstadoPartner.SUSPENDIDO) {
      throw new ConflictException(`Solo se puede reactivar un partner SUSPENDIDO (estado actual: ${partner.estado})`);
    }
    return this.prisma.partner.update({ where: { id }, data: { estado: EstadoPartner.ACTIVO } });
  }

  /// Vista de administración del catálogo asignado a un partner (incluye
  /// productos desactivados, a diferencia de `ProductosService.listarCatalogo`
  /// que es la vista propia del partner).
  async listarCatalogo(id: string, restringirCreadoPorId?: string) {
    await this.obtenerOFallar(id, restringirCreadoPorId);
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
  async asignarProductos(id: string, dto: AsignarProductosDto, restringirCreadoPorId?: string) {
    await this.obtenerOFallar(id, restringirCreadoPorId);

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

  async actualizarRepresentacion(
    partnerId: string,
    repId: string,
    dto: ActualizarRepresentacionDto,
    restringirCreadoPorId?: string,
  ) {
    await this.obtenerOFallar(partnerId, restringirCreadoPorId);
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
