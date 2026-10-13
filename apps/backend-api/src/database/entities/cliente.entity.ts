import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import type { Relation } from 'typeorm';
import { TipoCliente } from '../../common/enums/tipo-cliente.enum.js';
import { Siniestro } from './siniestro.entity.js';
import { Vehiculo } from './vehiculo.entity.js';

@Entity('cliente')
export class Cliente {
  @PrimaryGeneratedColumn({ name: 'id_cliente' })
  idCliente: number;

  @Column({ name: 'tipo_cliente', type: 'enum', enum: TipoCliente })
  tipoCliente: TipoCliente;

  @Column({ name: 'nombre', type: 'varchar', length: 100 })
  nombre: string;

  @Column({ name: 'apellido', type: 'varchar', length: 100 })
  apellido: string;

  @Column({ name: 'dpi', type: 'varchar', length: 20, nullable: true, unique: true })
  dpi: string | null;

  @Column({ name: 'telefono', type: 'varchar', length: 20, nullable: true })
  telefono: string | null;

  @Column({ name: 'correo', type: 'varchar', length: 150, nullable: true })
  correo: string | null;

  @Column({ name: 'direccion', type: 'varchar', length: 255, nullable: true })
  direccion: string | null;

  @CreateDateColumn({ name: 'fecha_registro' })
  fechaRegistro: Date;

  @OneToMany(() => Vehiculo, (vehiculo) => vehiculo.cliente)
  vehiculos: Relation<Vehiculo[]>;

  @OneToMany(() => Siniestro, (siniestro) => siniestro.cliente)
  siniestros: Relation<Siniestro[]>;
}
