import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import type { Relation } from 'typeorm';
import { TipoGolpe } from '../../common/enums/tipo-golpe.enum.js';
import { CatalogoPieza } from './catalogo-pieza.entity.js';
import { decimalNumberTransformer } from './decimal-number.transformer.js';

@Entity('baremo_precio')
@Unique(['catalogoPieza', 'tipoGolpe'])
export class BaremoPrecio {
  @PrimaryGeneratedColumn({ name: 'id_baremo' })
  idBaremo: number;

  @ManyToOne(() => CatalogoPieza, { nullable: false })
  @JoinColumn({ name: 'id_pieza_catalogo' })
  catalogoPieza: Relation<CatalogoPieza>;

  @Column({ name: 'tipo_golpe', type: 'enum', enum: TipoGolpe })
  tipoGolpe: TipoGolpe;

  @Column({
    name: 'costo_mano_obra_gtq',
    type: 'decimal',
    precision: 10,
    scale: 2,
    transformer: decimalNumberTransformer,
  })
  costoManoObraGtq: number;

  @Column({ name: 'fecha_vigencia', type: 'date' })
  fechaVigencia: Date;

  @Column({ name: 'estado', type: 'boolean', default: true })
  estado: boolean;
}
