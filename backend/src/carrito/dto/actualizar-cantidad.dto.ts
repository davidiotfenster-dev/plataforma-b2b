import { IsInt, Max, Min } from 'class-validator';
import { CANTIDAD_MAXIMA_POR_LINEA } from './agregar-item.dto.js';

export class ActualizarCantidadDto {
  @IsInt()
  @Min(1)
  @Max(CANTIDAD_MAXIMA_POR_LINEA)
  cantidad!: number;
}
