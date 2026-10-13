import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { InjectRepository } from '@nestjs/typeorm';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Repository } from 'typeorm';
import { getRsaKey } from '../../config/jwt-keys.js';
import { Usuario } from '../../database/entities/usuario.entity.js';
import type { AuthenticatedUser, JwtPayload } from '../auth.types.js';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    config: ConfigService,
    @InjectRepository(Usuario)
    private readonly usuariosRepo: Repository<Usuario>,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: getRsaKey(config, 'JWT_PUBLIC_KEY'),
      algorithms: ['RS256'],
    });
  }

  async validate(payload: JwtPayload): Promise<AuthenticatedUser> {
    if (!Number.isInteger(payload.sub) || payload.sub < 1) {
      throw new UnauthorizedException();
    }
    const usuario = await this.usuariosRepo.findOne({
      where: { idUsuario: payload.sub, estado: true },
      relations: { rol: true },
    });
    if (!usuario || !usuario.rol.estado) {
      throw new UnauthorizedException();
    }
    return {
      idUsuario: usuario.idUsuario,
      nombre: usuario.nombre,
      apellido: usuario.apellido,
      correo: usuario.correo,
      rol: usuario.rol.nombreRol,
    };
  }
}
