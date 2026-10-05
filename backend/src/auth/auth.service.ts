import {
  BadRequestException,
  ConflictException,
  GoneException,
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service.js';
import { CatalogoMarcaService } from '../catalogo-marca/catalogo-marca.service.js';
import { EmailService } from '../common/email/email.service.js';
import {
  asuntoCuentaAprobada,
  asuntoCuentaRechazada,
  asuntoNuevaSolicitud,
  asuntoResetPassword,
  asuntoVerificacionEmail,
  cuerpoCuentaAprobada,
  cuerpoCuentaRechazada,
  cuerpoNuevaSolicitud,
  cuerpoResetPassword,
  cuerpoVerificacionEmail,
} from '../common/email/plantillas-email.js';
import { EstadoPartner, Idioma, RolUsuario } from '../generated/prisma/enums.js';
import { Prisma } from '../generated/prisma/client.js';
import type { RegistroPartnerDto } from './dto/registro-partner.dto.js';
import type { AprobarPartnerDto } from './dto/aprobar-partner.dto.js';
import type { JwtPayload } from './strategies/jwt.strategy.js';
import type { UsuarioAutenticado } from '../common/decorators/current-user.decorator.js';

const SALT_ROUNDS = 12;
const PRISMA_UNIQUE_CONSTRAINT = 'P2002';

export interface UsuarioValidado {
  id: string;
  partnerId: string | null;
  rol: RolUsuario;
}

function dominioDeEmail(email: string): string {
  return email.slice(email.lastIndexOf('@') + 1).toLowerCase();
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly emailService: EmailService,
    private readonly catalogoMarca: CatalogoMarcaService,
  ) {}

  async registrarPartner(dto: RegistroPartnerDto): Promise<{ partnerId: string; userId: string }> {
    if (dominioDeEmail(dto.emailAdmin) !== dto.dominioWeb.toLowerCase()) {
      throw new BadRequestException(
        'El email del administrador debe pertenecer al dominio corporativo indicado (dominioWeb)',
      );
    }

    const passwordHash = await bcrypt.hash(dto.passwordAdmin, SALT_ROUNDS);

    let partnerId: string;
    let userId: string;
    let tokenVerificacion: string;

    try {
      const resultado = await this.prisma.$transaction(async (tx) => {
        const partner = await tx.partner.create({
          data: {
            razonSocial: dto.razonSocial,
            cif: dto.cif,
            direccionFiscal: dto.direccionFiscal,
            pais: dto.pais,
            dominioWeb: dto.dominioWeb,
            estado: EstadoPartner.PENDIENTE_VERIFICACION_EMAIL,
          },
        });

        const user = await tx.user.create({
          data: {
            email: dto.emailAdmin,
            passwordHash,
            nombre: dto.nombreAdmin,
            rol: RolUsuario.PARTNER_ADMIN,
            idioma: dto.idioma,
            partnerId: partner.id,
            /// Inactivo hasta que el Administrador IoT FENSTER apruebe el partner.
            activo: false,
            condicionesAceptadasEn: new Date(),
          },
        });

        const { token, expira } = await this.firmarTokenVerificacion(user.id);

        await tx.user.update({
          where: { id: user.id },
          data: { tokenVerificacion: token, tokenVerificacionExpira: expira },
        });

        return { partnerId: partner.id, userId: user.id, token };
      });

      partnerId = resultado.partnerId;
      userId = resultado.userId;
      tokenVerificacion = resultado.token;
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === PRISMA_UNIQUE_CONSTRAINT
      ) {
        throw new ConflictException(
          'Ya existe un partner o usuario registrado con esos datos (CIF o email)',
        );
      }
      throw error;
    }

    /// El token solo viaja por el correo: nunca se devuelve en la respuesta HTTP.
    /// Sin RESEND_API_KEY el enlace queda en el log de desarrollo (ver EmailService).
    await this.enviarVerificacion({ email: dto.emailAdmin, idioma: dto.idioma ?? Idioma.ES }, tokenVerificacion);

    return { partnerId, userId };
  }

  private async firmarTokenVerificacion(userId: string): Promise<{ token: string; expira: Date }> {
    const token = await this.jwtService.signAsync(
      { sub: userId, tipo: 'verificacion-email' },
      {
        expiresIn: this.configService.get<string>(
          'emailVerificationTokenExpiresIn',
        ) as `${number}${'s' | 'm' | 'h' | 'd'}`,
      },
    );
    const { exp } = this.jwtService.decode<{ exp: number }>(token);
    return { token, expira: new Date(exp * 1000) };
  }

  private async enviarVerificacion(destino: { email: string; idioma: Idioma }, token: string): Promise<void> {
    const enlace = `${this.configService.get<string>('frontendUrl')}/verificar-email?token=${token}`;
    await this.emailService.enviar(
      destino.email,
      asuntoVerificacionEmail(destino.idioma),
      cuerpoVerificacionEmail(destino.idioma, enlace),
    );
  }

  /// "No me llegó el correo": emite un token nuevo (el anterior deja de valer) y lo
  /// reenvía. No hace nada, y no lo dice, si el email no existe, ya está verificado o
  /// la empresa ya pasó esa fase: así no se averigua qué correos están registrados.
  async reenviarVerificacion(email: string): Promise<void> {
    const usuario = await this.prisma.user.findUnique({ where: { email }, include: { partner: true } });
    if (
      !usuario ||
      usuario.emailVerificadoEn ||
      usuario.partner?.estado !== EstadoPartner.PENDIENTE_VERIFICACION_EMAIL
    ) {
      return;
    }

    const { token, expira } = await this.firmarTokenVerificacion(usuario.id);
    await this.prisma.user.update({
      where: { id: usuario.id },
      data: { tokenVerificacion: token, tokenVerificacionExpira: expira },
    });
    await this.enviarVerificacion(usuario, token);
  }

  /// Avisa por correo a los administradores de que hay una solicitud esperando. Es un
  /// aviso: si falla, no debe estropear la verificación que el usuario acaba de hacer.
  private async avisarNuevaSolicitud(partner: { id: string; razonSocial: string; pais: string }): Promise<void> {
    try {
      const admins = await this.prisma.user.findMany({
        where: { rol: RolUsuario.ADMIN_FENSTER, activo: true },
        select: { email: true },
      });
      const enlace = `${this.configService.get<string>('frontendUrl')}/admin/partners/${partner.id}`;
      await Promise.all(
        admins.map((admin) =>
          this.emailService.enviar(
            admin.email,
            asuntoNuevaSolicitud(partner.razonSocial),
            cuerpoNuevaSolicitud(partner.razonSocial, partner.pais, enlace),
          ),
        ),
      );
    } catch (error) {
      this.logger.error(`No se pudo avisar de la nueva solicitud ${partner.id}: ${(error as Error).message}`);
    }
  }

  /// Avisa a los usuarios (con correo verificado) de la empresa de que su alta se ha
  /// aprobado o rechazado. Igual que el aviso interno, nunca rompe la acción del admin.
  private async avisarResolucionAlta(partnerId: string, aprobada: boolean): Promise<void> {
    try {
      const usuarios = await this.prisma.user.findMany({
        where: { partnerId, emailVerificadoEn: { not: null } },
        select: { email: true, idioma: true },
      });
      const enlaceLogin = `${this.configService.get<string>('frontendUrl')}/login`;
      await Promise.all(
        usuarios.map((u) =>
          this.emailService.enviar(
            u.email,
            aprobada ? asuntoCuentaAprobada(u.idioma) : asuntoCuentaRechazada(u.idioma),
            aprobada ? cuerpoCuentaAprobada(u.idioma, enlaceLogin) : cuerpoCuentaRechazada(u.idioma),
          ),
        ),
      );
    } catch (error) {
      this.logger.error(`No se pudo avisar de la resolución del alta ${partnerId}: ${(error as Error).message}`);
    }
  }

  async verificarEmail(token: string): Promise<{ partnerId: string }> {
    let payload: { sub: string };
    try {
      payload = await this.jwtService.verifyAsync(token, {
        secret: this.configService.get<string>('jwtSecret'),
      });
    } catch {
      throw new GoneException('Token de verificación inválido o expirado');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      include: { partner: true },
    });

    if (!user || user.tokenVerificacion !== token) {
      throw new BadRequestException('Token de verificación inválido');
    }

    if (!user.tokenVerificacionExpira || user.tokenVerificacionExpira < new Date()) {
      throw new GoneException('Token de verificación expirado');
    }

    if (!user.partnerId || !user.partner) {
      throw new BadRequestException('Token de verificación inválido');
    }

    try {
      await this.prisma.$transaction([
        this.prisma.user.update({
          where: { id: user.id },
          data: {
            emailVerificadoEn: new Date(),
            tokenVerificacion: null,
            tokenVerificacionExpira: null,
          },
        }),
        this.prisma.partner.update({
          where: {
            id: user.partnerId,
            estado: EstadoPartner.PENDIENTE_VERIFICACION_EMAIL,
          },
          data: { estado: EstadoPartner.PENDIENTE_APROBACION },
        }),
      ]);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
        throw new ConflictException('El partner ya no está pendiente de verificación de email');
      }
      throw error;
    }

    await this.avisarNuevaSolicitud(user.partner);

    return { partnerId: user.partnerId };
  }

  async aprobarPartner(partnerId: string, dto: AprobarPartnerDto): Promise<void> {
    const partner = await this.prisma.partner.findUnique({ where: { id: partnerId } });
    if (!partner) {
      throw new BadRequestException('Partner no encontrado');
    }
    if (partner.estado !== EstadoPartner.PENDIENTE_APROBACION) {
      throw new ConflictException(
        `El partner no está pendiente de aprobación (estado actual: ${partner.estado})`,
      );
    }

    await this.prisma.$transaction([
      this.prisma.partner.update({
        where: { id: partnerId },
        data: {
          marcaComercial: dto.marcaComercial,
          tarifa: dto.tarifa,
          descuentoPorcentaje: dto.descuentoPorcentaje,
          estado: EstadoPartner.ACTIVO,
        },
      }),
      this.prisma.user.updateMany({
        where: { partnerId },
        data: { activo: true },
      }),
    ]);
    // Al entrar ya ve el catálogo de su marca (MySmartWindow por defecto).
    await this.catalogoMarca.sincronizarEmpresa(partnerId);
    await this.avisarResolucionAlta(partnerId, true);
  }

  async rechazarPartner(partnerId: string): Promise<void> {
    const partner = await this.prisma.partner.findUnique({ where: { id: partnerId } });
    if (!partner) {
      throw new BadRequestException('Partner no encontrado');
    }
    if (partner.estado === EstadoPartner.ACTIVO) {
      throw new ConflictException('No se puede rechazar un partner ya activo');
    }

    await this.prisma.partner.update({
      where: { id: partnerId },
      data: { estado: EstadoPartner.RECHAZADO },
    });
    await this.avisarResolucionAlta(partnerId, false);
  }

  async validarCredenciales(email: string, password: string): Promise<UsuarioValidado> {
    const user = await this.prisma.user.findUnique({
      where: { email },
      include: { partner: true },
    });

    const credencialesInvalidas = () =>
      new UnauthorizedException('Credenciales inválidas');

    if (!user) {
      /// Se ejecuta un hash igualmente para no filtrar por timing si el
      /// email existe o no.
      await bcrypt.hash(password, SALT_ROUNDS);
      throw credencialesInvalidas();
    }

    const passwordValida = await bcrypt.compare(password, user.passwordHash);
    if (!passwordValida) {
      throw credencialesInvalidas();
    }

    if (!user.activo) {
      throw credencialesInvalidas();
    }

    /// Rol COMERCIAL apagado por ahora (`COMERCIAL_ACTIVO`): se avisa con un mensaje
    /// claro, y solo tras acertar la contraseña, para no revelar qué emails son de comerciales.
    if (user.rol === RolUsuario.COMERCIAL && !this.configService.get<boolean>('comercialActivo')) {
      throw new UnauthorizedException('El acceso de comerciales está desactivado por ahora');
    }

    /// ADMIN_FENSTER y COMERCIAL son personal interno de IoT FENSTER, sin
    /// partner asociado: solo los roles PARTNER_* exigen partner ACTIVO y
    /// email verificado.
    const esPersonalInterno = user.rol === RolUsuario.ADMIN_FENSTER || user.rol === RolUsuario.COMERCIAL;
    if (!esPersonalInterno) {
      if (!user.emailVerificadoEn || !user.partner || user.partner.estado !== EstadoPartner.ACTIVO || user.partner.archivadoEn) {
        throw credencialesInvalidas();
      }
    }

    return { id: user.id, partnerId: user.partnerId, rol: user.rol };
  }

  async obtenerPerfil(userId: string) {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        nombre: true,
        rol: true,
        idioma: true,
        partnerId: true,
        partner: { select: { razonSocial: true, marcaComercial: true, estado: true } },
      },
    });
    return user;
  }

  async actualizarIdioma(userId: string, idioma: Idioma): Promise<void> {
    await this.prisma.user.update({ where: { id: userId }, data: { idioma } });
  }

  async emitirTokenSesion(usuario: UsuarioValidado): Promise<string> {
    const payload: JwtPayload = {
      sub: usuario.id,
      partnerId: usuario.partnerId,
      rol: usuario.rol,
    };
    return this.jwtService.signAsync(payload);
  }

  /// Genera un token de un solo uso, lo persiste en el usuario y envía el
  /// email de reseteo. Compartido entre la solicitud propia del usuario
  /// (`olvidePassword`) y el disparo manual desde el panel admin
  /// (`dispararResetPassword`): en ambos casos el flujo posterior de canje
  /// del token es idéntico.
  private async generarYEnviarTokenReset(usuario: {
    id: string;
    email: string;
    idioma: Idioma;
  }): Promise<void> {
    const token = await this.jwtService.signAsync(
      { sub: usuario.id, tipo: 'reset-password' },
      {
        expiresIn: this.configService.get<string>(
          'passwordResetTokenExpiresIn',
        ) as `${number}${'s' | 'm' | 'h' | 'd'}`,
      },
    );
    const { exp } = this.jwtService.decode<{ exp: number }>(token);

    await this.prisma.user.update({
      where: { id: usuario.id },
      data: {
        tokenResetPassword: token,
        tokenResetPasswordExpira: new Date(exp * 1000),
      },
    });

    const enlace = `${this.configService.get<string>('frontendUrl')}/resetear-password?token=${token}`;
    await this.emailService.enviar(
      usuario.email,
      asuntoResetPassword(usuario.idioma),
      cuerpoResetPassword(usuario.idioma, enlace),
    );
  }

  /// Solicitud propia de "olvidé mi contraseña". Responde siempre con éxito
  /// en el controller exista o no la cuenta (evita filtrar qué emails están
  /// registrados); aquí simplemente no se hace nada si no hay usuario o está
  /// inactivo.
  async olvidePassword(email: string): Promise<void> {
    const usuario = await this.prisma.user.findUnique({ where: { email } });
    if (!usuario || !usuario.activo) {
      return;
    }
    await this.generarYEnviarTokenReset(usuario);
  }

  async resetearPassword(token: string, passwordNueva: string): Promise<void> {
    let payload: { sub: string };
    try {
      payload = await this.jwtService.verifyAsync(token, {
        secret: this.configService.get<string>('jwtSecret'),
      });
    } catch {
      throw new GoneException('Token de restablecimiento inválido o expirado');
    }

    const usuario = await this.prisma.user.findUnique({ where: { id: payload.sub } });
    if (!usuario || usuario.tokenResetPassword !== token) {
      throw new BadRequestException('Token de restablecimiento inválido');
    }
    if (!usuario.tokenResetPasswordExpira || usuario.tokenResetPasswordExpira < new Date()) {
      throw new GoneException('Token de restablecimiento expirado');
    }

    const passwordHash = await bcrypt.hash(passwordNueva, SALT_ROUNDS);
    await this.prisma.user.update({
      where: { id: usuario.id },
      data: {
        passwordHash,
        tokenResetPassword: null,
        tokenResetPasswordExpira: null,
        /// Un reseteo de contraseña invalida cualquier sesión ya emitida.
        sesionInvalidadaEn: new Date(),
      },
    });
  }

  /// Disparado por un ADMIN_FENSTER para un usuario concreto (soporte), sin
  /// que el usuario lo haya pedido. Mismo token/plantilla que `olvidePassword`.
  async dispararResetPassword(userId: string): Promise<void> {
    const usuario = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!usuario) {
      throw new NotFoundException('Usuario no encontrado');
    }
    await this.generarYEnviarTokenReset(usuario);
  }

  /// Invalida cualquier JWT de sesión emitido antes de este momento para el
  /// usuario (comparado contra el `iat` del token en `JwtStrategy`).
  async forzarLogout(userId: string): Promise<void> {
    const usuario = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!usuario) {
      throw new NotFoundException('Usuario no encontrado');
    }
    await this.prisma.user.update({ where: { id: userId }, data: { sesionInvalidadaEn: new Date() } });
  }
}
