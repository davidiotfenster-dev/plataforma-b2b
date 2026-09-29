import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';

export interface AdjuntoEmail {
  filename: string;
  content: Buffer;
}

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly resend: Resend | null;
  private readonly emailFrom: string;

  constructor(private readonly configService: ConfigService) {
    const apiKey = this.configService.get<string>('resendApiKey');
    this.resend = apiKey ? new Resend(apiKey) : null;
    this.emailFrom = this.configService.get<string>('emailFrom')!;
  }

  /// Sin `RESEND_API_KEY` configurada, no se envía correo real: se deja
  /// constancia en el log de desarrollo (mismo patrón que el token de
  /// verificación de email del bloque 2), para no bloquear el flujo de
  /// negocio (confirmación de pedido) por falta de credenciales de email.
  async enviar(destinatario: string, asunto: string, cuerpoHtml: string, adjuntos: AdjuntoEmail[] = []): Promise<void> {
    if (!this.resend) {
      this.logger.warn(`[DEV] Email no enviado (falta RESEND_API_KEY). Para: ${destinatario} · Asunto: ${asunto}`);
      return;
    }

    try {
      await this.resend.emails.send({
        from: this.emailFrom,
        to: destinatario,
        subject: asunto,
        html: cuerpoHtml,
        attachments: adjuntos.map((a) => ({ filename: a.filename, content: a.content })),
      });
    } catch (error) {
      /// Un fallo de envío de email nunca debe romper el flujo de negocio
      /// que lo disparó (confirmación de pedido, cambio de estado): se
      /// registra el error y se continúa.
      this.logger.error(`Error enviando email a ${destinatario}: ${(error as Error).message}`);
    }
  }
}
