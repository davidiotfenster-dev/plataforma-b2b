"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { Check, Copy, Wand2 } from "lucide-react";
import { api, ApiError } from "@/lib/api";
import { Campo, CampoTexto, Seccion } from "@/components/campo";
import { MARCA_INFO, MARCAS_CATALOGO, TIPOS_EMPRESA } from "@/lib/marcas";
import type { CrearPartnerInput, MarcaCatalogo, Partner, TipoEmpresa } from "@/lib/types";

type Valores = Record<string, string>;

interface DefCampo {
  nombre: string;
  tipo?: "text" | "email" | "tel" | "number";
  /// Columnas que ocupa de 6 (en pantallas anchas).
  ancho: 2 | 3 | 4 | 6;
  obligatorio?: boolean;
  ayuda?: boolean;
}

interface DefSeccion {
  clave: string;
  /// Solo aparece al dar de alta (no al editar).
  soloAlta?: boolean;
  campos: DefCampo[];
}

const CLASE_ANCHO = { 2: "sm:col-span-2", 3: "sm:col-span-3", 4: "sm:col-span-4", 6: "sm:col-span-6" } as const;

const SECCIONES: DefSeccion[] = [
  {
    clave: "empresa",
    campos: [
      { nombre: "razonSocial", ancho: 4, obligatorio: true },
      { nombre: "codigoCliente", ancho: 2 },
      { nombre: "cif", ancho: 2, obligatorio: true },
      { nombre: "dominioWeb", ancho: 4, obligatorio: true, ayuda: true },
      { nombre: "direccionFiscal", ancho: 6, obligatorio: true },
      { nombre: "codigoPostal", ancho: 2 },
      { nombre: "localidad", ancho: 2 },
      { nombre: "provincia", ancho: 2 },
      { nombre: "pais", ancho: 3, obligatorio: true },
    ],
  },
  {
    clave: "comercial",
    campos: [
      { nombre: "marcaComercial", ancho: 2, ayuda: true },
      { nombre: "tarifa", ancho: 2 },
      { nombre: "descuentoPorcentaje", tipo: "number", ancho: 2, ayuda: true },
      { nombre: "formaPago", ancho: 2 },
      { nombre: "divisa", ancho: 2 },
      { nombre: "iva", tipo: "number", ancho: 2 },
    ],
  },
  {
    clave: "contacto",
    campos: [
      { nombre: "telefono1", tipo: "tel", ancho: 3 },
      { nombre: "telefono2", tipo: "tel", ancho: 3 },
      { nombre: "correoContacto1", tipo: "email", ancho: 3 },
      { nombre: "correoContacto2", tipo: "email", ancho: 3 },
      { nombre: "correoFacturacion", tipo: "email", ancho: 3 },
    ],
  },
  {
    clave: "envio",
    campos: [
      { nombre: "direccionEnvioDefecto", ancho: 6 },
      { nombre: "codigoPostalEnvio", ancho: 2 },
      { nombre: "localidadEnvio", ancho: 2 },
      { nombre: "provinciaEnvio", ancho: 2 },
      { nombre: "paisEnvio", ancho: 3 },
    ],
  },
  {
    clave: "primerUsuario",
    soloAlta: true,
    campos: [
      { nombre: "nombreUsuario", ancho: 3, obligatorio: true },
      { nombre: "emailUsuario", tipo: "email", ancho: 3, obligatorio: true },
    ],
  },
];

const CAMPOS_OPCIONALES_TEXTO = [
  "codigoCliente", "marcaComercial", "tarifa", "telefono1", "telefono2", "codigoPostal", "localidad", "provincia",
  "direccionEnvioDefecto", "codigoPostalEnvio", "localidadEnvio", "provinciaEnvio", "paisEnvio",
  "correoContacto1", "correoContacto2", "correoFacturacion", "formaPago", "divisa", "notas",
] as const;

function valoresIniciales(partner?: Partner): Valores {
  const texto = (v: string | null | undefined) => v ?? "";
  return {
    tipo: partner?.tipo ?? "CLIENTE",
    marcaCatalogo: partner?.marcaCatalogo ?? "MYSMARTWINDOW",
    razonSocial: partner?.razonSocial ?? "",
    cif: partner?.cif ?? "",
    direccionFiscal: partner?.direccionFiscal ?? "",
    pais: partner?.pais ?? "España",
    dominioWeb: partner?.dominioWeb ?? "",
    codigoCliente: texto(partner?.codigoCliente),
    marcaComercial: texto(partner?.marcaComercial),
    tarifa: texto(partner?.tarifa),
    descuentoPorcentaje: partner ? String(Number(partner.descuentoPorcentaje)) : "0",
    telefono1: texto(partner?.telefono1),
    telefono2: texto(partner?.telefono2),
    codigoPostal: texto(partner?.codigoPostal),
    localidad: texto(partner?.localidad),
    provincia: texto(partner?.provincia),
    direccionEnvioDefecto: texto(partner?.direccionEnvioDefecto),
    codigoPostalEnvio: texto(partner?.codigoPostalEnvio),
    localidadEnvio: texto(partner?.localidadEnvio),
    provinciaEnvio: texto(partner?.provinciaEnvio),
    paisEnvio: texto(partner?.paisEnvio),
    correoContacto1: texto(partner?.correoContacto1),
    correoContacto2: texto(partner?.correoContacto2),
    correoFacturacion: texto(partner?.correoFacturacion),
    formaPago: texto(partner?.formaPago),
    divisa: texto(partner?.divisa),
    iva: partner?.iva != null ? String(Number(partner.iva)) : "",
    notas: texto(partner?.notas),
    nombreUsuario: "",
    emailUsuario: "",
    passwordUsuario: "",
  };
}

