import {
  IsIn,
  IsEnum,
  IsOptional,
  IsString,
  Length,
  MinLength,
} from 'class-validator';
import { Rol } from '../../common/enums/rol.enum.js';

export class ResetPasswordDto {
  @IsString()
  @MinLength(12)
  password: string;
}

export class BlockUserDto {
  @IsString()
  @Length(5, 255)
  motivo: string;
}

export class UserFilterDto {
  @IsOptional()
  @IsEnum(Rol)
  @Length(1, 50)
  rol?: string;

  @IsOptional()
  @IsIn(['true', 'false'])
  @IsString()
  estado?: string;
}
