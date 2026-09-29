import { IsBoolean, IsNotEmpty, IsNumber, IsOptional, IsPositive, IsString, Max, Min } from 'class-validator';

export class ActualizarRepresentacionDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  skuComercial?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  nombreComercial?: string;

  @IsOptional()
  @IsNumber()
  @IsPositive()
  pvpBase?: number;

  /// `null` explícito borra el override y vuelve a aplicar el descuento
  /// general del partner.
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  descuentoOverride?: number | null;

  @IsOptional()
  @IsBoolean()
  activo?: boolean;
}
