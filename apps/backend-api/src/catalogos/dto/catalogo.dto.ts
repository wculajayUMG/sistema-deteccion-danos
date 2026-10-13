import { PartialType } from '@nestjs/mapped-types';
import {
  IsEnum,
  IsDateString,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Length,
  Min,
} from 'class-validator';
import { TipoGolpe } from '../../common/enums/tipo-golpe.enum.js';

export class CreateMarcaDto {
  @IsString()
  @Length(2, 100)
  nombreMarca: string;
}

export class UpdateMarcaDto extends PartialType(CreateMarcaDto) {}

export class CreateModeloDto {
  @IsInt()
  @Min(1)
  idMarca: number;

  @IsString()
  @Length(1, 100)
  nombreModelo: string;

  @IsOptional()
  @IsString()
  @Length(1, 100)
  linea?: string;
}

export class UpdateModeloDto extends PartialType(CreateModeloDto) {}

export class CreateBaremoDto {
  @IsInt()
  @Min(1)
  idPiezaCatalogo: number;

  @IsEnum(TipoGolpe)
  tipoGolpe: TipoGolpe;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  costoManoObraGtq: number;

  @IsDateString()
  fechaVigencia: string;
}

export class UpdateBaremoDto extends PartialType(CreateBaremoDto) {}

export class CreateRepuestoDto {
  @IsInt()
  @Min(1)
  idPiezaCatalogo: number;

  @IsInt()
  @Min(1)
  idMarca: number;

  @IsInt()
  @Min(1)
  idModelo: number;

  @IsInt()
  @Min(1886)
  anioDesde: number;

  @IsInt()
  @Min(1886)
  anioHasta: number;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  costoGtq: number;

  @IsOptional()
  @IsString()
  @Length(1, 150)
  proveedor?: string;

  @IsDateString()
  fechaVigencia: string;
}

export class UpdateRepuestoDto extends PartialType(CreateRepuestoDto) {}
