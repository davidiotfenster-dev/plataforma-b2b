import type { Metadata } from "next";
import { Seccion } from "../componentes";

export const metadata: Metadata = { title: "Política de cookies — IoT FENSTER" };

/// Si se añade cualquier cookie de analítica, publicidad o de terceros, esta
/// página deja de ser suficiente: hará falta un banner que pida consentimiento
/// ANTES de instalarla (art. 22.2 LSSI y guía de cookies de la AEPD).
const COOKIES = [
  {
    nombre: "fenster_session",
    titular: "Propia",
    finalidad: "Mantener la sesión iniciada del usuario de forma segura (HttpOnly, Secure).",
    duracion: "8 horas",
  },
  {
    nombre: "NEXT_LOCALE",
    titular: "Propia",
    finalidad: "Recordar el idioma de la interfaz elegido por el usuario.",
    duracion: "1 año",
  },
];

export default function CookiesPage() {
  return (
    <>
      <h1 className="text-2xl font-semibold text-neutral-900">Política de cookies</h1>

      <Seccion titulo="1. Qué son las cookies">
        <p>
          Las cookies son pequeños archivos que un sitio web guarda en el navegador para recordar información
          entre una visita y otra o entre una página y otra.
        </p>
      </Seccion>

      <Seccion titulo="2. Cookies que usa este portal">
        <p>
          El Portal Partner utiliza únicamente cookies propias y técnicas, necesarias para que el servicio
          funcione. No utiliza cookies de analítica, de publicidad ni de terceros.
        </p>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[32rem] border-collapse text-left">
            <thead>
              <tr className="border-b border-neutral-200 text-xs uppercase tracking-wide text-neutral-500">
                <th className="py-2 pr-4 font-medium">Cookie</th>
                <th className="py-2 pr-4 font-medium">Titular</th>
                <th className="py-2 pr-4 font-medium">Finalidad</th>
                <th className="py-2 font-medium">Duración</th>
              </tr>
            </thead>
            <tbody>
              {COOKIES.map((c) => (
                <tr key={c.nombre} className="border-b border-neutral-100 align-top">
                  <td className="py-2 pr-4 font-mono text-xs text-neutral-900">{c.nombre}</td>
                  <td className="py-2 pr-4">{c.titular}</td>
                  <td className="py-2 pr-4">{c.finalidad}</td>
                  <td className="py-2 whitespace-nowrap">{c.duracion}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Seccion>

      <Seccion titulo="3. Por qué no se pide consentimiento">
        <p>
          De acuerdo con el artículo 22.2 de la LSSI y la Guía sobre el uso de las cookies de la Agencia Española
          de Protección de Datos, las cookies estrictamente necesarias para prestar un servicio solicitado por el
          usuario, como mantener la sesión o recordar el idioma que ha elegido, están exentas del deber de
          obtener consentimiento. Por eso el portal no muestra un aviso de aceptación de cookies.
        </p>
        <p>
          Si en el futuro se incorporan cookies que requieran consentimiento, se pedirá antes de instalarlas y
          se actualizará esta política.
        </p>
      </Seccion>

      <Seccion titulo="4. Cómo eliminarlas o bloquearlas">
        <p>
          Puedes borrar o bloquear las cookies desde la configuración de tu navegador (Chrome, Firefox, Safari,
          Edge…). Si bloqueas la cookie de sesión no podrás iniciar sesión en el portal; si bloqueas la de
          idioma, la interfaz se mostrará en español.
        </p>
      </Seccion>
    </>
  );
}
