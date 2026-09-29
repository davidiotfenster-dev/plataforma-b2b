import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class ConfirmarPedidoDto {
  @IsString()
  @IsNotEmpty()
  direccionEnvio!: string;

  /// PO Number del cliente: es la orden de compra diferida que sustituye
  /// al pago online (ver CLAUDE.md — sin pasarela de pago).
  @IsString()
  @IsNotEmpty()
  poNumber!: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notas?: string;
}
