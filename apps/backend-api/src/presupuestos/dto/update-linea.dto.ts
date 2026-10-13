import { IsNumber, IsOptional, IsString, Length, Min } from 'class-validator';

export class UpdateLineaDto {
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  costoRepuestoGtq?: number;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  costoManoObraGtq?: number;

  @IsOptional()
  @IsString()
  @Length(1, 255)
  descripcion?: string;
}
