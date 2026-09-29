"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { api, ApiError } from "@/lib/api";
import type { Partner, ProductoBaseAdmin, RepresentacionAdmin } from "@/lib/types";

function FilaAsignada({ rep, partnerId, descuentoGeneral }: { rep: RepresentacionAdmin; partnerId: string; descuentoGeneral: string }) {
  const t = useTranslations("adminPartnerCatalogo");
  const queryClient = useQueryClient();
  const [skuComercial, setSkuComercial] = useState(rep.skuComercial);
  const [nombreComercial, setNombreComercial] = useState(rep.nombreComercial);
  const [pvpBase, setPvpBase] = useState(rep.pvpBase);
  const [descuentoOverride, setDescuentoOverride] = useState(rep.descuentoOverride ?? "");
  const [error, setError] = useState<string | null>(null);

  function claveInvalidar() {
    queryClient.invalidateQueries({ queryKey: ["admin-partner-catalogo", partnerId] });
  }

  const guardar = useMutation({
    mutationFn: () =>
      api.patch(`/partners/${partnerId}/catalogo/${rep.id}`, {
        skuComercial,
        nombreComercial,
        pvpBase: Number(pvpBase),
        descuentoOverride: descuentoOverride === "" ? null : Number(descuentoOverride),
      }),
    onSuccess: claveInvalidar,
    onError: (err) => setError(err instanceof ApiError ? err.message : t("genericError")),
  });

  const alternarActivo = useMutation({
    mutationFn: () => api.patch(`/partners/${partnerId}/catalogo/${rep.id}`, { activo: !rep.activo }),
    onSuccess: claveInvalidar,
    onError: (err) => setError(err instanceof ApiError ? err.message : t("genericError")),
  });

  return (
    <div className="rounded-lg border border-neutral-200 bg-white p-3">
      <p className="mb-2 text-xs text-neutral-400">{rep.productoBase.nombreTecnico} · SKU industrial {rep.productoBase.skuIndustrial}</p>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-5">
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
          placeholder={t("discountOverridePlaceholder", { general: descuentoGeneral })}
          className="rounded-md border border-neutral-300 px-2 py-1.5 text-sm"
        />
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setError(null);
              guardar.mutate();
            }}
            disabled={guardar.isPending}
            className="rounded-md bg-neutral-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-neutral-700 disabled:opacity-50"
          >
            {guardar.isPending ? t("saving") : t("save")}
          </button>
          <button
            onClick={() => {
              setError(null);
              alternarActivo.mutate();
            }}
            disabled={alternarActivo.isPending}
            className={`rounded-md border px-3 py-1.5 text-xs font-medium disabled:opacity-50 ${
              rep.activo ? "border-red-300 text-red-600 hover:bg-red-50" : "border-green-300 text-green-700 hover:bg-green-50"
            }`}
          >
            {rep.activo ? t("deactivate") : t("activate")}
          </button>
        </div>
      </div>
      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
    </div>
  );
}

