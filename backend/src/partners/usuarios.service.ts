import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import type { ActualizarRolUsuarioDto } from './dto/actualizar-rol-usuario.dto.js';

/// Gestión de usuarios individuales dentro de un partner desde el panel
/// admin (bloque D del backlog de frontend, ver TAREAS.md). El reseteo de
/// contraseña y el cierre de sesión forzado viven en `AuthService` (dueño de
/// la lógica de sesión/tokens); este servicio solo cubre rol, activo/inactivo
/// y consulta de auditoría por usuario.
@Injectable()
export class UsuariosService {
  constructor(private readonly prisma: PrismaService) {}

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
