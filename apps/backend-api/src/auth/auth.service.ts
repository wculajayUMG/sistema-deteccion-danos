import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { Repository } from 'typeorm';
import { LoginDto } from './dto/login.dto.js';
import { LoginResponseDto } from './dto/login-response.dto.js';
import { Usuario } from '../database/entities/usuario.entity.js';
import type { AuthenticatedUser, JwtPayload } from './auth.types.js';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(Usuario)
    private readonly usuariosRepo: Repository<Usuario>,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
  ) {}

  async login(dto: LoginDto): Promise<LoginResponseDto> {
    const usuario = await this.usuariosRepo
      .createQueryBuilder('usuario')
      .addSelect('usuario.passwordHash')
      .leftJoinAndSelect('usuario.rol', 'rol')
      .where('LOWER(usuario.correo) = LOWER(:correo)', {
        correo: dto.correo.trim(),
      })
      .andWhere('usuario.estado = :estado', { estado: true })
      .getOne();

    const passwordValido =
      usuario !== null &&
      usuario.rol.estado &&
      (await bcrypt.compare(dto.password, usuario.passwordHash));
    if (!usuario || !passwordValido) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    await this.usuariosRepo.update(usuario.idUsuario, {
      ultimoAcceso: new Date(),
    });

    const authenticatedUser: AuthenticatedUser = {
      idUsuario: usuario.idUsuario,
      nombre: usuario.nombre,
      apellido: usuario.apellido,
      correo: usuario.correo,
      rol: usuario.rol.nombreRol,
    };
    const payload: JwtPayload = {
      sub: authenticatedUser.idUsuario,
      nombre: authenticatedUser.nombre,
      apellido: authenticatedUser.apellido,
      correo: authenticatedUser.correo,
      rol: authenticatedUser.rol,
    };
    const accessToken = await this.jwtService.signAsync(payload);
    return new LoginResponseDto(accessToken, authenticatedUser);
  }
}
