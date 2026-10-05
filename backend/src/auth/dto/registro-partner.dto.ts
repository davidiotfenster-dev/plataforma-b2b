import {
  Equals,
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MinLength,
} from 'class-validator';
import { Idioma } from '../../generated/prisma/enums.js';

export class RegistroPartnerDto {
  @IsString()
  @IsNotEmpty()
  razonSocial!: string;

  @IsString()
  @IsNotEmpty()
  cif!: string;

  @IsString()
  @IsNotEmpty()
  direccionFiscal!: string;

  @IsString()
  @IsNotEmpty()
  pais!: string;

  /// Dominio corporativo de la empresa (p. ej. "empresa.com"). El email del
  /// administrador debe pertenecer a este dominio: es la "verificación de
  /// correo corporativo" que exige CLAUDE.md.
  @IsString()
  @IsNotEmpty()
  @Matches(/^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/i, {
    message: 'dominioWeb debe ser un dominio válido (p. ej. empresa.com)',
  })
  dominioWeb!: string;

  @IsEmail()
  emailAdmin!: string;

  @IsString()
  @MinLength(10, { message: 'passwordAdmin debe tener al menos 10 caracteres' })
  passwordAdmin!: string;

  @IsString()
  @IsNotEmpty()
  nombreAdmin!: string;

  /// Casilla obligatoria "He leído y acepto las condiciones de uso y la
  /// política de privacidad". Sin ella no se admite el registro.
  @Equals(true, { message: 'Debe aceptar las condiciones de uso y la política de privacidad' })
  aceptaCondiciones!: boolean;

  /// Idioma preferido del administrador registrado: interfaz + emails
  /// transaccionales. Por defecto ES si no se indica.
  @IsOptional()
  @IsEnum(Idioma)
  idioma?: Idioma;
}
