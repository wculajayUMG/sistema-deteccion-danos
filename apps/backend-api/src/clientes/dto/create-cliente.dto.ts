import {
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  Length,
} from 'class-validator';
import { TipoCliente } from '../../common/enums/tipo-cliente.enum.js';

export class CreateClienteDto {
  @IsEnum(TipoCliente)
  tipoCliente: TipoCliente;

  @IsString()
  @Length(2, 100)
  nombre: string;

  @IsString()
  @Length(2, 100)
  apellido: string;

  @IsOptional()
  @IsString()
  @Length(1, 20)
  dpi?: string;

  @IsOptional()
  @IsString()
  @Length(1, 20)
  telefono?: string;

  @IsOptional()
  @IsEmail()
  correo?: string;

  @IsOptional()
  @IsString()
  @Length(1, 255)
  direccion?: string;
}
