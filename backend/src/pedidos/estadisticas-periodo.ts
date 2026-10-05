import { BadRequestException } from '@nestjs/common';

/// Agrupación de la serie temporal: por día en periodos cortos, por semana o
/// por mes en los largos, para que la gráfica no tenga cientos de barras.
export type Granularidad = 'day' | 'week' | 'month';

export interface PeriodoEstadisticas {
  /// Inicio incluido (00:00 UTC del primer día).
  inicio: Date;
  /// Fin excluido (00:00 UTC del día siguiente al último).
  fin: Date;
  /// Periodo inmediatamente anterior de la misma duración, para comparar.
  inicioAnterior: Date;
  desde: string;
  hasta: string;
  granularidad: Granularidad;
}

const DIA_MS = 24 * 60 * 60 * 1000;
const DIAS_POR_DEFECTO = 30;
/// Tope para que nadie lance una consulta sobre décadas de pedidos.
const MAX_DIAS = 3 * 366;

function aFecha(texto: string): Date {
  const fecha = new Date(`${texto}T00:00:00.000Z`);
  if (
    Number.isNaN(fecha.getTime()) ||
    fecha.toISOString().slice(0, 10) !== texto
  ) {
    throw new BadRequestException(`Fecha no válida: ${texto}`);
  }
  return fecha;
}

function inicioDelDiaUtc(fecha: Date): Date {
  return new Date(
    Date.UTC(fecha.getUTCFullYear(), fecha.getUTCMonth(), fecha.getUTCDate()),
  );
}

export function calcularPeriodo(
  desde: string | undefined,
  hasta: string | undefined,
  ahora = new Date(),
): PeriodoEstadisticas {
  const ultimoDia = hasta ? aFecha(hasta) : inicioDelDiaUtc(ahora);
  const primerDia = desde
    ? aFecha(desde)
    : new Date(ultimoDia.getTime() - (DIAS_POR_DEFECTO - 1) * DIA_MS);

  if (primerDia > ultimoDia) {
    throw new BadRequestException(
      'La fecha "desde" no puede ser posterior a "hasta"',
    );
  }
  const dias =
    Math.round((ultimoDia.getTime() - primerDia.getTime()) / DIA_MS) + 1;
  if (dias > MAX_DIAS) {
    throw new BadRequestException(
      `El periodo no puede superar ${MAX_DIAS} días`,
    );
  }

  const fin = new Date(ultimoDia.getTime() + DIA_MS);
  return {
    inicio: primerDia,
    fin,
    inicioAnterior: new Date(primerDia.getTime() - dias * DIA_MS),
    desde: primerDia.toISOString().slice(0, 10),
    hasta: ultimoDia.toISOString().slice(0, 10),
    granularidad: dias <= 62 ? 'day' : dias <= 366 ? 'week' : 'month',
  };
}

/// Mismo redondeo que `date_trunc` de PostgreSQL (la semana empieza en lunes).
export function truncar(fecha: Date, granularidad: Granularidad): Date {
  const dia = inicioDelDiaUtc(fecha);
  if (granularidad === 'day') return dia;
  if (granularidad === 'month')
    return new Date(Date.UTC(dia.getUTCFullYear(), dia.getUTCMonth(), 1));
  const desdeLunes = (dia.getUTCDay() + 6) % 7;
  return new Date(dia.getTime() - desdeLunes * DIA_MS);
}

function siguiente(fecha: Date, granularidad: Granularidad): Date {
  if (granularidad === 'day') return new Date(fecha.getTime() + DIA_MS);
  if (granularidad === 'week') return new Date(fecha.getTime() + 7 * DIA_MS);
  return new Date(Date.UTC(fecha.getUTCFullYear(), fecha.getUTCMonth() + 1, 1));
}

/// Todos los tramos del periodo, en orden, para rellenar con cero los que no
/// tienen pedidos (si no, la gráfica salta de un día con pedidos al siguiente).
export function tramosDelPeriodo(periodo: PeriodoEstadisticas): string[] {
  const tramos: string[] = [];
  for (
    let t = truncar(periodo.inicio, periodo.granularidad);
    t < periodo.fin;
    t = siguiente(t, periodo.granularidad)
  ) {
    tramos.push(t.toISOString().slice(0, 10));
  }
  return tramos;
}
