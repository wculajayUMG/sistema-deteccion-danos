import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import type { Relation } from 'typeorm';
import { AccionTecnica } from '../../common/enums/accion-tecnica.enum.js';
import { CatalogoPieza } from './catalogo-pieza.entity.js';
import { DeteccionIa } from './deteccion-ia.entity.js';
import { LineaPresupuesto } from './linea-presupuesto.entity.js';
import { Severidad } from './severidad.entity.js';
import { decimalNumberTransformer } from './decimal-number.transformer.js';

@Entity('pieza_danada')
export class PiezaDanada {
  @PrimaryGeneratedColumn({ name: 'id_pieza_danada' })
  idPiezaDanada: number;

  @ManyToOne(() => DeteccionIa, (deteccion) => deteccion.piezasDanadas, { nullable: false })
  @JoinColumn({ name: 'id_deteccion' })
  deteccion: Relation<DeteccionIa>;

  @ManyToOne(() => Severidad, { nullable: false })
  @JoinColumn({ name: 'id_severidad' })
  severidad: Relation<Severidad>;

  @ManyToOne(() => CatalogoPieza, { nullable: false })
  @JoinColumn({ name: 'id_pieza_catalogo' })
  catalogoPieza: Relation<CatalogoPieza>;

  @Column({
    name: 'confianza',
    type: 'decimal',
    precision: 5,
    scale: 2,
    nullable: true,
    transformer: decimalNumberTransformer,
  })
  confianza: number | null;

  @Column({
    name: 'bbox_x',
    type: 'decimal',
    precision: 10,
    scale: 4,
    nullable: true,
    transformer: decimalNumberTransformer,
  })
  bboxX: number | null;

  @Column({
    name: 'bbox_y',
    type: 'decimal',
    precision: 10,
    scale: 4,
    nullable: true,
    transformer: decimalNumberTransformer,
  })
  bboxY: number | null;

  @Column({
    name: 'bbox_ancho',
    type: 'decimal',
    precision: 10,
    scale: 4,
    nullable: true,
    transformer: decimalNumberTransformer,
  })
  bboxAncho: number | null;

  @Column({
    name: 'bbox_alto',
    type: 'decimal',
    precision: 10,
    scale: 4,
    nullable: true,
    transformer: decimalNumberTransformer,
  })
  bboxAlto: number | null;

  @Column({ name: 'accion_tecnica', type: 'enum', enum: AccionTecnica })
  accionTecnica: AccionTecnica;

  @OneToOne(() => LineaPresupuesto, (linea) => linea.piezaDanada)
  lineaPresupuesto: Relation<LineaPresupuesto | null>;
}
