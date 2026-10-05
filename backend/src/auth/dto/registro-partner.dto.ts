import {
  Equals,
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MinLength,
  MaxLength,
} from 'class-validator';
import { Recortar } from '../../common/dto/recortar.js';
import { CIF_MENSAJE, CIF_REGEX, NormalizarCif, DOMINIO_REGEX, DominioCorporativo } from '../../partners/dto/validadores-ficha-cliente.js';
import { Idioma } from '../../generated/prisma/enums.js';

export class RegistroPartnerDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  razonSocial!: string;

  @NormalizarCif()
  @IsString()
  @IsNotEmpty()
  @Matches(CIF_REGEX, { message: CIF_MENSAJE })
  cif!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(300)
  direccionFiscal!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  pais!: string;

  /// Dominio corporativo de la empresa (p. ej. "empresa.com"). El email del
  /// administrador debe pertenecer a este dominio: es la "verificación de
  /// correo corporativo" que exige CLAUDE.md.
  @IsString()
  @IsNotEmpty()
  @Matches(DOMINIO_REGEX, { message: 'dominioWeb debe ser un dominio válido (p. ej. empresa.com)' })
  @DominioCorporativo()
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
