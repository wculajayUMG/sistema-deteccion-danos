import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import type { Relation } from 'typeorm';
import { TipoVehiculo } from '../../common/enums/tipo-vehiculo.enum.js';
import { Cliente } from './cliente.entity.js';
import { Siniestro } from './siniestro.entity.js';
import { VehiculoMarca } from './vehiculo-marca.entity.js';
import { VehiculoModelo } from './vehiculo-modelo.entity.js';

@Entity('vehiculo')
export class Vehiculo {
  @PrimaryGeneratedColumn({ name: 'id_vehiculo' })
  idVehiculo: number;

  @ManyToOne(() => Cliente, (cliente) => cliente.vehiculos, { nullable: false })
  @JoinColumn({ name: 'id_cliente' })
  cliente: Relation<Cliente>;

  @ManyToOne(() => VehiculoMarca, { nullable: false })
  @JoinColumn({ name: 'id_marca' })
  marca: Relation<VehiculoMarca>;

  @ManyToOne(() => VehiculoModelo, (modelo) => modelo.vehiculos, { nullable: false })
  @JoinColumn({ name: 'id_modelo' })
  modelo: Relation<VehiculoModelo>;

  @Column({ name: 'placa', type: 'varchar', length: 20, unique: true })
  placa: string;

  @Column({ name: 'anio', type: 'int' })
  anio: number;

  @Column({ name: 'color', type: 'varchar', length: 50, nullable: true })
  color: string | null;

  @Column({ name: 'numero_chasis', type: 'varchar', length: 50, nullable: true, unique: true })
  numeroChasis: string | null;

  @Column({ name: 'numero_motor', type: 'varchar', length: 50, nullable: true, unique: true })
  numeroMotor: string | null;

  @Column({ name: 'tipo_vehiculo', type: 'enum', enum: TipoVehiculo })
  tipoVehiculo: TipoVehiculo;

  @OneToMany(() => Siniestro, (siniestro) => siniestro.vehiculo)
  siniestros: Relation<Siniestro[]>;
}
