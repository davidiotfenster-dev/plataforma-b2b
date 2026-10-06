import { IsNotEmpty, IsOptional, IsString, Matches, MaxLength } from 'class-validator';
import { Recortar } from '../../common/dto/recortar.js';

export class ConfirmarPedidoDto {
  @Recortar()
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  direccionEnvio!: string;

  /// PO Number del cliente: es la orden de compra diferida que sustituye
  /// al pago online (ver CLAUDE.md — sin pasarela de pago).
  @Recortar()
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  poNumber!: string;

  @Recortar()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notas?: string;

  /// Total que el cliente tenía en pantalla (el `totalPedido` del carrito). Si
  /// los precios cambiaron mientras tanto, el pedido no se confirma en silencio
  /// con otro importe: se le avisa para que lo revise.
  @IsOptional()
  @IsString()
  @Matches(/^\d{1,12}(\.\d{1,2})?$/)
  totalEsperado?: string;
}
