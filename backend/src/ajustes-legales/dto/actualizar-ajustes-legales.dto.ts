import {
  IsEmail,
  IsOptional,
  IsString,
  MaxLength,
  ValidateIf,
} from 'class-validator';
import { Recortar } from '../../common/dto/recortar.js';

/// Todos los campos son opcionales: el que no viene no se toca, y el que llega
/// vacío ("") se guarda como nulo, es decir, vuelve a mostrarse "pendiente".
export class ActualizarAjustesLegalesDto {
  @IsOptional()
  @Recortar()
  @IsString()
  @MaxLength(200)
  razonSocial?: string;

  @IsOptional()
  @Recortar()
  @IsString()
  @MaxLength(40)
  cif?: string;

  @IsOptional()
  @Recortar()
  @IsString()
  @MaxLength(300)
  domicilio?: string;

  @IsOptional()
  @Recortar()
  @IsString()
  @MaxLength(200)
  @ValidateIf((_, valor) => valor !== '')
  @IsEmail()
  emailContacto?: string;

  @IsOptional()
  @Recortar()
  @IsString()
  @MaxLength(200)
  @ValidateIf((_, valor) => valor !== '')
  @IsEmail()
  emailPrivacidad?: string;

  @IsOptional()
  @Recortar()
  @IsString()
  @MaxLength(60)
  telefono?: string;

  @IsOptional()
  @Recortar()
  @IsString()
  @MaxLength(300)
  registroMercantil?: string;

  @IsOptional()
  @Recortar()
  @IsString()
  @MaxLength(300)
  alojamiento?: string;

  @IsOptional()
  @Recortar()
  @IsString()
  @MaxLength(100)
  ciudadTribunales?: string;

  @IsOptional()
  @Recortar()
  @IsString()
  @MaxLength(2000)
  portes?: string;

  @IsOptional()
  @Recortar()
  @IsString()
  @MaxLength(2000)
  formaPago?: string;

  @IsOptional()
  @Recortar()
  @IsString()
  @MaxLength(2000)
  devoluciones?: string;

  @IsOptional()
  @Recortar()
  @IsString()
  @MaxLength(100)
  plazoRegistros?: string;
}
