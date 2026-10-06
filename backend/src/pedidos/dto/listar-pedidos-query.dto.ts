import { IsEnum, IsIn, IsOptional, IsString, Matches, MaxLength } from 'class-validator';
import { EstadoPedido } from '../../generated/prisma/enums.js';
import { PaginacionQueryDto } from '../../common/dto/paginacion.dto.js';

export const ORDENES_PEDIDOS = ['fecha', 'total'] as const;

/// Listado "Mis pedidos" del cliente: búsqueda, filtros, orden y paginación.
export class ListarPedidosQueryDto extends PaginacionQueryDto {
  /// Coincidencia parcial con el código PED, el PO Number o algún producto del pedido.
  @IsOptional()
  @IsString()
  @MaxLength(100)
  busqueda?: string;

  @IsOptional()
  @IsEnum(EstadoPedido)
  estado?: EstadoPedido;

  /// Fechas AAAA-MM-DD, ambas incluidas.
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'desde debe tener el formato AAAA-MM-DD' })
  desde?: string;

  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'hasta debe tener el formato AAAA-MM-DD' })
  hasta?: string;

  @IsOptional()
  @IsIn(ORDENES_PEDIDOS)
  orden?: (typeof ORDENES_PEDIDOS)[number] = 'fecha';

  @IsOptional()
  @IsIn(['asc', 'desc'])
  sentido?: 'asc' | 'desc' = 'desc';
}
