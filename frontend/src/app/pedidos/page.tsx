"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import { api } from "@/lib/api";
import type { Order } from "@/lib/types";
import { EstadoBadge } from "@/components/estado-badge";

export default function PedidosPage() {
  const t = useTranslations("pedidos");
  const locale = useLocale();
  const { data: pedidos, isLoading } = useQuery<Order[]>({
    queryKey: ["pedidos"],
    queryFn: () => api.get<Order[]>("/pedidos"),
  });

  if (isLoading) return <p className="text-neutral-500">{t("loading")}</p>;

  if (!pedidos || pedidos.length === 0) {
    return <p className="text-neutral-500">{t("empty")}</p>;
  }

  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold text-neutral-900">{t("title")}</h1>
      <div className="overflow-hidden rounded-lg border border-neutral-200 bg-white">
        <table className="w-full text-sm">
          <thead className="border-b border-neutral-200 bg-neutral-50 text-left text-neutral-500">
            <tr>
              <th className="px-4 py-3 font-medium">{t("order")}</th>
              <th className="px-4 py-3 font-medium">{t("date")}</th>
              <th className="px-4 py-3 font-medium">{t("poNumber")}</th>
              <th className="px-4 py-3 font-medium">{t("total")}</th>
              <th className="px-4 py-3 font-medium">{t("status")}</th>
            </tr>
          </thead>
          <tbody>
            {pedidos.map((order) => (
              <tr key={order.id} className="border-b border-neutral-100 last:border-0">
                <td className="px-4 py-3">
                  <Link href={`/pedidos/${order.id}`} className="font-medium text-neutral-900 hover:underline">
                    {order.codigoPed}
                  </Link>
                </td>
                <td className="px-4 py-3 text-neutral-600">{new Date(order.createdAt).toLocaleDateString(locale)}</td>
                <td className="px-4 py-3 text-neutral-600">{order.poNumber}</td>
                <td className="px-4 py-3 font-medium text-neutral-900">{order.totalNeto} €</td>
                <td className="px-4 py-3">
                  <EstadoBadge estado={order.estado} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
