import { Transform } from 'class-transformer';
import { IsBoolean, IsIn, IsOptional, IsString } from 'class-validator';
import { TIPOS_EMPRESA } from './validadores-ficha-cliente.js';
import { PaginacionQueryDto } from '../../common/dto/paginacion.dto.js';

const ESTADOS_PARTNER = ['PENDIENTE_VERIFICACION_EMAIL', 'PENDIENTE_APROBACION', 'ACTIVO', 'SUSPENDIDO', 'RECHAZADO'] as const;

export class ListarPartnersQueryDto extends PaginacionQueryDto {
  /// Busca por razón social, CIF o dominio web (coincidencia parcial).
  @IsOptional()
  @IsString()
  busqueda?: string;

  /// Solo partners o solo clientes.
  @IsOptional()
  @IsIn(TIPOS_EMPRESA)
  tipo?: (typeof TIPOS_EMPRESA)[number];

  @IsOptional()
  @IsIn(ESTADOS_PARTNER)
  estado?: (typeof ESTADOS_PARTNER)[number];

  /// Solo los partners dados de alta con datos provisionales (CIF, dominio o
  /// dirección "PENDIENTE"), que todavía hay que completar.
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  datosPorCompletar?: boolean;

  /// `true` lista solo las empresas archivadas; por defecto se ocultan.
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  archivadas?: boolean;
}
