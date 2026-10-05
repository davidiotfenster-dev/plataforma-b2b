import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-local';
import { AuthService, type UsuarioValidado } from '../auth.service.js';

@Injectable()
export class LocalStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly authService: AuthService) {
    super({ usernameField: 'email', passwordField: 'password' });
  }

  async validate(email: unknown, password: unknown): Promise<UsuarioValidado> {
    /// Un cuerpo JSON puede traer números u objetos: sin este filtro bcrypt
    /// lanza una excepción y el cliente recibe un 500 en vez de un 401.
    if (typeof email !== 'string' || typeof password !== 'string') {
      throw new UnauthorizedException({ message: 'Credenciales inválidas', codigo: 'CREDENCIALES_INVALIDAS' });
    }
    return this.authService.validarCredenciales(email, password);
  }
}
