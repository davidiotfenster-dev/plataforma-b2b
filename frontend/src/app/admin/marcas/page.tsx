"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useMutation, useQueries, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { ImageIcon, Plus, Search, Sparkles, X } from "lucide-react";
import { api, ApiError, urlImagen } from "@/lib/api";
import { candidatosParaPartner } from "@/lib/catalogo-admin";
import { FAMILIA_DE_MARCA, MARCA_INFO, MARCAS_CATALOGO } from "@/lib/marcas";
import type { CatalogoMarcaAdmin, MarcaCatalogo, ProductoBaseAdmin, ProductoMarcaAdmin } from "@/lib/types";
import { SoloAdmin } from "@/components/solo-admin";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { usePrecio } from "@/lib/formato";

/// Igual que el tope del servidor (`PVP_MAXIMO`).
const PVP_MAXIMO = 100_000;
/// Un PVP que se multiplica o divide por más de esto probablemente es un error de tecleo.
const CAMBIO_SOSPECHOSO = 2;

const ENTRADA = "h-8 w-full min-w-0 rounded-md border border-neutral-300 bg-white px-2 text-sm focus:border-neutral-500 focus:outline-none";

function Miniatura({ ruta }: { ruta: string | null | undefined }) {
  const src = urlImagen(ruta);
  return (
    <span className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-md border border-neutral-200 bg-neutral-50">
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt="" className="h-full w-full object-contain mix-blend-multiply" />
      ) : (
        <ImageIcon size={14} className="text-neutral-300" />
      )}
    </span>
  );
}

function useRefrescar(marca: MarcaCatalogo) {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: ["catalogo-marca", marca] });
    // Cambian los catálogos (y los contadores) de todas las empresas de la marca.
    queryClient.invalidateQueries({ queryKey: ["admin-partner-catalogo"] });
    queryClient.invalidateQueries({ queryKey: ["admin-partners"] });
  };
}

