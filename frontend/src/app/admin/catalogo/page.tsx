"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { api, ApiError } from "@/lib/api";
import type { ProductoBaseAdmin } from "@/lib/types";

interface ResultadoAsignacionMasiva {
  asignados: number;
  omitidos: number;
}

function FilaProducto({ producto }: { producto: ProductoBaseAdmin }) {
  const t = useTranslations("adminCatalogoBase");
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const [asignando, setAsignando] = useState(false);
  const [skuComercial, setSkuComercial] = useState(producto.skuIndustrial);
  const [nombreComercial, setNombreComercial] = useState(producto.nombreTecnico);
  const [pvpBase, setPvpBase] = useState("");
  const [descuentoOverride, setDescuentoOverride] = useState("");
  const [resultado, setResultado] = useState<ResultadoAsignacionMasiva | null>(null);

  const alternarActivo = useMutation({
    mutationFn: () => api.patch(`/productos-base/${producto.id}`, { activo: !producto.activo }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-productos-base"] }),
    onError: (err) => setError(err instanceof ApiError ? err.message : t("genericError")),
  });

  const asignarMasivo = useMutation({
    mutationFn: () =>
      api.post<ResultadoAsignacionMasiva>(`/productos-base/${producto.id}/asignar-masivo`, {
        skuComercial,
        nombreComercial,
        pvpBase: Number(pvpBase),
        ...(descuentoOverride !== "" ? { descuentoOverride: Number(descuentoOverride) } : {}),
      }),
    onSuccess: (data) => {
      setResultado(data);
      queryClient.invalidateQueries({ queryKey: ["admin-partner-catalogo"] });
    },
    onError: (err) => setError(err instanceof ApiError ? err.message : t("genericError")),
  });

  return (
    <div className="rounded-lg border border-neutral-200 bg-white p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="font-medium text-neutral-900">{producto.nombreTecnico}</p>
          <p className="text-xs text-neutral-400">SKU {producto.skuIndustrial}</p>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`rounded-full px-2.5 py-1 text-xs font-medium ${
              producto.activo ? "bg-green-100 text-green-700" : "bg-neutral-200 text-neutral-500"
            }`}
          >
            {producto.activo ? t("active") : t("inactive")}
          </span>
          <button
            onClick={() => {
              setError(null);
              alternarActivo.mutate();
            }}
            disabled={alternarActivo.isPending}
            className="rounded-md border border-neutral-300 px-3 py-1.5 text-xs font-medium text-neutral-700 hover:bg-neutral-50 disabled:opacity-50"
          >
            {producto.activo ? t("deactivate") : t("activate")}
          </button>
          <button
            onClick={() => {
              setError(null);
              setResultado(null);
              setAsignando((v) => !v);
            }}
            className="rounded-md border border-neutral-300 px-3 py-1.5 text-xs font-medium text-neutral-700 hover:bg-neutral-50"
          >
            {t("bulkAssign")}
          </button>
        </div>
      </div>

      {asignando && (
        <div className="mt-3 rounded-md bg-neutral-50 p-3">
          <p className="mb-2 text-xs text-neutral-500">{t("bulkAssignDescription")}</p>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-4">
            <input
              value={skuComercial}
              onChange={(e) => setSkuComercial(e.target.value)}
              placeholder={t("commercialSku")}
              className="rounded-md border border-neutral-300 px-2 py-1.5 text-sm"
            />
            <input
              value={nombreComercial}
              onChange={(e) => setNombreComercial(e.target.value)}
              placeholder={t("commercialName")}
              className="rounded-md border border-neutral-300 px-2 py-1.5 text-sm"
            />
            <input
              type="number"
              min={0}
              step="0.01"
              value={pvpBase}
              onChange={(e) => setPvpBase(e.target.value)}
              placeholder={t("pvpBase")}
              className="rounded-md border border-neutral-300 px-2 py-1.5 text-sm"
            />
            <input
              type="number"
              min={0}
              max={100}
              value={descuentoOverride}
              onChange={(e) => setDescuentoOverride(e.target.value)}
              placeholder={t("discountOverrideOptional")}
              className="rounded-md border border-neutral-300 px-2 py-1.5 text-sm"
            />
          </div>
          {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
          {resultado && (
            <p className="mt-2 text-xs text-green-700">
              {t("bulkAssignResult", { asignados: resultado.asignados, omitidos: resultado.omitidos })}
            </p>
          )}
          <div className="mt-2 flex gap-2">
            <button
              onClick={() => {
                setError(null);
                setResultado(null);
                asignarMasivo.mutate();
              }}
              disabled={asignarMasivo.isPending || !skuComercial.trim() || !nombreComercial.trim() || !pvpBase}
              className="rounded-md bg-neutral-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-neutral-700 disabled:opacity-50"
            >
              {asignarMasivo.isPending ? t("bulkAssigning") : t("bulkAssignConfirm")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function AdminCatalogoBasePage() {
  const t = useTranslations("adminCatalogoBase");
  const queryClient = useQueryClient();
  const [skuIndustrial, setSkuIndustrial] = useState("");
  const [nombreTecnico, setNombreTecnico] = useState("");
  const [error, setError] = useState<string | null>(null);

  const { data: productos, isLoading } = useQuery<ProductoBaseAdmin[]>({
    queryKey: ["admin-productos-base"],
    queryFn: () => api.get<ProductoBaseAdmin[]>("/productos-base"),
  });

  const crear = useMutation({
    mutationFn: () => api.post("/productos-base", { skuIndustrial, nombreTecnico }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-productos-base"] });
      setSkuIndustrial("");
      setNombreTecnico("");
    },
    onError: (err) => setError(err instanceof ApiError ? err.message : t("genericError")),
  });

  return (
    <div>
      <h1 className="mb-2 text-2xl font-semibold text-neutral-900">{t("title")}</h1>
      <p className="mb-6 text-sm text-neutral-500">{t("description")}</p>

      <div className="mb-6 rounded-lg border border-neutral-200 bg-white p-4">
        <p className="mb-3 text-sm font-medium text-neutral-900">{t("newProduct")}</p>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          <input
            value={skuIndustrial}
            onChange={(e) => setSkuIndustrial(e.target.value)}
            placeholder={t("industrialSkuPlaceholder")}
            className="rounded-md border border-neutral-300 px-2 py-1.5 text-sm"
          />
          <input
            value={nombreTecnico}
            onChange={(e) => setNombreTecnico(e.target.value)}
            placeholder={t("technicalNamePlaceholder")}
            className="rounded-md border border-neutral-300 px-2 py-1.5 text-sm"
          />
          <button
            onClick={() => {
              setError(null);
              crear.mutate();
            }}
            disabled={crear.isPending || !skuIndustrial.trim() || !nombreTecnico.trim()}
            className="rounded-md bg-neutral-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-neutral-700 disabled:opacity-50"
          >
            {crear.isPending ? t("creating") : t("create")}
          </button>
        </div>
        {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
      </div>

      {isLoading ? (
        <p className="text-neutral-500">{t("loading")}</p>
      ) : (
        <div className="space-y-2">
          {productos?.map((producto) => (
            <FilaProducto key={producto.id} producto={producto} />
          ))}
          {productos?.length === 0 && <p className="text-neutral-500">{t("empty")}</p>}
        </div>
      )}
    </div>
  );
}
