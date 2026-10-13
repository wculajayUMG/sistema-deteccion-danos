import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import type { Relation } from 'typeorm';
import { DeteccionIa } from './deteccion-ia.entity.js';
import { Siniestro } from './siniestro.entity.js';

@Entity('fotografia')
export class Fotografia {
  @PrimaryGeneratedColumn({ name: 'id_fotografia' })
  idFotografia: number;

  @ManyToOne(() => Siniestro, (siniestro) => siniestro.fotografias, { nullable: false })
  @JoinColumn({ name: 'id_siniestro' })
  siniestro: Relation<Siniestro>;

  @Column({ name: 'url_cloudflare', type: 'varchar', length: 500 })
  urlCloudflare: string;

  @Column({ name: 'nombre_archivo', type: 'varchar', length: 200 })
  nombreArchivo: string;

  @Column({ name: 'tamanio_kb', type: 'int', nullable: true })
  tamanioKb: number | null;

  @CreateDateColumn({ name: 'fecha_carga' })
  fechaCarga: Date;

  @Column({ name: 'orden', type: 'int', default: 1 })
  orden: number;

  @OneToOne(() => DeteccionIa, (deteccion) => deteccion.fotografia)
  deteccion: Relation<DeteccionIa | null>;
}
