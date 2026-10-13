import type { Rol } from '../common/enums/rol.enum.js';

export interface AuthenticatedUser {
  idUsuario: number;
  nombre: string;
  apellido: string;
  correo: string;
  rol: Rol;
}

export interface JwtPayload {
  sub: number;
  nombre: string;
  apellido: string;
  correo: string;
  rol: Rol;
  iat?: number;
  exp?: number;
}
