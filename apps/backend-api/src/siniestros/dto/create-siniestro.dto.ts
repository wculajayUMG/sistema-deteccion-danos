import {
  IsDateString,
  IsEmail,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Length,
  Max,
  Min,
} from 'class-validator';
import { TipoCliente } from '../../common/enums/tipo-cliente.enum.js';
import { TipoVehiculo } from '../../common/enums/tipo-vehiculo.enum.js';

export class CreateSiniestroDto {
  @IsEnum(TipoCliente)
  tipoCliente: TipoCliente;

  @IsString()
  @Length(2, 100)
  nombreCliente: string;

  @IsString()
  @Length(2, 100)
  apellidoCliente: string;

  @IsOptional()
  @IsString()
  @Length(1, 20)
  dpiCliente?: string;

  @IsOptional()
  @IsString()
  @Length(1, 20)
  telefonoCliente?: string;

  @IsOptional()
  @IsEmail()
  correoCliente?: string;

  @IsOptional()
  @IsString()
  @Length(1, 255)
  direccionCliente?: string;

  @IsInt()
  @Min(1)
  idMarca: number;

  @IsInt()
  @Min(1)
  idModelo: number;

  @IsInt()
  @Min(1886)
  @Max(2100)
  anio: number;

  @IsString()
  @Length(1, 20)
  placa: string;

  @IsEnum(TipoVehiculo)
  tipoVehiculo: TipoVehiculo;

  @IsOptional()
  @IsString()
  @Length(1, 50)
  color?: string;

  @IsOptional()
  @IsString()
  @Length(1, 50)
  numeroChasis?: string;

  @IsOptional()
  @IsString()
  @Length(1, 50)
  numeroMotor?: string;

  @IsString()
  @Length(5, 30)
  numeroPoliza: string;

  @IsDateString()
  fechaSiniestro: string;

  @IsOptional()
  @IsString()
  @Length(1, 255)
  lugarSiniestro?: string;

  @IsOptional()
  @IsString()
  descripcion?: string;
}
