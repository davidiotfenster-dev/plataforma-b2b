import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { Prisma } from '../generated/prisma/client.js';
import type { MarcaCatalogo, TipoEmpresa } from '../generated/prisma/enums.js';
import { propuestaDeMarca } from './propuesta.js';
import type { ActualizarProductoMarcaDto, ItemCatalogoMarcaDto } from './dto/catalogo-marca.dto.js';

export interface ResultadoSincronizacion {
  creados: number;
  actualizados: number;
  retirados: number;
  /// SKU de la marca que chocan con un producto extra de la empresa con ese mismo SKU.
  conflictos: string[];
}

const esConflicto = (e: unknown) => e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002';

/// Lo que ve un partner o distribuidor de su catálogo: activo para la empresa, el
/// producto base activo y, si viene de su marca, activo también en la marca.
export const REPRESENTACION_VISIBLE = {
  activo: true,
  productoBase: { activo: true },
  OR: [{ productoMarcaId: null }, { productoMarca: { activo: true } }],
} satisfies Prisma.RepresentacionPartnerWhereInput;

/// Catálogo de cada submarca (Wave, ICON, Connect). Es la fuente de verdad:
/// cada empresa (partner o distribuidor) con esa `marcaCatalogo` tiene una
/// `RepresentacionPartner` enlazada por producto, que se sincroniza aquí. La
/// empresa conserva lo suyo (ocultar un producto, su descuento) y los
/// productos extra que se le asignen a mano (`productoMarcaId` nulo).
@Injectable()
export class CatalogoMarcaService {
  constructor(private readonly prisma: PrismaService) {}

  async listar(marca: MarcaCatalogo) {
    const [productos, empresas] = await Promise.all([
      this.prisma.productoMarca.findMany({
        where: { marca },
        orderBy: { nombreComercial: 'asc' },
        include: {
          productoBase: {
            select: { id: true, skuIndustrial: true, nombreTecnico: true, imagenUrl: true, activo: true, especificacionesJson: true },
          },
        },
      }),
      this.prisma.partner.groupBy({ by: ['tipo'], where: { marcaCatalogo: marca }, _count: { _all: true } }),
    ]);
    /// Tipado con el enum (no `string`) para que un valor mal escrito no compile en
    /// vez de devolver 0 en silencio.
    const cuenta = (tipo: TipoEmpresa) => empresas.find((e) => e.tipo === tipo)?._count._all ?? 0;
    return { marca, productos, empresas: { partners: cuenta('PARTNER'), distribuidores: cuenta('DISTRIBUIDOR') } };
  }

  async anadir(marca: MarcaCatalogo, items: ItemCatalogoMarcaDto[]) {
    try {
      const { count } = await this.prisma.productoMarca.createMany({ data: items.map((i) => ({ marca, ...i })) });
      const sincronizacion = await this.sincronizarMarca(marca);
      return { anadidos: count, sincronizacion };
    } catch (error) {
      if (esConflicto(error)) throw new ConflictException('Ese producto o ese SKU ya están en el catálogo de esta marca.');
      throw error;
    }
  }

  /// Añade de una vez todo lo que la marca vende y aún no está en su catálogo
  /// (nombre y SKU de la marca, PVP de tarifa).
  async rellenar(marca: MarcaCatalogo) {
    const [productos, actuales] = await Promise.all([
      this.prisma.productoBase.findMany({ where: { activo: true }, orderBy: { skuIndustrial: 'asc' } }),
      this.prisma.productoMarca.findMany({ where: { marca }, select: { productoBaseId: true, skuComercial: true } }),
    ]);
    const yaBase = new Set(actuales.map((a) => a.productoBaseId));
    const yaSku = new Set(actuales.map((a) => a.skuComercial));
    const nuevos = propuestaDeMarca(productos, marca).filter((p) => !yaBase.has(p.productoBaseId) && !yaSku.has(p.skuComercial));
    if (nuevos.length > 0) await this.prisma.productoMarca.createMany({ data: nuevos.map((n) => ({ marca, ...n })) });
    const sincronizacion = await this.sincronizarMarca(marca);
    return { anadidos: nuevos.length, sincronizacion };
  }

  /// Pone a los productos de la marca el PVP de la tarifa (`ProductoBase.pvpTarifa`)
  /// cuando no coinciden, y sincroniza sus empresas. `rellenar` solo copia el PVP al
  /// añadir un producto, así que esto es lo que hace llegar un cambio de tarifa a un
  /// catálogo ya cargado. Con `aplicar` a false solo devuelve lo que cambiaría.
  async aplicarTarifa(marca: MarcaCatalogo, aplicar: boolean) {
    const productos = await this.prisma.productoMarca.findMany({
      where: { marca, productoBase: { pvpTarifa: { not: null } } },
      include: { productoBase: { select: { pvpTarifa: true } } },
      orderBy: { skuComercial: 'asc' },
    });
    const cambios = productos
      .filter((p) => !p.pvpBase.equals(p.productoBase.pvpTarifa!))
      .map((p) => ({ id: p.id, skuComercial: p.skuComercial, antes: p.pvpBase, despues: p.productoBase.pvpTarifa! }));
    if (!aplicar || cambios.length === 0) return { cambios, sincronizacion: null };
    await this.prisma.$transaction(
      cambios.map((c) => this.prisma.productoMarca.update({ where: { id: c.id }, data: { pvpBase: c.despues } })),
    );
    return { cambios, sincronizacion: await this.sincronizarMarca(marca) };
  }