function FilaAsignar({ producto, partnerId }: { producto: ProductoBaseAdmin; partnerId: string }) {
  const t = useTranslations("adminPartnerCatalogo");
  const queryClient = useQueryClient();
  const [abierto, setAbierto] = useState(false);
  const [skuComercial, setSkuComercial] = useState("");
  const [nombreComercial, setNombreComercial] = useState(producto.nombreTecnico);
  const [pvpBase, setPvpBase] = useState("");
  const [descuentoOverride, setDescuentoOverride] = useState("");
  const [error, setError] = useState<string | null>(null);

  const asignar = useMutation({
    mutationFn: () =>
      api.post(`/partners/${partnerId}/catalogo`, {
        items: [
          {
            productoBaseId: producto.id,
            skuComercial,
            nombreComercial,
            pvpBase: Number(pvpBase),
            ...(descuentoOverride !== "" ? { descuentoOverride: Number(descuentoOverride) } : {}),
          },
        ],
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-partner-catalogo", partnerId] });
      setAbierto(false);
      setSkuComercial("");
      setPvpBase("");
      setDescuentoOverride("");
    },
    onError: (err) => setError(err instanceof ApiError ? err.message : t("genericError")),
  });

  if (!abierto) {
    return (
      <div className="flex items-center justify-between rounded-lg border border-dashed border-neutral-300 p-3">
        <div>
          <p className="text-sm font-medium text-neutral-700">{producto.nombreTecnico}</p>
          <p className="text-xs text-neutral-400">SKU {producto.skuIndustrial}</p>
        </div>
        <button
          onClick={() => setAbierto(true)}
          className="rounded-md border border-neutral-300 px-3 py-1.5 text-xs font-medium text-neutral-700 hover:bg-neutral-50"
        >
          {t("assign")}
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-neutral-300 bg-neutral-50 p-3">
      <p className="mb-2 text-xs text-neutral-500">{producto.nombreTecnico} · SKU {producto.skuIndustrial}</p>
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
      <div className="mt-2 flex gap-2">
        <button
          onClick={() => {
            setError(null);
            asignar.mutate();
          }}
          disabled={asignar.isPending || !skuComercial.trim() || !nombreComercial.trim() || !pvpBase}
          className="rounded-md bg-neutral-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-neutral-700 disabled:opacity-50"
        >
          {asignar.isPending ? t("assigning") : t("confirmAssign")}
        </button>
        <button
          onClick={() => setAbierto(false)}
          className="rounded-md border border-neutral-300 px-3 py-1.5 text-xs text-neutral-700 hover:bg-neutral-50"
        >
          {t("dismiss")}
        </button>
      </div>
    </div>
  );
}

export default function AdminPartnerCatalogoPage() {
  const params = useParams<{ id: string }>();
  const partnerId = params.id;
  const t = useTranslations("adminPartnerCatalogo");

  const { data: partner } = useQuery<Partner>({
    queryKey: ["admin-partner", partnerId],
    queryFn: () => api.get<Partner>(`/partners/${partnerId}`),
  });

  const { data: representaciones, isLoading: cargandoRepresentaciones } = useQuery<RepresentacionAdmin[]>({
    queryKey: ["admin-partner-catalogo", partnerId],
    queryFn: () => api.get<RepresentacionAdmin[]>(`/partners/${partnerId}/catalogo`),
  });

  const { data: productosBase, isLoading: cargandoProductosBase } = useQuery<ProductoBaseAdmin[]>({
    queryKey: ["admin-productos-base"],
    queryFn: () => api.get<ProductoBaseAdmin[]>("/productos-base"),
  });

  const productosDisponibles = useMemo(() => {
    if (!productosBase) return [];
    const asignados = new Set(representaciones?.map((rep) => rep.productoBaseId));
    return productosBase.filter((producto) => producto.activo && !asignados.has(producto.id));
  }, [productosBase, representaciones]);

  return (
    <div>
      <Link href="/admin/partners" className="mb-4 inline-block text-sm text-neutral-500 hover:text-neutral-700">
        ← {t("back")}
      </Link>
      <h1 className="mb-1 text-2xl font-semibold text-neutral-900">{t("title", { partner: partner?.razonSocial ?? "…" })}</h1>
      <p className="mb-6 text-sm text-neutral-500">
        {t("generalDiscount", { descuento: partner?.descuentoPorcentaje ?? "…" })}
      </p>

      <h2 className="mb-3 text-sm font-medium text-neutral-900">{t("assignedTitle")}</h2>
      {cargandoRepresentaciones ? (
        <p className="text-neutral-500">{t("loading")}</p>
      ) : (
        <div className="mb-8 space-y-2">
          {representaciones?.map((rep) => (
            <FilaAsignada key={rep.id} rep={rep} partnerId={partnerId} descuentoGeneral={partner?.descuentoPorcentaje ?? "0"} />
          ))}
          {representaciones?.length === 0 && <p className="text-neutral-500">{t("assignedEmpty")}</p>}
        </div>
      )}

      <h2 className="mb-3 text-sm font-medium text-neutral-900">{t("availableTitle")}</h2>
      {cargandoProductosBase ? (
        <p className="text-neutral-500">{t("loading")}</p>
      ) : (
        <div className="space-y-2">
          {productosDisponibles.map((producto) => (
            <FilaAsignar key={producto.id} producto={producto} partnerId={partnerId} />
          ))}
          {productosDisponibles.length === 0 && <p className="text-neutral-500">{t("availableEmpty")}</p>}
        </div>
      )}
    </div>
  );
}
