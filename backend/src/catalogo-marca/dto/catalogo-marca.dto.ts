import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  IsUUID,
  Max,
  ValidateNested,
  MaxLength,
} from 'class-validator';

/// Tope de cordura para un PVP: un cero de más (82 → 820) llegaría a todas las empresas de la marca.
export const PVP_MAXIMO = 100_000;

export class ItemCatalogoMarcaDto {
  @IsUUID()
  productoBaseId!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  skuComercial!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  nombreComercial!: string;

  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  @Max(PVP_MAXIMO)
  pvpBase!: number;
}

export class AnadirCatalogoMarcaDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(500)
  @ValidateNested({ each: true })
  @Type(() => ItemCatalogoMarcaDto)
  items!: ItemCatalogoMarcaDto[];
}

export class ActualizarProductoMarcaDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  skuComercial?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  nombreComercial?: string;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  @Max(PVP_MAXIMO)
  pvpBase?: number;

  @IsOptional()
  @IsBoolean()
  activo?: boolean;
}
