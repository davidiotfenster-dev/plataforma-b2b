import { IsNotEmpty, IsString } from 'class-validator';

export class EliminarPartnerDto {
  /// Razón social de la empresa, escrita tal cual: freno contra borrados por error.
  @IsString()
  @IsNotEmpty()
  confirmarRazonSocial!: string;
}
