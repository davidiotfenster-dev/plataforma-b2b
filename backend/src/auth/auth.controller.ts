import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import type { Request, Response } from 'express';
import { AuthService } from './auth.service.js';
import { RegistroPartnerDto } from './dto/registro-partner.dto.js';
import { AprobarPartnerDto } from './dto/aprobar-partner.dto.js';
import { ActualizarIdiomaDto } from './dto/actualizar-idioma.dto.js';
import { OlvidePasswordDto } from './dto/olvide-password.dto.js';
import { ResetearPasswordDto } from './dto/resetear-password.dto.js';
import { ReenviarVerificacionDto } from './dto/reenviar-verificacion.dto.js';
import { LocalAuthGuard } from './guards/local-auth.guard.js';
import { JwtAuthGuard } from './guards/jwt-auth.guard.js';
import { JWT_COOKIE_NAME, cookieSameSite } from './strategies/jwt.strategy.js';
import { RolesGuard } from '../common/guards/roles.guard.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { RolUsuario } from '../generated/prisma/enums.js';
import type { UsuarioValidado } from './auth.service.js';
import { CurrentUser, type UsuarioAutenticado } from '../common/decorators/current-user.decorator.js';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('registro-partner')
  @UseGuards(ThrottlerGuard)
  @HttpCode(HttpStatus.CREATED)
  async registroPartner(@Body() dto: RegistroPartnerDto) {
    const { partnerId } = await this.authService.registrarPartner(dto);
    return {
      mensaje:
        'Registro recibido. Revise el correo corporativo indicado para verificar la cuenta.',
      partnerId,
    };
  }

  @Get('verificar-email')
  async verificarEmail(@Query('token') token: string) {
    await this.authService.verificarEmail(token);
    return { mensaje: 'Email verificado correctamente. Su alta queda pendiente de aprobación.' };
  }

  /// "No me llegó el correo". Responde igual exista o no la cuenta, como `olvide-password`.
  @Post('reenviar-verificacion')
  @UseGuards(ThrottlerGuard)
  @HttpCode(HttpStatus.OK)
  async reenviarVerificacion(@Body() dto: ReenviarVerificacionDto) {
    await this.authService.reenviarVerificacion(dto.email);
    return {
      mensaje: 'Si existe un registro pendiente de verificar con ese email, se ha enviado un nuevo enlace.',
    };
  }

  @Post('partners/:id/aprobar')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RolUsuario.ADMIN_FENSTER)
  @HttpCode(HttpStatus.OK)
  async aprobarPartner(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AprobarPartnerDto,
  ) {
    await this.authService.aprobarPartner(id, dto);
    return { mensaje: 'Partner aprobado y activado' };
  }

  @Post('partners/:id/rechazar')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RolUsuario.ADMIN_FENSTER)
  @HttpCode(HttpStatus.OK)
  async rechazarPartner(@Param('id', ParseUUIDPipe) id: string) {
    await this.authService.rechazarPartner(id);
    return { mensaje: 'Partner rechazado' };
  }

  @Post('login')
  @UseGuards(ThrottlerGuard, LocalAuthGuard)
  @HttpCode(HttpStatus.OK)
  async login(
    @Req() req: Request & { user: UsuarioValidado },
    @Res({ passthrough: true }) res: Response,
  ) {
    const token = await this.authService.emitirTokenSesion(req.user);

    res.cookie(JWT_COOKIE_NAME, token, {
      httpOnly: true,
      secure: true,
      sameSite: cookieSameSite(),
      maxAge: 8 * 60 * 60 * 1000,
    });

    return { mensaje: 'Sesión iniciada' };
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  async me(@CurrentUser() usuario: UsuarioAutenticado) {
    return this.authService.obtenerPerfil(usuario.userId);
  }

  /// Preferencia de idioma del usuario autenticado (interfaz + emails
  /// transaccionales). El frontend la llama al cambiar de idioma desde el
  /// selector mientras hay sesión iniciada.
  @Post('idioma')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async actualizarIdioma(
    @CurrentUser() usuario: UsuarioAutenticado,
    @Body() dto: ActualizarIdiomaDto,
  ) {
    await this.authService.actualizarIdioma(usuario.userId, dto.idioma);
    return { mensaje: 'Idioma actualizado' };
  }

  /// Respuesta idéntica exista o no la cuenta con ese email (evita filtrar
  /// qué emails están registrados en la plataforma).
  @Post('olvide-password')
  @UseGuards(ThrottlerGuard)
  @HttpCode(HttpStatus.OK)
  async olvidePassword(@Body() dto: OlvidePasswordDto) {
    await this.authService.olvidePassword(dto.email);
    return {
      mensaje:
        'Si existe una cuenta con ese email, se ha enviado un enlace para restablecer la contraseña.',
    };
  }

  @Post('resetear-password')
  @UseGuards(ThrottlerGuard)
  @HttpCode(HttpStatus.OK)
  async resetearPassword(@Body() dto: ResetearPasswordDto) {
    await this.authService.resetearPassword(dto.token, dto.passwordNueva);
    return { mensaje: 'Contraseña actualizada correctamente. Ya puede iniciar sesión.' };
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    await this.authService.cerrarSesion(req.cookies?.[JWT_COOKIE_NAME]);
    /// Mismos atributos que al crearla: con `SameSite=None` (demo por túnel) el
    /// navegador puede ignorar un borrado que no los repita.
    res.clearCookie(JWT_COOKIE_NAME, { httpOnly: true, secure: true, sameSite: cookieSameSite() });
    return { mensaje: 'Sesión cerrada' };
  }
}
