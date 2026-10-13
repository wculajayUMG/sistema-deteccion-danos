import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity('catalogo_pieza')
export class CatalogoPieza {
  @PrimaryGeneratedColumn({ name: 'id_pieza_catalogo' })
  idPiezaCatalogo: number;

  @Column({ name: 'nombre_pieza', type: 'varchar', length: 150 })
  nombrePieza: string;

  @Column({ name: 'categoria', type: 'varchar', length: 100, nullable: true })
  categoria: string | null;

  @Index({ unique: true, where: 'clase_yolo IS NOT NULL' })
  @Column({ name: 'clase_yolo', type: 'varchar', length: 100, nullable: true, default: null })
  claseYolo: string | null;

  @Column({ name: 'estado', type: 'boolean', default: true })
  estado: boolean;
}
