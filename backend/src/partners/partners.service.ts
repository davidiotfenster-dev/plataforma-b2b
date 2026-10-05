import { BadRequestException, ConflictException, ForbiddenException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service.js';
import { EmailService } from '../common/email/email.service.js';
import { asuntoBienvenidaEmpresa, cuerpoBienvenidaEmpresa } from '../common/email/plantillas-email.js';
import { CatalogoMarcaService } from '../catalogo-marca/catalogo-marca.service.js';
import { Prisma } from '../generated/prisma/client.js';
import { EstadoPartner, EstadoPedido, Idioma, RolUsuario, TipoEmpresa } from '../generated/prisma/enums.js';
import type { ActualizarPartnerDto } from './dto/actualizar-partner.dto.js';
import type { CrearPartnerDto } from './dto/crear-partner.dto.js';
import type { AsignarProductosDto } from './dto/asignar-productos.dto.js';
import type { ActualizarRepresentacionDto } from './dto/actualizar-representacion.dto.js';
import type { ListarPartnersQueryDto } from './dto/listar-partners-query.dto.js';
import type { EliminarPartnerDto } from './dto/eliminar-partner.dto.js';

const SALT_ROUNDS = 12;

/// Partners dados de alta a partir de un listado (ver `import-partners-reales.ts`)
/// llevan datos provisionales ("PENDIENTE-...") hasta que se completa su ficha.
/// Sirve para avisar en el panel de cuáles faltan y poder filtrarlos.
const DATOS_POR_COMPLETAR: Prisma.PartnerWhereInput = {
  OR: [
    { cif: { startsWith: 'PENDIENTE' } },
    { dominioWeb: { endsWith: '.pendiente.test' } },
    { direccionFiscal: 'Pendiente de completar' },
  ],
};

/// Conteos que se muestran junto a cada partner en el panel (sin traer las filas).
const CONTADORES_PARTNER = {
  _count: { select: { usuarios: true, representaciones: true, ordenes: true } },
} satisfies Prisma.PartnerInclude;

/// Dice qué dato ya existe (CIF, correo del usuario o código de cliente) en vez
/// de un "campo único" genérico: quien da el alta necesita saber qué corregir.
export function mensajeDuplicado(error: Prisma.PrismaClientKnownRequestError): string {
  const meta = JSON.stringify(error.meta ?? {}).toLowerCase();
  if (meta.includes('cif')) return 'Ya hay una empresa dada de alta con ese CIF.';
  if (meta.includes('email')) return 'Ya hay un usuario con ese correo electrónico.';
  if (meta.includes('codigocliente') || meta.includes('codigo_cliente')) return 'Ya hay una empresa con ese código de cliente.';
  return 'Ya existe una empresa o un usuario con alguno de esos datos.';
}

@Injectable()
export class PartnersService {
  private readonly logger = new Logger(PartnersService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly catalogoMarca: CatalogoMarcaService,
    private readonly emailService: EmailService,
    private readonly configService: ConfigService,
  ) {}

  /// Alta directa (sin registro público ni verificación de email): la usa
  /// ADMIN_FENSTER o COMERCIAL. Queda ACTIVO de inmediato con su primer
  /// usuario ya operativo. `creadoPorUsuarioId` queda grabado siempre (sirve
  /// de rastro de auditoría y es lo que acota la visibilidad de COMERCIAL).
  ///
  /// Solo un ADMIN_FENSTER puede dar de alta directamente un PARTNER: ser partner
  /// implica una inversión de IoT FENSTER (submarca, app/web a medida). Cualquier
  /// otro rol que lo pida recibe un 403 explícito; sin `tipo` la empresa nace DISTRIBUIDOR.
  async crear(dto: CrearPartnerDto, creadoPorUsuarioId: string, rol: RolUsuario) {
    if (dto.tipo === TipoEmpresa.PARTNER && rol !== RolUsuario.ADMIN_FENSTER) {
      throw new ForbiddenException('Solo un administrador puede dar de alta una empresa como Partner. Dala de alta como Distribuidor.');
    }
    const passwordHash = await bcrypt.hash(dto.passwordUsuario, SALT_ROUNDS);

    try {
      const creado = await this.prisma.$transaction(async (tx) => {
        const partner = await tx.partner.create({
          data: {
            razonSocial: dto.razonSocial,
            cif: dto.cif,
            direccionFiscal: dto.direccionFiscal,
            pais: dto.pais,
            dominioWeb: dto.dominioWeb,
            codigoCliente: dto.codigoCliente,
            marcaComercial: dto.marcaComercial,
            tipo: dto.tipo,
            marcaCatalogo: dto.marcaCatalogo,
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

        const usuario = await tx.user.create({
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

        return { partner, usuario };
      });
      // Nace con el catálogo de su marca ya puesto.
      await this.catalogoMarca.sincronizarEmpresa(creado.partner.id);
      await this.enviarBienvenida(creado.usuario);
      return creado.partner;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException(mensajeDuplicado(error));
      }
      throw error;
    }
  }

  /// Correo de bienvenida al primer usuario de una empresa dada de alta desde el
  /// panel. Es un aviso: si falla, el alta sigue hecha.
  private async enviarBienvenida(usuario: { email: string; idioma: Idioma }): Promise<void> {
    try {
      const frontendUrl = this.configService.get<string>('frontendUrl');
      await this.emailService.enviar(
        usuario.email,
        asuntoBienvenidaEmpresa(usuario.idioma),
        cuerpoBienvenidaEmpresa(usuario.idioma, usuario.email, `${frontendUrl}/login`, `${frontendUrl}/login/recuperar`),
      );
    } catch (error) {
      this.logger.error(`No se pudo enviar la bienvenida a ${usuario.email}: ${(error as Error).message}`);
    }
  }

  async listar(query: ListarPartnersQueryDto, restringirCreadoPorId?: string) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const filtros: Prisma.PartnerWhereInput[] = [];
    if (restringirCreadoPorId) filtros.push({ creadoPorUsuarioId: restringirCreadoPorId });
    filtros.push(query.archivadas ? { archivadoEn: { not: null } } : { archivadoEn: null });
    if (query.estado) filtros.push({ estado: query.estado });
    if (query.tipo) filtros.push({ tipo: query.tipo });
    if (query.busqueda) {
      filtros.push({
        OR: [
          { razonSocial: { contains: query.busqueda, mode: 'insensitive' } },
          { cif: { contains: query.busqueda, mode: 'insensitive' } },
          { dominioWeb: { contains: query.busqueda, mode: 'insensitive' } },
          { codigoCliente: { contains: query.busqueda, mode: 'insensitive' } },
        ],
      });
    }
    if (query.datosPorCompletar) filtros.push(DATOS_POR_COMPLETAR);
    const where: Prisma.PartnerWhereInput = filtros.length > 0 ? { AND: filtros } : {};

    const [data, total] = await Promise.all([
      this.prisma.partner.findMany({
        where,
        include: CONTADORES_PARTNER,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.partner.count({ where }),
    ]);

    return { data, total, page, limit };
  }

  /// Cifras para las pestañas del panel: cuántos partners hay en cada estado y
  /// cuántos siguen con datos provisionales. Respeta el alcance de un COMERCIAL.
  async resumen(restringirCreadoPorId?: string) {
    const propias: Prisma.PartnerWhereInput = restringirCreadoPorId ? { creadoPorUsuarioId: restringirCreadoPorId } : {};
    /// Las pestañas y contadores cuentan solo las empresas no archivadas.
    const acotado: Prisma.PartnerWhereInput = { AND: [propias, { archivadoEn: null }] };

    const [porEstadoBruto, datosPorCompletar, archivadas] = await Promise.all([
      this.prisma.partner.groupBy({ by: ['estado'], where: acotado, _count: { _all: true } }),
      this.prisma.partner.count({ where: { AND: [acotado, DATOS_POR_COMPLETAR] } }),
      this.prisma.partner.count({ where: { AND: [propias, { archivadoEn: { not: null } }] } }),
    ]);

    const porEstado = Object.fromEntries(Object.values(EstadoPartner).map((estado) => [estado, 0])) as Record<EstadoPartner, number>;
    for (const grupo of porEstadoBruto) porEstado[grupo.estado] = grupo._count._all;

    const total = Object.values(porEstado).reduce((suma, n) => suma + n, 0);
    return { total, porEstado, datosPorCompletar, archivadas };
  }

  /// `restringirCreadoPorId` acota el acceso a un COMERCIAL: si el partner
  /// existe pero pertenece a otro comercial/admin, se responde igual que si
  /// no existiera (404 opaco), nunca un 403 que confirme su existencia.
  private async obtenerOFallar(id: string, restringirCreadoPorId?: string) {
    const partner = await this.prisma.partner.findUnique({ where: { id }, include: CONTADORES_PARTNER });
    if (!partner || (restringirCreadoPorId && partner.creadoPorUsuarioId !== restringirCreadoPorId)) {
      throw new NotFoundException('Partner no encontrado');
    }
    return partner;
  }

  /// Ficha del partner con su volumen de compra (lo que justifica, o no, promocionarlo).
  async obtener(id: string, restringirCreadoPorId?: string) {
    const partner = await this.obtenerOFallar(id, restringirCreadoPorId);
    return { ...partner, volumen: await this.volumenCompras(id) };
  }

  /// Dispositivos y pedidos que lleva comprados la empresa, sin contar los cancelados.
  /// `umbralPromocion` es el aviso configurable (PARTNER_UMBRAL_UNIDADES); nulo si no está puesto.
  private async volumenCompras(partnerId: string) {
    const pedidos = { partnerId, estado: { not: EstadoPedido.CANCELADO } };
    const [lineas, totalPedidos] = await Promise.all([
      this.prisma.orderItem.aggregate({ _sum: { cantidad: true }, where: { order: pedidos } }),
      this.prisma.order.count({ where: pedidos }),
    ]);
    const umbral = Number(process.env.PARTNER_UMBRAL_UNIDADES);
    return {
      unidades: lineas._sum.cantidad ?? 0,
      pedidos: totalPedidos,
      umbralPromocion: Number.isInteger(umbral) && umbral > 0 ? umbral : null,
    };
  }

  async actualizar(id: string, dto: ActualizarPartnerDto, restringirCreadoPorId?: string) {
    const anterior = await this.obtenerOFallar(id, restringirCreadoPorId);

    try {
      const actualizado = await this.prisma.partner.update({
        where: { id },
        data: {
          razonSocial: dto.razonSocial,
          cif: dto.cif,
          direccionFiscal: dto.direccionFiscal,
          pais: dto.pais,
          dominioWeb: dto.dominioWeb,
          codigoCliente: dto.codigoCliente,
          marcaComercial: dto.marcaComercial,
          marcaCatalogo: dto.marcaCatalogo,
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
      // Cambio de marca: su catálogo pasa al de la nueva marca (los productos
      // de la anterior salen también de sus carritos; los pedidos no cambian).
      if (actualizado.marcaCatalogo !== anterior.marcaCatalogo) await this.catalogoMarca.sincronizarEmpresa(id);
      return actualizado;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException(mensajeDuplicado(error));
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

  /// Pasar una empresa de Distribuidor a Partner (solo ADMIN_FENSTER, ver el controlador).
  /// Es la única vía para cambiar el tipo: queda en la auditoría con quién, cuándo y
  /// el volumen de compra que lo justificó.
  async promocionar(id: string, adminUserId: string) {
    return this.cambiarTipo(id, TipoEmpresa.PARTNER, adminUserId);
  }

  /// Vuelta atrás de `promocionar`: Partner a Distribuidor. Sus datos y pedidos no cambian.
  async degradar(id: string, adminUserId: string) {
    return this.cambiarTipo(id, TipoEmpresa.DISTRIBUIDOR, adminUserId);
  }

  private async cambiarTipo(id: string, nuevoTipo: TipoEmpresa, adminUserId: string) {
    const partner = await this.obtenerOFallar(id);
    if (partner.tipo === nuevoTipo) {
      throw new ConflictException(`La empresa ya es ${nuevoTipo === TipoEmpresa.PARTNER ? 'Partner' : 'Distribuidor'}`);
    }
    if (nuevoTipo === TipoEmpresa.PARTNER && (partner.archivadoEn || partner.estado !== EstadoPartner.ACTIVO)) {
      throw new ConflictException('Solo se puede promocionar a Partner una empresa activa y no archivada');
    }

    const volumen = await this.volumenCompras(id);
    const [actualizada] = await this.prisma.$transaction([
      this.prisma.partner.update({ where: { id }, data: { tipo: nuevoTipo } }),
      this.prisma.auditLog.create({
        data: {
          level: 'info',
          eventType: nuevoTipo === TipoEmpresa.PARTNER ? 'PARTNER_PROMOCIONADO' : 'PARTNER_DEGRADADO',
          userId: adminUserId,
          partnerId: id,
          payload: {
            razonSocial: partner.razonSocial,
            tipoAnterior: partner.tipo,
            tipoNuevo: nuevoTipo,
            unidadesCompradas: volumen.unidades,
            pedidos: volumen.pedidos,
          },
        },
      }),
    ]);
    return actualizada;
  }

  private async registrarAuditoria(userId: string, eventType: string, payload: Prisma.InputJsonValue, partnerId?: string) {
    await this.prisma.auditLog.create({ data: { level: 'info', eventType, userId, partnerId, payload } });
  }

  /// Archivar oculta la empresa de las listas y le impide entrar, pero conserva
  /// sus datos y pedidos. Es reversible. No se permite con pedidos aún sin enviar:
  /// dejarían de verse en el panel de preparación.
  async archivar(id: string, userId: string, restringirCreadoPorId?: string) {
    const partner = await this.obtenerOFallar(id, restringirCreadoPorId);
    if (partner.archivadoEn) {
      throw new ConflictException('La empresa ya está archivada');
    }

    const enCurso = await this.prisma.order.count({
      where: {
        partnerId: id,
        estado: { in: [EstadoPedido.RECIBIDO, EstadoPedido.CONFIRMADO, EstadoPedido.EN_PREPARACION, EstadoPedido.PREPARADO] },
      },
    });
    if (enCurso > 0) {
      throw new ConflictException(
        `No se puede archivar: tiene ${enCurso} ${enCurso === 1 ? 'pedido' : 'pedidos'} sin enviar. Envíalos o cancélalos primero.`,
      );
    }

    const archivada = await this.prisma.partner.update({ where: { id }, data: { archivadoEn: new Date() } });
    await this.registrarAuditoria(userId, 'PARTNER_ARCHIVADO', { razonSocial: partner.razonSocial }, id);
    return archivada;
  }

  async desarchivar(id: string, userId: string, restringirCreadoPorId?: string) {
    const partner = await this.obtenerOFallar(id, restringirCreadoPorId);
    if (!partner.archivadoEn) {
      throw new ConflictException('La empresa no está archivada');
    }

    const activa = await this.prisma.partner.update({ where: { id }, data: { archivadoEn: null } });
    /// Su catálogo pudo quedar desfasado mientras estuvo archivada.
    await this.catalogoMarca.sincronizarEmpresa(id);
    await this.registrarAuditoria(userId, 'PARTNER_DESARCHIVADO', { razonSocial: partner.razonSocial }, id);
    return activa;
  }

  /// Borrado definitivo (solo ADMIN_FENSTER): únicamente si la empresa no tiene
  /// pedidos, que son histórico comercial y se conservan (el enlace pedido-empresa
  /// es de borrado restringido). Se lleva por delante sus usuarios, catálogo y
  /// carritos; el registro de auditoría se conserva. Libera su CIF y su email.
  async eliminar(id: string, dto: EliminarPartnerDto, adminUserId: string) {
    const partner = await this.obtenerOFallar(id);

    if (dto.confirmarRazonSocial.trim() !== partner.razonSocial) {
      throw new BadRequestException('La razón social escrita no coincide con la de la empresa');
    }
    if (partner._count.ordenes > 0) {
      throw new ConflictException(
        `No se puede eliminar: tiene ${partner._count.ordenes} ${partner._count.ordenes === 1 ? 'pedido' : 'pedidos'}. Archívala para conservarlos.`,
      );
    }

    try {
      await this.prisma.$transaction([
        this.prisma.auditLog.create({
          data: {
            level: 'warn',
            eventType: 'PARTNER_ELIMINADO',
            userId: adminUserId,
            payload: {
              partnerId: id,
              razonSocial: partner.razonSocial,
              cif: partner.cif,
              usuariosEliminados: partner._count.usuarios,
              productosAsignados: partner._count.representaciones,
            },
          },
        }),
        this.prisma.partner.delete({ where: { id } }),
      ]);
    } catch (error) {
      /// Un pedido creado justo entre la comprobación y el borrado lo frena la propia base de datos.
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2003') {
        throw new ConflictException('No se puede eliminar: la empresa tiene datos que dependen de ella (pedidos).');
      }
      throw error;
    }
    return { eliminada: true };
  }

  /// Vista de administración del catálogo asignado a un partner (incluye
  /// productos desactivados, a diferencia de `ProductosService.listarCatalogo`
  /// que es la vista propia del partner).
  async listarCatalogo(id: string, restringirCreadoPorId?: string) {
    await this.obtenerOFallar(id, restringirCreadoPorId);
    return this.prisma.representacionPartner.findMany({
      where: { partnerId: id },
      include: {
        productoBase: { select: { id: true, skuIndustrial: true, nombreTecnico: true, imagenUrl: true } },
        productoMarca: { select: { marca: true, activo: true } },
      },
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

  /// Quita un producto del catálogo del partner. Desaparece de sus carritos
  /// (cascade); las líneas de pedidos ya hechos conservan su "fotografía"
  /// comercial y solo pierden el enlace (SetNull).
  async eliminarRepresentacion(partnerId: string, repId: string, restringirCreadoPorId?: string) {
    await this.obtenerOFallar(partnerId, restringirCreadoPorId);
    const representacion = await this.obtenerRepresentacionOFallar(partnerId, repId);
    if (representacion.productoMarcaId) {
      throw new BadRequestException('Este producto viene del catálogo de su marca: ocúltalo en vez de borrarlo, o quítalo del catálogo de la marca.');
    }
    await this.prisma.representacionPartner.delete({ where: { id: repId } });
    return { eliminado: true };
  }

  /// Borra todos los productos EXTRA de la empresa (los de su marca se quedan:
  /// se gestionan desde el catálogo de la marca). Desaparecen de sus carritos;
  /// los pedidos ya hechos no se tocan.
  async eliminarTodasLasRepresentaciones(partnerId: string, restringirCreadoPorId?: string) {
    await this.obtenerOFallar(partnerId, restringirCreadoPorId);
    const { count } = await this.prisma.representacionPartner.deleteMany({ where: { partnerId, productoMarcaId: null } });
    return { eliminados: count };
  }

  async actualizarRepresentacion(
    partnerId: string,
    repId: string,
    dto: ActualizarRepresentacionDto,
    restringirCreadoPorId?: string,
  ) {
    await this.obtenerOFallar(partnerId, restringirCreadoPorId);
    const representacion = await this.obtenerRepresentacionOFallar(partnerId, repId);
    const cambiaDatosDeMarca =
      (dto.skuComercial !== undefined && dto.skuComercial !== representacion.skuComercial) ||
      (dto.nombreComercial !== undefined && dto.nombreComercial !== representacion.nombreComercial) ||
      (dto.pvpBase !== undefined && Number(dto.pvpBase) !== Number(representacion.pvpBase));
    if (representacion.productoMarcaId && cambiaDatosDeMarca) {
      throw new BadRequestException(
        'Nombre, SKU y PVP de este producto los fija el catálogo de su marca. Aquí solo se cambian el descuento o si se muestra.',
      );
    }

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
