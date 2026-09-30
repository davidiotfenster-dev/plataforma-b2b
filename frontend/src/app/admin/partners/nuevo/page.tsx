"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { ArrowLeft } from "lucide-react";
import { PartnerForm } from "../partner-form";

export default function NuevoPartnerPage() {
  const t = useTranslations("adminPartners");

  return (
    <div>
      <Link href="/admin/partners" className="inline-flex items-center gap-1 text-sm text-neutral-500 hover:text-neutral-800">
        <ArrowLeft size={14} /> {t("backToList")}
      </Link>
      <h1 className="mt-3 text-2xl font-semibold text-neutral-900">{t("createTitle")}</h1>
      <p className="mb-6 mt-1 text-sm text-neutral-500">{t("createSubtitle")}</p>
      <PartnerForm />
    </div>
  );
}
