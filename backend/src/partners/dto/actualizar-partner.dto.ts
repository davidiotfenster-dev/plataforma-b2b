import { IsEmail, IsIn, IsNotEmpty, IsNumber, IsOptional, IsString, Matches, Max, Min, MaxLength } from 'class-validator';
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
} from './validadores-ficha-cliente.js';

export class ActualizarPartnerDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  razonSocial?: string;

  @IsOptional()
  @Recortar()
  @IsString()
  @IsNotEmpty()
  @Matches(CIF_REGEX, { message: CIF_MENSAJE })
  cif?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(300)
  direccionFiscal?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  pais?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @Matches(DOMINIO_REGEX, { message: DOMINIO_MENSAJE })
  @DominioCorporativo()
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

  /// Ojo: `tipo` (Partner/Distribuidor) NO se edita aquí. Solo un admin puede cambiarlo,
  /// y lo hace con `promocionar` / `degradar` para que quede en la auditoría.
  /// Al no estar en este DTO, enviarlo da 400 (forbidNonWhitelisted).

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
