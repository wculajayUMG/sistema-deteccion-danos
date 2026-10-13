import { IsEnum, IsString, Length } from 'class-validator';
import { AccionTecnica } from '../../common/enums/accion-tecnica.enum.js';

export class EditarPiezaDanadaDto {
  @IsEnum(AccionTecnica)
  accionTecnica: AccionTecnica;

  @IsString()
  @Length(5, 1000)
  justificacion: string;
}
