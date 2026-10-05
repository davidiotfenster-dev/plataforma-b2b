"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { api, descargarArchivo } from "@/lib/api";
import { Download } from "lucide-react";
import type { Estadisticas, GranularidadEstadisticas, MarcaCatalogo } from "@/lib/types";
import { InsigniaMarca, MARCA_INFO, MARCAS_CATALOGO } from "@/lib/marcas";
import { SoloAdmin } from "@/components/solo-admin";
import { COLOR_ESTADO, ORDEN_ESTADOS, Variacion, useFormatos } from "./componentes";

type Preset = "7d" | "30d" | "90d" | "ytd" | "12m" | "custom";
const PRESETS: Exclude<Preset, "custom">[] = ["7d", "30d", "90d", "ytd", "12m"];

/// Fecha local en AAAA-MM-DD (no `toISOString`, que pasaría a UTC y movería el día).
function iso(fecha: Date) {
  const m = String(fecha.getMonth() + 1).padStart(2, "0");
  const d = String(fecha.getDate()).padStart(2, "0");
  return `${fecha.getFullYear()}-${m}-${d}`;
}

function rangoDePreset(preset: Exclude<Preset, "custom">): { desde: string; hasta: string } {
  const hoy = new Date();
  const desde = new Date(hoy);
  if (preset === "ytd") desde.setMonth(0, 1);
  else if (preset === "12m") desde.setFullYear(hoy.getFullYear() - 1, hoy.getMonth(), hoy.getDate() + 1);
  else desde.setDate(hoy.getDate() - ({ "7d": 7, "30d": 30, "90d": 90 }[preset] - 1));
  return { desde: iso(desde), hasta: iso(hoy) };
}

const COLOR_SERIE = "#0284c7";

