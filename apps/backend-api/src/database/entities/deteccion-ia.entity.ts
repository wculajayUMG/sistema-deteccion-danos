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
import { EstadoDeteccion } from '../../common/enums/estado-deteccion.enum.js';
import { decimalNumberTransformer } from './decimal-number.transformer.js';
import { Fotografia } from './fotografia.entity.js';
import { PiezaDanada } from './pieza-danada.entity.js';
import { Usuario } from './usuario.entity.js';

@Entity('deteccion_ia')
export class DeteccionIa {
  @PrimaryGeneratedColumn({ name: 'id_deteccion' })
  idDeteccion: number;

  @OneToOne(() => Fotografia, (fotografia) => fotografia.deteccion, { nullable: false })
  @JoinColumn({ name: 'id_fotografia' })
  fotografia: Relation<Fotografia>;

  @ManyToOne(() => Usuario, { nullable: false })
  @JoinColumn({ name: 'id_usuario' })
  usuario: Relation<Usuario>;

  @Column({ name: 'modelo_version', type: 'varchar', length: 50 })
  modeloVersion: string;

  @Column({ name: 'tiempo_inferencia_ms', type: 'int', nullable: true })
  tiempoInferenciaMs: number | null;

  @Column({
    name: 'confianza_promedio',
    type: 'decimal',
    precision: 5,
    scale: 2,
    nullable: true,
    transformer: decimalNumberTransformer,
  })
  confianzaPromedio: number | null;

  @CreateDateColumn({ name: 'fecha_deteccion' })
  fechaDeteccion: Date;

  @Column({
    name: 'estado',
    type: 'enum',
    enum: EstadoDeteccion,
    default: EstadoDeteccion.PENDIENTE,
  })
  estado: EstadoDeteccion;

  @OneToMany(() => PiezaDanada, (pieza) => pieza.deteccion)
  piezasDanadas: Relation<PiezaDanada[]>;
}
