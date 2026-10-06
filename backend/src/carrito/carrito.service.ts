import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { REPRESENTACION_VISIBLE, representacionDisponible } from '../catalogo-marca/catalogo-marca.service.js';
import { Prisma } from '../generated/prisma/client.js';
import { calcularPrecioNeto } from '../common/precio-neto.js';
import { CANTIDAD_MAXIMA_POR_LINEA } from './dto/agregar-item.dto.js';

/// Mensaje opaco: idéntico exista o no el recurso, o pertenezca a otro
/// partner/carrito. Nunca debe distinguirse una cosa de otra (Zero Data Leak).
const NO_ENCONTRADO = () => new NotFoundException('Recurso no encontrado');

export interface LineaCarrito {
  id: string;
  representacionPartnerId: string;
  skuComercial: string;
  nombreComercial: string;
  imagenUrl: string | null;
  cantidad: number;
  pvpBase: string;
  descuentoPorcentaje: string;
  precioNetoUnitario: string;
  totalLinea: string;
  /// `false` si el producto se retiró de la venta después de meterlo en el carrito.
  disponible: boolean;
}

export interface ResumenCarrito {
  cartId: string;
  items: LineaCarrito[];
  totalPedido: string;
}

export interface ResultadoRepetirPedido {
  carrito: ResumenCarrito;
  /// Líneas del pedido que se han vuelto a meter en el carrito.
  agregadas: number;
  /// Productos del pedido que ya no se pueden pedir (retirados o sin asignar).
  noDisponibles: string[];
  /// Productos cuyo precio neto actual es distinto del que se pagó en el pedido.
  preciosCambiados: { nombre: string; anterior: string; actual: string }[];
}

@Injectable()
export class CarritoService {
  /// El carrito NO se cachea: los precios y descuentos se leen de la base de
  /// datos en cada consulta. Así, si un admin cambia un PVP o un descuento
  /// mientras el cliente tiene el carrito abierto, lo que ve (y lo que se
  /// factura al confirmar) es siempre el precio vigente. Una caché de precios
  /// solo podía enseñar un total y cobrar otro.
  constructor(private readonly prisma: PrismaService) {}

  private async obtenerOCrearCart(partnerId: string, userId: string) {
    return this.prisma.cart.upsert({
      where: { partnerId_userId: { partnerId, userId } },
      update: {},
      create: { partnerId, userId },
    });
  }

  private async construirResumen(cartId: string, partnerId: string): Promise<ResumenCarrito> {
    const [items, partner] = await Promise.all([
      this.prisma.cartItem.findMany({
        where: { cartId },
        include: { representacionPartner: { include: { productoBase: true, productoMarca: true } } },
        orderBy: { createdAt: 'asc' },
      }),
      this.prisma.partner.findUniqueOrThrow({ where: { id: partnerId } }),
    ]);

    let totalPedido = new Prisma.Decimal(0);
    const lineas: LineaCarrito[] = items.map((item) => {
      const { representacionPartner: rep } = item;
      /// El descuento específico del producto (si existe) prevalece sobre el
      /// descuento general del partner.
      const descuentoAplicado = rep.descuentoOverride ?? partner.descuentoPorcentaje;
      const precioNetoUnitario = calcularPrecioNeto(rep.pvpBase, descuentoAplicado);
      const totalLinea = precioNetoUnitario.times(item.cantidad);
      totalPedido = totalPedido.plus(totalLinea);

      return {
        id: item.id,
        representacionPartnerId: rep.id,
        skuComercial: rep.skuComercial,
        nombreComercial: rep.nombreComercial,
        /// Igual que en el catálogo: la foto propia de la empresa si la tiene; si no,
        /// la del aparato, que es donde el admin sube las fotos.
        imagenUrl: rep.imagenUrl ?? rep.productoBase.imagenUrl,
        cantidad: item.cantidad,
        pvpBase: rep.pvpBase.toString(),
        descuentoPorcentaje: descuentoAplicado.toString(),
        precioNetoUnitario: precioNetoUnitario.toString(),
        totalLinea: totalLinea.toString(),
        disponible: representacionDisponible(rep),
      };
    });

    return { cartId, items: lineas, totalPedido: totalPedido.toString() };
  }

  async obtenerResumen(partnerId: string, userId: string): Promise<ResumenCarrito> {
    const cart = await this.obtenerOCrearCart(partnerId, userId);
    return this.construirResumen(cart.id, partnerId);
  }

