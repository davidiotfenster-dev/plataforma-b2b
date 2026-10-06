"use client";

import { useEffect } from "react";

/// Con cambios sin guardar (`activo`), pide confirmación antes de perderlos:
/// - al cerrar o recargar la pestaña (el navegador pone su propio texto);
/// - al pulsar un enlace de la propia aplicación (menú, migas…), que antes cambiaba
///   de página sin avisar porque la navegación interna no dispara `beforeunload`.
export function useAvisoSinGuardar(activo: boolean, mensaje: string) {
  useEffect(() => {
    if (!activo) return;
    const alSalir = (e: BeforeUnloadEvent) => e.preventDefault();
    const alPulsar = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const enlace = (e.target as Element | null)?.closest?.("a[href]");
      if (!(enlace instanceof HTMLAnchorElement) || enlace.target === "_blank" || enlace.hasAttribute("download")) return;
      const destino = new URL(enlace.href, window.location.href);
      if (destino.origin !== window.location.origin) return;
      if (destino.pathname === window.location.pathname && destino.search === window.location.search) return;
      if (!window.confirm(mensaje)) {
        e.preventDefault();
        e.stopPropagation();
      }
    };
    window.addEventListener("beforeunload", alSalir);
    // En captura: se decide antes de que el <Link> de Next haga la navegación.
    document.addEventListener("click", alPulsar, true);
    return () => {
      window.removeEventListener("beforeunload", alSalir);
      document.removeEventListener("click", alPulsar, true);
    };
  }, [activo, mensaje]);
}
