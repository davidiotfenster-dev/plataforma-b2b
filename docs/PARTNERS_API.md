# API de Partners (AWS) — fase MOCK

La plataforma ya tiene el cliente para la API de Partners de IoT FENSTER
(API Gateway `/v1` → Lambda Partner Manager), según el documento
"IoT Fenster Partners API MOCK v1.1" (6-10-2026).

## Qué hay

- `backend/src/partners-api/`: cliente HTTP y un repositorio por bloque con las 38 rutas
  (auth 1-7, empresa 8-16, admin 17-37, auditoría 38).
- Cabeceras del contrato: `X-Request-Id` (el mismo de la petición del navegador, de punta a
  punta), `X-Actor-User-Id` / `X-Actor-Partner-Id` en escrituras, `Idempotency-Key` en las
  marcadas [Idem], `x-api-key` si se configura.
- Timeout por llamada y reintentos solo en GET y escrituras idempotentes (misma clave).
- Errores: 404 opaco, 409/422 con `codigo`/`mensaje`/`campo`, API caída → 503.
- Auditoría: con `PARTNERS_API_AUDITORIA=true` los eventos se copian en lotes a `/audit/events`.

## Configurar (.env del backend)

```
PARTNERS_API_URL="https://055cjz2gki.execute-api.eu-west-1.amazonaws.com/v1"
PARTNERS_API_KEY=""            # cuando API Gateway exija API key
```

## Probar el contrato

```
npm run api:contrato                  # las 16 lecturas
npm run api:contrato -- --escrituras  # las 38 (solo contra el MOCK)
```

## Qué falta (siguiente fase)

Las pantallas siguen leyendo de PostgreSQL: el MOCK devuelve siempre los mismos datos de
prueba, así que pasar un dominio a la API ahora dejaría la plataforma con datos falsos.
Cuando la API tenga datos reales, cada servicio (auth → catálogo → carrito → pedidos →
admin) cambia Prisma por su repositorio sin tocar controladores ni frontend.

Antes de eso: la API está abierta (responde sin API key ni autenticación) y en el MOCK los
ids de ejemplo no son UUID (`user-001`, `company-001`).
