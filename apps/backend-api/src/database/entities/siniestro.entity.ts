import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  OneToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import type { Relation } from 'typeorm';
import { EstadoSiniestro } from '../../common/enums/estado-siniestro.enum.js';
import { Usuario } from './usuario.entity.js';
import { Cliente } from './cliente.entity.js';
import { Fotografia } from './fotografia.entity.js';
import { Presupuesto } from './presupuesto.entity.js';
import { Vehiculo } from './vehiculo.entity.js';

@Entity('siniestro')
export class Siniestro {
  @PrimaryGeneratedColumn({ name: 'id_siniestro' })
  idSiniestro: number;

  @ManyToOne(() => Cliente, (cliente) => cliente.siniestros, { nullable: false })
  @JoinColumn({ name: 'id_cliente' })
  cliente: Relation<Cliente>;

  @ManyToOne(() => Vehiculo, (vehiculo) => vehiculo.siniestros, { nullable: false })
  @JoinColumn({ name: 'id_vehiculo' })
  vehiculo: Relation<Vehiculo>;

  @ManyToOne(() => Usuario, { nullable: false })
  @JoinColumn({ name: 'id_usuario' })
  usuario: Relation<Usuario>;

  @Column({ name: 'numero_reclamo', type: 'varchar', length: 30, unique: true })
  numeroReclamo: string;

  @Column({ name: 'numero_poliza', type: 'varchar', length: 30 })
  numeroPoliza: string;

  @Column({ name: 'fecha_siniestro', type: 'date' })
  fechaSiniestro: Date;

  @CreateDateColumn({ name: 'fecha_registro' })
  fechaRegistro: Date;

  @Column({ name: 'lugar_siniestro', type: 'varchar', length: 255, nullable: true })
  lugarSiniestro: string | null;

  @Column({ name: 'descripcion', type: 'text', nullable: true })
  descripcion: string | null;

  @Column({
    name: 'estado',
    type: 'enum',
    enum: EstadoSiniestro,
    default: EstadoSiniestro.ABIERTO,
  })
  estado: EstadoSiniestro;

  @OneToMany(() => Fotografia, (fotografia) => fotografia.siniestro)
  fotografias: Relation<Fotografia[]>;

  @OneToOne(() => Presupuesto, (presupuesto) => presupuesto.siniestro)
  presupuesto: Relation<Presupuesto | null>;
}
