import { IsString, MinLength } from 'class-validator';

export class ResetearPasswordDto {
  @IsString()
  token!: string;

  @IsString()
  @MinLength(10, { message: 'passwordNueva debe tener al menos 10 caracteres' })
  passwordNueva!: string;
}
