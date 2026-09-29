import { IsInt, IsUUID, Min } from 'class-validator';

export class AgregarItemDto {
  @IsUUID()
  representacionPartnerId!: string;

  @IsInt()
  @Min(1)
  cantidad: number = 1;
}
