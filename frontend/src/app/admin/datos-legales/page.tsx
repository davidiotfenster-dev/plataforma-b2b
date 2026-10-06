"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { ExternalLink } from "lucide-react";
import { api, ApiError } from "@/lib/api";
import { SoloAdmin } from "@/components/solo-admin";
import { Campo, CampoTexto, Seccion } from "@/components/campo";
import { PAGINAS_LEGALES } from "@/app/legal/paginas";
import { CAMPOS_LEGALES, type AjustesLegales, type CampoLegal } from "@/app/legal/campos";

type ValoresFormulario = Record<CampoLegal, string>;

/// Cómo se pinta cada campo: ancho en la rejilla de 6 columnas y si es texto largo.
const DISENO: Record<CampoLegal, { columnas: string; largo?: boolean; tipo?: string }> = {
  razonSocial: { columnas: "sm:col-span-4" },
  cif: { columnas: "sm:col-span-2" },
  domicilio: { columnas: "sm:col-span-6" },
  emailContacto: { columnas: "sm:col-span-3", tipo: "email" },
  emailPrivacidad: { columnas: "sm:col-span-3", tipo: "email" },
  telefono: { columnas: "sm:col-span-2" },
  registroMercantil: { columnas: "sm:col-span-4" },
  alojamiento: { columnas: "sm:col-span-4" },
  ciudadTribunales: { columnas: "sm:col-span-2" },
  portes: { columnas: "sm:col-span-6", largo: true },
  formaPago: { columnas: "sm:col-span-6", largo: true },
  devoluciones: { columnas: "sm:col-span-6", largo: true },
  plazoRegistros: { columnas: "sm:col-span-2" },
};

const EMPRESA: CampoLegal[] = [
  "razonSocial",
  "cif",
  "domicilio",
  "emailContacto",
  "emailPrivacidad",
  "telefono",
  "registroMercantil",
  "alojamiento",
  "ciudadTribunales",
];
const CONDICIONES: CampoLegal[] = ["portes", "formaPago", "devoluciones", "plazoRegistros"];

function aFormulario(ajustes: AjustesLegales): ValoresFormulario {
  return Object.fromEntries(CAMPOS_LEGALES.map((c) => [c, ajustes[c] ?? ""])) as ValoresFormulario;
}

function FormularioDatosLegales() {
  const t = useTranslations("adminDatosLegales");
  const { data, isLoading } = useQuery({
    queryKey: ["ajustes-legales"],
    queryFn: () => api.get<AjustesLegales>("/ajustes-legales"),
  });
  if (isLoading || !data) return <p className="text-neutral-500">{t("loading")}</p>;
  return <Formulario inicial={aFormulario(data)} />;
}

function Formulario({ inicial }: { inicial: ValoresFormulario }) {
  const t = useTranslations("adminDatosLegales");
  const queryClient = useQueryClient();
  const [form, setForm] = useState<ValoresFormulario>(inicial);
  const [guardado, setGuardado] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const guardar = useMutation({
    mutationFn: (cambios: ValoresFormulario) => api.patch<AjustesLegales>("/ajustes-legales", cambios),
    onSuccess: (ajustes) => {
      queryClient.setQueryData(["ajustes-legales"], ajustes);
      setGuardado(true);
    },
    onError: (err) => setError(err instanceof ApiError ? err.message : t("error")),
  });

  const pendientes = CAMPOS_LEGALES.filter((c) => !form[c].trim()).length;
  const cambiar = (campo: CampoLegal, valor: string) => {
    setGuardado(false);
    setForm((f) => ({ ...f, [campo]: valor }));
  };
  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    guardar.mutate(form);
  };

  const pintar = (campo: CampoLegal) => {
    const { columnas, largo, tipo } = DISENO[campo];
    const comunes = {
      etiqueta: t(`campos.${campo}.label`),
      ayuda: t(`campos.${campo}.ayuda`),
      className: columnas,
      value: form[campo],
    };
    return largo ? (
      <CampoTexto key={campo} {...comunes} rows={3} onChange={(e) => cambiar(campo, e.target.value)} />
    ) : (
      <Campo key={campo} {...comunes} type={tipo ?? "text"} onChange={(e) => cambiar(campo, e.target.value)} />
    );
  };

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <Seccion titulo={t("empresa")} descripcion={t("empresaDesc")}>
        {EMPRESA.map(pintar)}
      </Seccion>
      <Seccion titulo={t("condiciones")} descripcion={t("condicionesDesc")}>
        {CONDICIONES.map(pintar)}
      </Seccion>
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={guardar.isPending}
          className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-700 disabled:opacity-50"
        >
          {guardar.isPending ? t("saving") : t("save")}
        </button>
        {guardado && <span className="text-sm text-teal-700">{t("saved")}</span>}
        {error && (
          <span role="alert" className="text-sm text-red-600">
            {error}
          </span>
        )}
        <span className={`ml-auto text-sm ${pendientes ? "text-amber-700" : "text-neutral-500"}`}>
          {t("pendientes", { n: pendientes })}
        </span>
      </div>
    </form>
  );
}

export default function DatosLegalesPage() {
  const t = useTranslations("adminDatosLegales");
  const tLegal = useTranslations("legal");
  return (
    <SoloAdmin>
      <div className="mx-auto max-w-3xl space-y-5">
        <div>
          <h1 className="text-2xl font-semibold text-neutral-900">{t("title")}</h1>
          <p className="mt-1 text-sm text-neutral-600">{t("intro")}</p>
          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm">
            {PAGINAS_LEGALES.map(({ href, clave }) => (
              <Link key={href} href={href} target="_blank" className="inline-flex items-center gap-1 text-teal-700 hover:text-teal-800">
                {tLegal(clave)}
                <ExternalLink className="size-3.5" />
              </Link>
            ))}
          </div>
        </div>
        <FormularioDatosLegales />
      </div>
    </SoloAdmin>
  );
}
