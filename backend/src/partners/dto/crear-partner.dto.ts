import { IsEmail, IsNotEmpty, IsNumber, IsOptional, IsString, Matches, Max, Min, MinLength } from 'class-validator';
import {
  CODIGO_POSTAL_MENSAJE,
  CODIGO_POSTAL_REGEX,
  DOMINIO_MENSAJE,
  DOMINIO_REGEX,
  TELEFONO_MENSAJE,
  TELEFONO_REGEX,
} from './validadores-ficha-cliente.js';

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
  @Matches(DOMINIO_REGEX, { message: DOMINIO_MENSAJE })
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

  // --- Campos de la "FICHA CLIENTE" (ficha interna del ERP) ---------------
  @IsOptional()
  @IsString()
  @Matches(TELEFONO_REGEX, { message: TELEFONO_MENSAJE })
  telefono1?: string;

  @IsOptional()
  @IsString()
  @Matches(TELEFONO_REGEX, { message: TELEFONO_MENSAJE })
  telefono2?: string;

  @IsOptional()
  @IsString()
  @Matches(CODIGO_POSTAL_REGEX, { message: CODIGO_POSTAL_MENSAJE })
  codigoPostal?: string;

  @IsOptional()
  @IsString()
  localidad?: string;

  @IsOptional()
  @IsString()
  provincia?: string;

  @IsOptional()
  @IsString()
  direccionEnvioDefecto?: string;

  @IsOptional()
  @IsString()
  @Matches(CODIGO_POSTAL_REGEX, { message: CODIGO_POSTAL_MENSAJE })
  codigoPostalEnvio?: string;

  @IsOptional()
  @IsString()
  localidadEnvio?: string;

  @IsOptional()
  @IsString()
  provinciaEnvio?: string;

  @IsOptional()
  @IsString()
  paisEnvio?: string;

  @IsOptional()
  @IsEmail()
  correoContacto1?: string;

  @IsOptional()
  @IsEmail()
  correoContacto2?: string;

  @IsOptional()
  @IsEmail()
  correoFacturacion?: string;

  @IsOptional()
  @IsString()
  formaPago?: string;

  @IsOptional()
  @IsString()
  divisa?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  iva?: number;

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
