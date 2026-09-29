import { IsEnum } from 'class-validator';
import { Idioma } from '../../generated/prisma/enums.js';

export class ActualizarIdiomaDto {
  @IsEnum(Idioma)
  idioma!: Idioma;
}
