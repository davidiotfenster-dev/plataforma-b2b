import { IsNotEmpty, IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';

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
  telefono1?: string | null;

  @IsOptional()
  @IsString()
  telefono2?: string | null;

  @IsOptional()
  @IsString()
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
  @IsString()
  correoContacto1?: string | null;

  @IsOptional()
  @IsString()
  correoContacto2?: string | null;

  @IsOptional()
  @IsString()
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
