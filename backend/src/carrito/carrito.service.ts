import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { RedisService } from '../common/redis/redis.service.js';
import { Prisma } from '../generated/prisma/client.js';

/// Mensaje opaco: idéntico exista o no el recurso, o pertenezca a otro
/// partner/carrito. Nunca debe distinguirse una cosa de otra (Zero Data Leak).
const NO_ENCONTRADO = () => new NotFoundException('Recurso no encontrado');

const CACHE_TTL_SEGUNDOS = 300;

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
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  private claveCache(partnerId: string, userId: string): string {
    return `carrito:${partnerId}:${userId}`;
  }

  private async invalidarCache(partnerId: string, userId: string): Promise<void> {
    await this.redis.del(this.claveCache(partnerId, userId));
  }

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
    const clave = this.claveCache(partnerId, userId);
    const cacheado = await this.redis.get(clave);
    if (cacheado) {
      return JSON.parse(cacheado) as ResumenCarrito;
    }

    const cart = await this.obtenerOCrearCart(partnerId, userId);
    const resumen = await this.construirResumen(cart.id, partnerId);
    await this.redis.setEx(clave, CACHE_TTL_SEGUNDOS, JSON.stringify(resumen));
    return resumen;
  }

  async agregarItem(
    partnerId: string,
    userId: string,
    representacionPartnerId: string,
    cantidad: number,
  ): Promise<ResumenCarrito> {
    const representacion = await this.prisma.representacionPartner.findUnique({
      where: { id: representacionPartnerId },
    });

    if (!representacion || representacion.partnerId !== partnerId || !representacion.activo) {
      throw NO_ENCONTRADO();
    }

    const cart = await this.obtenerOCrearCart(partnerId, userId);

    const existente = await this.prisma.cartItem.findUnique({
      where: { cartId_representacionPartnerId: { cartId: cart.id, representacionPartnerId } },
    });

    if (existente) {
      await this.prisma.cartItem.update({
        where: { id: existente.id },
        data: { cantidad: existente.cantidad + cantidad },
      });
    } else {
      await this.prisma.cartItem.create({
        data: { cartId: cart.id, representacionPartnerId, cantidad },
      });
    }

    await this.invalidarCache(partnerId, userId);
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

    await this.invalidarCache(partnerId, userId);
    return this.obtenerResumen(partnerId, userId);
  }

  async eliminarItem(partnerId: string, userId: string, itemId: string): Promise<ResumenCarrito> {
    const item = await this.obtenerItemPropio(partnerId, userId, itemId);

    await this.prisma.cartItem.delete({ where: { id: item.id } });

    await this.invalidarCache(partnerId, userId);
    return this.obtenerResumen(partnerId, userId);
  }
}
