import type { AuthenticatedUser } from '../auth.types.js';

export class LoginResponseDto {
  accessToken: string;
  usuario: AuthenticatedUser;

  constructor(accessToken: string, usuario: AuthenticatedUser) {
    this.accessToken = accessToken;
    this.usuario = usuario;
  }
}
