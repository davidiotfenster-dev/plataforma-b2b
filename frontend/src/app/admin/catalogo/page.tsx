"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { Boxes, ChevronDown, ChevronRight, ImageIcon, Plus, Search, Tags, Upload, Users, X } from "lucide-react";
import { api, ApiError, urlImagen } from "@/lib/api";
import {
  agruparPorModelo,
  especificacionesVisibles,
  FAMILIAS_DE_MARCA,
  nombreEnMarca,
  productosPorMarca,
  SIN_MARCA,
  etiquetaCortaGrupo,
  type Modelo,
  muestraDeColor,
  numPartners,
  partesDeNombre,
  referenciasDe,
  tieneCodigos,
} from "@/lib/catalogo-admin";
import type { ProductoBaseAdmin, RepresentacionDeBase } from "@/lib/types";
import { AsignarPanel } from "./asignar-panel";
import { SoloAdmin } from "@/components/solo-admin";
import { usePrecio } from "@/lib/formato";

type FiltroRapido = "todos" | "sinAsignar" | "sinCodigos";
type Vista = "aparato" | "marca";

/// En la vista por marca, cada modelo lleva el nombre con el que lo vende esa marca.
type ModeloVista = Modelo & { nombreMarca?: string };

/// Color de cada marca en el panel (solo decorativo).
const ESTILO_MARCA: Record<string, { acento: string; suave: string; texto: string; iniciales: string }> = {
  vbh: { acento: "bg-sky-600", suave: "bg-sky-50", texto: "text-sky-700", iniciales: "VBH" },
  procomsa: { acento: "bg-orange-500", suave: "bg-orange-50", texto: "text-orange-700", iniciales: "PR" },
  mysmartwindow: { acento: "bg-teal-600", suave: "bg-teal-50", texto: "text-teal-700", iniciales: "MSW" },
  [SIN_MARCA]: { acento: "bg-neutral-500", suave: "bg-neutral-100", texto: "text-neutral-600", iniciales: "—" },
};

/// Etiqueta de marca que devuelve `partesDeNombre` para cada familia.
const MARCA_DE_FAMILIA: Record<string, string> = { vbh: "VBH", procomsa: "Procomsa", mysmartwindow: "MySmartWindow" };

/// Un aparato con varios nombres según la marca: cada nombre en su propia
/// etiqueta con la marca debajo, en vez de pegados con barras.
function NombreMultimarca({ nombre, className = "" }: { nombre: string; className?: string }) {
  const partes = partesDeNombre(nombre);
  if (partes.length < 2) return <span className={className}>{nombre}</span>;
  return (
    <span className="flex flex-wrap items-center gap-1.5">
      {partes.map((p) => (
        <span key={p.texto} className="inline-flex flex-col rounded-md border border-neutral-200 bg-white px-2 py-0.5 leading-tight">
          <span className={className}>{p.texto}</span>
          {p.marca && <span className="text-[10px] font-normal text-neutral-400">{p.marca}</span>}
        </span>
      ))}
    </span>
  );
}

function grupoDe(p: ProductoBaseAdmin, sinGrupo: string) {
  return p.especificacionesJson?.grupo ?? sinGrupo;
}

/// Cambiar / quitar la foto de uno o varios productos. La misma foto sirve para
/// todas las marcas y colores del aparato.
function useImagenes(onError: (mensaje: string) => void) {
  const queryClient = useQueryClient();
  const t = useTranslations("adminCatalogoBase");
  const refrescar = () => queryClient.invalidateQueries({ queryKey: ["admin-productos-base"] });
  const fallo = (err: unknown) => onError(err instanceof ApiError ? err.message : t("genericError"));
  const subir = useMutation({
    mutationFn: ({ ids, archivo }: { ids: string[]; archivo: File }) => {
      const form = new FormData();
      form.append("ids", JSON.stringify(ids));
      form.append("archivo", archivo);
      return api.upload("/productos-base/imagen", form);
    },
    onSuccess: refrescar,
    onError: fallo,
  });
  const quitar = useMutation({
    mutationFn: (ids: string[]) => api.delete("/productos-base/imagen", { ids }),
    onSuccess: refrescar,
    onError: fallo,
  });
  return { subir, quitar, ocupado: subir.isPending || quitar.isPending };
}

function Miniatura({ producto, tamano = "h-8 w-8" }: { producto: ProductoBaseAdmin; tamano?: string }) {
  const src = urlImagen(producto.imagenUrl);
  return (
    <span className={`flex ${tamano} shrink-0 items-center justify-center overflow-hidden rounded-md border border-neutral-200 bg-neutral-50`}>
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt="" className="h-full w-full object-contain mix-blend-multiply" />
      ) : (
        <ImageIcon size={14} className="text-neutral-300" />
      )}
    </span>
  );
}

