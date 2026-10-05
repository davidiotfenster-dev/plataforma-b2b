import { IsEnum, IsOptional, IsUUID, Matches } from 'class-validator';
import { MarcaCatalogo } from '../../generated/prisma/enums.js';

const FECHA_ISO = /^\d{4}-\d{2}-\d{2}$/;

/// Filtros del panel de estadísticas de ADMIN_FENSTER. Todos opcionales: sin
/// fechas, el periodo son los últimos 30 días.
export class EstadisticasQueryDto {
  /// Primer día incluido (AAAA-MM-DD).
  @IsOptional()
  @Matches(FECHA_ISO, { message: 'desde debe tener el formato AAAA-MM-DD' })
  desde?: string;

  /// Último día incluido (AAAA-MM-DD).
  @IsOptional()
  @Matches(FECHA_ISO, { message: 'hasta debe tener el formato AAAA-MM-DD' })
  hasta?: string;

  @IsOptional()
  @IsEnum(MarcaCatalogo)
  marca?: MarcaCatalogo;

  @IsOptional()
  @IsUUID('4')
  partnerId?: string;
}
