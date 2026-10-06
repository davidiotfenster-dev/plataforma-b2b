import { IsNotEmpty, IsObject, IsOptional, IsString, MaxLength } from 'class-validator';

export class CrearProductoBaseDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  skuIndustrial!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  nombreTecnico!: string;

  /// Ficha libre del dispositivo (grupo/familia, color, referencias por
  /// marca con su GTIN...). Ver `EspecificacionesDispositivo` en el frontend.
  @IsOptional()
  @IsObject()
  especificacionesJson?: Record<string, unknown>;
}
