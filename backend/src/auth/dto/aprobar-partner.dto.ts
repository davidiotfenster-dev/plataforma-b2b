import { IsNotEmpty, IsNumber, IsString, Max, Min } from 'class-validator';

export class AprobarPartnerDto {
  @IsString()
  @IsNotEmpty()
  marcaComercial!: string;

  @IsString()
  @IsNotEmpty()
  tarifa!: string;

  @IsNumber()
  @Min(0)
  @Max(100)
  descuentoPorcentaje!: number;
}
