import { IsEnum, IsOptional } from 'class-validator';
import { Idioma } from '../../generated/prisma/enums.js';

export class DescargarPdfQueryDto {
  /// Idioma del PDF; si no se indica, el que el usuario tiene guardado.
  @IsOptional()
  @IsEnum(Idioma)
  idioma?: Idioma;
}
