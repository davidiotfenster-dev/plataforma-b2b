import { IsIn, IsOptional, IsString } from 'class-validator';
import { PaginacionQueryDto } from '../../common/dto/paginacion.dto.js';

const ESTADOS_PARTNER = ['PENDIENTE_VERIFICACION_EMAIL', 'PENDIENTE_APROBACION', 'ACTIVO', 'SUSPENDIDO', 'RECHAZADO'] as const;

export class ListarPartnersQueryDto extends PaginacionQueryDto {
  /// Busca por razón social, CIF o dominio web (coincidencia parcial).
  @IsOptional()
  @IsString()
  busqueda?: string;

  @IsOptional()
  @IsIn(ESTADOS_PARTNER)
  estado?: (typeof ESTADOS_PARTNER)[number];
}
