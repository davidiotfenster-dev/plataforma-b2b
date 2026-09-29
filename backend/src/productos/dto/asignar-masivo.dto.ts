import { ArrayMinSize, IsArray, IsNotEmpty, IsNumber, IsOptional, IsPositive, IsString, IsUUID, Max, Min } from 'class-validator';

export class AsignarMasivoDto {
  /// Si se omite (o va vacío), se aplica a todos los partners ACTIVO que
  /// todavía no tengan este producto en su catálogo.
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @IsUUID('4', { each: true })
  partnerIds?: string[];

  @IsString()
  @IsNotEmpty()
  skuComercial!: string;

  @IsString()
  @IsNotEmpty()
  nombreComercial!: string;

  @IsNumber()
  @IsPositive()
  pvpBase!: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  descuentoOverride?: number;
}
