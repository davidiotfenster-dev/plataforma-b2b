import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Prisma } from '../generated/prisma/client.js';
import { CatalogoMarcaService } from './catalogo-marca.service.js';
import { propuestaDeMarca } from './propuesta.js';
import type { PrismaService } from '../prisma/prisma.service.js';

const producto = (id: string, refs: { marca: string; nombre: string; refInterna: string | null }[], extra: Record<string, unknown> = {}, pvp = 50) => ({
  id,
  skuIndustrial: id.toUpperCase(),
  nombreTecnico: `Técnico ${id}`,
  especificacionesJson: { referencias: refs, ...extra },
  pvpTarifa: pvp ? { toString: () => String(pvp) } : null,
});

describe('propuestaDeMarca', () => {
  const productos = [
    producto('w1', [
      { marca: 'Greenteq', nombre: 'Pulsador Wave1 blanco', refInterna: 'W1B' },
      { marca: 'PROCOMSA', nombre: 'Dispositivo ICON1', refInterna: 'ICON1B' },
      { marca: 'MySmartWindow', nombre: 'CONNECT 1  BLANCO', refInterna: 'Connect1BL' },
    ], { color: 'Blanco' }),
    producto('sky', [{ marca: 'C-WALL', nombre: 'C-WALL SKY', refInterna: 'C-WALLSKYB' }], { color: 'Blanco' }),
    producto('evo', [{ marca: 'MySmartWindow', nombre: 'EVO Plus', refInterna: null }], { ambito: 'todos' }),
    producto('mando', []),
    producto('sinprecio', [{ marca: 'PROCOMSA', nombre: 'Tapa ICON1', refInterna: 'TAPA' }], {}, 0),
  ];

  it('cada marca usa su nombre y su SKU; nunca los de otra marca', () => {
    const icon = propuestaDeMarca(productos, 'PROCOMSA');
    expect(icon.find((p) => p.productoBaseId === 'w1')).toMatchObject({ skuComercial: 'ICON1B', nombreComercial: 'Dispositivo ICON1 Blanco' });
    expect(icon.some((p) => p.productoBaseId === 'sky')).toBe(false);
    const connect = propuestaDeMarca(productos, 'MYSMARTWINDOW');
    expect(connect.find((p) => p.productoBaseId === 'w1')).toMatchObject({ skuComercial: 'Connect1BL', nombreComercial: 'CONNECT 1 BLANCO' });
    expect(connect.find((p) => p.productoBaseId === 'sky')?.skuComercial).toBe('C-WALLSKYB');
  });

  it('los productos para todos y los sin nombres de marca entran en todas; sin precio no entra', () => {
    const wave = propuestaDeMarca(productos, 'VBH');
    expect(wave.find((p) => p.productoBaseId === 'evo')).toMatchObject({ skuComercial: 'EVO', nombreComercial: 'EVO Plus' });
    expect(wave.find((p) => p.productoBaseId === 'mando')?.nombreComercial).toBe('Técnico mando');
    expect(propuestaDeMarca(productos, 'PROCOMSA').some((p) => p.productoBaseId === 'sinprecio')).toBe(false);
  });
});

