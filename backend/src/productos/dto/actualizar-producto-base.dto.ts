import { IsBoolean, IsNotEmpty, IsObject, IsOptional, IsString } from 'class-validator';

export class ActualizarProductoBaseDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  nombreTecnico?: string;

  @IsOptional()
  @IsBoolean()
  activo?: boolean;

  /// Sustituye la ficha completa (el frontend envía la versión ya fusionada).
  @IsOptional()
  @IsObject()
  especificacionesJson?: Record<string, unknown>;
}