  async agregarItem(
    partnerId: string,
    userId: string,
    representacionPartnerId: string,
    cantidad: number,
  ): Promise<ResumenCarrito> {
    /// Filtro por partner dentro de la propia consulta, y solo productos que
    /// siguen a la venta (ni la asignación ni el producto base desactivados).
    const representacion = await this.prisma.representacionPartner.findFirst({
      where: { id: representacionPartnerId, partnerId, ...REPRESENTACION_VISIBLE },
      select: { id: true },
    });

    if (!representacion) {
      throw NO_ENCONTRADO();
    }

    const cart = await this.obtenerOCrearCart(partnerId, userId);

    /// Una sola sentencia que crea la línea o suma a la existente: dos "añadir"
    /// simultáneos (doble clic, dos pestañas) suman los dos, sin chocar ni perder
    /// unidades. Si la suma pasaría del máximo, no se toca la fila y no vuelve nada.
    const ahora = new Date();
    const filas = await this.prisma.$queryRaw<{ id: string }[]>`
      INSERT INTO "CartItem" ("id", "cartId", "representacionPartnerId", "cantidad", "createdAt", "updatedAt")
      VALUES (gen_random_uuid(), ${cart.id}::uuid, ${representacionPartnerId}::uuid, ${cantidad}, ${ahora}, ${ahora})
      ON CONFLICT ("cartId", "representacionPartnerId") DO UPDATE
        SET "cantidad" = "CartItem"."cantidad" + EXCLUDED."cantidad", "updatedAt" = EXCLUDED."updatedAt"
        WHERE "CartItem"."cantidad" + EXCLUDED."cantidad" <= ${CANTIDAD_MAXIMA_POR_LINEA}
      RETURNING "id"`;

    if (filas.length === 0) {
      throw new BadRequestException(`La cantidad máxima por producto es ${CANTIDAD_MAXIMA_POR_LINEA}.`);
    }

    return this.obtenerResumen(partnerId, userId);
  }

  /// "Repetir pedido": cada línea del pedido se suma al carrito con el precio
  /// VIGENTE (nunca el histórico). Lo que ya no se puede pedir se salta y se
  /// devuelve aparte, junto con los productos cuyo precio ha cambiado, para
  /// que el cliente lo vea antes de confirmar.
  async repetirPedido(partnerId: string, userId: string, pedidoId: string): Promise<ResultadoRepetirPedido> {
    const pedido = await this.prisma.order.findUnique({ where: { id: pedidoId }, include: { items: true } });

    if (!pedido || pedido.partnerId !== partnerId) {
      throw NO_ENCONTRADO();
    }

    const cart = await this.obtenerOCrearCart(partnerId, userId);
    const vigentes = await this.prisma.representacionPartner.findMany({
      where: {
        partnerId,
        ...REPRESENTACION_VISIBLE,
        id: { in: pedido.items.flatMap((item) => (item.representacionPartnerId ? [item.representacionPartnerId] : [])) },
      },
      select: { id: true },
    });
    const idsVigentes = new Set(vigentes.map((rep) => rep.id));

    const noDisponibles: string[] = [];
    const agregadas: { representacionPartnerId: string; nombre: string; precioPagado: Prisma.Decimal }[] = [];

    for (const linea of pedido.items) {
      const repId = linea.representacionPartnerId;
      if (!repId || !idsVigentes.has(repId)) {
        noDisponibles.push(linea.nombreProducto);
        continue;
      }

      const existente = await this.prisma.cartItem.findUnique({
        where: { cartId_representacionPartnerId: { cartId: cart.id, representacionPartnerId: repId } },
      });
      const cantidad = Math.min((existente?.cantidad ?? 0) + linea.cantidad, CANTIDAD_MAXIMA_POR_LINEA);

      if (existente) {
        await this.prisma.cartItem.update({ where: { id: existente.id }, data: { cantidad } });
      } else {
        await this.prisma.cartItem.create({ data: { cartId: cart.id, representacionPartnerId: repId, cantidad } });
      }
      agregadas.push({ representacionPartnerId: repId, nombre: linea.nombreProducto, precioPagado: linea.precioNetoUnitario });
    }

    const carrito = await this.construirResumen(cart.id, partnerId);
    const preciosCambiados = agregadas.flatMap((agregada) => {
      const actual = carrito.items.find((item) => item.representacionPartnerId === agregada.representacionPartnerId);
      return actual && !new Prisma.Decimal(actual.precioNetoUnitario).equals(agregada.precioPagado)
        ? [{ nombre: agregada.nombre, anterior: agregada.precioPagado.toString(), actual: actual.precioNetoUnitario }]
        : [];
    });

    return { carrito, agregadas: agregadas.length, noDisponibles, preciosCambiados };
  }

  private async obtenerItemPropio(partnerId: string, userId: string, itemId: string) {
    const item = await this.prisma.cartItem.findUnique({
      where: { id: itemId },
      include: { cart: true },
    });

    if (!item || item.cart.partnerId !== partnerId || item.cart.userId !== userId) {
      throw NO_ENCONTRADO();
    }

    return item;
  }

  async actualizarCantidad(
    partnerId: string,
    userId: string,
    itemId: string,
    cantidad: number,
  ): Promise<ResumenCarrito> {
    const item = await this.obtenerItemPropio(partnerId, userId, itemId);

    await this.prisma.cartItem.update({
      where: { id: item.id },
      data: { cantidad },
    });

    return this.obtenerResumen(partnerId, userId);
  }

  async eliminarItem(partnerId: string, userId: string, itemId: string): Promise<ResumenCarrito> {
    const item = await this.obtenerItemPropio(partnerId, userId, itemId);

    await this.prisma.cartItem.delete({ where: { id: item.id } });

    return this.obtenerResumen(partnerId, userId);
  }
}
