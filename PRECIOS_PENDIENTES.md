# Precios y datos pendientes de confirmar

El PVP es uno por aparato (`ProductoBase.pvpTarifa` en `backend/scripts/data/dispositivos.json`) y vale
para las tres marcas: Wave (VBH), ICON (Procomsa) y Connect (MySmartWindow). El precio de cada empresa
es ese PVP menos su descuento general (o el de un producto concreto, si se le pone).
Para cargar cambios: `npm run import:dispositivos` y `npm run tarifa:marcas -- --aplicar` (en `backend/`).

Actualizado: 2026-10-05.

## 1. Precio de PRUEBA (50 €), sin dato real

| Producto | SKU | Precio hoy |
|---|---|---|
| Wave2S+ Blanco | W2SP-BLANCO | 50 € (prueba) |
| Wave2S+ Negro | W2SP-NEGRO | 50 € (prueba) |
| Tapa ICON1 Blanco | TAPAICON1B | 50 € (prueba) |
| Tapa ICON1 Negro | TAPAICON1N | 50 € (prueba) |
| Tapa ICON2 Blanco | TAPAICON2B | 50 € (prueba) |
| Tapa ICON2 Negro | TAPAICON2N | 50 € (prueba) |

## 2. Precio DEDUCIDO, no visto en ninguna tarifa

Sacado de la oferta VBH (PVP − 50 %), así que PVP = el doble del precio de la hoja. Confirmar con la tarifa oficial.

| Producto (Connect / Wave / Icon) | SKU | PVP puesto | De dónde sale |
|---|---|---|---|
| Connect-1 / Wave-1 / Icon1 (blanco, negro) | W1-* | 90 € | Hoja VBH 45 € |
| Connect-1+ / Wave-1+ / Icon1+ (blanco, negro) | W1P-* | 100 € | Hoja VBH 50 € |
| Connect-2 / Wave-2 / Icon2 (blanco, negro) | W2-* | 164 € | Hoja VBH 82 € |
| Connect-2+ / Wave-2+ / Icon2+ (blanco, negro) | W2P-* | 174 € | Hoja VBH 87 € |
| Connect-2 Security / Wave2S (blanco, negro) | W2S-* | 130 € | Hoja VBH 65 € («WAVE-2 SECURITY»; David confirma Wave2S = Connect-2 Security) |
| Pulsar+ / Wave-4+ / Icon Mini+ (inox, negro) | PULSARP-* | 108 € | Hoja VBH 54 € |
| Pulsar+ con cable 1,6 m (inox, negro) | PULSARP-C16-* | 108 € | Igual que el Pulsar+ |
| Wave3 Air (blanco, inox, negro) | WALLAIR-* | 82 € | Tabla de equivalencias: Wave3 Air = C-WALL |

## 3. Precio con dudas

- **Wave-3 / C-WALL en la hoja VBH**: la hoja dice 51 €, y con PVP 82 € − 50 % saldrían 41 €. ¿Es otro PVP o un error de la hoja?
- **Wave-2 Security más barato que Wave-2 normal** (130 € frente a 164 € de PVP). ¿Es correcto?
- **Mando ICON BLUE y WAVE BLUE**: se supone el mismo precio que el bluConnect (30 €).
- **Mando Connect estándar** (`MANDO-CONNECT-ESTANDAR`, 30 €): no sale en la tarifa 2026.
- **Pulsar con cable 1,6 m** (98 € / 108 €): sin confirmar si es el mismo aparato que el Pulsar.

## 4. Sin GTIN real (código `TEST…` de prueba)

EVO Shutter / Security / Plus (12, además del color Antracita/Acero por confirmar), C-WALL Flex (además sin
colores definidos), Connect Smart White Box, botón Pulsar, cable Pulsar 1 m, cable Pulsar 2 m, cable datos
EVO y mando Witooth (bluConnect / ICON BLUE / WAVE BLUE).

## 5. Otros datos dudosos

- **Hoja VBH**: el Wave-1 Standard Negro tiene el EAN del Wave-1+ Negro (…039; el bueno es …015).
- **C-WALL duplicado** en el catálogo: Wave3 de pared (`WALL-WAVE3-*`) y C-WALL Shutter (`WALL-SHUTTER-*`)
  son el mismo aparato según la tabla de equivalencias, igual que Wave3 Air y C-WALL Sky. Falta decidir si se unen.
- **Konect Elite**: está en la tabla de equivalencias pero no en el catálogo.
