import { ArrayMinSize, IsArray, IsNotEmpty, IsNumber, IsOptional, IsPositive, IsString, IsUUID, Max, Min, MaxLength } from 'class-validator';

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
  @MaxLength(64)
  skuComercial!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
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
