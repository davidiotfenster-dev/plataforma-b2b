import { Transform } from 'class-transformer';
import { IsEmail, IsEnum, IsIn, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import { Idioma } from '../../generated/prisma/enums.js';
import { Recortar } from '../../common/dto/recortar.js';
import { ROLES_ASIGNABLES_PARTNER } from './actualizar-rol-usuario.dto.js';

/// Alta de un usuario más en una empresa ya activa (por IoT FENSTER o por el
/// administrador de la propia empresa). No lleva contraseña: el usuario recibe
/// un correo para crearla él mismo.
export class CrearUsuarioDto {
  @Recortar()
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  nombre!: string;

  /// En minúsculas: el login busca el email tal cual, y quien lo escribe aquí no
  /// es quien luego entra, así que no puede saber qué mayúsculas se usaron.
  @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim().toLowerCase() : value))
  @IsEmail()
  email!: string;

  @IsIn(ROLES_ASIGNABLES_PARTNER)
  rol!: (typeof ROLES_ASIGNABLES_PARTNER)[number];

  /// Idioma del correo de invitación y de su portal. Por defecto, español.
  @IsOptional()
  @IsEnum(Idioma)
  idioma?: Idioma;
}
