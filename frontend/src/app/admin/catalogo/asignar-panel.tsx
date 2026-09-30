"use client";

import { useEffect, useMemo, useState } from "react";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { AlertTriangle, Check, Search, Sparkles, X } from "lucide-react";
import { api, ApiError } from "@/lib/api";
import {
  candidatosParaPartner,
  familiasDelPartner,
  FAMILIAS_DE_MARCA,
  tieneNombresDeMarca,
  type Candidato,
} from "@/lib/catalogo-admin";
import type { Paginado, Partner, ProductoBaseAdmin, RepresentacionAdmin } from "@/lib/types";

interface Resultado {
  asignados: number;
  omitidos: number;
  sinEquivalente: number;
  errores: string[];
}

interface FilaPlan {
  producto: ProductoBaseAdmin;
  candidatos: Candidato[];
  elegido: Candidato | null;
}

/// Panel lateral para asignar uno o varios productos base (cada color por
/// separado) al catálogo de uno o varios partners de una sola vez.
///
/// Para cada partner propone el nombre y el SKU de SU marca (VBH ve Wave,
/// Procomsa ve ICON...). Un partner nunca recibe nombres de otras marcas: si un
/// producto no tiene nombre en la marca del partner, no se asigna desde aquí.
export function AsignarPanel({
  productos: todos,
  onClose,
}: {
  productos: ProductoBaseAdmin[];
  onClose: (asignado: boolean) => void;
}) {
  const t = useTranslations("adminCatalogoBase");
  const queryClient = useQueryClient();
  const [excluidos, setExcluidos] = useState<Set<string>>(new Set());
  const [pvp, setPvp] = useState<Record<string, string>>({});
  const [descuento, setDescuento] = useState("");
  const [busqueda, setBusqueda] = useState("");
  const [busquedaDeb, setBusquedaDeb] = useState("");
  const [elegidos, setElegidos] = useState<Map<string, Partner>>(new Map());
  const [familiasSel, setFamiliasSel] = useState<Record<string, string[]>>({});
  const [eleccion, setEleccion] = useState<Record<string, string>>({});
  const [resultado, setResultado] = useState<Resultado | null>(null);
  const [error, setError] = useState<string | null>(null);

  const productos = useMemo(() => todos.filter((p) => !excluidos.has(p.id)), [todos, excluidos]);
  const hayNombresDeMarca = productos.some(tieneNombresDeMarca);
  const sucio = !resultado && (elegidos.size > 0 || Object.values(pvp).some(Boolean));

  function cerrar() {
    if (sucio && !window.confirm(t("confirmDiscard"))) return;
    onClose(!!resultado && resultado.asignados > 0);
  }

  // Esc cierra, y el fondo de la página no se desplaza mientras el panel está abierto.
  useEffect(() => {
    const alPulsar = (e: KeyboardEvent) => {
      if (e.key === "Escape") cerrar();
    };
    window.addEventListener("keydown", alPulsar);
    const overflowPrevio = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", alPulsar);
      document.body.style.overflow = overflowPrevio;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sucio, resultado]);

  useEffect(() => {
    const id = setTimeout(() => setBusquedaDeb(busqueda.trim()), 250);
    return () => clearTimeout(id);
  }, [busqueda]);

  const { data: partners, isLoading } = useQuery<Paginado<Partner>>({
    queryKey: ["admin-partners-activos", busquedaDeb],
    queryFn: () =>
      api.get<Paginado<Partner>>(
        `/partners?estado=ACTIVO&limit=100${busquedaDeb ? `&busqueda=${encodeURIComponent(busquedaDeb)}` : ""}`,
      ),
    placeholderData: keepPreviousData,
  });

  function alternarPartner(partner: Partner) {
    setElegidos((prev) => {
      const siguiente = new Map(prev);
      if (siguiente.has(partner.id)) siguiente.delete(partner.id);
      else siguiente.set(partner.id, partner);
      return siguiente;
    });
  }

  const familiasDe = (partner: Partner) => familiasSel[partner.id] ?? familiasDelPartner(partner);

  function alternarFamilia(partner: Partner, clave: string) {
    const actuales = familiasDe(partner);
    setFamiliasSel((prev) => ({
      ...prev,
      [partner.id]: actuales.includes(clave) ? actuales.filter((c) => c !== clave) : [...actuales, clave],
    }));
  }

  /// Qué se crearía para cada partner elegido, y con qué nombre/SKU.
  const plan = useMemo(() => {
    return [...elegidos.values()].map((partner) => {
      const familias = familiasSel[partner.id] ?? familiasDelPartner(partner);
      const filas: FilaPlan[] = productos.map((producto) => {
        const candidatos = candidatosParaPartner(producto, familias);
        const forzado = candidatos.find((c) => c.clave === eleccion[`${partner.id}:${producto.id}`]);
        return { producto, candidatos, elegido: forzado ?? candidatos[0] ?? null };
      });
      return { partner, familias, filas, faltaMarca: hayNombresDeMarca && familias.length === 0 };
    });
  }, [elegidos, familiasSel, productos, eleccion, hayNombresDeMarca]);

  const totalAsignaciones = plan.reduce((n, p) => n + p.filas.filter((f) => f.elegido).length, 0);
  const preciosValidos = productos.length > 0 && productos.every((p) => Number(pvp[p.id]) > 0);
  const hayMarcaSinElegir = plan.some((p) => p.faltaMarca);
  const puedeAsignar = preciosValidos && totalAsignaciones > 0 && !hayMarcaSinElegir;

  const asignar = useMutation({
    mutationFn: async (): Promise<Resultado> => {
      const res: Resultado = { asignados: 0, omitidos: 0, sinEquivalente: 0, errores: [] };
      for (const { partner, filas } of plan) {
        res.sinEquivalente += filas.filter((f) => !f.elegido).length;
        const aCrear = filas.filter((f): f is FilaPlan & { elegido: Candidato } => !!f.elegido);
        if (aCrear.length === 0) continue;
        try {
          const existentes = await api.get<RepresentacionAdmin[]>(`/partners/${partner.id}/catalogo`);
          const yaTiene = new Set(existentes.map((r) => r.productoBaseId));
          const items = aCrear
            .filter((f) => !yaTiene.has(f.producto.id))
            .map((f) => ({
              productoBaseId: f.producto.id,
              skuComercial: f.elegido.sku,
              nombreComercial: f.elegido.nombre,
              pvpBase: Number(pvp[f.producto.id]),
              ...(descuento !== "" ? { descuentoOverride: Number(descuento) } : {}),
            }));
          res.omitidos += aCrear.length - items.length;
          if (items.length > 0) {
            await api.post(`/partners/${partner.id}/catalogo`, { items });
            res.asignados += items.length;
          }
        } catch (err) {
          res.errores.push(`${partner.razonSocial}: ${err instanceof ApiError ? err.message : t("genericError")}`);
        }
      }
      return res;
    },
    onSuccess: (res) => {
      setResultado(res);
      queryClient.invalidateQueries({ queryKey: ["admin-productos-base"] });
      queryClient.invalidateQueries({ queryKey: ["admin-producto-partners"] });
      queryClient.invalidateQueries({ queryKey: ["admin-partner-catalogo"] });
    },
    onError: (err) => setError(err instanceof ApiError ? err.message : t("genericError")),
  });

  const partnersMostrados = partners?.data ?? [];

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/30" onClick={cerrar}>
      <aside
        role="dialog"
        aria-modal="true"
        aria-labelledby="asignar-titulo"
        onClick={(e) => e.stopPropagation()}
        className="flex h-full w-full max-w-xl flex-col overflow-y-auto bg-white shadow-xl"
      >
        <header className="flex items-start justify-between border-b border-neutral-200 p-4">
          <div>
            <h2 id="asignar-titulo" className="text-lg font-semibold text-neutral-900">
              {t("assignTitle")}
            </h2>
            <p className="text-xs text-neutral-500">{t("assignSubtitle", { n: productos.length })}</p>
          </div>
          <button onClick={cerrar} aria-label={t("close")} className="rounded p-1 text-neutral-500 hover:bg-neutral-100">
            <X size={18} />
          </button>
        </header>

        {resultado ? (
          <div className="space-y-3 p-4" role="status">
            <div className="rounded-md border border-green-200 bg-green-50 p-3 text-sm text-green-800">
              <Check size={16} className="mr-1 inline" />
              {t("assignDone", { asignados: resultado.asignados, omitidos: resultado.omitidos })}
            </div>
            {resultado.sinEquivalente > 0 && (
              <p className="rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
                {t("skippedNoEquivalent", { n: resultado.sinEquivalente })}
              </p>
            )}
            {resultado.errores.length > 0 && (
              <ul className="rounded-md border border-red-200 bg-red-50 p-3 text-xs text-red-700" role="alert">
                {resultado.errores.map((e) => (
                  <li key={e}>{e}</li>
                ))}
              </ul>
            )}
            <button
              onClick={() => onClose(resultado.asignados > 0)}
              className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-700"
            >
              {t("close")}
            </button>
          </div>
        ) : (
          <div className="space-y-5 p-4">
            <section>
              <h3 className="mb-2 text-sm font-medium text-neutral-900">1. {t("stepPrices")}</h3>
              <div className="space-y-1.5">
                {todos.map((p, i) => {
                  const incluido = !excluidos.has(p.id);
                  return (
                    <div key={p.id} className={`flex items-center gap-2 ${incluido ? "" : "opacity-40"}`}>
                      <input
                        type="checkbox"
                        checked={incluido}
                        onChange={() =>
                          setExcluidos((prev) => {
                            const siguiente = new Set(prev);
                            if (siguiente.has(p.id)) siguiente.delete(p.id);
                            else siguiente.add(p.id);
                            return siguiente;
                          })
                        }
                        aria-label={p.nombreTecnico}
                      />
                      <span className="min-w-0 flex-1 truncate text-sm text-neutral-700" title={p.nombreTecnico}>
                        {p.nombreTecnico}
                      </span>
                      <input
                        type="number"
                        min={0}
                        step="0.01"
                        autoFocus={i === 0}
                        disabled={!incluido}
                        value={pvp[p.id] ?? ""}
                        onChange={(e) => setPvp((prev) => ({ ...prev, [p.id]: e.target.value }))}
                        placeholder={t("pvpBase")}
                        aria-label={`${t("pvpBase")} · ${p.nombreTecnico}`}
                        className="w-28 rounded-md border border-neutral-300 px-2 py-1.5 text-sm"
                      />
                    </div>
                  );
                })}
              </div>
              {todos.length > 1 && (
                <button
                  onClick={() => {
                    const primero = pvp[productos[0]?.id];
                    if (primero) setPvp(Object.fromEntries(todos.map((p) => [p.id, primero])));
                  }}
                  className="mt-2 text-xs text-neutral-500 underline hover:text-neutral-800"
                >
                  {t("samePriceForAll")}
                </button>
              )}
              <div className="mt-3 flex items-center gap-2">
                <label htmlFor="asignar-descuento" className="text-sm text-neutral-700">
                  {t("discountOverrideOptional")}
                </label>
                <input
                  id="asignar-descuento"
                  type="number"
                  min={0}
                  max={100}
                  value={descuento}
                  onChange={(e) => setDescuento(e.target.value)}
                  className="w-20 rounded-md border border-neutral-300 px-2 py-1.5 text-sm"
                />
                <span className="text-xs text-neutral-400">%</span>
              </div>
            </section>

            <section>
              <div className="mb-2 flex items-center justify-between">
                <h3 className="text-sm font-medium text-neutral-900">2. {t("stepPartners")}</h3>
                <button
                  onClick={() =>
                    setElegidos((prev) => {
                      const siguiente = new Map(prev);
                      for (const p of partnersMostrados) siguiente.set(p.id, p);
                      return siguiente;
                    })
                  }
                  className="text-xs text-neutral-500 underline hover:text-neutral-800"
                >
                  {t("selectAllShown")}
                </button>
              </div>
              <div className="relative mb-2">
                <Search size={14} className="absolute left-2.5 top-2.5 text-neutral-400" />
                <input
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  placeholder={t("searchPartner")}
                  aria-label={t("searchPartner")}
                  className="w-full rounded-md border border-neutral-300 py-1.5 pl-8 pr-2 text-sm"
                />
              </div>
              {isLoading ? (
                <p className="text-sm text-neutral-500">{t("loading")}</p>
              ) : (
                <>
                  <ul className="max-h-56 divide-y divide-neutral-100 overflow-y-auto rounded-md border border-neutral-200">
                    {partnersMostrados.map((p) => (
                      <li key={p.id}>
                        <label className="flex cursor-pointer items-center gap-2 px-3 py-2 text-sm hover:bg-neutral-50">
                          <input type="checkbox" checked={elegidos.has(p.id)} onChange={() => alternarPartner(p)} />
                          <span className="flex-1 text-neutral-800">{p.razonSocial}</span>
                          {p.codigoCliente && <span className="text-xs text-neutral-500">#{p.codigoCliente}</span>}
                        </label>
                      </li>
                    ))}
                    {partnersMostrados.length === 0 && <li className="px-3 py-2 text-sm text-neutral-500">{t("noPartners")}</li>}
                  </ul>
                  {partners && partners.total > partnersMostrados.length && (
                    <p className="mt-1 text-xs text-neutral-500">
                      {t("morePartners", { shown: partnersMostrados.length, total: partners.total })}
                    </p>
                  )}
                </>
              )}
            </section>

            {plan.length > 0 && (
              <section>
                <h3 className="mb-1 flex items-center gap-1 text-sm font-medium text-neutral-900">
                  <Sparkles size={14} className="text-amber-500" /> 3. {t("stepPreview")}
                </h3>
                <p className="mb-2 text-xs text-neutral-500">{t("previewHint")}</p>
                <div className="max-h-72 space-y-3 overflow-y-auto rounded-md bg-neutral-50 p-3">
                  {plan.map(({ partner, familias, filas, faltaMarca }) => (
                    <div key={partner.id}>
                      <p className="text-xs font-semibold text-neutral-800">{partner.razonSocial}</p>
                      {hayNombresDeMarca && (
                        <div className="my-1 flex flex-wrap items-center gap-1" role="group" aria-label={t("brandLabel")}>
                          <span className="text-xs text-neutral-500">{t("brandLabel")}</span>
                          {FAMILIAS_DE_MARCA.map((f) => (
                            <button
                              key={f.clave}
                              onClick={() => alternarFamilia(partner, f.clave)}
                              aria-pressed={familias.includes(f.clave)}
                              className={`rounded-full border px-2 py-0.5 text-xs ${
                                familias.includes(f.clave)
                                  ? "border-neutral-900 bg-neutral-900 text-white"
                                  : "border-neutral-300 bg-white text-neutral-700 hover:bg-neutral-100"
                              }`}
                            >
                              {f.etiqueta}
                            </button>
                          ))}
                        </div>
                      )}
                      {faltaMarca && (
                        <p className="flex items-center gap-1 text-xs font-medium text-amber-700" role="alert">
                          <AlertTriangle size={12} /> {t("chooseBrand")}
                        </p>
                      )}
                      <ul className="ml-2 space-y-0.5 text-xs text-neutral-600">
                        {filas.map((f) => (
                          <li key={f.producto.id}>
                            {f.elegido ? (
                              <>
                                <span className="font-mono text-neutral-500">{f.elegido.sku}</span> — {f.elegido.nombre}
                                {f.candidatos.length > 1 && (
                                  <select
                                    value={f.elegido.clave}
                                    onChange={(e) =>
                                      setEleccion((prev) => ({ ...prev, [`${partner.id}:${f.producto.id}`]: e.target.value }))
                                    }
                                    aria-label={t("pickName")}
                                    className="ml-2 rounded border border-neutral-300 bg-white px-1 py-0.5 text-xs"
                                  >
                                    {f.candidatos.map((c) => (
                                      <option key={c.clave} value={c.clave}>
                                        {c.sku} — {c.nombre}
                                      </option>
                                    ))}
                                  </select>
                                )}
                              </>
                            ) : (
                              !faltaMarca && (
                                <span className="text-amber-700">
                                  <AlertTriangle size={11} className="mr-1 inline" />
                                  {f.producto.nombreTecnico}: {t("noEquivalent")}
                                </span>
                              )
                            )}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {error && (
              <p className="text-xs text-red-600" role="alert">
                {error}
              </p>
            )}
            <button
              onClick={() => {
                setError(null);
                asignar.mutate();
              }}
              disabled={!puedeAsignar || asignar.isPending}
              className="w-full rounded-md bg-neutral-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-neutral-700 disabled:opacity-40"
            >
              {asignar.isPending ? t("bulkAssigning") : t("assignConfirm", { n: totalAsignaciones, partners: elegidos.size })}
            </button>
            {!preciosValidos && <p className="text-xs text-amber-700">{t("needPrices")}</p>}
            {hayMarcaSinElegir && <p className="text-xs text-amber-700">{t("needBrand")}</p>}
          </div>
        )}
      </aside>
    </div>
  );
}
