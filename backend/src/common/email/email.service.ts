import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SESv2Client, SendEmailCommand } from '@aws-sdk/client-sesv2';
import { Resend } from 'resend';
import { envolverCorreo } from './plantillas-email.js';

export interface AdjuntoEmail {
  filename: string;
  content: Buffer;
}

interface CorreoSaliente {
  destinatario: string;
  asunto: string;
  html: string;
  texto: string;
  adjuntos: AdjuntoEmail[];
}

type Enviador = (correo: CorreoSaliente) => Promise<void>;

/// Versión en texto plano del HTML de las plantillas (siempre HTML sencillo:
/// párrafos, negritas, enlaces y saltos de línea). Los filtros antispam
/// penalizan los correos que solo llevan HTML, así que cada envío lleva ambas.
export function htmlATexto(html: string): string {
  return html
    .replace(/<a\s[^>]*href="([^"]*)"[^>]*>(.*?)<\/a>/gi, '$2: $1')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|h[1-6]|li|tr)>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly enviador: Enviador | null;
  private readonly emailFrom: string;
  private readonly emailReplyTo: string | undefined;
  private readonly emailLogoUrl: string | undefined;

  constructor(private readonly configService: ConfigService) {
    this.emailFrom = this.configService.get<string>('emailFrom')!;
    this.emailReplyTo = this.configService.get<string>('emailReplyTo') || undefined;
    this.emailLogoUrl = this.configService.get<string>('emailLogoUrl') || undefined;
    this.enviador = this.crearEnviador();
  }

  /// `EMAIL_PROVEEDOR=ses` envía por Amazon SES (credenciales de la cadena
  /// estándar de AWS: variables `AWS_ACCESS_KEY_ID`/`AWS_SECRET_ACCESS_KEY` o el
  /// rol del servidor). Si no, Resend cuando hay `RESEND_API_KEY`. Sin ninguno,
  /// no se envía nada (modo desarrollo).
  private crearEnviador(): Enviador | null {
    const proveedor = this.configService.get<string>('emailProveedor')?.trim().toLowerCase();

    if (proveedor === 'ses') {
      const ses = new SESv2Client({ region: this.configService.get<string>('awsSesRegion') });
      return async (c) => {
        await ses.send(
          new SendEmailCommand({
            FromEmailAddress: this.emailFrom,
            Destination: { ToAddresses: [c.destinatario] },
            ReplyToAddresses: this.emailReplyTo ? [this.emailReplyTo] : undefined,
            Content: {
              Simple: {
                Subject: { Data: c.asunto, Charset: 'UTF-8' },
                Body: {
                  Html: { Data: c.html, Charset: 'UTF-8' },
                  Text: { Data: c.texto, Charset: 'UTF-8' },
                },
                Attachments: c.adjuntos.length
                  ? c.adjuntos.map((a) => ({
                      FileName: a.filename,
                      RawContent: a.content,
                      ContentType: a.filename.toLowerCase().endsWith('.pdf') ? 'application/pdf' : undefined,
                    }))
                  : undefined,
              },
            },
          }),
        );
      };
    }

    const apiKey = this.configService.get<string>('resendApiKey');
    if (apiKey) {
      const resend = new Resend(apiKey);
      return async (c) => {
        /// El SDK de Resend no lanza: devuelve el error en la respuesta.
        const { error } = await resend.emails.send({
          from: this.emailFrom,
          to: c.destinatario,
          replyTo: this.emailReplyTo,
          subject: c.asunto,
          html: c.html,
          text: c.texto,
          attachments: c.adjuntos.map((a) => ({ filename: a.filename, content: a.content })),
        });
        if (error) {
          throw new Error(error.message);
        }
      };
    }

    return null;
  }

  /// Sin proveedor configurado, no se envía correo real: se deja
  /// constancia en el log de desarrollo (mismo patrón que el token de
  /// verificación de email del bloque 2), para no bloquear el flujo de
  /// negocio (confirmación de pedido) por falta de credenciales de email.
  async enviar(destinatario: string, asunto: string, cuerpoHtml: string, adjuntos: AdjuntoEmail[] = []): Promise<void> {
    if (!this.enviador) {
      /// Sin proveedor no sale nada. Se deja el enlace del correo en el log para poder completar
      /// a mano el flujo en desarrollo (verificar email, restablecer contraseña).
      const enlaces = cuerpoHtml.match(/https?:\/\/[^\s"'<]+/g);
      this.logger.warn(
        `[DEV] Email no enviado (sin proveedor: falta EMAIL_PROVEEDOR=ses o RESEND_API_KEY). Para: ${destinatario} · Asunto: ${asunto}` +
          (enlaces ? ` · Enlace: ${enlaces[0]}` : ''),
      );
      return;
    }

    try {
      await this.enviador({ destinatario, asunto, html: envolverCorreo(cuerpoHtml, this.emailLogoUrl), texto: htmlATexto(cuerpoHtml), adjuntos });
    } catch (error) {
      /// Un fallo de envío de email nunca debe romper el flujo de negocio
      /// que lo disparó (confirmación de pedido, cambio de estado): se
      /// registra el error y se continúa.
      this.logger.error(`Error enviando email a ${destinatario}: ${(error as Error).message}`);
    }
  }
}
