"use client";

import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { Bar, BarChart, CartesianGrid, Cell, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { api } from "@/lib/api";
import type { Estadisticas } from "@/lib/types";

const COLOR_ESTADO: Record<string, string> = {
  RECIBIDO: "#a3a3a3",
  CONFIRMADO: "#3b82f6",
  EN_PREPARACION: "#f59e0b",
  PREPARADO: "#a855f7",
  ENVIADO: "#22c55e",
  CANCELADO: "#ef4444",
};

export default function AdminDashboardPage() {
  const t = useTranslations("adminDashboard");
  const tEstados = useTranslations("estados");
  const { data, isLoading } = useQuery<Estadisticas>({
    queryKey: ["admin-estadisticas"],
    queryFn: () => api.get<Estadisticas>("/pedidos/admin/estadisticas"),
  });

  if (isLoading) return <p className="text-neutral-500">{t("loading")}</p>;
  if (!data) return null;

  const porEstadoConNombre = data.porEstado.map((e) => ({ ...e, nombre: tEstados(e.estado) }));

  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold text-neutral-900">{t("title")}</h1>

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="rounded-lg border border-neutral-200 bg-white p-5">
          <p className="text-xs text-neutral-500">{t("totalOrders")}</p>
          <p className="text-3xl font-semibold text-neutral-900">{data.totalPedidos}</p>
        </div>
        <div className="rounded-lg border border-neutral-200 bg-white p-5">
          <p className="text-xs text-neutral-500">{t("totalBilled")}</p>
          <p className="text-3xl font-semibold text-neutral-900">{data.totalFacturado} €</p>
        </div>
      </div>

      <div className="mb-6 rounded-lg border border-neutral-200 bg-white p-5">
        <p className="mb-4 text-sm font-medium text-neutral-900">{t("byStatus")}</p>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={porEstadoConNombre}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" />
            <XAxis dataKey="nombre" tick={{ fontSize: 12 }} />
            <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
            <Tooltip />
            <Bar dataKey="cantidad" radius={[4, 4, 0, 0]}>
              {porEstadoConNombre.map((entry) => (
                <Cell key={entry.estado} fill={COLOR_ESTADO[entry.estado] ?? "#3b82f6"} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="mb-6 rounded-lg border border-neutral-200 bg-white p-5">
        <p className="mb-4 text-sm font-medium text-neutral-900">{t("last30Days")}</p>
        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={data.pedidosPorDia}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" />
            <XAxis dataKey="dia" tick={{ fontSize: 11 }} />
            <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
            <Tooltip />
            <Line type="monotone" dataKey="cantidad" stroke="#3b82f6" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
        {data.pedidosPorDia.length === 0 && <p className="text-sm text-neutral-400">{t("noData")}</p>}
      </div>

      <div className="rounded-lg border border-neutral-200 bg-white p-5">
        <p className="mb-4 text-sm font-medium text-neutral-900">{t("topPartners")}</p>
        <ResponsiveContainer width="100%" height={Math.max(200, data.porPartner.length * 40)}>
          <BarChart data={data.porPartner} layout="vertical" margin={{ left: 24 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" />
            <XAxis type="number" tick={{ fontSize: 12 }} />
            <YAxis type="category" dataKey="razonSocial" width={160} tick={{ fontSize: 12 }} />
            <Tooltip />
            <Bar dataKey="cantidad" fill="#3b82f6" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
        {data.porPartner.length === 0 && <p className="text-sm text-neutral-400">{t("noData")}</p>}
      </div>
    </div>
  );
}
