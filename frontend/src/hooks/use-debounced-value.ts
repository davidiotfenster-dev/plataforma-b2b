import { useEffect, useState } from "react";

/// Retrasa la propagación de un valor que cambia rápido (p. ej. un campo de
/// búsqueda) para no disparar una petición al servidor en cada pulsación.
export function useDebouncedValue<T>(valor: T, delayMs = 350): T {
  const [debounced, setDebounced] = useState(valor);

  useEffect(() => {
    const timeout = setTimeout(() => setDebounced(valor), delayMs);
    return () => clearTimeout(timeout);
  }, [valor, delayMs]);

  return debounced;
}
