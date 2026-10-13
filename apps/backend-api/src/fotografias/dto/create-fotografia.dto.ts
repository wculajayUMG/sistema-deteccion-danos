import { IsInt, IsOptional, Min } from 'class-validator';

export class CreateFotografiaDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  orden?: number;
}
