"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { useMe } from "@/hooks/use-me";
import { escucharSesionPerdida } from "@/lib/api";
import { paginaInicio, puedeVer, requiereSesion } from "@/lib/acceso";
import type { Perfil } from "@/lib/types";

/// Envuelve todas las páginas. En las zonas con sesión no enseña nada hasta saber
/// quién entra: sin sesión manda al login (que luego devuelve a la misma página)
/// y con un rol que no toca (un comprador en /admin) a su página de inicio. Así
/// nadie ve un catálogo "vacío" o una pantalla de admin sin datos y cree que es real.
export function ControlAcceso({ children }: { children: ReactNode }) {
  const t = useTranslations("common");
  const pathname = usePathname();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: perfil, isPending } = useMe();
  /// La sesión se perdió mientras se usaba el portal (no es que no se hubiera iniciado).
  const caducada = useRef(false);

  useEffect(() => {
    escucharSesionPerdida(() => {
      // Sin perfil cargado no había sesión que perder (p. ej. el /auth/me de un visitante).
      if (!queryClient.getQueryData<Perfil | null>(["me"])) return;
      caducada.current = true;
      queryClient.setQueryData(["me"], null);
    });
    return () => escucharSesionPerdida(null);
  }, [queryClient]);

  const protegida = requiereSesion(pathname);
  let destino: string | null = null;
  if (protegida && !isPending) {
    if (perfil === null) destino = "/login";
    else if (perfil && !puedeVer(pathname, perfil.rol)) destino = paginaInicio(perfil.rol);
  }

  useEffect(() => {
    if (perfil) caducada.current = false;
  }, [perfil]);

  useEffect(() => {
    if (!destino) return;
    if (destino !== "/login") {
      router.replace(destino);
      return;
    }
    const params = new URLSearchParams({ next: window.location.pathname + window.location.search });
    if (caducada.current) params.set("motivo", "caducada");
    caducada.current = false;
    router.replace(`/login?${params}`);
  }, [destino, router]);

  if (protegida && (isPending || destino)) {
    return (
      <p className="text-neutral-500" role="status">
        {t("loading")}
      </p>
    );
  }
  return <>{children}</>;
}
