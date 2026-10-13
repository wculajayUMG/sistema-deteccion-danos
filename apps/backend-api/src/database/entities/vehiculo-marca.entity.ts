import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import type { Relation } from 'typeorm';
import { VehiculoModelo } from './vehiculo-modelo.entity.js';

@Entity('vehiculo_marca')
export class VehiculoMarca {
  @PrimaryGeneratedColumn({ name: 'id_marca' })
  idMarca: number;

  @Column({ name: 'nombre_marca', type: 'varchar', length: 100, unique: true })
  nombreMarca: string;

  @Column({ name: 'estado', type: 'boolean', default: true })
  estado: boolean;

  @OneToMany(() => VehiculoModelo, (modelo) => modelo.marca)
  modelos: Relation<VehiculoModelo[]>;
}
