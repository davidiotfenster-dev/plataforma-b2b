import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { ActualizarAjustesLegalesDto } from './dto/actualizar-ajustes-legales.dto.js';

export const CAMPOS_AJUSTES_LEGALES = [
  'razonSocial',
  'cif',
  'domicilio',
  'emailContacto',
  'emailPrivacidad',
  'telefono',
  'registroMercantil',
  'alojamiento',
  'ciudadTribunales',
  'portes',
  'formaPago',
  'devoluciones',
  'plazoRegistros',
] as const;

export type AjustesLegalesPublicos = Record<
  (typeof CAMPOS_AJUSTES_LEGALES)[number],
  string | null
> & {
  updatedAt: Date | null;
};

const SELECCION = {
  ...Object.fromEntries(CAMPOS_AJUSTES_LEGALES.map((c) => [c, true])),
  updatedAt: true,
} as Record<(typeof CAMPOS_AJUSTES_LEGALES)[number] | 'updatedAt', true>;

@Injectable()
export class AjustesLegalesService {
  constructor(private readonly prisma: PrismaService) {}

  /// Siempre devuelve todos los campos; si la fila aún no existe (base de
  /// datos sin la migración de datos iniciales), todo sale como pendiente.
  async obtener(): Promise<AjustesLegalesPublicos> {
    const fila = await this.prisma.ajustesLegales.findUnique({
      where: { unica: true },
      select: SELECCION,
    });
    if (fila) return fila;
    return {
      ...(Object.fromEntries(
        CAMPOS_AJUSTES_LEGALES.map((c) => [c, null]),
      ) as Record<(typeof CAMPOS_AJUSTES_LEGALES)[number], null>),
      updatedAt: null,
    };
  }

  async actualizar(
    dto: ActualizarAjustesLegalesDto,
  ): Promise<AjustesLegalesPublicos> {
    const datos: Partial<
      Record<(typeof CAMPOS_AJUSTES_LEGALES)[number], string | null>
    > = {};
    for (const campo of CAMPOS_AJUSTES_LEGALES) {
      const valor = dto[campo];
      if (valor !== undefined) datos[campo] = valor === '' ? null : valor;
    }
    return this.prisma.ajustesLegales.upsert({
      where: { unica: true },
      create: { unica: true, ...datos },
      update: datos,
      select: SELECCION,
    });
  }
}
