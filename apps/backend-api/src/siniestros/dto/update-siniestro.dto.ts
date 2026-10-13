import { PartialType, PickType } from '@nestjs/mapped-types';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { EstadoSiniestro } from '../../common/enums/estado-siniestro.enum.js';
import { CreateSiniestroDto } from './create-siniestro.dto.js';

export class UpdateSiniestroDto extends PartialType(
  PickType(CreateSiniestroDto, [
    'numeroPoliza',
    'fechaSiniestro',
    'lugarSiniestro',
    'descripcion',
  ] as const),
) {
  @IsOptional()
  @IsEnum(EstadoSiniestro)
  estado?: EstadoSiniestro;

  @IsOptional()
  @IsString()
  descripcion?: string;
}
