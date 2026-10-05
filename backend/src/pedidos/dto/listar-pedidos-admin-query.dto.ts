import { IsEnum, IsOptional, IsString } from 'class-validator';
import { EstadoPedido } from '../../generated/prisma/enums.js';
import { PaginacionQueryDto } from '../../common/dto/paginacion.dto.js';

export class ListarPedidosAdminQueryDto extends PaginacionQueryDto {
  /// Busca por razón social del partner (coincidencia parcial).
  @IsOptional()
  @IsString()
  busqueda?: string;
}

/// Lista plana de todos los pedidos: busca por código PED, PO Number o empresa, y
/// se puede filtrar por estado.
export class ListarTodosPedidosAdminQueryDto extends PaginacionQueryDto {
  @IsOptional()
  @IsString()
  busqueda?: string;

  @IsOptional()
  @IsEnum(EstadoPedido)
  estado?: EstadoPedido;
}
