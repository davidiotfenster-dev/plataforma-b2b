import { IsNotEmpty, IsString } from 'class-validator';

export class CrearProductoBaseDto {
  @IsString()
  @IsNotEmpty()
  skuIndustrial!: string;

  @IsString()
  @IsNotEmpty()
  nombreTecnico!: string;
}
