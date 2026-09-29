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

  /// Notas internas (contactos, forma de pago, IVA, divisa…). `null`
  /// explícito las borra.
  @IsOptional()
  @IsString()
  notas?: string | null;
}
