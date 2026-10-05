import type { Metadata } from "next";
import Link from "next/link";
import { Dato, Lista, Seccion } from "../componentes";

export const metadata: Metadata = { title: "Aviso legal — IoT FENSTER" };

export default function AvisoLegalPage() {
  return (
    <>
      <h1 className="text-2xl font-semibold text-neutral-900">Aviso legal</h1>

      <Seccion titulo="1. Titular del portal">
        <p>
          En cumplimiento del artículo 10 de la Ley 34/2002, de 11 de julio, de Servicios de la Sociedad de la
          Información y de Comercio Electrónico (LSSI), se informa de que este portal es titularidad de:
        </p>
        <Lista>
          <li>
            Razón social: <Dato campo="razonSocial" />
          </li>
          <li>
            CIF: <Dato campo="cif" />
          </li>
          <li>
            Domicilio social: <Dato campo="domicilio" />
          </li>
          <li>
            Inscripción: <Dato campo="registroMercantil" />
          </li>
          <li>
            Email de contacto: <Dato campo="emailContacto" />
          </li>
          <li>
            Teléfono: <Dato campo="telefono" />
          </li>
        </Lista>
        <p>En adelante, «IoT FENSTER».</p>
      </Seccion>

      <Seccion titulo="2. Objeto y destinatarios">
        <p>
          El Portal Partner es una plataforma de pedidos entre empresas (B2B). Está dirigido exclusivamente a
          distribuidores, instaladores y demás profesionales con los que IoT FENSTER mantiene o va a mantener una
          relación comercial, y que actúan en el ámbito de su actividad empresarial o profesional. No está
          destinado a consumidores.
        </p>
        <p>
          El acceso a la zona privada requiere el alta previa de la empresa y su aprobación por IoT FENSTER. El
          uso del portal se rige por las <Link href="/legal/condiciones" className="text-teal-700 underline">condiciones de uso</Link>.
        </p>
      </Seccion>

      <Seccion titulo="3. Propiedad intelectual e industrial">
        <p>
          Los contenidos del portal (textos, fichas de producto, imágenes, documentación técnica, diseño y
          código) son titularidad de IoT FENSTER o de terceros que han autorizado su uso, y están protegidos por
          la normativa de propiedad intelectual e industrial. Las marcas comerciales que aparecen en el portal
          pertenecen a sus respectivos titulares.
        </p>
        <p>
          Los partners pueden usar las imágenes y la documentación técnica de los productos de su catálogo
          autorizado únicamente para comercializar esos productos. Queda prohibida cualquier otra reproducción,
          distribución o transformación sin autorización escrita.
        </p>
      </Seccion>

      <Seccion titulo="4. Responsabilidad">
        <p>
          IoT FENSTER procura que la información del portal sea exacta y esté actualizada, pero puede contener
          errores u omisiones. Las especificaciones técnicas, imágenes y precios publicados son orientativos
          hasta la confirmación del pedido. IoT FENSTER no responde de las interrupciones del servicio por
          mantenimiento, causas técnicas o causas ajenas a su control, ni del uso indebido del portal por parte
          de los usuarios.
        </p>
      </Seccion>

      <Seccion titulo="5. Enlaces">
        <p>
          Si el portal incluye enlaces a sitios de terceros, IoT FENSTER no controla ni se responsabiliza de sus
          contenidos.
        </p>
      </Seccion>

      <Seccion titulo="6. Protección de datos y cookies">
        <p>
          El tratamiento de datos personales se explica en la{" "}
          <Link href="/legal/privacidad" className="text-teal-700 underline">política de privacidad</Link> y el uso
          de cookies en la <Link href="/legal/cookies" className="text-teal-700 underline">política de cookies</Link>.
        </p>
      </Seccion>

      <Seccion titulo="7. Ley aplicable y jurisdicción">
        <p>
          Este aviso legal se rige por la legislación española. Para cualquier controversia, las partes se
          someten a los juzgados y tribunales de <Dato campo="ciudadTribunales" />, con renuncia a cualquier otro
          fuero que pudiera corresponderles.
        </p>
      </Seccion>
    </>
  );
}
