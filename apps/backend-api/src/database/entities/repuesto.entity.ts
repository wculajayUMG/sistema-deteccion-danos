import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import type { Relation } from 'typeorm';
import { CatalogoPieza } from './catalogo-pieza.entity.js';
import { VehiculoMarca } from './vehiculo-marca.entity.js';
import { VehiculoModelo } from './vehiculo-modelo.entity.js';
import { decimalNumberTransformer } from './decimal-number.transformer.js';

@Entity('repuesto')
export class Repuesto {
  @PrimaryGeneratedColumn({ name: 'id_repuesto' })
  idRepuesto: number;

  @ManyToOne(() => CatalogoPieza, { nullable: false })
  @JoinColumn({ name: 'id_pieza_catalogo' })
  catalogoPieza: Relation<CatalogoPieza>;

  @ManyToOne(() => VehiculoMarca, { nullable: false })
  @JoinColumn({ name: 'id_marca' })
  marca: Relation<VehiculoMarca>;

  @ManyToOne(() => VehiculoModelo, { nullable: false })
  @JoinColumn({ name: 'id_modelo' })
  modelo: Relation<VehiculoModelo>;

  @Column({ name: 'anio_desde', type: 'int' })
  anioDesde: number;

  @Column({ name: 'anio_hasta', type: 'int' })
  anioHasta: number;

  @Column({
    name: 'costo_gtq',
    type: 'decimal',
    precision: 10,
    scale: 2,
    transformer: decimalNumberTransformer,
  })
  costoGtq: number;

  @Column({ name: 'proveedor', type: 'varchar', length: 150, nullable: true })
  proveedor: string | null;

  @Column({ name: 'fecha_vigencia', type: 'date' })
  fechaVigencia: Date;

  @Column({ name: 'estado', type: 'boolean', default: true })
  estado: boolean;
}
