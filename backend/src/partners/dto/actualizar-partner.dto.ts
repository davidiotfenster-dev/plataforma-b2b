import { IsEmail, IsNotEmpty, IsNumber, IsOptional, IsString, Matches, Max, Min } from 'class-validator';
import {
  CODIGO_POSTAL_MENSAJE,
  CODIGO_POSTAL_REGEX,
  DOMINIO_MENSAJE,
  DOMINIO_REGEX,
  TELEFONO_MENSAJE,
  TELEFONO_REGEX,
} from './validadores-ficha-cliente.js';

export class ActualizarPartnerDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  razonSocial?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  cif?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  direccionFiscal?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  pais?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @Matches(DOMINIO_REGEX, { message: DOMINIO_MENSAJE })
  dominioWeb?: string;

  /// Código de cliente del ERP interno (ver "FICHA CLIENTE"). `null`
  /// explícito lo borra.
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  codigoCliente?: string | null;

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
  telefono1?: string | null;

  @IsOptional()
  @IsString()
  @Matches(TELEFONO_REGEX, { message: TELEFONO_MENSAJE })
  telefono2?: string | null;

  @IsOptional()
  @IsString()
  @Matches(CODIGO_POSTAL_REGEX, { message: CODIGO_POSTAL_MENSAJE })
  codigoPostal?: string | null;

  @IsOptional()
  @IsString()
  localidad?: string | null;

  @IsOptional()
  @IsString()
  provincia?: string | null;

  @IsOptional()
  @IsString()
  direccionEnvioDefecto?: string | null;

  @IsOptional()
  @IsString()
  @Matches(CODIGO_POSTAL_REGEX, { message: CODIGO_POSTAL_MENSAJE })
  codigoPostalEnvio?: string | null;

  @IsOptional()
  @IsString()
  localidadEnvio?: string | null;

  @IsOptional()
  @IsString()
  provinciaEnvio?: string | null;

  @IsOptional()
  @IsString()
  paisEnvio?: string | null;

  @IsOptional()
  @IsEmail()
  correoContacto1?: string | null;

  @IsOptional()
  @IsEmail()
  correoContacto2?: string | null;

  @IsOptional()
  @IsEmail()
  correoFacturacion?: string | null;

  @IsOptional()
  @IsString()
  formaPago?: string | null;

  @IsOptional()
  @IsString()
  divisa?: string | null;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  iva?: number | null;

  /// Notas internas (contactos, forma de pago, IVA, divisa…). `null`
  /// explícito las borra.
  @IsOptional()
  @IsString()
  notas?: string | null;
}
