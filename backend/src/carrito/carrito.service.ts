import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { Prisma } from '../generated/prisma/client.js';
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
}

export interface ResumenCarrito {
  cartId: string;
  items: LineaCarrito[];
  totalPedido: string;
}

@Injectable()
export class CarritoService {
  /// El carrito NO se cachea: los precios y descuentos se leen de la base de
  /// datos en cada consulta. Así, si un admin cambia un PVP o un descuento
  /// mientras el cliente tiene el carrito abierto, lo que ve (y lo que se
  /// factura al confirmar) es siempre el precio vigente. Una caché de precios
  /// solo podía enseñar un total y cobrar otro.
  constructor(private readonly prisma: PrismaService) {}

  /// Calcula el precio neto en servidor: nunca se confía en un precio
  /// enviado por el cliente. Redondeo a 2 decimales (moneda).
  private calcularPrecioNeto(pvpBase: Prisma.Decimal, descuentoPorcentaje: Prisma.Decimal): Prisma.Decimal {
    const factor = new Prisma.Decimal(1).minus(descuentoPorcentaje.dividedBy(100));
    return pvpBase.times(factor).toDecimalPlaces(2);
  }

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
        include: { representacionPartner: true },
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
      const precioNetoUnitario = this.calcularPrecioNeto(rep.pvpBase, descuentoAplicado);
      const totalLinea = precioNetoUnitario.times(item.cantidad);
      totalPedido = totalPedido.plus(totalLinea);

      return {
        id: item.id,
        representacionPartnerId: rep.id,
        skuComercial: rep.skuComercial,
        nombreComercial: rep.nombreComercial,
        imagenUrl: rep.imagenUrl,
        cantidad: item.cantidad,
        pvpBase: rep.pvpBase.toString(),
        descuentoPorcentaje: descuentoAplicado.toString(),
        precioNetoUnitario: precioNetoUnitario.toString(),
        totalLinea: totalLinea.toString(),
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
      where: { id: representacionPartnerId, partnerId, activo: true, productoBase: { activo: true } },
      select: { id: true },
    });

    if (!representacion) {
      throw NO_ENCONTRADO();
    }

    const cart = await this.obtenerOCrearCart(partnerId, userId);

    const existente = await this.prisma.cartItem.findUnique({
      where: { cartId_representacionPartnerId: { cartId: cart.id, representacionPartnerId } },
    });

    if (existente) {
      const nuevaCantidad = existente.cantidad + cantidad;
      if (nuevaCantidad > CANTIDAD_MAXIMA_POR_LINEA) {
        throw new BadRequestException(`La cantidad máxima por producto es ${CANTIDAD_MAXIMA_POR_LINEA}.`);
      }
      await this.prisma.cartItem.update({
        where: { id: existente.id },
        data: { cantidad: nuevaCantidad },
      });
    } else {
      await this.prisma.cartItem.create({
        data: { cartId: cart.id, representacionPartnerId, cantidad },
      });
    }

    return this.obtenerResumen(partnerId, userId);
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
