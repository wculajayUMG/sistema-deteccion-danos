import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import type { Relation } from 'typeorm';
import { Presupuesto } from './presupuesto.entity.js';
import { Usuario } from './usuario.entity.js';

@Entity('audit_trail')
export class AuditTrail {
  @PrimaryGeneratedColumn({ name: 'id_audit' })
  idAudit: number;

  @ManyToOne(() => Usuario, { nullable: false })
  @JoinColumn({ name: 'id_usuario' })
  usuario: Relation<Usuario>;

  @ManyToOne(() => Presupuesto, (presupuesto) => presupuesto.auditTrails, { nullable: true })
  @JoinColumn({ name: 'id_presupuesto' })
  presupuesto: Relation<Presupuesto | null>;

  @Column({ name: 'tabla_afectada', type: 'varchar', length: 100 })
  tablaAfectada: string;

  @Column({ name: 'campo_modificado', type: 'varchar', length: 100 })
  campoModificado: string;

  @Column({ name: 'valor_anterior', type: 'text', nullable: true })
  valorAnterior: string | null;

  @Column({ name: 'valor_nuevo', type: 'text', nullable: true })
  valorNuevo: string | null;

  @CreateDateColumn({ name: 'fecha_modificacion' })
  fechaModificacion: Date;

  @Column({ name: 'ip_origen', type: 'varchar', length: 45, nullable: true })
  ipOrigen: string | null;
}
