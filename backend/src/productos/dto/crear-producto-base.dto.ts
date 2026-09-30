import { IsNotEmpty, IsObject, IsOptional, IsString } from 'class-validator';

export class CrearProductoBaseDto {
  @IsString()
  @IsNotEmpty()
  skuIndustrial!: string;

  @IsString()
  @IsNotEmpty()
  nombreTecnico!: string;

  /// Ficha libre del dispositivo (grupo/familia, color, referencias por
  /// marca con su GTIN...). Ver `EspecificacionesDispositivo` en el frontend.
  @IsOptional()
  @IsObject()
  especificacionesJson?: Record<string, unknown>;
}
