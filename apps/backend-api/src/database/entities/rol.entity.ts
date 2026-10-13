import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import type { Relation } from 'typeorm';
import type { Rol as RolEnum } from '../../common/enums/rol.enum.js';
import { Usuario } from './usuario.entity.js';

@Entity('rol')
export class Rol {
  @PrimaryGeneratedColumn({ name: 'id_rol' })
  idRol: number;

  @Column({
    name: 'nombre_rol',
    type: 'varchar',
    length: 50,
    unique: true,
  })
  nombreRol: RolEnum;

  @Column({ name: 'descripcion', type: 'varchar', length: 200, nullable: true })
  descripcion: string | null;

  @Column({ name: 'estado', type: 'boolean', default: true })
  estado: boolean;

  @OneToMany(() => Usuario, (usuario) => usuario.rol)
  usuarios: Relation<Usuario[]>;
}
