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
  ValidateNested,
} from 'class-validator';

export class ItemCatalogoMarcaDto {
  @IsUUID()
  productoBaseId!: string;

  @IsString()
  @IsNotEmpty()
  skuComercial!: string;

  @IsString()
  @IsNotEmpty()
  nombreComercial!: string;

  @IsNumber()
  @IsPositive()
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
  skuComercial?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  nombreComercial?: string;

  @IsOptional()
  @IsNumber()
  @IsPositive()
  pvpBase?: number;

  @IsOptional()
  @IsBoolean()
  activo?: boolean;
}
