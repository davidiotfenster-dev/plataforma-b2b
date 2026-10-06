import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ConfigService } from '@nestjs/config';

const sesSend = vi.fn();
const resendSend = vi.fn();

vi.mock('@aws-sdk/client-sesv2', () => ({
  SESv2Client: vi.fn(function (this: { send: typeof sesSend }) {
    this.send = sesSend;
  }),
  SendEmailCommand: vi.fn(function (this: { input: unknown }, input: unknown) {
    this.input = input;
  }),
}));

vi.mock('resend', () => ({
  Resend: vi.fn(function (this: { emails: { send: typeof resendSend } }) {
    this.emails = { send: resendSend };
  }),
}));

const { EmailService, htmlATexto } = await import('./email.service.js');

function servicio(config: Record<string, string | undefined>) {
  const valores: Record<string, string | undefined> = { emailFrom: 'pedidos@iotfenster.com', ...config };
  return new EmailService({ get: (clave: string) => valores[clave] } as unknown as ConfigService);
}

describe('EmailService', () => {
  beforeEach(() => {
    sesSend.mockReset().mockResolvedValue({});
    resendSend.mockReset().mockResolvedValue({ data: { id: '1' }, error: null });
  });

  it('con EMAIL_PROVEEDOR=ses envía por Amazon SES con HTML, texto, "responder a" y el PDF adjunto', async () => {
    await servicio({ emailProveedor: 'ses', awsSesRegion: 'eu-west-1', emailReplyTo: 'comercial@iotfenster.com' }).enviar(
      'cliente@empresa.com',
      'Confirmación de pedido PED-1',
      '<p>Su pedido <strong>PED-1</strong> ha sido recibido.</p>',
      [{ filename: 'PED-1.pdf', content: Buffer.from('pdf') }],
    );

    expect(sesSend).toHaveBeenCalledTimes(1);
    const { input } = sesSend.mock.calls[0][0];
    expect(input.FromEmailAddress).toBe('pedidos@iotfenster.com');
    expect(input.Destination.ToAddresses).toEqual(['cliente@empresa.com']);
    expect(input.ReplyToAddresses).toEqual(['comercial@iotfenster.com']);
    expect(input.Content.Simple.Body.Html.Data).toContain('<p>Su pedido <strong>PED-1</strong> ha sido recibido.</p>');
    expect(input.Content.Simple.Body.Html.Data).toContain('FENSTER');
    expect(input.Content.Simple.Body.Text.Data).toBe('Su pedido PED-1 ha sido recibido.');
    expect(input.Content.Simple.Attachments[0]).toMatchObject({ FileName: 'PED-1.pdf', ContentType: 'application/pdf' });
    expect(resendSend).not.toHaveBeenCalled();
  });

  it('sin SES y con RESEND_API_KEY envía por Resend, también con versión en texto', async () => {
    await servicio({ resendApiKey: 're_x' }).enviar('a@b.com', 'Asunto', '<p>Hola</p>');

    expect(resendSend).toHaveBeenCalledWith(expect.objectContaining({ to: 'a@b.com', html: expect.stringContaining('<p>Hola</p>'), text: 'Hola' }));
    expect(sesSend).not.toHaveBeenCalled();
  });

  it('sin proveedor no envía nada', async () => {
    await servicio({}).enviar('a@b.com', 'Asunto', '<p>Hola</p>');

    expect(sesSend).not.toHaveBeenCalled();
    expect(resendSend).not.toHaveBeenCalled();
  });

  it('un fallo del proveedor no rompe la acción que envía el correo', async () => {
    sesSend.mockRejectedValue(new Error('MessageRejected'));
    await expect(servicio({ emailProveedor: 'ses' }).enviar('a@b.com', 'A', '<p>x</p>')).resolves.toBeUndefined();

    resendSend.mockResolvedValue({ data: null, error: { message: 'dominio no verificado' } });
    await expect(servicio({ resendApiKey: 're_x' }).enviar('a@b.com', 'A', '<p>x</p>')).resolves.toBeUndefined();
  });
});

describe('logo de la cabecera', () => {
  it('con EMAIL_LOGO_URL (https) la cabecera lleva el logo; sin ella, el nombre en texto', async () => {
    resendSend.mockClear();
    await servicio({ resendApiKey: 're_x', emailLogoUrl: 'https://b2b.iotfenster.com/logo-email.png' }).enviar('a@b.com', 'A', '<p>x</p>');
    expect(resendSend.mock.calls[0][0].html).toContain('<img src="https://b2b.iotfenster.com/logo-email.png"');

    await servicio({ resendApiKey: 're_x', emailLogoUrl: 'javascript:alert(1)' }).enviar('a@b.com', 'A', '<p>x</p>');
    expect(resendSend.mock.calls[1][0].html).not.toContain('<img');
    expect(resendSend.mock.calls[1][0].html).toContain('FENSTER</span>');
  });
});

describe('botón', () => {
  it('sale como botón en el HTML y como "texto: enlace" en la versión de texto plano', async () => {
    const { boton } = await import('./plantillas-email.js');
    const html = `<p>Confirma:</p>${boton('https://x.com/a?b=1&c=2', 'Confirmar mi correo')}`;
    expect(html).toContain('href="https://x.com/a?b=1&amp;c=2"');
    expect(htmlATexto(html)).toBe('Confirma:\nConfirmar mi correo: https://x.com/a?b=1&c=2');
  });
});

describe('htmlATexto', () => {
  it('convierte enlaces, párrafos y entidades en texto legible', () => {
    expect(
      htmlATexto('<p>La empresa <strong>A &amp; B</strong> espera.</p><p><a href="https://x.com/a">Revisar la solicitud</a></p>'),
    ).toBe('La empresa A & B espera.\nRevisar la solicitud: https://x.com/a');
  });
});
