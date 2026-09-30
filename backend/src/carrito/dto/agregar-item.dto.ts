import { IsInt, IsUUID, Max, Min } from 'class-validator';

/// Tope por línea: evita cantidades absurdas que desbordarían los importes.
export const CANTIDAD_MAXIMA_POR_LINEA = 100_000;

export class AgregarItemDto {
  @IsUUID()
  representacionPartnerId!: string;

  @IsInt()
  @Min(1)
  @Max(CANTIDAD_MAXIMA_POR_LINEA)
  cantidad: number = 1;
}
