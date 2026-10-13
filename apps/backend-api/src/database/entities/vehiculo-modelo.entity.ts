import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import type { Relation } from 'typeorm';
import { Vehiculo } from './vehiculo.entity.js';
import { VehiculoMarca } from './vehiculo-marca.entity.js';

@Entity('vehiculo_modelo')
export class VehiculoModelo {
  @PrimaryGeneratedColumn({ name: 'id_modelo' })
  idModelo: number;

  @ManyToOne(() => VehiculoMarca, (marca) => marca.modelos, { nullable: false })
  @JoinColumn({ name: 'id_marca' })
  marca: Relation<VehiculoMarca>;

  @Column({ name: 'nombre_modelo', type: 'varchar', length: 100 })
  nombreModelo: string;

  @Column({ name: 'linea', type: 'varchar', length: 100, nullable: true })
  linea: string | null;

  @Column({ name: 'estado', type: 'boolean', default: true })
  estado: boolean;

  @OneToMany(() => Vehiculo, (vehiculo) => vehiculo.modelo)
  vehiculos: Relation<Vehiculo[]>;
}