function FilaProductoMarca({ producto, empresas }: { producto: ProductoMarcaAdmin; empresas: number }) {
  const t = useTranslations("adminMarcas");
  const refrescar = useRefrescar(producto.marca);
  const [sku, setSku] = useState(producto.skuComercial);
  const [nombre, setNombre] = useState(producto.nombreComercial);
  const [pvp, setPvp] = useState(producto.pvpBase);
  const [error, setError] = useState<string | null>(null);
  const [confirmando, setConfirmando] = useState(false);
  const precio = usePrecio();
  const fallo = (err: unknown) => setError(err instanceof ApiError ? err.message : t("genericError"));

  const guardar = useMutation({
    mutationFn: (cambios: Record<string, unknown>) => api.patch(`/catalogos-marca/productos/${producto.id}`, cambios),
    onSuccess: () => {
      setConfirmando(false);
      refrescar();
    },
    onError: fallo,
  });
  const quitar = useMutation({
    mutationFn: () => api.delete(`/catalogos-marca/productos/${producto.id}`),
    onSuccess: refrescar,
    onError: fallo,
  });

  const cambiado = sku !== producto.skuComercial || nombre !== producto.nombreComercial || Number(pvp) !== Number(producto.pvpBase);
  const pvpAntes = Number(producto.pvpBase);
  const pvpNuevo = Number(pvp);
  const cambiaPvp = pvpNuevo !== pvpAntes;
  const sospechoso = cambiaPvp && pvpAntes > 0 && (pvpNuevo / pvpAntes > CAMBIO_SOSPECHOSO || pvpNuevo / pvpAntes < 1 / CAMBIO_SOSPECHOSO);
  const pvpValido = pvpNuevo > 0 && pvpNuevo <= PVP_MAXIMO;
  const guardarCambios = () => guardar.mutate({ skuComercial: sku.trim(), nombreComercial: nombre.trim(), pvpBase: pvpNuevo });
  const ocupado = guardar.isPending || quitar.isPending;

  return (
    <li className={`px-3 py-2 ${producto.activo ? "" : "bg-neutral-50"}`}>
      <div className={`grid grid-cols-[40px_1fr] items-center gap-2 lg:grid-cols-[40px_minmax(0,1fr)_minmax(0,2fr)_96px_auto] ${producto.activo ? "" : "opacity-60"}`}>
        <Miniatura ruta={producto.productoBase.imagenUrl} />
        <input value={sku} onChange={(e) => setSku(e.target.value)} aria-label={t("sku")} className={ENTRADA} />
        <input value={nombre} onChange={(e) => setNombre(e.target.value)} aria-label={t("name")} className={`${ENTRADA} col-span-2 lg:col-span-1`} />
        <input
          type="number"
          min={0}
          step="0.01"
          value={pvp}
          onChange={(e) => setPvp(e.target.value)}
          aria-label={t("pvp")}
          className={ENTRADA}
        />
        <div className="col-span-2 flex items-center justify-end gap-1.5 lg:col-span-1">
          <button
            onClick={() => {
              setError(null);
              // Un cambio de precio llega al momento a todas las empresas de la marca: se confirma antes.
              if (cambiaPvp) setConfirmando(true);
              else guardarCambios();
            }}
            disabled={ocupado || !cambiado || !sku.trim() || !nombre.trim() || !pvpValido}
            className="h-8 rounded-md bg-neutral-900 px-3 text-xs font-medium text-white hover:bg-neutral-700 disabled:bg-neutral-200 disabled:text-neutral-400"
          >
            {t("save")}
          </button>
          <button
            onClick={() => {
              setError(null);
              guardar.mutate({ activo: !producto.activo });
            }}
            disabled={ocupado}
            className={`h-8 rounded-md border px-2.5 text-xs font-medium disabled:opacity-50 ${
              producto.activo ? "border-neutral-300 text-neutral-600 hover:bg-neutral-100" : "border-green-300 text-green-700 hover:bg-green-50"
            }`}
          >
            {producto.activo ? t("hide") : t("show")}
          </button>
          <button
            onClick={() => {
              if (!window.confirm(t("removeConfirm", { name: producto.nombreComercial, n: empresas }))) return;
              setError(null);
              quitar.mutate();
            }}
            disabled={ocupado}
            className="h-8 rounded-md border border-transparent px-2.5 text-xs font-medium text-red-600 hover:border-red-200 hover:bg-red-50 disabled:opacity-50"
          >
            {t("remove")}
          </button>
        </div>
      </div>
      <p className="mt-1 pl-12 text-[11px] text-neutral-400">
        {producto.productoBase.nombreTecnico} · {producto.productoBase.skuIndustrial}
        {!producto.activo && <span className="ml-2 rounded bg-neutral-200 px-1.5 py-0.5 text-neutral-600">{t("hidden")}</span>}
      </p>
      {pvp !== "" && !pvpValido && (
        <p role="alert" className="mt-1 pl-12 text-xs text-red-600">
          {t("pvpInvalid", { max: precio(PVP_MAXIMO) })}
        </p>
      )}
      {error && <p className="mt-1 pl-12 text-xs text-red-600">{error}</p>}
      {confirmando && (
        <ConfirmDialog
          titulo={t("pvpConfirmTitle", { name: producto.nombreComercial })}
          descripcion={t(sospechoso ? "pvpConfirmSuspicious" : "pvpConfirmText", {
            antes: precio(pvpAntes),
            despues: precio(pvpNuevo),
            n: empresas,
          })}
          confirmar={t("pvpConfirmYes", { n: empresas })}
          peligro={sospechoso}
          cargando={guardar.isPending}
          error={error}
          onConfirmar={() => {
            setError(null);
            guardarCambios();
          }}
          onCancelar={() => setConfirmando(false)}
        />
      )}
    </li>
  );
}

function FilaAnadir({ producto, marca }: { producto: ProductoBaseAdmin; marca: MarcaCatalogo }) {
  const t = useTranslations("adminMarcas");
  const refrescar = useRefrescar(marca);
  const [propuesto] = candidatosParaPartner(producto, [FAMILIA_DE_MARCA[marca]]);
  const [sku, setSku] = useState(propuesto?.sku || producto.skuIndustrial);
  const [nombre, setNombre] = useState(propuesto?.nombre ?? "");
  const [pvp, setPvp] = useState(producto.pvpTarifa ? String(Number(producto.pvpTarifa)) : "");
  const [error, setError] = useState<string | null>(null);

  const anadir = useMutation({
    mutationFn: () =>
      api.post(`/catalogos-marca/${marca}/productos`, {
        items: [{ productoBaseId: producto.id, skuComercial: sku.trim(), nombreComercial: nombre.trim(), pvpBase: Number(pvp) }],
      }),
    onSuccess: refrescar,
    onError: (err) => setError(err instanceof ApiError ? err.message : t("genericError")),
  });

  return (
    <li className="px-3 py-2">
      <div className="grid grid-cols-[40px_1fr] items-center gap-2 lg:grid-cols-[40px_minmax(0,1fr)_minmax(0,2fr)_96px_auto]">
        <Miniatura ruta={producto.imagenUrl} />
        <input value={sku} onChange={(e) => setSku(e.target.value)} aria-label={t("sku")} className={ENTRADA} />
        <input
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          placeholder={t("namePlaceholder")}
          aria-label={t("name")}
          className={`${ENTRADA} col-span-2 lg:col-span-1`}
        />
        <input
          type="number"
          min={0}
          step="0.01"
          value={pvp}
          onChange={(e) => setPvp(e.target.value)}
          placeholder={t("pvp")}
          aria-label={t("pvp")}
          className={ENTRADA}
        />
        <div className="col-span-2 flex justify-end lg:col-span-1">
          <button
            onClick={() => {
              setError(null);
              anadir.mutate();
            }}
            disabled={anadir.isPending || !sku.trim() || !nombre.trim() || !(Number(pvp) > 0 && Number(pvp) <= PVP_MAXIMO)}
            className="inline-flex h-8 items-center gap-1 rounded-md border border-neutral-300 px-3 text-xs font-medium text-neutral-700 hover:bg-neutral-50 disabled:opacity-40"
          >
            <Plus size={12} /> {t("add")}
          </button>
        </div>
      </div>
      <p className="mt-1 pl-12 text-[11px] text-neutral-400">
        {producto.nombreTecnico} · {producto.skuIndustrial}
        {!propuesto && <span className="ml-2 text-amber-700">{t("otherBrandsOnly")}</span>}
      </p>
      {error && <p className="mt-1 pl-12 text-xs text-red-600">{error}</p>}
    </li>
  );
}

