import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';

/// Envoltorio estándar de listados paginados, para no repetir la forma de
/// la respuesta en cada endpoint.
export interface Paginado<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}

export class PaginacionQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;
}
