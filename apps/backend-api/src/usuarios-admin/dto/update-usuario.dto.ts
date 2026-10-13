import { PartialType, PickType } from '@nestjs/mapped-types';
import { IsBoolean, IsOptional } from 'class-validator';
import { CreateUsuarioDto } from './create-usuario.dto.js';

export class UpdateUsuarioDto extends PartialType(
  PickType(CreateUsuarioDto, [
    'nombre',
    'apellido',
    'correo',
    'nombreRol',
    'telefono',
  ] as const),
) {
  @IsOptional()
  @IsBoolean()
  estado?: boolean;
}
