import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import type { Relation } from 'typeorm';
import { BaremoPrecio } from './baremo-precio.entity.js';
import { PiezaDanada } from './pieza-danada.entity.js';
import { Presupuesto } from './presupuesto.entity.js';
import { Repuesto } from './repuesto.entity.js';
import { decimalNumberTransformer } from './decimal-number.transformer.js';

@Entity('linea_presupuesto')
export class LineaPresupuesto {
  @PrimaryGeneratedColumn({ name: 'id_linea' })
  idLinea: number;

  @ManyToOne(() => Presupuesto, (presupuesto) => presupuesto.lineas, { nullable: false })
  @JoinColumn({ name: 'id_presupuesto' })
  presupuesto: Relation<Presupuesto>;

  @OneToOne(() => PiezaDanada, (piezaDanada) => piezaDanada.lineaPresupuesto, { nullable: false })
  @JoinColumn({ name: 'id_pieza_danada' })
  piezaDanada: Relation<PiezaDanada>;

  @ManyToOne(() => BaremoPrecio, { nullable: true })
  @JoinColumn({ name: 'id_baremo' })
  baremo: Relation<BaremoPrecio | null>;

  @ManyToOne(() => Repuesto, { nullable: true })
  @JoinColumn({ name: 'id_repuesto' })
  repuesto: Relation<Repuesto | null>;

  @Column({ name: 'descripcion', type: 'varchar', length: 255, nullable: true })
  descripcion: string | null;

  @Column({
    name: 'costo_repuesto_gtq',
    type: 'decimal',
    precision: 10,
    scale: 2,
    default: 0,
    transformer: decimalNumberTransformer,
  })
  costoRepuestoGtq: number;

  @Column({
    name: 'costo_mano_obra_gtq',
    type: 'decimal',
    precision: 10,
    scale: 2,
    default: 0,
    transformer: decimalNumberTransformer,
  })
  costoManoObraGtq: number;

  @Column({
    name: 'subtotal_gtq',
    type: 'decimal',
    precision: 10,
    scale: 2,
    default: 0,
    transformer: decimalNumberTransformer,
  })
  subtotalGtq: number;

  @Column({ name: 'modificado_manualmente', type: 'boolean', default: false })
  modificadoManualmente: boolean;
}
