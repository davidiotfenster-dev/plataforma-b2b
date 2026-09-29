"use client";

import { useTranslations } from "next-intl";

export function Paginacion({
  page,
  limit,
  total,
  onPageChange,
}: {
  page: number;
  limit: number;
  total: number;
  onPageChange: (page: number) => void;
}) {
  const t = useTranslations("common");
  const totalPaginas = Math.max(1, Math.ceil(total / limit));

  if (totalPaginas <= 1) return null;

  return (
    <div className="mt-4 flex items-center justify-between gap-2 text-sm">
      <button
        onClick={() => onPageChange(page - 1)}
        disabled={page <= 1}
        className="rounded-md border border-neutral-300 px-3 py-1.5 text-neutral-700 hover:bg-neutral-50 disabled:opacity-40"
      >
        {t("previous")}
      </button>
      <span className="text-neutral-500">{t("pageOf", { page, total: totalPaginas })}</span>
      <button
        onClick={() => onPageChange(page + 1)}
        disabled={page >= totalPaginas}
        className="rounded-md border border-neutral-300 px-3 py-1.5 text-neutral-700 hover:bg-neutral-50 disabled:opacity-40"
      >
        {t("next")}
      </button>
    </div>
  );
}
