import type { Metadata } from "next";
import Link from "next/link";
import { Dato, Lista, Pendiente, Seccion } from "../componentes";

export const metadata: Metadata = { title: "Condiciones de uso — IoT FENSTER" };

export default function CondicionesPage() {
  return (
    <>
      <h1 className="text-2xl font-semibold text-neutral-900">Condiciones de uso del Portal Partner</h1>
      <p>
        Estas condiciones regulan el acceso y el uso del Portal Partner de <Dato campo="razonSocial" /> («IoT
        FENSTER»). La empresa que se registra (el «partner») las acepta al solicitar el alta, y sus usuarios al
        utilizar el portal.
      </p>

      <Seccion titulo="1. Ámbito profesional">
        <p>
          El portal es exclusivamente para empresas y profesionales que compran en el ámbito de su actividad
          empresarial. No es aplicable la normativa de protección de consumidores. Si el partner tiene firmado con
          IoT FENSTER un acuerdo comercial o de distribución, ese acuerdo prevalece sobre estas condiciones en lo
          que las contradiga.
        </p>
      </Seccion>

      <Seccion titulo="2. Alta y aprobación">
        <Lista>
          <li>La empresa solicita el alta con datos veraces y verifica su email corporativo.</li>
          <li>
            IoT FENSTER revisa cada solicitud y puede aprobarla o rechazarla libremente. Al aprobarla asigna a la
            empresa su catálogo autorizado, su tarifa y su descuento.
          </li>
          <li>El partner debe mantener actualizados sus datos fiscales y de contacto.</li>
        </Lista>
      </Seccion>

      <Seccion titulo="3. Cuentas y contraseñas">
        <Lista>
          <li>Cada cuenta es personal. Las credenciales son confidenciales y no deben compartirse.</li>
          <li>
            El partner responde de las acciones realizadas con las cuentas de sus usuarios, incluidos los pedidos,
            y debe dar de baja a las personas que dejen de trabajar con él.
          </li>
          <li>
            Ante cualquier uso no autorizado, el partner debe avisar de inmediato a IoT FENSTER en{" "}
            <Dato campo="emailContacto" />.
          </li>
        </Lista>
      </Seccion>

      <Seccion titulo="4. Catálogo y precios">
        <Lista>
          <li>
            Cada partner ve solo los productos de su catálogo autorizado, con el precio neto resultante de aplicar
            su descuento a la tarifa vigente.
          </li>
          <li>
            Los precios no incluyen IVA ni otros impuestos, que se añadirán en la factura según corresponda.
            <Pendiente>portes y condiciones de envío</Pendiente>
          </li>
          <li>
            IoT FENSTER puede modificar productos, tarifas y descuentos en cualquier momento. Los cambios no afectan
            a los pedidos ya enviados desde el portal, cuyo precio queda fijado en el momento de hacer el pedido.
          </li>
          <li>
            Los precios, descuentos y condiciones que el partner ve en el portal son confidenciales y no deben
            difundirse a terceros.
          </li>
        </Lista>
      </Seccion>

      <Seccion titulo="5. Pedidos">
        <Lista>
          <li>
            El portal no admite pago en línea. Cada pedido se tramita como orden de compra del partner, que puede
            indicar su propio número de pedido (PO).
          </li>
          <li>
            Un pedido enviado desde el portal queda en estado «Recibido» y es una oferta de compra del partner. El
            contrato de compraventa se perfecciona cuando IoT FENSTER lo confirma.
          </li>
          <li>
            IoT FENSTER puede rechazar o cancelar un pedido no enviado por falta de stock, errores manifiestos de
            precio o incumplimientos de pago, informando al partner del motivo.
          </li>
          <li>
            El pago se realizará en la forma y plazos acordados con cada partner. <Pendiente>forma de pago por defecto</Pendiente>
          </li>
          <li>
            Los plazos de preparación y entrega son orientativos. Cuando el pedido se envía, el portal muestra el
            transportista y, si existe, el enlace de seguimiento.
          </li>
          <li>
            Los productos tienen la{" "}
            <a
              href="https://www.iotfenster.com/es/legal/garantia-comercial"
              target="_blank"
              rel="noopener"
              className="text-teal-700 underline"
            >
              garantía comercial de IoT FENSTER
            </a>{" "}
            de 5 años frente a defectos de fabricación. Las reclamaciones se tramitan en info@iotfenster.com o
            soporte@iotfenster.com indicando modelo, número de serie y factura de compra.
          </li>
          <li>
            Las incidencias de transporte y las devoluciones que no sean por garantía se rigen por{" "}
            <Pendiente>política de devoluciones e incidencias de transporte</Pendiente>.
          </li>
        </Lista>
      </Seccion>

      <Seccion titulo="6. Uso correcto del portal">
        <p>El partner y sus usuarios se comprometen a no:</p>
        <Lista>
          <li>intentar acceder a datos de otras empresas o a zonas para las que no tienen permiso;</li>
          <li>usar sistemas automáticos para extraer información del portal;</li>
          <li>introducir código malicioso ni comprometer la seguridad o el funcionamiento del servicio;</li>
          <li>usar los contenidos para fines distintos de la comercialización de los productos autorizados.</li>
        </Lista>
      </Seccion>

      <Seccion titulo="7. Suspensión y baja">
        <p>
          IoT FENSTER puede suspender o dar de baja el acceso de un usuario o de una empresa si incumple estas
          condiciones o cuando termine la relación comercial. Los pedidos ya confirmados se gestionarán hasta su
          entrega. El partner puede solicitar la baja en cualquier momento escribiendo a{" "}
          <Dato campo="emailContacto" />.
        </p>
      </Seccion>

      <Seccion titulo="8. Disponibilidad y responsabilidad">
        <p>
          IoT FENSTER procura que el portal esté disponible de forma continua, pero no garantiza la ausencia de
          interrupciones o errores. Salvo dolo o culpa grave, IoT FENSTER no responde de los daños indirectos ni
          del lucro cesante derivados del uso o la imposibilidad de uso del portal.
        </p>
      </Seccion>

      <Seccion titulo="9. Datos personales">
        <p>
          El tratamiento de los datos personales de los usuarios se describe en la{" "}
          <Link href="/legal/privacidad" className="text-teal-700 underline">política de privacidad</Link>.
        </p>
      </Seccion>

      <Seccion titulo="10. Cambios en las condiciones">
        <p>
          IoT FENSTER puede modificar estas condiciones. Los cambios se publicarán en esta página y se aplicarán a
          los pedidos realizados después de su publicación.
        </p>
      </Seccion>

      <Seccion titulo="11. Idioma, ley aplicable y jurisdicción">
        <p>
          Estas condiciones se redactan en español, que es la versión que prevalece frente a cualquier traducción.
          Se rigen por la legislación española y, para cualquier controversia, las partes se someten a los juzgados
          y tribunales de <Dato campo="ciudadTribunales" />.
        </p>
      </Seccion>
    </>
  );
}
