"use client";

import { useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { api, ApiError } from "@/lib/api";
import { FAMILIAS_DE_MARCA, familiasDelPartner, propuestaCatalogoDeMarca, sugerenciaManual } from "@/lib/catalogo-admin";
import type { Partner, ProductoBaseAdmin, RepresentacionAdmin } from "@/lib/types";
import { PartnerHeader } from "../../partner-header";

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

  const borrar = useMutation({
    mutationFn: () => api.delete(`/partners/${partnerId}/catalogo/${rep.id}`),
    onSuccess: () => {
      claveInvalidar();
      // Vuelve a aparecer en "disponibles" y cambian los contadores del catálogo global.
      queryClient.invalidateQueries({ queryKey: ["admin-productos-base"] });
    },
    onError: (err) => setError(err instanceof ApiError ? err.message : t("genericError")),
  });

  const cambiado =
    skuComercial !== rep.skuComercial ||
    nombreComercial !== rep.nombreComercial ||
    Number(pvpBase) !== Number(rep.pvpBase) ||
    (descuentoOverride === "" ? null : Number(descuentoOverride)) !== (rep.descuentoOverride == null ? null : Number(rep.descuentoOverride));
  const ocupado = guardar.isPending || alternarActivo.isPending || borrar.isPending;
  const entrada = "h-8 w-full min-w-0 rounded-md border border-neutral-300 bg-white px-2 text-sm focus:border-neutral-500 focus:outline-none";

  return (
    <div className={`px-3 py-2 ${rep.activo ? "" : "bg-neutral-50"}`}>
      <div className={`grid grid-cols-2 items-center gap-2 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,2fr)_84px_120px_auto] ${rep.activo ? "" : "opacity-60"}`}>
        <input value={skuComercial} onChange={(e) => setSkuComercial(e.target.value)} placeholder={t("commercialSku")} className={entrada} />
        <input value={nombreComercial} onChange={(e) => setNombreComercial(e.target.value)} placeholder={t("commercialName")} className={entrada} />
        <input
          type="number"
          min={0}
          step="0.01"
          value={pvpBase}
          onChange={(e) => setPvpBase(e.target.value)}
          placeholder={t("pvpBase")}
          className={entrada}
        />
        <input
          type="number"
          min={0}
          max={100}
          value={descuentoOverride}
          onChange={(e) => setDescuentoOverride(e.target.value)}
          placeholder={t("discountOverridePlaceholder", { general: descuentoGeneral })}
          className={entrada}
        />
        <div className="col-span-2 flex items-center justify-end gap-1.5 lg:col-span-1">
          <button
            onClick={() => {
              setError(null);
              guardar.mutate();
            }}
            disabled={ocupado || !cambiado}
            className="h-8 rounded-md bg-neutral-900 px-3 text-xs font-medium text-white hover:bg-neutral-700 disabled:bg-neutral-200 disabled:text-neutral-400"
          >
            {guardar.isPending ? t("saving") : t("save")}
          </button>
          <button
            onClick={() => {
              setError(null);
              alternarActivo.mutate();
            }}
            disabled={ocupado}
            className={`h-8 rounded-md border px-2.5 text-xs font-medium disabled:opacity-50 ${
              rep.activo ? "border-neutral-300 text-neutral-600 hover:bg-neutral-100" : "border-green-300 text-green-700 hover:bg-green-50"
            }`}
          >
            {rep.activo ? t("deactivate") : t("activate")}
          </button>
          <button
            onClick={() => {
              if (!window.confirm(t("deleteConfirm", { name: rep.nombreComercial }))) return;
              setError(null);
              borrar.mutate();
            }}
            disabled={ocupado}
            title={t("delete")}
            aria-label={t("delete")}
            className="h-8 rounded-md border border-transparent px-2.5 text-xs font-medium text-red-600 hover:border-red-200 hover:bg-red-50 disabled:opacity-50"
          >
            {borrar.isPending ? t("deleting") : t("delete")}
          </button>
        </div>
      </div>
      <p className="mt-1 text-[11px] text-neutral-400">
        {rep.productoBase.nombreTecnico} · {rep.productoBase.skuIndustrial}
        {!rep.activo && <span className="ml-2 rounded bg-neutral-200 px-1.5 py-0.5 text-neutral-600">{t("inactive")}</span>}
      </p>
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}

function FilaAsignar({ producto, partnerId, partner }: { producto: ProductoBaseAdmin; partnerId: string; partner: Partner | null }) {
  const t = useTranslations("adminPartnerCatalogo");
  const queryClient = useQueryClient();
  const [abierto, setAbierto] = useState(false);
  const [skuComercial, setSkuComercial] = useState("");
  const [nombreComercial, setNombreComercial] = useState("");
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
      // Los contadores "sin asignar" / "partners" del catálogo global dependen de esto.
      queryClient.invalidateQueries({ queryKey: ["admin-productos-base"] });
      setAbierto(false);
      setSkuComercial("");
      setNombreComercial("");
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
          onClick={() => {
            // Nombre y SKU de la marca de este partner. Nunca el nombre técnico
            // multimarca: si no hay equivalente, se deja vacío para escribirlo.
            const sugerido = sugerenciaManual(producto, partner);
            setSkuComercial(sugerido.sku);
            setNombreComercial(sugerido.nombre);
            setAbierto(true);
          }}
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

function AsignarPorMarca({ productos, partnerId, partner }: { productos: ProductoBaseAdmin[]; partnerId: string; partner: Partner | null }) {
  const t = useTranslations("adminPartnerCatalogo");
  const queryClient = useQueryClient();
  const detectada = partner ? familiasDelPartner(partner)[0] ?? "" : "";
  const [elegida, setElegida] = useState<string | null>(null);
  const familia = elegida ?? detectada;
  const [error, setError] = useState<string | null>(null);

  const propuesta = useMemo(() => (familia ? propuestaCatalogoDeMarca(productos, [familia]) : null), [productos, familia]);

  const asignar = useMutation({
    mutationFn: () => api.post(`/partners/${partnerId}/catalogo`, { items: propuesta?.items ?? [] }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-partner-catalogo", partnerId] });
      queryClient.invalidateQueries({ queryKey: ["admin-productos-base"] });
    },
    onError: (err) => setError(err instanceof ApiError ? err.message : t("genericError")),
  });

  return (
    <div className="mb-6 rounded-lg border border-neutral-200 bg-neutral-50 p-4">
      <h2 className="text-sm font-medium text-neutral-900">{t("brandTitle")}</h2>
      <p className="mt-1 text-xs text-neutral-500">{t("brandHelp")}</p>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <label className="text-xs text-neutral-600" htmlFor="marca-catalogo">
          {t("brandLabel")}
        </label>
        <select
          id="marca-catalogo"
          value={familia}
          onChange={(e) => {
            setElegida(e.target.value);
            setError(null);
          }}
          className="rounded-md border border-neutral-300 bg-white px-2 py-1.5 text-sm"
        >
          <option value="">{t("brandNone")}</option>
          {FAMILIAS_DE_MARCA.map((f) => (
            <option key={f.clave} value={f.clave}>
              {f.etiqueta}
            </option>
          ))}
        </select>
        <button
          onClick={() => {
            setError(null);
            asignar.mutate();
          }}
          disabled={asignar.isPending || !propuesta || propuesta.items.length === 0}
          className="rounded-md bg-neutral-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-neutral-700 disabled:opacity-50"
        >
          {asignar.isPending ? t("brandAssigning") : t("brandAssign", { n: propuesta?.items.length ?? 0 })}
        </button>
      </div>
      {propuesta && propuesta.items.length === 0 && <p className="mt-2 text-xs text-neutral-500">{t("brandNothing")}</p>}
      {propuesta && propuesta.sinPrecio.length > 0 && (
        <p className="mt-2 text-xs text-amber-700">{t("brandNoPrice", { n: propuesta.sinPrecio.length })}</p>
      )}
      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
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

  const [filtro, setFiltro] = useState("");
  const representacionesFiltradas = useMemo(() => {
    const q = filtro.trim().toLowerCase();
    if (!q || !representaciones) return representaciones ?? [];
    return representaciones.filter((r) =>
      [r.skuComercial, r.nombreComercial, r.productoBase.nombreTecnico, r.productoBase.skuIndustrial].some((v) => v.toLowerCase().includes(q)),
    );
  }, [representaciones, filtro]);

  const productosDisponibles = useMemo(() => {
    if (!productosBase) return [];
    const asignados = new Set(representaciones?.map((rep) => rep.productoBaseId));
    return productosBase.filter((producto) => producto.activo && !asignados.has(producto.id));
  }, [productosBase, representaciones]);

  return (
    <div>
      <PartnerHeader partnerId={partnerId} activa="catalogo" />
      <p className="mb-6 text-sm text-neutral-500">
        {t("generalDiscount", { descuento: partner ? Number(partner.descuentoPorcentaje) : "…" })}
      </p>

      <h2 className="mb-3 text-sm font-medium text-neutral-900">{t("assignedTitle")}</h2>
      {cargandoRepresentaciones ? (
        <p className="text-neutral-500">{t("loading")}</p>
      ) : (
        <div className="mb-8">
          {representaciones && representaciones.length > 0 && (
            <input
              type="search"
              value={filtro}
              onChange={(e) => setFiltro(e.target.value)}
              placeholder={t("searchAssigned")}
              className="mb-2 h-8 w-full max-w-sm rounded-md border border-neutral-300 px-2 text-sm focus:border-neutral-500 focus:outline-none"
            />
          )}
          {representacionesFiltradas.length > 0 && (
            <div className="overflow-hidden rounded-lg border border-neutral-200 bg-white">
              <div
                className="hidden gap-2 border-b border-neutral-200 bg-neutral-50 px-3 py-1.5 text-xs font-medium text-neutral-500 lg:grid lg:grid-cols-[minmax(0,1.2fr)_minmax(0,2fr)_84px_120px_auto]"
                aria-hidden="true"
              >
                <span>{t("commercialSku")}</span>
                <span>{t("commercialName")}</span>
                <span>{t("pvpBase")}</span>
                <span>{t("discountShort")}</span>
                <span className="w-[214px]" />
              </div>
              <div className="divide-y divide-neutral-100">
                {representacionesFiltradas.map((rep) => (
                  <FilaAsignada key={rep.id} rep={rep} partnerId={partnerId} descuentoGeneral={partner?.descuentoPorcentaje ?? "0"} />
                ))}
              </div>
            </div>
          )}
          {representaciones && representaciones.length > 0 && representacionesFiltradas.length === 0 && (
            <p className="text-sm text-neutral-500">{t("searchEmpty")}</p>
          )}
          {representaciones?.length === 0 && <p className="text-neutral-500">{t("assignedEmpty")}</p>}
        </div>
      )}

      <AsignarPorMarca productos={productosDisponibles} partnerId={partnerId} partner={partner ?? null} />

      <h2 className="mb-3 text-sm font-medium text-neutral-900">{t("availableTitle")}</h2>
      {cargandoProductosBase ? (
        <p className="text-neutral-500">{t("loading")}</p>
      ) : (
        <div className="space-y-2">
          {productosDisponibles.map((producto) => (
            <FilaAsignar key={producto.id} producto={producto} partnerId={partnerId} partner={partner ?? null} />
          ))}
          {productosDisponibles.length === 0 && <p className="text-neutral-500">{t("availableEmpty")}</p>}
        </div>
      )}
    </div>
  );
}