function DetalleProducto({ producto, onAsignar }: { producto: ProductoBaseAdmin; onAsignar: () => void }) {
  const t = useTranslations("adminCatalogoBase");
  const precio = usePrecio();
  const queryClient = useQueryClient();
  const [nombre, setNombre] = useState(producto.nombreTecnico);
  const [error, setError] = useState<string | null>(null);
  const refs = referenciasDe(producto);
  const specs = especificacionesVisibles(producto);
  const [errorImagen, setErrorImagen] = useState<string | null>(null);
  const imagenes = useImagenes(setErrorImagen);

  const { data: asignaciones, isLoading } = useQuery<RepresentacionDeBase[]>({
    queryKey: ["admin-producto-partners", producto.id],
    queryFn: () => api.get<RepresentacionDeBase[]>(`/productos-base/${producto.id}/representaciones`),
  });

  const actualizar = useMutation({
    mutationFn: (cambios: { activo?: boolean; nombreTecnico?: string }) =>
      api.patch(`/productos-base/${producto.id}`, cambios),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-productos-base"] }),
    onError: (err) => setError(err instanceof ApiError ? err.message : t("genericError")),
  });

  return (
    <div className="grid gap-4 border-t border-neutral-100 bg-neutral-50 px-4 py-4 lg:grid-cols-2">
      <div>
        <div className="mb-4 flex items-center gap-3">
          <Miniatura producto={producto} tamano="h-20 w-20" />
          <div>
            <h4 className="mb-1 text-xs font-semibold uppercase tracking-wide text-neutral-500">{t("image")}</h4>
            <div className="flex gap-2">
              <label
                className={`inline-flex cursor-pointer items-center gap-1 rounded-md border border-neutral-300 bg-white px-3 py-1 text-xs font-medium text-neutral-700 hover:bg-neutral-100 ${imagenes.ocupado ? "pointer-events-none opacity-50" : ""}`}
              >
                <Upload size={12} /> {producto.imagenUrl ? t("changeImage") : t("uploadImage")}
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  className="hidden"
                  onChange={(e) => {
                    const archivo = e.target.files?.[0];
                    e.target.value = "";
                    if (!archivo) return;
                    setErrorImagen(null);
                    imagenes.subir.mutate({ ids: [producto.id], archivo });
                  }}
                />
              </label>
              {producto.imagenUrl && (
                <button
                  onClick={() => {
                    if (!window.confirm(t("removeImageConfirm", { n: 1 }))) return;
                    setErrorImagen(null);
                    imagenes.quitar.mutate([producto.id]);
                  }}
                  disabled={imagenes.ocupado}
                  className="rounded-md border border-transparent px-2.5 py-1 text-xs font-medium text-red-600 hover:border-red-200 hover:bg-red-50 disabled:opacity-50"
                >
                  {t("removeImage")}
                </button>
              )}
            </div>
            <p className="mt-1 text-[11px] text-neutral-400">{t("imageHelp")}</p>
            {errorImagen && <p className="mt-1 text-xs text-red-600">{errorImagen}</p>}
          </div>
        </div>
        <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-500">{t("namesByBrand")}</h4>
        {producto.especificacionesJson?.pendiente && (
          <p className="mb-2 rounded bg-amber-50 px-2 py-1 text-xs text-amber-700">{producto.especificacionesJson.pendiente}</p>
        )}
        {refs.length === 0 ? (
          <p className="text-xs text-neutral-500">{t("noReferences")}</p>
        ) : (
          <table className="w-full text-xs">
            <thead>
              <tr className="text-left text-neutral-500">
                <th className="py-1 pr-2 font-medium">{t("colBrand")}</th>
                <th className="py-1 pr-2 font-medium">{t("colNameInBrand")}</th>
                <th className="py-1 font-medium">GTIN</th>
              </tr>
            </thead>
            <tbody>
              {refs.map((r) => (
                <tr key={`${r.marca}-${r.refInterna}`} className="border-t border-neutral-200 text-neutral-700">
                  <td className="py-1 pr-2 font-medium">{r.marca}</td>
                  <td className="py-1 pr-2">
                    {r.nombre}
                    <span className="block font-mono text-[11px] text-neutral-400">{r.refInterna}</span>
                  </td>
                  <td className="py-1 font-mono">{r.gtin ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {specs.length > 0 && (
          <div className="mt-4">
            <h4 className="mb-1 text-xs font-semibold uppercase tracking-wide text-neutral-500">{t("partnerSpecs")}</h4>
            <dl className="divide-y divide-neutral-200 rounded-md border border-neutral-200 bg-white text-xs">
              {specs.map(([clave, valor]) => (
                <div key={clave} className="flex justify-between gap-3 px-3 py-1.5">
                  <dt className="text-neutral-500">{clave}</dt>
                  <dd className="text-right text-neutral-800">{valor}</dd>
                </div>
              ))}
            </dl>
          </div>
        )}

        <div className="mt-4 flex items-center gap-2">
          <input
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            className="min-w-0 flex-1 rounded-md border border-neutral-300 bg-white px-2 py-1.5 text-sm"
            aria-label={t("technicalNamePlaceholder")}
          />
          <button
            onClick={() => {
              setError(null);
              actualizar.mutate({ nombreTecnico: nombre.trim() });
            }}
            disabled={actualizar.isPending || !nombre.trim() || nombre.trim() === producto.nombreTecnico}
            className="rounded-md border border-neutral-300 bg-white px-3 py-1.5 text-xs font-medium text-neutral-700 hover:bg-neutral-100 disabled:opacity-40"
          >
            {t("rename")}
          </button>
        </div>
        {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between">
          <h4 className="text-xs font-semibold uppercase tracking-wide text-neutral-500">{t("assignedTo")}</h4>
          <div className="flex gap-2">
            <button
              onClick={() => actualizar.mutate({ activo: !producto.activo })}
              disabled={actualizar.isPending}
              className="rounded-md border border-neutral-300 bg-white px-3 py-1 text-xs font-medium text-neutral-700 hover:bg-neutral-100 disabled:opacity-40"
            >
              {producto.activo ? t("deactivate") : t("activate")}
            </button>
            <button
              onClick={onAsignar}
              className="inline-flex items-center gap-1 rounded-md bg-neutral-900 px-3 py-1 text-xs font-medium text-white hover:bg-neutral-700"
            >
              <Plus size={12} /> {t("assignToPartners")}
            </button>
          </div>
        </div>
        {isLoading ? (
          <p className="text-xs text-neutral-500">{t("loading")}</p>
        ) : asignaciones && asignaciones.length > 0 ? (
          <ul className="divide-y divide-neutral-200 rounded-md border border-neutral-200 bg-white text-xs">
            {asignaciones.map((a) => (
              <li key={a.id} className="flex items-center gap-2 px-3 py-2">
                <Link
                  href={`/admin/partners/${a.partnerId}/catalogo`}
                  className="min-w-0 flex-1 font-medium text-neutral-900 hover:underline"
                >
                  {a.partner.razonSocial}
                  <span className="block truncate font-normal text-neutral-500">
                    {a.skuComercial} · {a.nombreComercial}
                  </span>
                </Link>
                <span className="text-neutral-700">{precio(a.pvpBase)}</span>
                {!a.activo && <span className="rounded bg-neutral-200 px-1.5 py-0.5 text-neutral-500">{t("inactive")}</span>}
              </li>
            ))}
          </ul>
        ) : (
          <p className="rounded-md border border-dashed border-neutral-300 bg-white p-3 text-xs text-neutral-500">
            {t("notAssigned")}
          </p>
        )}
      </div>
    </div>
  );
}

function FilaProducto({
  producto,
  seleccionado,
  abierto,
  onSeleccionar,
  onAbrir,
  onAsignar,
  variante = false,
  nombre,
}: {
  producto: ProductoBaseAdmin;
  seleccionado: boolean;
  abierto: boolean;
  onSeleccionar: () => void;
  onAbrir: () => void;
  onAsignar: () => void;
  variante?: boolean;
  /// Nombre a mostrar en vez del técnico (vista por marca).
  nombre?: string;
}) {
  const t = useTranslations("adminCatalogoBase");
  const partners = numPartners(producto);
  const color = producto.especificacionesJson?.color;

  return (
    <div className={`border-b border-neutral-100 last:border-b-0 ${producto.activo ? "" : "opacity-60"}`}>
      <div className={`flex items-center gap-3 py-2.5 pr-3 text-sm ${variante ? "bg-neutral-50 pl-10" : "pl-3"}`}>
        <input type="checkbox" checked={seleccionado} onChange={onSeleccionar} aria-label={t("select")} />
        <button onClick={onAbrir} className="flex min-w-0 flex-1 items-center gap-3 text-left">
          {abierto ? <ChevronDown size={14} className="text-neutral-400" /> : <ChevronRight size={14} className="text-neutral-400" />}
          <Miniatura producto={producto} />
          <span
            className="h-4 w-4 shrink-0 rounded-full border border-neutral-300"
            style={{ background: muestraDeColor(color) }}
            title={color ?? ""}
          />
          <span className="min-w-0">
            <span className="block font-medium text-neutral-900">
              {variante ? (color ?? producto.nombreTecnico) : <NombreMultimarca nombre={nombre ?? producto.nombreTecnico} className="text-sm font-medium text-neutral-900" />}
            </span>
            <span className="block truncate text-xs text-neutral-400">{producto.skuIndustrial}</span>
          </span>
        </button>
        <div className="hidden items-center gap-2 sm:flex">
          {producto.especificacionesJson?.pendiente ? (
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">{t("pendingCodes")}</span>
          ) : !tieneCodigos(producto) ? (
            <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-xs text-neutral-500">{t("noGtin")}</span>
          ) : (
            <span className="text-xs text-neutral-500">{t("codesCount", { n: referenciasDe(producto).filter((r) => r.gtin).length })}</span>
          )}
          {partners === 0 ? (
            <span className="rounded-full bg-red-50 px-2 py-0.5 text-xs font-medium text-red-600">{t("unassigned")}</span>
          ) : (
            <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2 py-0.5 text-xs font-medium text-green-700">
              <Users size={11} /> {partners}
            </span>
          )}
          {!producto.activo && <span className="rounded-full bg-neutral-200 px-2 py-0.5 text-xs text-neutral-600">{t("inactive")}</span>}
        </div>
        <button
          onClick={onAsignar}
          className="rounded-md border border-neutral-300 px-2.5 py-1 text-xs font-medium text-neutral-700 hover:bg-neutral-50"
        >
          {t("assign")}
        </button>
      </div>
      {abierto && <DetalleProducto producto={producto} onAsignar={onAsignar} />}
    </div>
  );
}

/// Un modelo con varios colores se ve en una sola fila (muestras de color +
/// resumen); al desplegarla salen los colores como productos individuales.
function FilaModelo({
  modelo,
  seleccion,
  abiertos,
  onSeleccionar,
  onAbrir,
  onAsignar,
}: {
  modelo: ModeloVista;
  seleccion: Set<string>;
  abiertos: Set<string>;
  onSeleccionar: (id: string) => void;
  onAbrir: (id: string) => void;
  onAsignar: (productos: ProductoBaseAdmin[]) => void;
}) {
  const t = useTranslations("adminCatalogoBase");
  const [desplegado, setDesplegado] = useState(false);
  const { variantes } = modelo;

  if (variantes.length === 1) {
    const p = variantes[0];
    return (
      <FilaProducto
        producto={p}
        seleccionado={seleccion.has(p.id)}
        abierto={abiertos.has(p.id)}
        onSeleccionar={() => onSeleccionar(p.id)}
        onAbrir={() => onAbrir(p.id)}
        onAsignar={() => onAsignar([p])}
        nombre={modelo.nombreMarca}
      />
    );
  }

  const marcadas = variantes.filter((p) => seleccion.has(p.id)).length;
  const asignadas = variantes.filter((p) => numPartners(p) > 0).length;
  const sinCodigos = variantes.filter((p) => !tieneCodigos(p)).length;

  return (
    <div className="border-b border-neutral-100 last:border-b-0">
      <div className="flex items-center gap-3 px-3 py-2.5 text-sm">
        <input
          type="checkbox"
          checked={marcadas === variantes.length}
          ref={(el) => {
            if (el) el.indeterminate = marcadas > 0 && marcadas < variantes.length;
          }}
          onChange={() => {
            const todas = marcadas === variantes.length;
            for (const p of variantes) if (todas === seleccion.has(p.id)) onSeleccionar(p.id);
          }}
          aria-label={t("select")}
        />
        <button onClick={() => setDesplegado((v) => !v)} className="flex min-w-0 flex-1 items-center gap-3 text-left">
          {desplegado ? <ChevronDown size={14} className="text-neutral-400" /> : <ChevronRight size={14} className="text-neutral-400" />}
          <Miniatura producto={variantes[0]} />
          <span className="flex shrink-0 -space-x-1">
            {variantes.map((p) => (
              <span
                key={p.id}
                className="h-4 w-4 rounded-full border border-neutral-300"
                style={{ background: muestraDeColor(p.especificacionesJson?.color) }}
                title={p.especificacionesJson?.color ?? ""}
              />
            ))}
          </span>
          <span className="min-w-0">
            <span className="block font-medium text-neutral-900">
              <NombreMultimarca nombre={modelo.nombreMarca ?? modelo.nombre} className="text-sm font-medium text-neutral-900" />
            </span>
            <span className="block truncate text-xs text-neutral-400">
              {variantes.map((p) => p.especificacionesJson?.color).filter(Boolean).join(" · ")}
            </span>
          </span>
        </button>
        <div className="hidden items-center gap-2 sm:flex">
          {sinCodigos > 0 && (
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
              {t("colorsNoCodes", { n: sinCodigos })}
            </span>
          )}
          {asignadas === 0 ? (
            <span className="rounded-full bg-red-50 px-2 py-0.5 text-xs font-medium text-red-600">{t("unassigned")}</span>
          ) : (
            <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2 py-0.5 text-xs font-medium text-green-700">
              <Users size={11} /> {t("colorsAssigned", { a: asignadas, n: variantes.length })}
            </span>
          )}
        </div>
        <button
          onClick={() => onAsignar(variantes)}
          className="rounded-md border border-neutral-300 px-2.5 py-1 text-xs font-medium text-neutral-700 hover:bg-neutral-50"
        >
          {t("assign")}
        </button>
      </div>
      {desplegado &&
        variantes.map((p) => (
          <FilaProducto
            key={p.id}
            variante
            producto={p}
            seleccionado={seleccion.has(p.id)}
            abierto={abiertos.has(p.id)}
            onSeleccionar={() => onSeleccionar(p.id)}
            onAbrir={() => onAbrir(p.id)}
            onAsignar={() => onAsignar([p])}
          />
        ))}
    </div>
  );
}

function AdminCatalogoBasePageContenido() {
  const t = useTranslations("adminCatalogoBase");
  const queryClient = useQueryClient();
  const [busqueda, setBusqueda] = useState("");
  const [grupoSel, setGrupoSel] = useState("");
  const [filtro, setFiltro] = useState<FiltroRapido>("todos");
  const [seleccion, setSeleccion] = useState<Set<string>>(new Set());
  const [abiertos, setAbiertos] = useState<Set<string>>(new Set());
  // Los apartados empiezan cerrados; aquí van los que el admin ha abierto.
  const [gruposAbiertos, setGruposAbiertos] = useState<Set<string>>(new Set());
  const [vista, setVista] = useState<Vista>("aparato");
  const [errorImagen, setErrorImagen] = useState<string | null>(null);
  const imagenes = useImagenes(setErrorImagen);
  const [aAsignar, setAAsignar] = useState<ProductoBaseAdmin[] | null>(null);
  const [mostrarNuevo, setMostrarNuevo] = useState(false);
  const [skuIndustrial, setSkuIndustrial] = useState("");
  const [nombreTecnico, setNombreTecnico] = useState("");
  const [error, setError] = useState<string | null>(null);

  const { data: productos, isLoading } = useQuery<ProductoBaseAdmin[]>({
    queryKey: ["admin-productos-base"],
    queryFn: () => api.get<ProductoBaseAdmin[]>("/productos-base"),
  });

  const crear = useMutation({
    mutationFn: () =>
      api.post("/productos-base", { skuIndustrial: skuIndustrial.trim(), nombreTecnico: nombreTecnico.trim() }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-productos-base"] });
      setSkuIndustrial("");
      setNombreTecnico("");
      setMostrarNuevo(false);
    },
    onError: (err) => setError(err instanceof ApiError ? err.message : t("genericError")),
  });

  const lista = useMemo(() => productos ?? [], [productos]);
  const resumen = useMemo(
    () => ({
      total: lista.length,
      sinAsignar: lista.filter((p) => p.activo && numPartners(p) === 0).length,
      sinCodigos: lista.filter((p) => !tieneCodigos(p)).length,
    }),
    [lista],
  );

  const grupos = useMemo(() => {
    const cuenta = new Map<string, number>();
    for (const p of lista) cuenta.set(grupoDe(p, t("noGroup")), (cuenta.get(grupoDe(p, t("noGroup"))) ?? 0) + 1);
    return Array.from(cuenta.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [lista, t]);

  const filtrados = useMemo(() => {
    const texto = busqueda.trim().toLowerCase();
    return lista.filter((p) => {
      if (grupoSel && grupoDe(p, t("noGroup")) !== grupoSel) return false;
      if (filtro === "sinAsignar" && !(p.activo && numPartners(p) === 0)) return false;
      if (filtro === "sinCodigos" && tieneCodigos(p)) return false;
      if (!texto) return true;
      return [p.nombreTecnico, p.skuIndustrial, ...referenciasDe(p).flatMap((r) => [r.nombre, r.refInterna, r.gtin ?? ""])]
        .join(" ")
        .toLowerCase()
        .includes(texto);
    });
  }, [lista, busqueda, grupoSel, filtro, t]);

  const porGrupo = useMemo(() => Array.from(agruparPorModelo(filtrados, t("noGroup")).entries()), [filtrados, t]);

  /// Vista por marca: un apartado por marca de partner y, dentro, sus modelos
  /// con el nombre de esa marca (un aparato de 3 marcas sale en las 3).
  const porMarca = useMemo(() => {
    const mapa = productosPorMarca(filtrados);
    const marcas = [...FAMILIAS_DE_MARCA.map((f) => ({ clave: f.clave, etiqueta: f.etiqueta })), { clave: SIN_MARCA, etiqueta: t("noBrand") }];
    return marcas
      .map((m) => {
        const productosMarca = mapa.get(m.clave) ?? [];
        const grupos = Array.from(agruparPorModelo(productosMarca, t("noGroup")).entries()).map(([grupo, modelos]) => {
          const parte = partesDeNombre(grupo).find((p) => p.marca === MARCA_DE_FAMILIA[m.clave]);
          return {
            grupo: parte?.texto ?? etiquetaCortaGrupo(grupo),
            modelos: modelos.map(
              (mo): ModeloVista => ({
                ...mo,
                clave: `${m.clave}|${mo.clave}`,
                nombreMarca: m.clave === SIN_MARCA ? undefined : nombreEnMarca(mo.variantes[0], m.clave) || undefined,
              }),
            ),
          };
        });
        return { ...m, productos: productosMarca, grupos };
      })
      .filter((m) => m.productos.length > 0);
  }, [filtrados, t]);

  const clavesApartados = vista === "aparato" ? porGrupo.map(([g]) => `g:${g}`) : porMarca.map((m) => `m:${m.clave}`);
  // Mientras se busca se ve todo abierto, para no esconder resultados.
  const estaAbierto = (clave: string) => gruposAbiertos.has(clave) || !!busqueda.trim();

  function alternar(set: Set<string>, id: string): Set<string> {
    const s = new Set(set);
    if (s.has(id)) s.delete(id);
    else s.add(id);
    return s;
  }

  const filaModelo = (modelo: ModeloVista) => (
    <FilaModelo
      key={modelo.clave}
      modelo={modelo}
      seleccion={seleccion}
      abiertos={abiertos}
      onSeleccionar={(id) => setSeleccion((s) => alternar(s, id))}
      onAbrir={(id) => setAbiertos((s) => alternar(s, id))}
      onAsignar={setAAsignar}
    />
  );

  function alternarGrupo(items: ProductoBaseAdmin[]) {
    const todos = items.every((p) => seleccion.has(p.id));
    setSeleccion((prev) => {
      const s = new Set(prev);
      for (const p of items) {
        if (todos) s.delete(p.id);
        else s.add(p.id);
      }
      return s;
    });
  }

  const seleccionados = lista.filter((p) => seleccion.has(p.id));

  return (
    // Más ancho que el resto del portal para que quepan nombres y etiquetas. Sin
    // `transform`: la barra de selección y el panel de asignar son `fixed`.
    <div className="pb-24" style={{ width: "min(1440px, calc(100vw - 3rem))", marginLeft: "calc(50% - min(720px, 50vw - 1.5rem))" }}>
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-neutral-900">{t("title")}</h1>
          <p className="mt-1 max-w-2xl text-sm text-neutral-500">{t("description")}</p>
        </div>
        <button
          onClick={() => setMostrarNuevo((v) => !v)}
          className="inline-flex items-center gap-1 rounded-md border border-neutral-300 px-3 py-1.5 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
        >
          <Plus size={14} /> {t("newProduct")}
        </button>
      </div>

      {mostrarNuevo && (
        <div className="mb-4 rounded-lg border border-neutral-200 bg-white p-4">
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
      )}

      <div className="mb-4 grid grid-cols-3 gap-2 sm:max-w-xl">
        {(
          [
            ["todos", resumen.total, t("statTotal")],
            ["sinAsignar", resumen.sinAsignar, t("statUnassigned")],
            ["sinCodigos", resumen.sinCodigos, t("statNoCodes")],
          ] as [FiltroRapido, number, string][]
        ).map(([clave, n, etiqueta]) => (
          <button
            key={clave}
            onClick={() => setFiltro(filtro === clave ? "todos" : clave)}
            className={`rounded-lg border px-3 py-2 text-left transition ${
              filtro === clave ? "border-neutral-900 bg-neutral-900 text-white" : "border-neutral-200 bg-white hover:border-neutral-400"
            }`}
          >
            <span className="block text-xl font-semibold">{n}</span>
            <span className={`block text-xs ${filtro === clave ? "text-neutral-300" : "text-neutral-500"}`}>{etiqueta}</span>
          </button>
        ))}
      </div>

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <div className="inline-flex rounded-lg border border-neutral-300 bg-white p-0.5" role="group" aria-label={t("groupBy")}>
          {(
            [
              ["aparato", t("byDevice"), Boxes],
              ["marca", t("byBrand"), Tags],
            ] as const
          ).map(([clave, etiqueta, Icono]) => (
            <button
              key={clave}
              onClick={() => {
                setVista(clave);
                setGruposAbiertos(new Set());
              }}
              aria-pressed={vista === clave}
              className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1 text-sm font-medium transition ${
                vista === clave ? "bg-neutral-900 text-white" : "text-neutral-600 hover:bg-neutral-100"
              }`}
            >
              <Icono size={14} /> {etiqueta}
            </button>
          ))}
        </div>
        <button
          onClick={() => setGruposAbiertos(gruposAbiertos.size > 0 ? new Set() : new Set(clavesApartados))}
          className="rounded-md border border-neutral-300 bg-white px-3 py-1.5 text-sm text-neutral-700 hover:bg-neutral-50"
        >
          {gruposAbiertos.size > 0 ? t("collapseAll") : t("expandAll")}
        </button>
        <div className="relative min-w-64 flex-1">
          <Search size={15} className="absolute left-3 top-2.5 text-neutral-400" />
          <input
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder={t("searchPlaceholder")}
            className="w-full rounded-md border border-neutral-300 py-1.5 pl-9 pr-8 text-sm"
          />
          {busqueda && (
            <button onClick={() => setBusqueda("")} aria-label={t("clear")} className="absolute right-2 top-2 text-neutral-400 hover:text-neutral-700">
              <X size={15} />
            </button>
          )}
        </div>
      </div>

      <div className="mb-4 flex flex-wrap gap-1.5">
        <button
          onClick={() => setGrupoSel("")}
          className={`rounded-full border px-3 py-1 text-xs font-medium ${
            grupoSel === "" ? "border-neutral-900 bg-neutral-900 text-white" : "border-neutral-300 bg-white text-neutral-700 hover:bg-neutral-50"
          }`}
        >
          {t("allGroups")}
        </button>
        {grupos.map(([g, n]) => (
          <button
            key={g}
            onClick={() => setGrupoSel(grupoSel === g ? "" : g)}
            title={g}
            className={`rounded-full border px-3 py-1 text-xs font-medium ${
              grupoSel === g ? "border-neutral-900 bg-neutral-900 text-white" : "border-neutral-300 bg-white text-neutral-700 hover:bg-neutral-50"
            }`}
          >
            {etiquetaCortaGrupo(g)} <span className="opacity-60">{n}</span>
          </button>
        ))}
      </div>

      {isLoading ? (
        <p className="text-neutral-500">{t("loading")}</p>
      ) : (
        <div className={vista === "aparato" ? "grid grid-cols-1 items-start gap-3 xl:grid-cols-2" : "space-y-4"}>
          {vista === "aparato" &&
            porGrupo.map(([grupo, modelos]) => {
              const items = modelos.flatMap((m) => m.variantes);
              const clave = `g:${grupo}`;
              const abierto = estaAbierto(clave);
              const partes = partesDeNombre(grupo);
              const asignados = items.filter((p) => numPartners(p) > 0).length;
              const conFoto = items.find((p) => p.imagenUrl) ?? items[0];
              return (
                <section key={grupo} className={`overflow-hidden rounded-xl border bg-white transition ${abierto ? "border-neutral-300 shadow-sm xl:col-span-2" : "border-neutral-200 hover:border-neutral-300"}`}>
                  <header className="flex items-center gap-3 px-3 py-2.5">
                    <input
                      type="checkbox"
                      checked={items.every((p) => seleccion.has(p.id))}
                      onChange={() => alternarGrupo(items)}
                      aria-label={t("selectGroup")}
                    />
                    <button
                      onClick={() => setGruposAbiertos((s) => alternar(s, clave))}
                      aria-expanded={abierto}
                      className="flex min-w-0 flex-1 items-center gap-3 text-left"
                    >
                      {abierto ? <ChevronDown size={16} className="text-neutral-500" /> : <ChevronRight size={16} className="text-neutral-500" />}
                      <Miniatura producto={conFoto} tamano="h-11 w-11" />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold text-neutral-900">
                          {partes.length > 1 ? etiquetaCortaGrupo(partes[0].texto) : grupo}
                        </span>
                        <span className="mt-0.5 flex flex-wrap items-center gap-1">
                          {partes.length > 1 ? (
                            partes.map((p) => {
                              const familia = Object.keys(MARCA_DE_FAMILIA).find((k) => MARCA_DE_FAMILIA[k] === p.marca);
                              const estilo = ESTILO_MARCA[familia ?? SIN_MARCA];
                              return (
                                <span key={p.texto} className={`rounded px-1.5 py-0.5 text-[11px] font-medium ${estilo.suave} ${estilo.texto}`}>
                                  {p.texto}
                                </span>
                              );
                            })
                          ) : (
                            <span className="text-xs text-neutral-500">{t("modelsCount", { n: modelos.length })}</span>
                          )}
                        </span>
                      </span>
                    </button>
                    <span className="hidden text-right text-xs text-neutral-500 sm:block">
                      <span className="block font-medium text-neutral-800">{t("productsCount", { n: items.length })}</span>
                      <span className={asignados === 0 ? "text-red-600" : "text-green-700"}>{t("assignedCount", { a: asignados, n: items.length })}</span>
                    </span>
                  </header>
                  {abierto && <div className="border-t border-neutral-200">{modelos.map(filaModelo)}</div>}
                </section>
              );
            })}

          {vista === "marca" &&
            porMarca.map((m) => {
              const clave = `m:${m.clave}`;
              const abierto = estaAbierto(clave);
              const estilo = ESTILO_MARCA[m.clave] ?? ESTILO_MARCA[SIN_MARCA];
              const asignados = m.productos.filter((p) => numPartners(p) > 0).length;
              const numModelos = m.grupos.reduce((n, g) => n + g.modelos.length, 0);
              return (
                <section key={m.clave} className="overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-sm">
                  <header className={`flex items-center gap-4 px-4 py-3 ${estilo.suave}`}>
                    <input
                      type="checkbox"
                      checked={m.productos.every((p) => seleccion.has(p.id))}
                      onChange={() => alternarGrupo(m.productos)}
                      aria-label={t("selectGroup")}
                    />
                    <button
                      onClick={() => setGruposAbiertos((s) => alternar(s, clave))}
                      aria-expanded={abierto}
                      className="flex min-w-0 flex-1 items-center gap-3 text-left"
                    >
                      {abierto ? <ChevronDown size={18} className={estilo.texto} /> : <ChevronRight size={18} className={estilo.texto} />}
                      <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-xs font-bold text-white ${estilo.acento}`}>
                        {estilo.iniciales}
                      </span>
                      <span className="min-w-0">
                        <span className="block text-base font-semibold text-neutral-900">{m.etiqueta}</span>
                        <span className="block text-xs text-neutral-500">
                          {t("modelsCount", { n: numModelos })} · {t("productsCount", { n: m.productos.length })}
                        </span>
                      </span>
                    </button>
                    <div className="hidden w-48 sm:block">
                      <div className="mb-1 flex justify-between text-xs text-neutral-600">
                        <span>{t("assignedLabel")}</span>
                        <span className="font-medium">
                          {asignados}/{m.productos.length}
                        </span>
                      </div>
                      <div className="h-1.5 overflow-hidden rounded-full bg-white">
                        <div className={`h-full rounded-full ${estilo.acento}`} style={{ width: `${m.productos.length ? (asignados / m.productos.length) * 100 : 0}%` }} />
                      </div>
                    </div>
                  </header>
                  {abierto &&
                    m.grupos.map((g) => (
                      <div key={g.grupo} className="border-t border-neutral-200">
                        <p className="bg-neutral-50 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-neutral-500">{g.grupo}</p>
                        {g.modelos.map(filaModelo)}
                      </div>
                    ))}
                </section>
              );
            })}
          {filtrados.length === 0 && <p className="text-neutral-500">{lista.length ? t("noResults") : t("empty")}</p>}
        </div>
      )}

      {seleccionados.length > 0 && (
        <div className="fixed inset-x-0 bottom-4 z-40 mx-auto flex w-fit items-center gap-3 rounded-full bg-neutral-900 px-5 py-2.5 text-sm text-white shadow-lg">
          <span>{t("selectedCount", { n: seleccionados.length })}</span>
          <button
            onClick={() => setAAsignar(seleccionados)}
            className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-neutral-900 hover:bg-neutral-200"
          >
            {t("assignToPartners")}
          </button>
          <label
            className={`inline-flex cursor-pointer items-center gap-1 rounded-full border border-neutral-500 px-3 py-1 text-xs font-medium hover:bg-neutral-800 ${imagenes.ocupado ? "pointer-events-none opacity-50" : ""}`}
          >
            <Upload size={12} /> {t("changeImage")}
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="hidden"
              onChange={(e) => {
                const archivo = e.target.files?.[0];
                e.target.value = "";
                if (!archivo) return;
                setErrorImagen(null);
                imagenes.subir.mutate({ ids: seleccionados.map((p) => p.id), archivo });
              }}
            />
          </label>
          <button
            onClick={() => {
              if (!window.confirm(t("removeImageConfirm", { n: seleccionados.length }))) return;
              setErrorImagen(null);
              imagenes.quitar.mutate(seleccionados.map((p) => p.id));
            }}
            disabled={imagenes.ocupado}
            className="rounded-full border border-neutral-500 px-3 py-1 text-xs font-medium hover:bg-neutral-800 disabled:opacity-50"
          >
            {t("removeImage")}
          </button>
          {errorImagen && <span className="text-xs text-red-300">{errorImagen}</span>}
          <button onClick={() => setSeleccion(new Set())} className="text-xs text-neutral-300 underline hover:text-white">
            {t("clearSelection")}
          </button>
        </div>
      )}

      {aAsignar && (
        <AsignarPanel
          productos={aAsignar}
          onClose={(asignado) => {
            setAAsignar(null);
            // Solo se vacía la selección si se llegó a asignar: cancelar no debe perderla.
            if (asignado) setSeleccion(new Set());
          }}
        />
      )}
    </div>
  );
}

export default function AdminCatalogoBasePage() {
  return (
    <SoloAdmin>
      <AdminCatalogoBasePageContenido />
    </SoloAdmin>
  );
}
