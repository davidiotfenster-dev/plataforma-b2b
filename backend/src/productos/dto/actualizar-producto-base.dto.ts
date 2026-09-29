import { IsBoolean, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class ActualizarProductoBaseDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  nombreTecnico?: string;

  @IsOptional()
  @IsBoolean()
  activo?: boolean;
}
