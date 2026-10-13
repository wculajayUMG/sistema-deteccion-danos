import { Type } from 'class-transformer';
import { IsInt, Min } from 'class-validator';

export class ProcesarDeteccionDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  id_fotografia: number;
}
