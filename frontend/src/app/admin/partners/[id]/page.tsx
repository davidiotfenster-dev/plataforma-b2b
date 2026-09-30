"use client";

import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { Partner } from "@/lib/types";
import { PartnerForm } from "../partner-form";
import { PartnerHeader } from "../partner-header";

/// Ficha de un partner: cabecera con su estado y acciones, y sus datos editables.
export default function FichaPartnerPage() {
  const params = useParams<{ id: string }>();
  const partnerId = params.id;

  const { data: partner } = useQuery<Partner>({
    queryKey: ["admin-partner", partnerId],
    queryFn: () => api.get<Partner>(`/partners/${partnerId}`),
  });

  return (
    <div>
      <PartnerHeader partnerId={partnerId} activa="datos" />
      {partner && <PartnerForm key={partner.id} partner={partner} />}
    </div>
  );
}