function AdminDashboardPageContenido() {
  const t = useTranslations("adminDashboard");
  const tEstados = useTranslations("estados");
  const locale = useLocale();
  const f = useFormatos();

  const [preset, setPreset] = useState<Preset>("30d");
  const [rango, setRango] = useState(() => rangoDePreset("30d"));
  const [marca, setMarca] = useState<MarcaCatalogo | "">("");
  const [partnerId, setPartnerId] = useState("");
  const [medida, setMedida] = useState<"facturado" | "pedidos">("facturado");
  const [descargando, setDescargando] = useState(false);
  const [errorDescarga, setErrorDescarga] = useState<string | null>(null);

  const params = new URLSearchParams({ desde: rango.desde, hasta: rango.hasta });
  if (marca) params.set("marca", marca);
  if (partnerId) params.set("partnerId", partnerId);

  const { data, isLoading, isFetching, error } = useQuery<Estadisticas>({
    queryKey: ["admin-estadisticas", rango.desde, rango.hasta, marca, partnerId],
    queryFn: () => api.get<Estadisticas>(`/pedidos/admin/estadisticas?${params}`),
    placeholderData: keepPreviousData,
  });

  const empresasFiltro = useMemo(
    () => (data?.empresas ?? []).filter((e) => !marca || e.marca === marca),
    [data?.empresas, marca],
  );

  const etiquetaTramo = useMemo(() => {
    const g: GranularidadEstadisticas = data?.periodo.granularidad ?? "day";
    const fmt = new Intl.DateTimeFormat(locale, g === "month" ? { month: "short", year: "2-digit" } : { day: "numeric", month: "short" });
    return (tramo: string) => fmt.format(new Date(`${tramo}T00:00:00`));
  }, [data?.periodo.granularidad, locale]);

  const elegirPreset = (p: Exclude<Preset, "custom">) => {
    setPreset(p);
    setRango(rangoDePreset(p));
  };

  const descargarExcel = async () => {
    setDescargando(true);
    setErrorDescarga(null);
    try {
      await descargarArchivo(`/pedidos/admin/estadisticas/excel?${params}`, `estadisticas_${rango.desde}_${rango.hasta}.xlsx`);
    } catch (e) {
      setErrorDescarga((e as Error).message);
    } finally {
      setDescargando(false);
    }
  };

  const hayFiltros = preset !== "30d" || marca !== "" || partnerId !== "";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h1 className="text-2xl font-semibold text-neutral-900">{t("title")}</h1>
          {data && (
            <p className="mt-1 text-sm text-neutral-500">
              {t("periodSummary", { desde: f.fechaLarga(data.periodo.desde), hasta: f.fechaLarga(data.periodo.hasta) })}
            </p>
          )}
        </div>
        <div className="flex items-center gap-3">
          {isFetching && !isLoading && <span className="text-xs text-neutral-400">{t("updating")}</span>}
          <button
            type="button"
            onClick={descargarExcel}
            disabled={descargando || !data}
            title={t("export.hint")}
            className="inline-flex items-center gap-2 rounded-md border border-neutral-300 bg-white px-3 py-1.5 text-sm font-medium text-neutral-800 hover:bg-neutral-50 disabled:opacity-50"
          >
            <Download className="size-4" aria-hidden />
            {descargando ? t("export.downloading") : t("export.button")}
          </button>
        </div>
      </div>
      {errorDescarga && <p className="text-sm text-red-600">{errorDescarga}</p>}

      {/* Filtros: una sola fila encima de todo, afectan a toda la página. */}
      <div className="flex flex-wrap items-center gap-3 rounded-lg border border-neutral-200 bg-white p-3">
        <div className="flex overflow-hidden rounded-md border border-neutral-200" role="group" aria-label={t("filters.period")}>
          {PRESETS.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => elegirPreset(p)}
              aria-pressed={preset === p}
              className={`px-3 py-1.5 text-sm ${preset === p ? "bg-neutral-900 text-white" : "bg-white text-neutral-600 hover:bg-neutral-50"} border-l border-neutral-200 first:border-l-0`}
            >
              {t(`presets.${p}`)}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1.5 text-sm text-neutral-600">
          <input
            type="date"
            value={rango.desde}
            max={rango.hasta}
            onChange={(e) => e.target.value && (setPreset("custom"), setRango((r) => ({ ...r, desde: e.target.value })))}
            aria-label={t("filters.from")}
            className="rounded-md border border-neutral-200 px-2 py-1"
          />
          <span>–</span>
          <input
            type="date"
            value={rango.hasta}
            min={rango.desde}
            onChange={(e) => e.target.value && (setPreset("custom"), setRango((r) => ({ ...r, hasta: e.target.value })))}
            aria-label={t("filters.to")}
            className="rounded-md border border-neutral-200 px-2 py-1"
          />
        </div>
        <select
          value={marca}
          onChange={(e) => {
            setMarca(e.target.value as MarcaCatalogo | "");
            setPartnerId("");
          }}
          aria-label={t("filters.brand")}
          className="rounded-md border border-neutral-200 bg-white px-2 py-1.5 text-sm"
        >
          <option value="">{t("filters.allBrands")}</option>
          {MARCAS_CATALOGO.map((m) => (
            <option key={m} value={m}>
              {MARCA_INFO[m].etiqueta} · {MARCA_INFO[m].submarca}
            </option>
          ))}
        </select>
        <select
          value={partnerId}
          onChange={(e) => setPartnerId(e.target.value)}
          aria-label={t("filters.company")}
          className="max-w-64 rounded-md border border-neutral-200 bg-white px-2 py-1.5 text-sm"
        >
          <option value="">{t("filters.allCompanies")}</option>
          {empresasFiltro.map((e) => (
            <option key={e.id} value={e.id}>
              {e.razonSocial}
            </option>
          ))}
        </select>
        {hayFiltros && (
          <button
            type="button"
            onClick={() => {
              elegirPreset("30d");
              setMarca("");
              setPartnerId("");
            }}
            className="text-sm text-neutral-500 underline hover:text-neutral-900"
          >
            {t("filters.reset")}
          </button>
        )}
      </div>

      {isLoading && <p className="text-neutral-500">{t("loading")}</p>}
      {error && <p className="text-sm text-red-600">{(error as Error).message}</p>}

      {data && (
        <>
          {/* Cifras clave, comparadas con el periodo anterior de la misma duración. */}
          <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
            <Kpi titulo={t("kpis.billed")} valor={f.euros(data.kpis.facturado)}>
              <Variacion actual={data.kpis.facturado} anterior={data.periodoAnterior.facturado} />
            </Kpi>
            <Kpi titulo={t("kpis.orders")} valor={f.numero(data.kpis.pedidos)}>
              <Variacion actual={data.kpis.pedidos} anterior={data.periodoAnterior.pedidos} />
            </Kpi>
            <Kpi titulo={t("kpis.avgOrder")} valor={f.euros(data.kpis.ticketMedio)}>
              <Variacion
                actual={data.kpis.ticketMedio}
                anterior={data.periodoAnterior.pedidos > 0 ? data.periodoAnterior.facturado / data.periodoAnterior.pedidos : 0}
              />
            </Kpi>
            <Kpi titulo={t("kpis.pending")} valor={f.numero(data.kpis.sinEnviar)}>
              <span className="text-neutral-500">{t("kpis.cancelled", { n: data.kpis.cancelados })}</span>
            </Kpi>
          </div>

          <div className="rounded-lg border border-neutral-200 bg-white p-5">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-medium text-neutral-900">{t(`evolution.${data.periodo.granularidad}`)}</p>
              <div className="flex overflow-hidden rounded-md border border-neutral-200 text-xs" role="group">
                {(["facturado", "pedidos"] as const).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setMedida(m)}
                    aria-pressed={medida === m}
                    className={`px-3 py-1 ${medida === m ? "bg-neutral-900 text-white" : "bg-white text-neutral-600 hover:bg-neutral-50"}`}
                  >
                    {t(`measure.${m}`)}
                  </button>
                ))}
              </div>
            </div>
            {data.kpis.pedidos === 0 ? (
              <p className="py-16 text-center text-sm text-neutral-400">{t("noData")}</p>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={data.serie} margin={{ top: 4, right: 4, left: 4, bottom: 0 }}>
                  <CartesianGrid vertical={false} stroke="#f0f0f0" />
                  <XAxis
                    dataKey="tramo"
                    tickFormatter={etiquetaTramo}
                    tick={{ fontSize: 11, fill: "#737373" }}
                    tickLine={false}
                    axisLine={{ stroke: "#e5e5e5" }}
                    minTickGap={16}
                  />
                  <YAxis
                    allowDecimals={false}
                    tickFormatter={(v: number) => (medida === "facturado" ? f.eurosCompacto(v) : f.numero(v))}
                    tick={{ fontSize: 11, fill: "#737373" }}
                    tickLine={false}
                    axisLine={false}
                    width={56}
                  />
                  <Tooltip
                    cursor={{ fill: "#f5f5f5" }}
                    labelFormatter={(tramo) => etiquetaTramo(String(tramo))}
                    formatter={(v) => [medida === "facturado" ? f.euros(Number(v)) : f.numero(Number(v)), t(`measure.${medida}`)]}
                  />
                  <Bar dataKey={medida} fill={COLOR_SERIE} radius={[4, 4, 0, 0]} maxBarSize={40} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <Tarjeta titulo={t("byStatus")}>
              <ul className="space-y-3">
                {ORDEN_ESTADOS.map((estado) => {
                  const fila = data.porEstado.find((e) => e.estado === estado);
                  const cantidad = fila?.cantidad ?? 0;
                  const total = data.porEstado.reduce((a, e) => a + e.cantidad, 0);
                  return (
                    <FilaBarra
                      key={estado}
                      etiqueta={
                        <span className="flex items-center gap-2">
                          <span className="size-2.5 rounded-full" style={{ background: COLOR_ESTADO[estado] }} />
                          {tEstados(estado)}
                        </span>
                      }
                      valor={f.numero(cantidad)}
                      detalle={f.euros(fila?.facturado ?? 0)}
                      fraccion={total > 0 ? cantidad / total : 0}
                      color={COLOR_ESTADO[estado]}
                    />
                  );
                })}
              </ul>
            </Tarjeta>

            <Tarjeta titulo={t("byBrand")}>
              {data.porMarca.length === 0 ? (
                <p className="text-sm text-neutral-400">{t("noData")}</p>
              ) : (
                <ul className="space-y-4">
                  {data.porMarca.map((m) => (
                    <FilaBarra
                      key={m.marca}
                      etiqueta={<InsigniaMarca marca={m.marca} />}
                      valor={f.euros(m.facturado)}
                      detalle={`${t("ordersN", { n: m.pedidos })} · ${f.porcentaje(data.kpis.facturado > 0 ? m.facturado / data.kpis.facturado : 0)}`}
                      fraccion={data.kpis.facturado > 0 ? m.facturado / data.kpis.facturado : 0}
                      claseBarra={MARCA_INFO[m.marca].acento}
                    />
                  ))}
                </ul>
              )}
            </Tarjeta>
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <Tarjeta titulo={t("topCompanies")}>
              {data.topEmpresas.length === 0 ? (
                <p className="text-sm text-neutral-400">{t("noData")}</p>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs text-neutral-500">
                      <th className="pb-2 font-normal">{t("cols.company")}</th>
                      <th className="pb-2 text-right font-normal">{t("cols.orders")}</th>
                      <th className="pb-2 text-right font-normal">{t("cols.billed")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.topEmpresas.map((e, i) => (
                      <tr key={e.partnerId} className="border-t border-neutral-100">
                        <td className="py-2 pr-2">
                          <div className="flex items-center gap-2">
                            <span className="w-4 text-xs text-neutral-400">{i + 1}</span>
                            <Link href={`/admin/partners/${e.partnerId}`} className="truncate text-neutral-900 hover:underline">
                              {e.razonSocial}
                            </Link>
                            {e.marca && !marca && <InsigniaMarca marca={e.marca} />}
                          </div>
                        </td>
                        <td className="py-2 text-right tabular-nums text-neutral-600">{f.numero(e.pedidos)}</td>
                        <td className="py-2 text-right font-medium tabular-nums text-neutral-900">{f.euros(e.facturado)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </Tarjeta>

            <Tarjeta titulo={t("topProducts")}>
              {data.topProductos.length === 0 ? (
                <p className="text-sm text-neutral-400">{t("noData")}</p>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs text-neutral-500">
                      <th className="pb-2 font-normal">{t("cols.product")}</th>
                      <th className="pb-2 text-right font-normal">{t("cols.units")}</th>
                      <th className="pb-2 text-right font-normal">{t("cols.billed")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.topProductos.map((p) => (
                      <tr key={`${p.sku}-${p.nombre}`} className="border-t border-neutral-100">
                        <td className="py-2 pr-2">
                          <p className="text-neutral-900">{p.nombre}</p>
                          <p className="font-mono text-xs text-neutral-400">{p.sku}</p>
                        </td>
                        <td className="py-2 text-right tabular-nums text-neutral-600">{f.numero(p.unidades)}</td>
                        <td className="py-2 text-right font-medium tabular-nums text-neutral-900">{f.euros(p.facturado)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </Tarjeta>
          </div>
        </>
      )}
    </div>
  );
}

function Kpi({ titulo, valor, children }: { titulo: string; valor: string; children?: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-neutral-200 bg-white p-5">
      <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">{titulo}</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums sm:text-3xl text-neutral-900">{valor}</p>
      <div className="mt-1 text-xs">{children}</div>
    </div>
  );
}

function Tarjeta({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-neutral-200 bg-white p-5">
      <p className="mb-4 text-sm font-medium text-neutral-900">{titulo}</p>
      {children}
    </div>
  );
}

function FilaBarra(props: {
  etiqueta: React.ReactNode;
  valor: string;
  detalle: string;
  fraccion: number;
  color?: string;
  claseBarra?: string;
}) {
  return (
    <li>
      <div className="flex items-center justify-between gap-3 text-sm">
        <span className="text-neutral-700">{props.etiqueta}</span>
        <span className="text-right">
          <span className="font-medium tabular-nums text-neutral-900">{props.valor}</span>
          <span className="ml-2 text-xs tabular-nums text-neutral-500">{props.detalle}</span>
        </span>
      </div>
      <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-neutral-100">
        <div
          className={`h-full rounded-full ${props.claseBarra ?? ""}`}
          style={{ width: `${Math.max(props.fraccion * 100, props.fraccion > 0 ? 1 : 0)}%`, background: props.color }}
        />
      </div>
    </li>
  );
}

export default function AdminDashboardPage() {
  return (
    <SoloAdmin>
      <AdminDashboardPageContenido />
    </SoloAdmin>
  );
}