  private async obtenerOFallar(id: string) {
    const producto = await this.prisma.productoMarca.findUnique({
      where: { id },
      include: { _count: { select: { representaciones: true } } },
    });
    if (!producto) throw new NotFoundException('Producto no encontrado en el catálogo de marca');
    return producto;
  }

  async actualizar(id: string, dto: ActualizarProductoMarcaDto) {
    const producto = await this.obtenerOFallar(id);
    try {
      const actualizado = await this.prisma.productoMarca.update({ where: { id }, data: dto });
      const sincronizacion = await this.sincronizarMarca(producto.marca);
      return { ...actualizado, sincronizacion };
    } catch (error) {
      if (esConflicto(error)) throw new ConflictException('Ya hay otro producto con ese SKU en el catálogo de esta marca.');
      throw error;
    }
  }

  /// Quita el producto de la marca: desaparece del catálogo (y de los carritos)
  /// de todas sus empresas; los pedidos hechos conservan su "fotografía".
  async eliminar(id: string) {
    const producto = await this.obtenerOFallar(id);
    await this.prisma.productoMarca.delete({ where: { id } });
    return { eliminado: true, empresasAfectadas: producto._count.representaciones };
  }

  async sincronizarMarca(marca: MarcaCatalogo): Promise<ResultadoSincronizacion> {
    const empresas = await this.prisma.partner.findMany({ where: { marcaCatalogo: marca, archivadoEn: null }, select: { id: true } });
    const total: ResultadoSincronizacion = { creados: 0, actualizados: 0, retirados: 0, conflictos: [] };
    for (const { id } of empresas) {
      const r = await this.sincronizarEmpresa(id);
      total.creados += r.creados;
      total.actualizados += r.actualizados;
      total.retirados += r.retirados;
      total.conflictos.push(...r.conflictos);
    }
    return total;
  }

  /// Deja el catálogo de una empresa al día con el de su marca: crea lo que
  /// falta, copia nombre/SKU/PVP de la marca y retira lo de otras marcas (tras
  /// cambiarle la marca). Nunca toca `activo` ni el descuento de la empresa, ni
  /// sus productos extra (salvo que un extra sea el mismo producto que uno de
  /// la marca: entonces pasa a ser esa fila, conservando descuento y activo).
  async sincronizarEmpresa(partnerId: string): Promise<ResultadoSincronizacion> {
    const resultado: ResultadoSincronizacion = { creados: 0, actualizados: 0, retirados: 0, conflictos: [] };
    const partner = await this.prisma.partner.findUnique({ where: { id: partnerId }, select: { marcaCatalogo: true } });
    if (!partner) return resultado;

    const { count: retirados } = await this.prisma.representacionPartner.deleteMany({
      where: { partnerId, productoMarca: { marca: { not: partner.marcaCatalogo } } },
    });
    resultado.retirados = retirados;

    const [catalogo, propias] = await Promise.all([
      this.prisma.productoMarca.findMany({ where: { marca: partner.marcaCatalogo } }),
      this.prisma.representacionPartner.findMany({ where: { partnerId } }),
    ]);
    const porMarca = new Map(propias.filter((r) => r.productoMarcaId).map((r) => [r.productoMarcaId!, r]));
    const extrasPorBase = new Map(propias.filter((r) => !r.productoMarcaId).map((r) => [r.productoBaseId, r]));

    for (const pm of catalogo) {
      const datos = {
        productoBaseId: pm.productoBaseId,
        skuComercial: pm.skuComercial,
        nombreComercial: pm.nombreComercial,
        pvpBase: pm.pvpBase,
        documentacionUrl: pm.documentacionUrl,
      };
      const existente = porMarca.get(pm.id) ?? extrasPorBase.get(pm.productoBaseId);
      try {
        if (existente) {
          const igual =
            existente.productoMarcaId === pm.id &&
            existente.skuComercial === pm.skuComercial &&
            existente.nombreComercial === pm.nombreComercial &&
            existente.pvpBase.equals(pm.pvpBase) &&
            existente.documentacionUrl === pm.documentacionUrl;
          if (igual) continue;
          await this.prisma.representacionPartner.update({ where: { id: existente.id }, data: { ...datos, productoMarcaId: pm.id } });
          resultado.actualizados++;
        } else {
          await this.prisma.representacionPartner.create({ data: { ...datos, partnerId, productoMarcaId: pm.id } });
          resultado.creados++;
        }
      } catch (error) {
        if (!esConflicto(error)) throw error;
        resultado.conflictos.push(pm.skuComercial);
      }
    }
    return resultado;
  }
}