describe('CatalogoMarcaService.sincronizarEmpresa', () => {
  const pm = (id: string, productoBaseId: string, sku: string, pvp = 50) => ({
    id,
    marca: 'MYSMARTWINDOW',
    productoBaseId,
    skuComercial: sku,
    nombreComercial: `Nombre ${sku}`,
    pvpBase: new Prisma.Decimal(pvp),
    documentacionUrl: null,
    activo: true,
  });
  const rep = (id: string, productoBaseId: string, productoMarcaId: string | null, sku: string, pvp = 50) => ({
    id,
    partnerId: 'e1',
    productoBaseId,
    productoMarcaId,
    skuComercial: sku,
    nombreComercial: `Nombre ${sku}`,
    pvpBase: new Prisma.Decimal(pvp),
    documentacionUrl: null,
    activo: false,
    descuentoOverride: new Prisma.Decimal(7),
  });

  let prisma: Record<string, Record<string, ReturnType<typeof vi.fn>>>;
  let service: CatalogoMarcaService;

  beforeEach(() => {
    prisma = {
      partner: { findUnique: vi.fn().mockResolvedValue({ marcaCatalogo: 'MYSMARTWINDOW' }) },
      productoMarca: { findMany: vi.fn().mockResolvedValue([pm('a', 'b1', 'A'), pm('b', 'b2', 'B', 60), pm('c', 'b3', 'C')]) },
      representacionPartner: {
        deleteMany: vi.fn().mockResolvedValue({ count: 4 }),
        findMany: vi.fn().mockResolvedValue([
          rep('r1', 'b1', 'a', 'A'), // al día
          rep('r2', 'b2', 'b', 'B', 50), // la marca subió el precio
          rep('r3', 'b3', null, 'X'), // extra del mismo producto: pasa a ser de la marca
          rep('r4', 'b9', null, 'EXTRA'), // extra propio: no se toca
        ]),
        update: vi.fn().mockResolvedValue({}),
        create: vi.fn().mockResolvedValue({}),
      },
    };
    service = new CatalogoMarcaService(prisma as unknown as PrismaService);
  });

  it('retira lo de otras marcas, actualiza lo que cambió y enlaza el extra del mismo producto', async () => {
    const r = await service.sincronizarEmpresa('e1');
    expect(prisma.representacionPartner.deleteMany).toHaveBeenCalledWith({
      where: { partnerId: 'e1', productoMarca: { marca: { not: 'MYSMARTWINDOW' } } },
    });
    expect(r).toEqual({ creados: 0, actualizados: 2, retirados: 4, conflictos: [] });
    const ids = prisma.representacionPartner.update.mock.calls.map((c) => c[0].where.id);
    expect(ids).toEqual(['r2', 'r3']);
    // Nunca se pisan `activo` ni el descuento de la empresa.
    for (const [arg] of prisma.representacionPartner.update.mock.calls) {
      expect(arg.data).not.toHaveProperty('activo');
      expect(arg.data).not.toHaveProperty('descuentoOverride');
    }
  });

  it('crea lo que falta y apunta como conflicto un SKU que ya usa un extra de la empresa', async () => {
    prisma.representacionPartner.findMany.mockResolvedValue([]);
    prisma.representacionPartner.create
      .mockResolvedValueOnce({})
      .mockRejectedValueOnce(new Prisma.PrismaClientKnownRequestError('dup', { code: 'P2002', clientVersion: 'x' }))
      .mockResolvedValueOnce({});
    const r = await service.sincronizarEmpresa('e1');
    expect(r.creados).toBe(2);
    expect(r.conflictos).toEqual(['B']);
  });
});

describe('CatalogoMarcaService.listar — recuento de empresas por tipo', () => {
  it('cuenta partners y distribuidores de la marca (y 0 si no hay de un tipo)', async () => {
    const prisma = {
      productoMarca: { findMany: vi.fn().mockResolvedValue([]) },
      partner: {
        groupBy: vi.fn().mockResolvedValue([
          { tipo: 'PARTNER', _count: { _all: 1 } },
          { tipo: 'DISTRIBUIDOR', _count: { _all: 12 } },
        ]),
      },
    };
    const servicio = new CatalogoMarcaService(prisma as unknown as PrismaService);

    expect((await servicio.listar('MYSMARTWINDOW')).empresas).toEqual({ partners: 1, distribuidores: 12 });
    expect(prisma.partner.groupBy).toHaveBeenCalledWith(expect.objectContaining({ where: { marcaCatalogo: 'MYSMARTWINDOW' } }));

    prisma.partner.groupBy.mockResolvedValue([{ tipo: 'PARTNER', _count: { _all: 1 } }]);
    expect((await servicio.listar('VBH')).empresas).toEqual({ partners: 1, distribuidores: 0 });
  });
});

describe('CatalogoMarcaService.aplicarTarifa — PVP de tarifa a la marca', () => {
  const pm = (id: string, sku: string, pvp: number, tarifa: number) => ({
    id,
    skuComercial: sku,
    pvpBase: new Prisma.Decimal(pvp),
    productoBase: { pvpTarifa: new Prisma.Decimal(tarifa) },
  });

  const crear = () => {
    const prisma = {
      productoMarca: {
        findMany: vi.fn().mockResolvedValue([pm('a', 'W1B', 50, 90), pm('b', 'C-WALL', 82, 82)]),
        update: vi.fn((arg) => arg),
      },
      $transaction: vi.fn().mockResolvedValue([]),
      partner: { findMany: vi.fn().mockResolvedValue([]) },
    };
    return { prisma, servicio: new CatalogoMarcaService(prisma as unknown as PrismaService) };
  };

  it('sin aplicar solo enseña los productos cuyo PVP no es el de la tarifa', async () => {
    const { prisma, servicio } = crear();
    const r = await servicio.aplicarTarifa('VBH', false);
    expect(r.cambios.map((c) => [c.skuComercial, c.antes.toNumber(), c.despues.toNumber()])).toEqual([['W1B', 50, 90]]);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('al aplicar actualiza el PVP de la marca y sincroniza sus empresas', async () => {
    const { prisma, servicio } = crear();
    const r = await servicio.aplicarTarifa('VBH', true);
    expect(prisma.productoMarca.update).toHaveBeenCalledTimes(1);
    expect(prisma.productoMarca.update.mock.calls[0][0]).toEqual({ where: { id: 'a' }, data: { pvpBase: new Prisma.Decimal(90) } });
    expect(prisma.partner.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { marcaCatalogo: 'VBH', archivadoEn: null } }));
    expect(r.sincronizacion).toEqual({ creados: 0, actualizados: 0, retirados: 0, conflictos: [] });
  });
});
