import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { randomBytes } from 'node:crypto';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service.js';
import { AuthService } from '../auth/auth.service.js';
import { Prisma } from '../generated/prisma/client.js';
import { EstadoPartner } from '../generated/prisma/enums.js';
import type { ActualizarRolUsuarioDto } from './dto/actualizar-rol-usuario.dto.js';
import type { CrearUsuarioDto } from './dto/crear-usuario.dto.js';

/// Gestión de usuarios individuales dentro de un partner desde el panel
/// admin (bloque D del backlog de frontend, ver TAREAS.md). El reseteo de
/// contraseña y el cierre de sesión forzado viven en `AuthService` (dueño de
/// la lógica de sesión/tokens); este servicio solo cubre rol, activo/inactivo
/// y consulta de auditoría por usuario.
@Injectable()
export class UsuariosService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authService: AuthService,
  ) {}

  private async obtenerOFallar(id: string) {
    const usuario = await this.prisma.user.findUnique({ where: { id } });
    if (!usuario) {
      throw new NotFoundException('Usuario no encontrado');
    }
    return usuario;
  }

  async listarPorPartner(partnerId: string) {
    return this.prisma.user.findMany({
      where: { partnerId },
      select: {
        id: true,
        email: true,
        nombre: true,
        rol: true,
        activo: true,
        emailVerificadoEn: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  /// Da de alta un usuario más en la empresa y le manda la invitación para
  /// crear su contraseña. Nace con el correo verificado (lo da de alta alguien
  /// que ya tiene acceso) y con una contraseña aleatoria que nadie conoce, así
  /// que solo puede entrar tras usar el enlace del correo.
  async crear(partnerId: string, dto: CrearUsuarioDto) {
    const partner = await this.prisma.partner.findUnique({
      where: { id: partnerId },
      select: { razonSocial: true, estado: true, archivadoEn: true },
    });
    if (!partner) {
      throw new NotFoundException('Empresa no encontrada');
    }
    // En una empresa que no está activa el usuario recibiría la invitación pero nunca podría entrar.
    if (partner.estado !== EstadoPartner.ACTIVO || partner.archivadoEn) {
      throw new ConflictException('Solo se pueden añadir usuarios a una empresa activa.');
    }

    // El email es único sin distinguir mayúsculas: "Ana@x.com" y "ana@x.com" son la misma persona.
    const existente = await this.prisma.user.findFirst({
      where: { email: { equals: dto.email, mode: 'insensitive' } },
      select: { id: true },
    });
    if (existente) {
      throw new ConflictException('Ya existe un usuario con ese email.');
    }

    const passwordHash = await bcrypt.hash(randomBytes(32).toString('hex'), 12);
    const usuario = await this.prisma.user
      .create({
        data: {
          email: dto.email,
          nombre: dto.nombre,
          rol: dto.rol,
          idioma: dto.idioma,
          passwordHash,
          partnerId,
          activo: true,
          emailVerificadoEn: new Date(),
        },
        select: { id: true, email: true, nombre: true, rol: true, idioma: true, activo: true },
      })
      .catch((error: unknown) => {
        // Dos altas simultáneas con el mismo email: la segunda choca con el índice único.
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
          throw new ConflictException('Ya existe un usuario con ese email.');
        }
        throw error;
      });

    await this.authService.invitarUsuario(usuario, partner.razonSocial);
    return usuario;
  }

  async cambiarRol(id: string, dto: ActualizarRolUsuarioDto) {
    const usuario = await this.obtenerOFallar(id);
    if (!usuario.partnerId) {
      throw new NotFoundException('Usuario no encontrado');
    }
    return this.prisma.user.update({
      where: { id },
      data: { rol: dto.rol },
      select: { id: true, email: true, rol: true },
    });
  }

  async activar(id: string) {
    await this.obtenerOFallar(id);
    return this.prisma.user.update({
      where: { id },
      data: { activo: true },
      select: { id: true, email: true, activo: true },
    });
  }

  async desactivar(id: string) {
    await this.obtenerOFallar(id);
    return this.prisma.user.update({
      where: { id },
      data: { activo: false },
      select: { id: true, email: true, activo: true },
    });
  }

  async auditoria(id: string) {
    await this.obtenerOFallar(id);
    return this.prisma.auditLog.findMany({
      where: { userId: id },
      orderBy: { timestamp: 'desc' },
      take: 200,
    });
  }
}
