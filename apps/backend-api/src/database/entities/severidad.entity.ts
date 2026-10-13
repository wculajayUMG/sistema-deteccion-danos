import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { NivelSeveridad } from '../../common/enums/nivel-severidad.enum.js';
import { decimalNumberTransformer } from './decimal-number.transformer.js';

@Entity('severidad')
export class Severidad {
  @PrimaryGeneratedColumn({ name: 'id_severidad' })
  idSeveridad: number;

  @Column({ name: 'nivel', type: 'enum', enum: NivelSeveridad, unique: true })
  nivel: NivelSeveridad;

  @Column({ name: 'descripcion', type: 'varchar', length: 200, nullable: true })
  descripcion: string | null;

  @Column({
    name: 'factor_costo',
    type: 'decimal',
    precision: 5,
    scale: 2,
    default: 1,
    transformer: decimalNumberTransformer,
  })
  factorCosto: number;
}
