import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { Repository } from 'typeorm';
import { Rol as RolEnum } from '../common/enums/rol.enum.js';
import { Rol } from '../database/entities/rol.entity.js';
import { Usuario } from '../database/entities/usuario.entity.js';
import { CreateUsuarioDto } from './dto/create-usuario.dto.js';
import { UpdateUsuarioDto } from './dto/update-usuario.dto.js';

type SafeUsuario = Omit<Usuario, 'passwordHash'>;

function hidePassword(usuario: Usuario): SafeUsuario {
  const { passwordHash: _passwordHash, ...safeUsuario } = usuario;
  return safeUsuario;
}

@Injectable()
export class UsuariosAdminService {
  constructor(
    @InjectRepository(Usuario)
    private readonly usuarios: Repository<Usuario>,
    @InjectRepository(Rol)
    private readonly roles: Repository<Rol>,
  ) {}

  async findAll(filtros: {
    rol?: string;
    estado?: boolean;
  }): Promise<SafeUsuario[]> {
    const query = this.usuarios
      .createQueryBuilder('usuario')
      .leftJoinAndSelect('usuario.rol', 'rol')
      .orderBy('usuario.fechaCreacion', 'DESC');
    if (filtros.rol) query.andWhere('rol.nombreRol = :rol', { rol: filtros.rol });
    if (filtros.estado !== undefined) {
      query.andWhere('usuario.estado = :estado', { estado: filtros.estado });
    }
    return (await query.getMany()).map(hidePassword);
  }

  async create(dto: CreateUsuarioDto): Promise<SafeUsuario> {
    if (await this.usuarios.existsBy({ correo: dto.correo.toLowerCase() })) {
      throw new ConflictException('Ya existe un usuario con ese correo');
    }
    const rol = await this.roles.findOneBy({ nombreRol: dto.nombreRol });
    if (!rol || !rol.estado) {
      throw new NotFoundException(`Rol ${dto.nombreRol} no encontrado o inactivo`);
    }
    const saved = await this.usuarios.save(
      this.usuarios.create({
        nombre: dto.nombre,
        apellido: dto.apellido,
        correo: dto.correo.toLowerCase(),
        passwordHash: await bcrypt.hash(dto.password, 12),
        rol,
        telefono: dto.telefono ?? null,
        estado: true,
        ultimoAcceso: null,
      }),
    );
    return hidePassword(saved);
  }

  async update(
    id: number,
    dto: UpdateUsuarioDto,
    actorId: number,
  ): Promise<SafeUsuario> {
    const usuario = await this.usuarios.findOne({
      where: { idUsuario: id },
      relations: { rol: true },
    });
    if (!usuario) throw new NotFoundException(`Usuario ${id} no encontrado`);
    if (dto.nombreRol !== undefined) {
      if (id === actorId && dto.nombreRol !== RolEnum.ADMINISTRADOR_TI) {
        throw new ForbiddenException('No puedes cambiar tu propio rol de administrador');
      }
      const rol = await this.roles.findOneBy({ nombreRol: dto.nombreRol });
      if (!rol || !rol.estado) {
        throw new NotFoundException(`Rol ${dto.nombreRol} no encontrado o inactivo`);
      }
      usuario.rol = rol;
    }
    if (dto.nombre !== undefined) usuario.nombre = dto.nombre;
    if (dto.apellido !== undefined) usuario.apellido = dto.apellido;
    if (dto.telefono !== undefined) usuario.telefono = dto.telefono;
    if (dto.estado !== undefined) usuario.estado = dto.estado;
    if (dto.correo !== undefined) {
      const correo = dto.correo.toLowerCase();
      const duplicate = await this.usuarios.findOneBy({ correo });
      if (duplicate && duplicate.idUsuario !== id) {
        throw new ConflictException('Ya existe un usuario con ese correo');
      }
      usuario.correo = correo;
    }
    return hidePassword(await this.usuarios.save(usuario));
  }

  async resetPassword(id: number, nuevaPassword: string): Promise<void> {
    await this.findById(id);
    await this.usuarios.update(id, {
      passwordHash: await bcrypt.hash(nuevaPassword, 12),
    });
  }

  async bloquear(id: number, motivo: string): Promise<SafeUsuario> {
    if (!motivo.trim()) throw new ConflictException('El motivo es obligatorio');
    const usuario = await this.findById(id);
    usuario.estado = false;
    return hidePassword(await this.usuarios.save(usuario));
  }

  async desactivar(id: number): Promise<SafeUsuario> {
    const usuario = await this.findById(id);
    usuario.estado = false;
    return hidePassword(await this.usuarios.save(usuario));
  }

  private async findById(id: number): Promise<Usuario> {
    const usuario = await this.usuarios.findOneBy({ idUsuario: id });
    if (!usuario) throw new NotFoundException(`Usuario ${id} no encontrado`);
    return usuario;
  }
}