function CatalogosMarcaPageContenido() {
  const t = useTranslations("adminMarcas");
  const [marca, setMarca] = useState<MarcaCatalogo>("MYSMARTWINDOW");
  const [busqueda, setBusqueda] = useState("");
  const [verOtras, setVerOtras] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);
  const refrescar = useRefrescar(marca);

  const catalogos = useQueries({
    queries: MARCAS_CATALOGO.map((m) => ({
      queryKey: ["catalogo-marca", m],
      queryFn: () => api.get<CatalogoMarcaAdmin>(`/catalogos-marca/${m}`),
    })),
  });
  const actual = catalogos[MARCAS_CATALOGO.indexOf(marca)]?.data;

  const { data: productosBase } = useQuery<ProductoBaseAdmin[]>({
    queryKey: ["admin-productos-base"],
    queryFn: () => api.get<ProductoBaseAdmin[]>("/productos-base"),
  });

  const rellenar = useMutation({
    mutationFn: () => api.post<{ anadidos: number }>(`/catalogos-marca/${marca}/rellenar`),
    onSuccess: (r) => {
      setAviso(t("filled", { n: r.anadidos }));
      refrescar();
    },
    onError: (err) => setAviso(err instanceof ApiError ? err.message : t("genericError")),
  });

  const texto = busqueda.trim().toLowerCase();
  const coincide = (...campos: string[]) => !texto || campos.join(" ").toLowerCase().includes(texto);

  const enCatalogo = useMemo(
    () =>
      (actual?.productos ?? []).filter((p) =>
        coincide(p.skuComercial, p.nombreComercial, p.productoBase.nombreTecnico, p.productoBase.skuIndustrial),
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [actual, texto],
  );

  // Productos base que aún no están en la marca: primero los que la marca vende
  // (tienen nombre en ella); los de otras marcas, solo si se piden.
  const disponibles = useMemo(() => {
    const ya = new Set((actual?.productos ?? []).map((p) => p.productoBaseId));
    const familia = FAMILIA_DE_MARCA[marca];
    return (productosBase ?? [])
      .filter((p) => p.activo && !ya.has(p.id))
      .filter((p) => coincide(p.nombreTecnico, p.skuIndustrial))
      .map((p) => ({ producto: p, deLaMarca: candidatosParaPartner(p, [familia]).length > 0 }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productosBase, actual, marca, texto]);
  const propios = disponibles.filter((d) => d.deLaMarca);
  const deOtras = disponibles.filter((d) => !d.deLaMarca);
  const numEmpresas = (actual?.empresas.partners ?? 0) + (actual?.empresas.distribuidores ?? 0);

  return (
    <div style={{ width: "min(1440px, calc(100vw - 3rem))", marginLeft: "calc(50% - min(720px, 50vw - 1.5rem))" }}>
      <h1 className="text-2xl font-semibold text-neutral-900">{t("title")}</h1>
      <p className="mt-1 max-w-3xl text-sm text-neutral-500">{t("description")}</p>

      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        {MARCAS_CATALOGO.map((m, i) => {
          const info = MARCA_INFO[m];
          const datos = catalogos[i]?.data;
          const elegida = m === marca;
          return (
            <button
              key={m}
              onClick={() => {
                setMarca(m);
                setAviso(null);
              }}
              aria-pressed={elegida}
              className={`flex items-center gap-3 rounded-xl border border-t-4 bg-white p-4 text-left transition ${info.borde} ${
                elegida ? "border-neutral-400 shadow-md ring-2 ring-neutral-900" : "border-neutral-200 shadow-sm hover:shadow-md"
              }`}
            >
              <span className={`flex size-11 shrink-0 items-center justify-center rounded-lg text-sm font-bold text-white ${info.acento}`}>
                {info.submarca.slice(0, 2).toUpperCase()}
              </span>
              <span className="min-w-0">
                <span className="block font-semibold text-neutral-900">
                  {info.submarca} <span className="font-normal text-neutral-500">· {info.etiqueta}</span>
                </span>
                <span className="block text-xs text-neutral-500">
                  {datos
                    ? t("cardStats", { productos: datos.productos.length, partners: datos.empresas.partners, distribuidores: datos.empresas.distribuidores })
                    : "…"}
                </span>
              </span>
            </button>
          );
        })}
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-2">
        <div className="relative min-w-64 flex-1 sm:max-w-md">
          <Search size={15} className="absolute left-3 top-2.5 text-neutral-400" />
          <input
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder={t("search")}
            className="w-full rounded-md border border-neutral-300 bg-white py-1.5 pl-9 pr-8 text-sm"
          />
          {busqueda && (
            <button onClick={() => setBusqueda("")} aria-label={t("clear")} className="absolute right-2 top-2 text-neutral-400 hover:text-neutral-700">
              <X size={15} />
            </button>
          )}
        </div>
        <button
          onClick={() => {
            setAviso(null);
            rellenar.mutate();
          }}
          disabled={rellenar.isPending || propios.length === 0}
          className="inline-flex items-center gap-1.5 rounded-md bg-neutral-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-neutral-700 disabled:opacity-40"
        >
          <Sparkles size={14} /> {t("fill", { n: propios.length })}
        </button>
        {aviso && <span className="text-sm text-neutral-600">{aviso}</span>}
      </div>
      <p className="mt-2 text-xs text-neutral-500">
        {t("appliesTo", { n: numEmpresas, marca: MARCA_INFO[marca].submarca })}{" "}
        <Link href="/admin/partners" className="underline hover:text-neutral-800">
          {t("seeCompanies")}
        </Link>
      </p>

      <h2 className="mb-2 mt-6 text-sm font-medium text-neutral-900">
        {t("inCatalog", { marca: MARCA_INFO[marca].submarca })} <span className="font-normal text-neutral-400">{enCatalogo.length}</span>
      </h2>
      <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-sm">
        <div className="hidden gap-2 border-b border-neutral-200 bg-neutral-50 px-3 py-1.5 text-xs font-medium text-neutral-500 lg:grid lg:grid-cols-[40px_minmax(0,1fr)_minmax(0,2fr)_96px_auto]">
          <span />
          <span>{t("sku")}</span>
          <span>{t("name")}</span>
          <span>{t("pvp")}</span>
          <span className="w-[230px]" />
        </div>
        {actual ? (
          <ul className="divide-y divide-neutral-100">
            {enCatalogo.map((p) => (
              <FilaProductoMarca key={`${p.id}-${p.skuComercial}-${p.nombreComercial}-${p.pvpBase}`} producto={p} empresas={numEmpresas} />
            ))}
            {enCatalogo.length === 0 && <li className="px-3 py-6 text-center text-sm text-neutral-500">{t("empty")}</li>}
          </ul>
        ) : (
          <p className="px-3 py-6 text-sm text-neutral-500">{t("loading")}</p>
        )}
      </div>

      <h2 className="mb-1 mt-8 text-sm font-medium text-neutral-900">
        {t("canAdd")} <span className="font-normal text-neutral-400">{propios.length}</span>
      </h2>
      <p className="mb-2 text-xs text-neutral-500">{t("canAddHelp")}</p>
      {propios.length > 0 ? (
        <ul className="divide-y divide-neutral-100 overflow-hidden rounded-xl border border-dashed border-neutral-300 bg-white">
          {propios.map(({ producto }) => (
            <FilaAnadir key={`${marca}-${producto.id}`} producto={producto} marca={marca} />
          ))}
        </ul>
      ) : (
        <p className="rounded-xl border border-dashed border-neutral-300 px-3 py-4 text-sm text-neutral-500">{t("nothingToAdd")}</p>
      )}

      {deOtras.length > 0 && (
        <div className="mt-6 pb-16">
          <button onClick={() => setVerOtras((v) => !v)} className="text-sm text-neutral-600 underline hover:text-neutral-900">
            {verOtras ? t("hideOthers") : t("showOthers", { n: deOtras.length })}
          </button>
          {verOtras && (
            <ul className="mt-2 divide-y divide-neutral-100 overflow-hidden rounded-xl border border-dashed border-neutral-300 bg-white">
              {deOtras.map(({ producto }) => (
                <FilaAnadir key={`${marca}-${producto.id}`} producto={producto} marca={marca} />
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

export default function CatalogosMarcaPage() {
  return (
    <SoloAdmin>
      <CatalogosMarcaPageContenido />
    </SoloAdmin>
  );
}
