import { IsOptional, IsString } from 'class-validator';
import { PaginacionQueryDto } from '../../common/dto/paginacion.dto.js';

export class ListarPedidosAdminQueryDto extends PaginacionQueryDto {
  /// Busca por razón social del partner (coincidencia parcial).
  @IsOptional()
  @IsString()
  busqueda?: string;
}
