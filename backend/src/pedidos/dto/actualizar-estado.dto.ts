import { IsBoolean, IsEnum, IsNotEmpty, IsOptional, IsString, IsUrl, ValidateIf } from 'class-validator';
import { EstadoPedido } from '../../generated/prisma/enums.js';

export class ActualizarEstadoDto {
  @IsEnum(EstadoPedido)
  estado!: EstadoPedido;

  /// Cuando es `true`, se salta la validación de "solo un paso adelante" de
  /// la máquina de estados (permite retrocesos y saltos manuales de
  /// corrección). Uso excepcional, siempre queda registrado en AuditLog.
  @IsOptional()
  @IsBoolean()
  forzar?: boolean;

  /// Obligatorios únicamente al transicionar a ENVIADO.
  @ValidateIf((dto: ActualizarEstadoDto) => dto.estado === EstadoPedido.ENVIADO)
  @IsString()
  @IsNotEmpty()
  transportista?: string;

  @ValidateIf((dto: ActualizarEstadoDto) => dto.estado === EstadoPedido.ENVIADO)
  @IsString()
  @IsNotEmpty()
  numeroExpedicion?: string;

  @ValidateIf((dto: ActualizarEstadoDto) => dto.estado === EstadoPedido.ENVIADO)
  @IsUrl()
  trackingUrl?: string;

  /// Obligatorio únicamente al transicionar a CANCELADO: motivo/feedback de
  /// por qué el pedido no se completa.
  @ValidateIf((dto: ActualizarEstadoDto) => dto.estado === EstadoPedido.CANCELADO)
  @IsString()
  @IsNotEmpty()
  motivoCancelacion?: string;
}
