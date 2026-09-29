import { IsEmail, IsNotEmpty, IsNumber, IsOptional, IsString, Max, Min, MinLength } from 'class-validator';

/// Alta directa de un partner por el Admin o un Comercial (no pasa por
/// registro público ni verificación de email): queda ACTIVO de inmediato,
/// con su primer usuario ya listo para iniciar sesión.
export class CrearPartnerDto {
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

  @IsString()
  @IsNotEmpty()
  dominioWeb!: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  codigoCliente?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  marcaComercial?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  tarifa?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  descuentoPorcentaje?: number;

  @IsOptional()
  @IsString()
  notas?: string;

  // --- Primer usuario (PARTNER_ADMIN) del partner --------------------------
  @IsString()
  @IsNotEmpty()
  nombreUsuario!: string;

  @IsEmail()
  emailUsuario!: string;

  @IsString()
  @MinLength(8)
  passwordUsuario!: string;
}
