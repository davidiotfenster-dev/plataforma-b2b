import { IsEmail, IsIn, IsNotEmpty, IsNumber, IsOptional, IsString, Matches, Max, Min, MinLength } from 'class-validator';
import { Recortar } from '../../common/dto/recortar.js';
import {
  CODIGO_POSTAL_MENSAJE,
  CODIGO_POSTAL_REGEX,
  CIF_MENSAJE,
  CIF_REGEX,
  DominioCorporativo,
  DOMINIO_MENSAJE,
  DOMINIO_REGEX,
  TELEFONO_MENSAJE,
  TELEFONO_REGEX,
  MARCAS_CATALOGO,
  TIPOS_EMPRESA,
} from './validadores-ficha-cliente.js';

/// Alta directa de un partner por el Admin o un Comercial (no pasa por
/// registro público ni verificación de email): queda ACTIVO de inmediato,
/// con su primer usuario ya listo para iniciar sesión.
export class CrearPartnerDto {
  @IsString()
  @IsNotEmpty()
  razonSocial!: string;

  @Recortar()
  @IsString()
  @IsNotEmpty()
  @Matches(CIF_REGEX, { message: CIF_MENSAJE })
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
  @DominioCorporativo()
  dominioWeb!: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  codigoCliente?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  marcaComercial?: string;

  /// Partner (submarca propia) o distribuidor.
  @IsOptional()
  @IsIn(TIPOS_EMPRESA)
  tipo?: (typeof TIPOS_EMPRESA)[number];

  /// Marca cuyos dispositivos ve la empresa.
  @IsOptional()
  @IsIn(MARCAS_CATALOGO)
  marcaCatalogo?: (typeof MARCAS_CATALOGO)[number];

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