/// Contraseña aleatoria sin caracteres ambiguos (0/O, 1/l/I), para dictarla o copiarla.
function generarPassword(): string {
  const alfabeto = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = crypto.getRandomValues(new Uint32Array(14));
  return Array.from(bytes, (n) => alfabeto[n % alfabeto.length]).join("");
}

/// Un solo formulario para dar de alta y para editar un partner: los mismos
/// campos, con su etiqueta, agrupados por temas.
export function PartnerForm({ partner }: { partner?: Partner }) {
  const t = useTranslations("adminPartners");
  const router = useRouter();
  const queryClient = useQueryClient();
  const modoAlta = !partner;
  const inicial = useMemo(() => valoresIniciales(partner), [partner]);
  const [valores, setValores] = useState<Valores>(inicial);
  const [error, setError] = useState<string | null>(null);
  const [guardado, setGuardado] = useState(false);
  const [copiada, setCopiada] = useState(false);

  const cambiado = JSON.stringify(valores) !== JSON.stringify(inicial);
  const secciones = SECCIONES.filter((s) => modoAlta || !s.soloAlta);

  function cambiar(nombre: string, valor: string) {
    setGuardado(false);
    setValores((prev) => ({ ...prev, [nombre]: valor }));
  }

  const obligatoriosOk = secciones
    .flatMap((s) => s.campos)
    .filter((c) => c.obligatorio)
    .every((c) => valores[c.nombre].trim() !== "") && (!modoAlta || valores.passwordUsuario.length >= 8);

  const guardar = useMutation({
    mutationFn: () => {
      const texto = (nombre: string) => valores[nombre].trim();
      const numero = (nombre: string) => (texto(nombre) === "" ? null : Number(texto(nombre)));

      if (modoAlta) {
        const carga: CrearPartnerInput = {
          tipo: valores.tipo as TipoEmpresa,
          marcaCatalogo: valores.marcaCatalogo as MarcaCatalogo,
          razonSocial: texto("razonSocial"),
          cif: texto("cif"),
          direccionFiscal: texto("direccionFiscal"),
          pais: texto("pais"),
          dominioWeb: texto("dominioWeb"),
          descuentoPorcentaje: Number(valores.descuentoPorcentaje || 0),
          iva: numero("iva") ?? undefined,
          nombreUsuario: texto("nombreUsuario"),
          emailUsuario: texto("emailUsuario"),
          passwordUsuario: valores.passwordUsuario,
        };
        for (const campo of CAMPOS_OPCIONALES_TEXTO) {
          if (texto(campo)) (carga as unknown as Record<string, unknown>)[campo] = texto(campo);
        }
        return api.post<Partner>("/partners", carga);
      }

      const carga: Record<string, unknown> = {
        tipo: valores.tipo,
        marcaCatalogo: valores.marcaCatalogo,
        razonSocial: texto("razonSocial"),
        cif: texto("cif"),
        direccionFiscal: texto("direccionFiscal"),
        pais: texto("pais"),
        dominioWeb: texto("dominioWeb"),
        descuentoPorcentaje: Number(valores.descuentoPorcentaje || 0),
        iva: numero("iva"),
      };
      // Vaciar un campo opcional lo borra (null), salvo marca y tarifa, que no admiten borrarse.
      for (const campo of CAMPOS_OPCIONALES_TEXTO) {
        carga[campo] = texto(campo) === "" ? (campo === "marcaComercial" || campo === "tarifa" ? undefined : null) : texto(campo);
      }
      return api.patch<Partner>(`/partners/${partner!.id}`, carga);
    },
    onSuccess: (resultado) => {
      queryClient.invalidateQueries({ queryKey: ["admin-partners"] });
      queryClient.invalidateQueries({ queryKey: ["admin-partners-resumen"] });
      if (modoAlta) {
        router.push(`/admin/partners/${resultado.id}`);
      } else {
        queryClient.invalidateQueries({ queryKey: ["admin-partner", partner!.id] });
        // Se muestra lo que el servidor ha guardado (ya recortado y normalizado), sin dejar el botón activo.
        setValores(valoresIniciales(resultado));
        setGuardado(true);
      }
    },
    onError: (err) => setError(err instanceof ApiError ? err.message : t("genericError")),
  });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        setError(null);
        guardar.mutate();
      }}
      className="space-y-5"
    >
      {secciones.map((seccion) => (
        <Seccion
          key={seccion.clave}
          titulo={t(`sections.${seccion.clave}.title`)}
          descripcion={t(`sections.${seccion.clave}.description`)}
        >
          {seccion.campos.map((campo) => (
            <Campo
              key={campo.nombre}
              className={CLASE_ANCHO[campo.ancho]}
              etiqueta={t(`fields.${campo.nombre}`)}
              ayuda={campo.ayuda ? t(`hints.${campo.nombre}`) : undefined}
              obligatorio={campo.obligatorio}
              type={campo.tipo ?? "text"}
              {...(campo.tipo === "number" ? { min: 0, max: 100, step: "0.01" } : {})}
              value={valores[campo.nombre]}
              onChange={(e) => cambiar(campo.nombre, e.target.value)}
            />
          ))}

          {seccion.clave === "comercial" && (
            <>
              <div className="sm:col-span-3">
                <label htmlFor="tipo-empresa" className="mb-1 block text-sm font-medium text-neutral-700">
                  {t("fields.tipo")}
                </label>
                <select
                  id="tipo-empresa"
                  value={valores.tipo}
                  onChange={(e) => cambiar("tipo", e.target.value)}
                  className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm focus:border-neutral-500 focus:outline-none"
                >
                  {TIPOS_EMPRESA.map((tipo) => (
                    <option key={tipo} value={tipo}>
                      {t(tipo === "PARTNER" ? "typePartnerLong" : "typeClientLong")}
                    </option>
                  ))}
                </select>
              </div>
              <div className="sm:col-span-3">
                <label htmlFor="marca-catalogo" className="mb-1 block text-sm font-medium text-neutral-700">
                  {t("fields.marcaCatalogo")}
                </label>
                <select
                  id="marca-catalogo"
                  value={valores.marcaCatalogo}
                  onChange={(e) => cambiar("marcaCatalogo", e.target.value)}
                  className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm focus:border-neutral-500 focus:outline-none"
                >
                  {MARCAS_CATALOGO.map((m) => (
                    <option key={m} value={m}>
                      {MARCA_INFO[m].etiqueta} · {MARCA_INFO[m].submarca}
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-xs text-neutral-500">{t("hints.marcaCatalogo")}</p>
              </div>
            </>
          )}

          {seccion.clave === "primerUsuario" && (
            <div className="sm:col-span-6">
              <Campo
                etiqueta={t("fields.passwordUsuario")}
                ayuda={t("hints.passwordUsuario")}
                obligatorio
                autoComplete="off"
                value={valores.passwordUsuario}
                onChange={(e) => cambiar("passwordUsuario", e.target.value)}
              />
              <div className="mt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    cambiar("passwordUsuario", generarPassword());
                    setCopiada(false);
                  }}
                  className="inline-flex items-center gap-1.5 rounded-md border border-neutral-300 px-2.5 py-1.5 text-xs font-medium text-neutral-700 hover:bg-neutral-50"
                >
                  <Wand2 size={13} /> {t("generatePassword")}
                </button>
                <button
                  type="button"
                  disabled={!valores.passwordUsuario}
                  onClick={async () => {
                    await navigator.clipboard?.writeText(valores.passwordUsuario);
                    setCopiada(true);
                  }}
                  className="inline-flex items-center gap-1.5 rounded-md border border-neutral-300 px-2.5 py-1.5 text-xs font-medium text-neutral-700 hover:bg-neutral-50 disabled:opacity-40"
                >
                  {copiada ? <Check size={13} /> : <Copy size={13} />} {copiada ? t("copied") : t("copy")}
                </button>
              </div>
            </div>
          )}
        </Seccion>
      ))}

      <Seccion titulo={t("sections.notas.title")} descripcion={t("sections.notas.description")}>
        <CampoTexto
          className="sm:col-span-6"
          etiqueta={t("fields.notas")}
          rows={4}
          value={valores.notas}
          onChange={(e) => cambiar("notas", e.target.value)}
        />
      </Seccion>

      <div className="sticky bottom-0 -mx-1 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-neutral-200 bg-white/95 px-4 py-3 shadow-sm backdrop-blur">
        <div className="min-h-5 text-sm" aria-live="polite">
          {error && <span role="alert" className="text-red-600">{error}</span>}
          {!error && guardado && (
            <span className="inline-flex items-center gap-1 text-green-700">
              <Check size={14} /> {t("saved")}
            </span>
          )}
          {!error && !guardado && !obligatoriosOk && <span className="text-neutral-500">{t("missingRequired")}</span>}
        </div>
        <div className="flex gap-2">
          {modoAlta && (
            <Link
              href="/admin/partners"
              className="rounded-md border border-neutral-300 px-3 py-2 text-sm text-neutral-700 hover:bg-neutral-50"
            >
              {t("cancel")}
            </Link>
          )}
          <button
            type="submit"
            disabled={guardar.isPending || !obligatoriosOk || (!modoAlta && !cambiado)}
            className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-700 disabled:opacity-40"
          >
            {guardar.isPending ? t("saving") : modoAlta ? t("createButton") : t("saveChanges")}
          </button>
        </div>
      </div>
    </form>
  );
}
