import {
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  Length,
  MinLength,
} from 'class-validator';
import { Rol } from '../../common/enums/rol.enum.js';

export class CreateUsuarioDto {
  @IsString()
  @Length(2, 100)
  nombre: string;

  @IsString()
  @Length(2, 100)
  apellido: string;

  @IsEmail()
  @Length(1, 150)
  correo: string;

  @MinLength(12)
  password: string;

  @IsEnum(Rol)
  nombreRol: Rol;

  @IsOptional()
  @IsString()
  @Length(1, 20)
  telefono?: string;
}
