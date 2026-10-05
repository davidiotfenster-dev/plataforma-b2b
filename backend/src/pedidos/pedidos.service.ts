import { BadRequestException, ConflictException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { RedisService } from '../common/redis/redis.service.js';
import { PedidoPdfService, type DatosPedidoPdf } from '../common/pdf/pedido-pdf.service.js';
import { EmailService } from '../common/email/email.service.js';
import { Prisma } from '../generated/prisma/client.js';
import { EstadoPedido, Idioma } from '../generated/prisma/enums.js';
import { siguienteCodigoPedido } from './codigo-pedido.js';
import { ConfirmarPedidoDto } from './dto/confirmar-pedido.dto.js';
import { ActualizarEstadoDto } from './dto/actualizar-estado.dto.js';
import type { ListarPedidosAdminQueryDto } from './dto/listar-pedidos-admin-query.dto.js';
import type { ListarPedidosQueryDto } from './dto/listar-pedidos-query.dto.js';
import {
  asuntoCambioEstado,
  asuntoConfirmacionPedido,
  cuerpoCambioEstado,
  cuerpoConfirmacionPedido,
} from '../common/email/plantillas-email.js';

/// Código que el frontend reconoce para traducir el aviso de "los precios han cambiado".
export const CODIGO_PRECIOS_CAMBIADOS = 'PRECIOS_CAMBIADOS';

/// Mensaje opaco: idéntico exista o no el recurso, o pertenezca a otro
/// partner. Nunca debe distinguirse una cosa de otra (Zero Data Leak).
const NO_ENCONTRADO = () => new NotFoundException('Recurso no encontrado');

/// TTL corto: el dashboard no necesita el dato al segundo, y evita
/// recalcular `groupBy`/`aggregate` sobre toda la tabla `Order` en cada
/// carga de página a medida que crece el volumen de pedidos.
const ESTADISTICAS_CACHE_TTL_SEGUNDOS = 120;
const ESTADISTICAS_CACHE_KEY = 'pedidos:estadisticas-admin';

/// Máquina de estados lineal: solo se permite avanzar un paso, nunca saltar
/// ni retroceder (ver CLAUDE.md requisito 4).
const SECUENCIA_ESTADOS: EstadoPedido[] = [
  EstadoPedido.RECIBIDO,
  EstadoPedido.CONFIRMADO,
  EstadoPedido.EN_PREPARACION,
  EstadoPedido.PREPARADO,
  EstadoPedido.ENVIADO,
];

const MS_POR_DIA = 24 * 60 * 60 * 1000;

/// Productos que se enseñan resumidos en cada fila de "Mis pedidos".
const PRODUCTOS_EN_LISTA = 3;

/// Medianoche UTC de una fecha AAAA-MM-DD; rechaza fechas imposibles como 2026-13-45.
function inicioDelDia(fecha: string): Date {
  const dia = new Date(`${fecha}T00:00:00.000Z`);
  if (Number.isNaN(dia.getTime())) {
    throw new BadRequestException(`Fecha no válida: ${fecha}`);
  }
  return dia;
}

@Injectable()
export class PedidosService {
  private readonly logger = new Logger(PedidosService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly pedidoPdfService: PedidoPdfService,
    private readonly emailService: EmailService,
  ) {}

  private calcularPrecioNeto(pvpBase: Prisma.Decimal, descuentoPorcentaje: Prisma.Decimal): Prisma.Decimal {
    const factor = new Prisma.Decimal(1).minus(descuentoPorcentaje.dividedBy(100));
    return pvpBase.times(factor).toDecimalPlaces(2);
  }

  async confirmar(partnerId: string, userId: string, dto: ConfirmarPedidoDto) {
    const orden = await this.prisma.$transaction(async (tx) => {
      const cart = await tx.cart.findUnique({
        where: { partnerId_userId: { partnerId, userId } },
        include: {
          items: {
            include: {
              representacionPartner: {
                include: { productoBase: { select: { activo: true } }, productoMarca: { select: { activo: true } } },
              },
            },
          },
        },
      });

      if (!cart || cart.items.length === 0) {
        throw new BadRequestException('El carrito está vacío');
      }

      /// Un producto retirado de la venta después de meterlo en el carrito no
      /// se puede pedir: se avisa cuáles son para que el cliente los quite.
      const retirados = cart.items
        .filter(
          (item) =>
            item.representacionPartner.activo === false ||
            item.representacionPartner.productoBase?.activo === false ||
            item.representacionPartner.productoMarca?.activo === false,
        )
        .map((item) => item.representacionPartner.nombreComercial);
      if (retirados.length > 0) {
        throw new ConflictException(`Estos productos ya no están disponibles, quítalos del carrito: ${retirados.join(', ')}.`);
      }

      const partner = await tx.partner.findUniqueOrThrow({ where: { id: partnerId } });

      let totalNeto = new Prisma.Decimal(0);
      const lineas = cart.items.map((item) => {
        const rep = item.representacionPartner;
        /// El descuento específico del producto (si existe) prevalece sobre
        /// el descuento general del partner.
        const descuentoAplicado = rep.descuentoOverride ?? partner.descuentoPorcentaje;
        const precioNetoUnitario = this.calcularPrecioNeto(rep.pvpBase, descuentoAplicado);
        const totalLinea = precioNetoUnitario.times(item.cantidad);
        totalNeto = totalNeto.plus(totalLinea);

        return {
          representacionPartnerId: rep.id,
          skuComercial: rep.skuComercial,
          nombreProducto: rep.nombreComercial,
          pvpHistorico: rep.pvpBase,
          descuentoAplicado,
          precioNetoUnitario,
          cantidad: item.cantidad,
          totalLinea,
        };
      });

      /// El carrito siempre enseña el precio vigente; si un admin cambió un precio
      /// o un descuento mientras el cliente miraba la pantalla, el total que vio
      /// ya no es el de este pedido. En vez de cobrarle otro importe en silencio,
      /// se le avisa (el carrito ya se refresca con los precios nuevos).
      if (dto.totalEsperado !== undefined && !new Prisma.Decimal(dto.totalEsperado).equals(totalNeto)) {
        throw new ConflictException({
          message: 'Los precios de tu carrito han cambiado. Revisa el nuevo total y vuelve a confirmar.',
          codigo: CODIGO_PRECIOS_CAMBIADOS,
        });
      }

      /// Se reclama el contenido del carrito ANTES de crear el pedido: si otra
      /// confirmación simultánea (doble clic, dos pestañas, reintento) ya lo
      /// ha vaciado, este `deleteMany` espera a que esa transacción termine y
      /// borra 0 filas, así que se aborta y no se crea un pedido duplicado.
      const idsLineas = cart.items.map((item) => item.id);
      const reclamadas = await tx.cartItem.deleteMany({ where: { id: { in: idsLineas } } });
      if (reclamadas.count !== idsLineas.length) {
        throw new ConflictException('Este carrito ya se ha confirmado o ha cambiado. Revisa tus pedidos antes de repetir.');
      }

      const codigoPed = await siguienteCodigoPedido(tx);

      const order = await tx.order.create({
        data: {
          codigoPed,
          partnerId,
          userId,
          direccionEnvio: dto.direccionEnvio,
          poNumber: dto.poNumber,
          notas: dto.notas,
          totalNeto,
          items: { createMany: { data: lineas } },
          historial: { create: { estado: EstadoPedido.RECIBIDO } },
        },
        include: { items: true, usuario: { select: { email: true, idioma: true } } },
      });

      await tx.auditLog.create({
        data: {
          level: 'info',
          eventType: 'PEDIDO_CONFIRMADO',
          userId,
          partnerId,
          payload: { codigoPed: order.codigoPed, totalNeto: totalNeto.toString() },
        },
      });

      return { order, razonSocialPartner: partner.razonSocial };
    });

    await this.notificarConfirmacion(orden.order, orden.razonSocialPartner);

    /// El objeto `usuario` (aunque solo trae el email) es un detalle interno
    /// para el envío de la confirmación: nunca se expone en la respuesta HTTP.
    const { usuario: _usuario, ...ordenSinUsuario } = orden.order;
    return ordenSinUsuario;
  }

  /// Genera el PDF y envía el email de confirmación. Best-effort: un fallo
  /// aquí se loguea pero nunca revierte ni falla el pedido ya confirmado.
  private async notificarConfirmacion(
    order: Prisma.OrderGetPayload<{
      include: { items: true; usuario: { select: { email: true; idioma: true } } };
    }>,
    razonSocialPartner: string,
  ): Promise<void> {
    try {
      const pdfBuffer = await this.pedidoPdfService.generar(this.datosPdf(order, razonSocialPartner, order.usuario.idioma));

      await this.emailService.enviar(
        order.usuario.email,
        asuntoConfirmacionPedido(order.usuario.idioma, order.codigoPed),
        cuerpoConfirmacionPedido(order.usuario.idioma, order.codigoPed),
        [{ filename: `${order.codigoPed}.pdf`, content: pdfBuffer }],
      );
    } catch (error) {
      this.logger.error(`Error generando/enviando la confirmación del pedido ${order.codigoPed}: ${(error as Error).message}`);
    }
  }

  private datosPdf(
    order: Prisma.OrderGetPayload<{ include: { items: true } }>,
    razonSocialPartner: string,
    idioma: Idioma,
  ): DatosPedidoPdf {
    return {
      idioma,
      codigoPed: order.codigoPed,
      razonSocialPartner,
      direccionEnvio: order.direccionEnvio,
      poNumber: order.poNumber,
      notas: order.notas,
      totalNeto: order.totalNeto.toString(),
      createdAt: order.createdAt,
      items: order.items.map((item) => ({
        skuComercial: item.skuComercial,
        nombreProducto: item.nombreProducto,
        cantidad: item.cantidad,
        pvpHistorico: item.pvpHistorico.toString(),
        descuentoAplicado: item.descuentoAplicado.toString(),
        precioNetoUnitario: item.precioNetoUnitario.toString(),
        totalLinea: item.totalLinea.toString(),
      })),
    };
  }

  /// "Mis pedidos" del cliente: siempre acotado a su partner. Además de la
  /// página pedida devuelve un resumen del conjunto completo (no filtrado)
  /// para los contadores de la pantalla.
  async listar(partnerId: string, query: ListarPedidosQueryDto = {}) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const where: Prisma.OrderWhereInput = { partnerId };

    if (query.estado) {
      where.estado = query.estado;
    }

    if (query.desde || query.hasta) {
      where.createdAt = {
        ...(query.desde ? { gte: inicioDelDia(query.desde) } : {}),
        ...(query.hasta ? { lt: new Date(inicioDelDia(query.hasta).getTime() + MS_POR_DIA) } : {}),
      };
    }

    const busqueda = query.busqueda?.trim();
    if (busqueda) {
      const contiene = { contains: busqueda, mode: 'insensitive' as const };
      where.OR = [
        { codigoPed: contiene },
        { poNumber: contiene },
        { items: { some: { OR: [{ nombreProducto: contiene }, { skuComercial: contiene }] } } },
      ];
    }

    const campo = query.orden === 'total' ? 'totalNeto' : 'createdAt';
    const desdeSemana = new Date(Date.now() - 7 * MS_POR_DIA);

    const [total, filas, porEstado, enviadosUltimos7Dias] = await Promise.all([
      this.prisma.order.count({ where }),
      this.prisma.order.findMany({
        where,
        orderBy: [{ [campo]: query.sentido ?? 'desc' }, { id: 'asc' }],
        skip: (page - 1) * limit,
        take: limit,
        include: { items: { select: { nombreProducto: true, cantidad: true }, orderBy: { createdAt: 'asc' } } },
      }),
      this.prisma.order.groupBy({ by: ['estado'], where: { partnerId }, _count: { _all: true } }),
      this.prisma.pedidoEstadoHistorial.count({
        where: { estado: EstadoPedido.ENVIADO, createdAt: { gte: desdeSemana }, order: { partnerId } },
      }),
    ]);

    const data = filas.map(({ items, partnerId: _partnerId, userId: _userId, ...order }) => ({
      ...order,
      articulos: items.reduce((suma, item) => suma + item.cantidad, 0),
      productos: items.slice(0, PRODUCTOS_EN_LISTA).map((item) => ({ nombre: item.nombreProducto, cantidad: item.cantidad })),
      productosRestantes: Math.max(0, items.length - PRODUCTOS_EN_LISTA),
    }));

    return {
      data,
      total,
      page,
      limit,
      resumen: {
        porEstado: Object.fromEntries(porEstado.map((fila) => [fila.estado, fila._count._all])),
        enviadosUltimos7Dias,
      },
    };
  }

  async obtener(partnerId: string, id: string) {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: {
        items: {
          include: {
            representacionPartner: { select: { imagenUrl: true, productoBase: { select: { imagenUrl: true } } } },
          },
        },
        historial: { select: { estado: true, createdAt: true }, orderBy: { createdAt: 'asc' } },
      },
    });

    if (!order || order.partnerId !== partnerId) {
      throw NO_ENCONTRADO();
    }

    /// La foto se lee del catálogo actual (no forma parte de la "fotografía"
    /// del pedido); si el producto se retiró del catálogo, la línea queda sin foto.
    const items = order.items.map(({ representacionPartner, ...linea }) => ({
      ...linea,
      imagenUrl: representacionPartner?.imagenUrl ?? representacionPartner?.productoBase.imagenUrl ?? null,
    }));

    return { ...order, items };
  }

  /// PDF del resumen de un pedido propio, el mismo que se envía por email al confirmarlo.
  /// El idioma lo elige el usuario al descargarlo; si no indica ninguno, el que tiene guardado.
  async generarPdf(
    partnerId: string,
    userId: string,
    id: string,
    idioma?: Idioma,
  ): Promise<{ codigoPed: string; contenido: Buffer }> {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: { items: true, partner: { select: { razonSocial: true } } },
    });

    if (!order || order.partnerId !== partnerId) {
      throw NO_ENCONTRADO();
    }

    const idiomaPdf =
      idioma ?? (await this.prisma.user.findUnique({ where: { id: userId }, select: { idioma: true } }))?.idioma ?? Idioma.ES;
    const contenido = await this.pedidoPdfService.generar(this.datosPdf(order, order.partner.razonSocial, idiomaPdf));
    return { codigoPed: order.codigoPed, contenido };
  }

  /// Gestión interna de fulfillment (ADMIN_FENSTER): no está scopeada por
  /// partnerId a propósito, ya que IoT FENSTER opera pedidos de todos los
  /// partners.
  async listarTodos() {
    return this.prisma.order.findMany({
      orderBy: { createdAt: 'desc' },
      include: { partner: { select: { razonSocial: true } } },
    });
  }

  /// Vista escalable del panel de fulfillment: un partner por fila (con su
  /// nº total de pedidos y cuántos están RECIBIDO/pendientes de revisar),
  /// paginada y con búsqueda por razón social, en vez de traer todos los
  /// pedidos de todos los partners de golpe. Los pedidos de cada partner se
  /// cargan aparte (`listarPorPartnerAdmin`) solo cuando se despliega esa
  /// tarjeta en el frontend.
  async resumenPorPartner(query: ListarPedidosAdminQueryDto, restringirCreadoPorId?: string) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const busqueda = query.busqueda?.trim() || null;
    const condicionBusqueda =
      busqueda === null ? Prisma.sql`TRUE` : Prisma.sql`p."razonSocial" ILIKE ${'%' + busqueda + '%'}`;
    const condicionPropietario =
      restringirCreadoPorId === undefined
        ? Prisma.sql`p."archivadoEn" IS NULL`
        : Prisma.sql`p."archivadoEn" IS NULL AND p."creadoPorUsuarioId" = ${restringirCreadoPorId}::uuid`;

    const [filas, [{ total }]] = await Promise.all([
      this.prisma.$queryRaw<{ partnerId: string; razonSocial: string; total: bigint; pendientes: bigint }[]>`
        SELECT p.id AS "partnerId", p."razonSocial",
          COUNT(o.id)::bigint AS total,
          COUNT(o.id) FILTER (WHERE o.estado = 'RECIBIDO')::bigint AS pendientes
        FROM "Order" o
        JOIN "Partner" p ON p.id = o."partnerId"
        WHERE ${condicionBusqueda} AND ${condicionPropietario}
        GROUP BY p.id, p."razonSocial"
        ORDER BY pendientes DESC, p."razonSocial" ASC
        LIMIT ${limit} OFFSET ${(page - 1) * limit}
      `,
      this.prisma.$queryRaw<{ total: bigint }[]>`
        SELECT COUNT(DISTINCT o."partnerId")::bigint AS total
        FROM "Order" o
        JOIN "Partner" p ON p.id = o."partnerId"
        WHERE ${condicionBusqueda} AND ${condicionPropietario}
      `,
    ]);

    return {
      data: filas.map((fila) => ({
        partnerId: fila.partnerId,
        razonSocial: fila.razonSocial,
        total: Number(fila.total),
        pendientes: Number(fila.pendientes),
      })),
      total: Number(total),
      page,
      limit,
    };
  }

  /// Pedidos de un único partner, vista admin (todos los estados, sin
  /// scopear por sesión ya que la llama ADMIN_FENSTER). Pensada para carga
  /// diferida al desplegar la tarjeta de ese partner en el panel.
  async listarPorPartnerAdmin(partnerId: string, restringirCreadoPorId?: string) {
    if (restringirCreadoPorId !== undefined) {
      const partner = await this.prisma.partner.findUnique({ where: { id: partnerId } });
      if (!partner || partner.creadoPorUsuarioId !== restringirCreadoPorId) {
        throw NO_ENCONTRADO();
      }
    }

    return this.prisma.order.findMany({
      where: { partnerId },
      orderBy: { createdAt: 'desc' },
    });
  }

  /// Datos agregados para el panel de estadísticas de ADMIN_FENSTER (gráficas
  /// de pedidos por estado, por partner y por día). Solo lectura, no expone
  /// datos de un partner a otro (uso exclusivo de ADMIN_FENSTER).
  async estadisticas() {
    const cacheado = await this.redis.get(ESTADISTICAS_CACHE_KEY);
    if (cacheado) {
      return JSON.parse(cacheado);
    }

    const [porEstado, porPartner, totalGeneral, pedidosPorDia] = await Promise.all([
      this.prisma.order.groupBy({
        by: ['estado'],
        _count: { _all: true },
        _sum: { totalNeto: true },
      }),
      this.prisma.order.groupBy({
        by: ['partnerId'],
        where: { estado: { not: EstadoPedido.CANCELADO } },
        _count: { _all: true },
        _sum: { totalNeto: true },
        orderBy: { _sum: { totalNeto: 'desc' } },
        take: 10,
      }),
      /// Un pedido cancelado no es facturación: se cuenta en `totalPedidos` y en
      /// `porEstado`, pero no suma en `totalFacturado` ni en el ranking.
      this.prisma.order.aggregate({
        where: { estado: { not: EstadoPedido.CANCELADO } },
        _count: { _all: true },
        _sum: { totalNeto: true },
      }),
      this.prisma.$queryRaw<{ dia: Date; total: bigint }[]>`
        SELECT date_trunc('day', "createdAt") AS dia, COUNT(*)::bigint AS total
        FROM "Order"
        WHERE "createdAt" >= NOW() - INTERVAL '30 days'
        GROUP BY dia
        ORDER BY dia ASC
      `,
    ]);

    const partners = await this.prisma.partner.findMany({
      where: { id: { in: porPartner.map((p) => p.partnerId) } },
      select: { id: true, razonSocial: true },
    });
    const nombrePartner = new Map(partners.map((p) => [p.id, p.razonSocial]));

    const resultado = {
      totalPedidos: porEstado.reduce((acc, e) => acc + e._count._all, 0),
      totalFacturado: totalGeneral._sum.totalNeto?.toString() ?? '0',
      porEstado: porEstado.map((e) => ({
        estado: e.estado,
        cantidad: e._count._all,
        totalNeto: e._sum.totalNeto?.toString() ?? '0',
      })),
      porPartner: porPartner.map((p) => ({
        partnerId: p.partnerId,
        razonSocial: nombrePartner.get(p.partnerId) ?? 'Desconocido',
        cantidad: p._count._all,
        totalNeto: p._sum.totalNeto?.toString() ?? '0',
      })),
      pedidosPorDia: pedidosPorDia.map((d) => ({
        dia: d.dia.toISOString().slice(0, 10),
        cantidad: Number(d.total),
      })),
    };

    await this.redis.setEx(ESTADISTICAS_CACHE_KEY, ESTADISTICAS_CACHE_TTL_SEGUNDOS, JSON.stringify(resultado));
    return resultado;
  }

  async obtenerAdmin(id: string, restringirCreadoPorId?: string) {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: { items: true, partner: { select: { razonSocial: true, creadoPorUsuarioId: true } } },
    });

    if (
      !order ||
      (restringirCreadoPorId !== undefined && order.partner.creadoPorUsuarioId !== restringirCreadoPorId)
    ) {
      throw new NotFoundException('Pedido no encontrado');
    }

    return order;
  }

  async actualizarEstado(id: string, adminUserId: string, dto: ActualizarEstadoDto) {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: { usuario: true },
    });

    if (!order) {
      throw new NotFoundException('Pedido no encontrado');
    }

    if (dto.estado === order.estado) {
      throw new BadRequestException('El pedido ya está en ese estado.');
    }

    const esCancelacion = dto.estado === EstadoPedido.CANCELADO;
    const veniaCancelado = order.estado === EstadoPedido.CANCELADO;

    if (esCancelacion) {
      /// Un pedido ya enviado no se cancela: la mercancía ya salió.
      if (order.estado === EstadoPedido.ENVIADO) {
        throw new ConflictException('No se puede cancelar un pedido que ya está enviado.');
      }
    } else {
      const indiceActual = SECUENCIA_ESTADOS.indexOf(order.estado);
      const indiceNuevo = SECUENCIA_ESTADOS.indexOf(dto.estado);

      /// `forzar` permite al admin corregir manualmente el estado (adelante o
      /// atrás) para casos excepcionales, saltándose la restricción de "solo
      /// un paso". Fuera de ese caso, la máquina de estados sigue siendo
      /// estrictamente lineal. Reactivar un pedido cancelado siempre requiere
      /// `forzar`, ya que no forma parte de la secuencia lineal.
      if (!dto.forzar && (veniaCancelado || indiceNuevo !== indiceActual + 1)) {
        throw new ConflictException(
          `Transición de estado inválida: ${order.estado} -> ${dto.estado}. Solo se permite avanzar un paso en la secuencia.`,
        );
      }
    }

    const datosExpedicion =
      dto.estado === EstadoPedido.ENVIADO
        ? {
            transportista: dto.transportista,
            numeroExpedicion: dto.numeroExpedicion,
            trackingUrl: dto.trackingUrl,
          }
        : esCancelacion
          ? { motivoCancelacion: dto.motivoCancelacion }
          : {};

    /// Al salir de CANCELADO o de ENVIADO se borran los datos que ya no
    /// aplican (motivo de cancelación, transportista...), para que el partner
    /// no vea restos de un estado anterior.
    const limpieza = {
      ...(veniaCancelado && !esCancelacion ? { motivoCancelacion: null } : {}),
      ...(order.estado === EstadoPedido.ENVIADO && dto.estado !== EstadoPedido.ENVIADO
        ? { transportista: null, numeroExpedicion: null, trackingUrl: null }
        : {}),
    };

    let actualizado;
    try {
      [actualizado] = await this.prisma.$transaction([
        /// El `estado` en el `where` hace que la escritura falle si otro admin
        /// cambió el pedido entre la lectura y este momento.
        this.prisma.order.update({
          where: { id, estado: order.estado },
          data: { estado: dto.estado, ...limpieza, ...datosExpedicion },
        }),
        this.prisma.pedidoEstadoHistorial.create({ data: { orderId: id, estado: dto.estado } }),
        this.prisma.auditLog.create({
          data: {
            level: 'info',
            eventType: 'PEDIDO_ESTADO_ACTUALIZADO',
            userId: adminUserId,
            partnerId: order.partnerId,
            payload: {
              codigoPed: order.codigoPed,
              estadoAnterior: order.estado,
              estadoNuevo: dto.estado,
              forzado: dto.forzar ?? false,
              ...datosExpedicion,
            },
          },
        }),
      ]);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
        throw new ConflictException('El pedido ha cambiado de estado mientras lo editabas. Recarga y vuelve a intentarlo.');
      }
      throw error;
    }

    await this.notificarCambioEstado(order.usuario.email, order.usuario.idioma, actualizado);

    return actualizado;
  }

  private async notificarCambioEstado(
    destinatario: string,
    idioma: Idioma,
    order: Prisma.OrderGetPayload<Record<string, never>>,
  ): Promise<void> {
    await this.emailService.enviar(
      destinatario,
      asuntoCambioEstado(idioma, order.codigoPed, order.estado),
      cuerpoCambioEstado(
        idioma,
        order.codigoPed,
        order.estado,
        {
          transportista: order.transportista,
          numeroExpedicion: order.numeroExpedicion,
          trackingUrl: order.trackingUrl,
        },
        order.motivoCancelacion,
      ),
    );
  }
}
