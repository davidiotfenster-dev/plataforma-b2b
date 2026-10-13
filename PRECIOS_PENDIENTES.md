# Precios y datos pendientes de confirmar

El PVP es uno por aparato (`ProductoBase.pvpTarifa` en `backend/scripts/data/dispositivos.json`) y vale
para las tres marcas: Wave (VBH), ICON (Procomsa) y Connect (MySmartWindow). El precio de cada empresa
es ese PVP menos su descuento general (o el de un producto concreto, si se le pone).
Para cargar cambios: `npm run import:dispositivos` y `npm run tarifa:marcas -- --aplicar` (en `backend/`).

Actualizado: 2026-10-08. La tabla completa de lo que falta, lista para enviar y rellenar, está en `PENDIENTES_TARIFA_2026.xlsx`.

## 0. Tarifa (3) del 2026-10-08

Solo cambia la hoja EVO respecto a la tarifa (2); el resto de precios coincide con el sistema.

- **Aplicado hoy:** EVO Security 114 → 96 € y EVO Plus 138 → 116 € (4 colores cada uno), en `dispositivos.json`, en `ProductoBase`, en los tres catálogos de marca y en las empresas.
- **EVO Shutter** (108 €, 4 colores) ya no sale en la tarifa. Se deja a 108 € hasta que IoT FENSTER diga si sigue a la venta.
- **Los catálogos de marca siguen con 50 €** en 37 productos cuyo precio deducido (sección 2) ya está en `ProductoBase` (VBH 15, Procomsa 10, MySmartWindow 12). Las empresas ven 50 € hasta que se ejecute `npm run tarifa:marcas -- --aplicar`, que se dejó sin aplicar a propósito porque son precios sin confirmar.

### Carga del 2026-10-08 (tarde)

Con las respuestas de David y su jefe se cargó en el sistema (copia previa de la base en `%TEMP%\backups\fenster-antes-carga-102.dump`):

- **Precios:** C-WALL Shutter, Sky y Flex, Wave3 y Wave3 Air a **102 €**; Wave2S+ a **135 €** (lectura de «precio del normal más 5», sin confirmar si eran 140); tapas ICON a **5 €**; y los precios deducidos (90, 100, 164, 174, 130, 108) llevados a los catálogos de marca y a las empresas. No queda ningún producto a 50 €.
- **Retirados:** EVO Shutter (4) y los acabados Especial de Shutter y Sky (2). Pedidos y carritos no tenían líneas de esos productos.
- **Unidos:** Wave3 → C-WALL Shutter, Wave3 Air → C-WALL Sky, Pulsar+ con cable 1,6 m → Pulsar+ (el Pulsar+ es la versión con cable). El catálogo pasa de 58 a 44 productos.
- **Sigue sin resolver:** el Pulsar normal con cable de 1,6 m (`PULSAR-C16-*`, 98 €) se deja como estaba hasta saber si existe; 18 GTIN en 15 productos, que se pusieron a `0` como marcador (antes `TEST…`; siguen marcados con `datosDePrueba` en el JSON y hay que cambiarlos por los reales). Los colores del C-WALL Flex «dan igual».
- Las secciones 1 a 3 de abajo son anteriores a esta carga.

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

- **Wave-3 / C-WALL en la hoja VBH**: la hoja dice 51 €, y con PVP 82 € − 50 % saldrían 41 €. ¿Es otro PVP o un error de la hoja? (La tarifa oficial pone 82 € al C-WALL; lo que sigue sin explicar es el 51 € de VBH.)
- **Wave-2 Security más barato que Wave-2 normal** (130 € frente a 164 € de PVP). ¿Es correcto?
- **Mando ICON BLUE y WAVE BLUE**: se supone el mismo precio que el bluConnect (30 €).
- **Mando Connect estándar** (`MANDO-CONNECT-ESTANDAR`, 30 €): no sale en la tarifa 2026.
- **Pulsar con cable 1,6 m** (98 € / 108 €): sin confirmar si es el mismo aparato que el Pulsar.

## 4. Sin GTIN real (código `TEST…` de prueba)

EVO Shutter / Security / Plus (12; el color es Antracita, confirmado por la tarifa (3)), C-WALL Flex (además sin
colores definidos), Connect Smart White Box, botón Pulsar, cable Pulsar 1 m, cable Pulsar 2 m, cable datos
EVO y mando Witooth (bluConnect / ICON BLUE / WAVE BLUE).

## 5. Otros datos dudosos

- **Hoja VBH**: el Wave-1 Standard Negro tiene el EAN del Wave-1+ Negro (…039; el bueno es …015).
- **C-WALL duplicado** en el catálogo: Wave3 de pared (`WALL-WAVE3-*`) y C-WALL Shutter (`WALL-SHUTTER-*`)
  son el mismo aparato según la tabla de equivalencias, igual que Wave3 Air y C-WALL Sky. Falta decidir si se unen.
- **Konect Elite**: está en la tabla de equivalencias pero no en el catálogo.
