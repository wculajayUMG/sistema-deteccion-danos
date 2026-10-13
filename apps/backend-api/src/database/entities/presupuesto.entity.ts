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
import { EstadoPresupuesto } from '../../common/enums/estado-presupuesto.enum.js';
import { AuditTrail } from './audit-trail.entity.js';
import { LineaPresupuesto } from './linea-presupuesto.entity.js';
import { Siniestro } from './siniestro.entity.js';
import { Usuario } from './usuario.entity.js';
import { decimalNumberTransformer } from './decimal-number.transformer.js';

@Entity('presupuesto')
export class Presupuesto {
  @PrimaryGeneratedColumn({ name: 'id_presupuesto' })
  idPresupuesto: number;

  @OneToOne(() => Siniestro, (siniestro) => siniestro.presupuesto, { nullable: false })
  @JoinColumn({ name: 'id_siniestro' })
  siniestro: Relation<Siniestro>;

  @ManyToOne(() => Usuario, { nullable: false })
  @JoinColumn({ name: 'id_usuario' })
  usuario: Relation<Usuario>;

  @Column({
    name: 'total_gtq',
    type: 'decimal',
    precision: 10,
    scale: 2,
    default: 0,
    transformer: decimalNumberTransformer,
  })
  totalGtq: number;

  @Column({
    name: 'estado',
    type: 'enum',
    enum: EstadoPresupuesto,
    default: EstadoPresupuesto.PRELIMINAR,
  })
  estado: EstadoPresupuesto;

  @CreateDateColumn({ name: 'fecha_generacion' })
  fechaGeneracion: Date;

  @Column({ name: 'fecha_aprobacion', type: 'timestamp', nullable: true })
  fechaAprobacion: Date | null;

  @Column({ name: 'observaciones', type: 'text', nullable: true })
  observaciones: string | null;

  @OneToMany(() => LineaPresupuesto, (linea) => linea.presupuesto)
  lineas: Relation<LineaPresupuesto[]>;

  @OneToMany(() => AuditTrail, (auditTrail) => auditTrail.presupuesto)
  auditTrails: Relation<AuditTrail[]>;
}
