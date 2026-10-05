import type { Metadata } from "next";
import { Dato, Lista, Pendiente, Seccion } from "../componentes";

export const metadata: Metadata = { title: "Política de privacidad — IoT FENSTER" };

export default function PrivacidadPage() {
  return (
    <>
      <h1 className="text-2xl font-semibold text-neutral-900">Política de privacidad</h1>
      <p>
        Esta política explica cómo se tratan los datos personales de las personas que usan el Portal Partner,
        conforme al Reglamento (UE) 2016/679 (RGPD) y a la Ley Orgánica 3/2018 de Protección de Datos Personales
        y garantía de los derechos digitales (LOPDGDD).
      </p>

      <Seccion titulo="1. Responsable del tratamiento">
        <Lista>
          <li>
            <Dato campo="razonSocial" /> (IoT FENSTER), CIF <Dato campo="cif" />
          </li>
          <li>
            Domicilio: <Dato campo="domicilio" />
          </li>
          <li>
            Contacto para privacidad: <Dato campo="emailPrivacidad" />
          </li>
        </Lista>
      </Seccion>

      <Seccion titulo="2. Qué datos tratamos">
        <Lista>
          <li>
            <strong>Datos de la empresa</strong>: razón social, CIF, dirección fiscal, país y dominio web. No son
            datos personales salvo en el caso de empresarios individuales.
          </li>
          <li>
            <strong>Datos de los usuarios</strong> de cada empresa: nombre, email corporativo, idioma preferido y
            rol en el portal. La contraseña se guarda siempre cifrada (hash) y nadie, tampoco IoT FENSTER, puede
            leerla.
          </li>
          <li>
            <strong>Datos de los pedidos</strong>: productos, cantidades, direcciones de envío, número de orden de
            compra, notas y la persona que realiza cada pedido.
          </li>
          <li>
            <strong>Datos técnicos y de seguridad</strong>: dirección IP, navegador (user agent), fecha y hora de
            inicios de sesión y de las acciones relevantes en el portal (registro de auditoría).
          </li>
        </Lista>
      </Seccion>

      <Seccion titulo="3. Para qué y con qué base legal">
        <Lista>
          <li>
            <strong>Dar de alta a la empresa y a sus usuarios, y gestionar sus pedidos</strong> (confirmación,
            preparación, envío y comunicaciones sobre su estado). Base: ejecución del contrato o de medidas
            precontractuales con la empresa (art. 6.1.b RGPD) y, respecto de las personas de contacto que actúan
            en nombre de la empresa, el interés legítimo en mantener la relación comercial (art. 6.1.f RGPD y art.
            19 LOPDGDD).
          </li>
          <li>
            <strong>Enviar emails transaccionales</strong> (verificación de cuenta, recuperación de contraseña,
            confirmación y cambios de estado de pedidos). Base: ejecución del contrato. No enviamos comunicaciones
            comerciales desde el portal.
          </li>
          <li>
            <strong>Proteger el portal</strong>: control de accesos, prevención del fraude y registro de auditoría.
            Base: interés legítimo en garantizar la seguridad de la plataforma (art. 6.1.f RGPD).
          </li>
          <li>
            <strong>Cumplir obligaciones legales</strong> contables y fiscales. Base: obligación legal (art. 6.1.c
            RGPD).
          </li>
        </Lista>
        <p>No se toman decisiones automatizadas ni se elaboran perfiles con efectos jurídicos sobre las personas.</p>
      </Seccion>

      <Seccion titulo="4. Cuánto tiempo los conservamos">
        <p>
          Los datos de usuarios y empresas se conservan mientras se mantenga la relación comercial o la cuenta esté
          activa. Después se bloquean durante los plazos de prescripción de las obligaciones legales (con carácter
          general, seis años para la documentación mercantil según el artículo 30 del Código de Comercio) y,
          transcurridos, se eliminan. Los registros de auditoría y seguridad se conservan el tiempo necesario para
          investigar incidentes, y como máximo <Pendiente>plazo, p. ej. 12 meses</Pendiente>.
        </p>
      </Seccion>

      <Seccion titulo="5. Con quién los compartimos">
        <p>No vendemos ni cedemos datos a terceros. Solo acceden a ellos:</p>
        <Lista>
          <li>
            El personal de IoT FENSTER que lo necesita para su trabajo, y los administradores de cada empresa
            partner respecto de los usuarios y pedidos de su propia empresa.
          </li>
          <li>
            Proveedores que tratan los datos por cuenta de IoT FENSTER con contrato de encargado del tratamiento:
            alojamiento de la web y la base de datos (<Dato campo="alojamiento" />) y envío de emails (Resend,
            Inc., Estados Unidos).
          </li>
          <li>Administraciones públicas, juzgados y tribunales cuando exista obligación legal.</li>
        </Lista>
      </Seccion>

      <Seccion titulo="6. Transferencias internacionales">
        <p>
          El proveedor de email Resend, Inc. está en Estados Unidos. La transferencia se ampara en el Marco de
          Privacidad de Datos UE-EE. UU. o, en su defecto, en las cláusulas contractuales tipo aprobadas por la
          Comisión Europea (art. 46 RGPD).
        </p>
      </Seccion>

      <Seccion titulo="7. Tus derechos">
        <p>
          Puedes ejercer los derechos de acceso, rectificación, supresión, oposición, limitación del tratamiento y
          portabilidad escribiendo a <Dato campo="emailPrivacidad" />, indicando qué derecho ejerces. Si consideras
          que no hemos atendido correctamente tu solicitud, puedes reclamar ante la Agencia Española de Protección
          de Datos (www.aepd.es).
        </p>
      </Seccion>

      <Seccion titulo="8. Seguridad">
        <p>
          Aplicamos medidas técnicas y organizativas adecuadas: conexión cifrada (HTTPS), contraseñas cifradas,
          cookies de sesión protegidas, aislamiento de los datos de cada empresa, limitación de intentos de acceso
          y registro de auditoría.
        </p>
      </Seccion>

      <Seccion titulo="9. Cambios en esta política">
        <p>
          Podemos actualizar esta política para adaptarla a cambios legales o del servicio. La fecha de la última
          actualización figura al final de la página.
        </p>
      </Seccion>
    </>
  );
}
