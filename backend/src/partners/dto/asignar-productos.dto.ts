import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  IsUUID,
  Max,
  Min,
  ValidateNested,
  MaxLength,
} from 'class-validator';
import { PVP_MAXIMO } from '../../catalogo-marca/dto/catalogo-marca.dto.js';

class ItemAsignarProductoDto {
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

  /// Descuento específico para este producto en este partner. Si se omite,
  /// se aplicará el descuento general del partner.
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  descuentoOverride?: number;
}

export class AsignarProductosDto {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => ItemAsignarProductoDto)
  items!: ItemAsignarProductoDto[];
}
