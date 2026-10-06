# Guía para montar el CRM en Bigin (paso a paso)

Para montar ahora el CRM en una cuenta de Zoho y ajustarlo después con lo que pida la dirección comercial. Cubre las funcionalidades 1 a 19 de [`funcionalidades.md`](funcionalidades.md); la conexión con la plataforma (20 a 22) va aparte, ver [`integracion-plataforma.md`](integracion-plataforma.md).

Está escrita para **Bigin Premier**, con los nombres de menú de la cuenta en español (centro de datos `.eu`): en el menú de la izquierda, **Ciclos de venta**, Contactos, Empresas, Productos, Actividades y Paneles; en Configuración, **Usuarios y controles, Organización, Campos, Etapas, Formularios, Automatización, Administración de datos y Toppings**. Si algo no está donde dice, buscarlo por el nombre en el buscador de arriba (Ctrl+K). Lo marcado **(comprobar)** hay que verlo en la cuenta, porque no se ha podido probar aún. Si la cuenta es Zoho CRM en lugar de Bigin, los pasos son los mismos con otros nombres: Pipelines = Deals, Empresas = Accounts.

Tiempo estimado: una mañana para la base y otra para las mejoras.

## 0. Antes de empezar

> **Plan gratuito.** La cuenta de prueba figura con el *plan de suscripción gratuito* (aviso de arriba, con el botón *Actualizar*). El plan gratuito de Bigin tiene **1 usuario, 1 pipeline y 3 automatizaciones**, y no tiene roles ni perfiles. Con él se pueden hacer los pasos 1, 2, 4 (vistas), 5 y 6, pero **no** el 3 (usuarios y roles por país) ni todas las automatizaciones. Para esos pasos hay que pasar a **Premier** (o activar su prueba gratuita si Zoho la ofrece). Conviene decidirlo antes de montar, para no rehacer nada.

> **Qué plan elegir (precios en euros de la tienda de Zoho, 2026-10-05).** Gratuito 0 €; Express 7 € (9 € mes a mes); **Premier 12 € (15 € mes a mes)**; Bigin 360 18 € (21 € mes a mes), siempre por usuario y mes, anual salvo indicación. **Premier es el mínimo recomendado:** Express solo permite 10 campos propios por módulo y las oportunidades necesitan 11 (5 de la base y 6 de las mejoras). Premier trae 25 campos, 50 automatizaciones, 5 pipelines, campos de fórmula, limpieza de duplicados y **reglas de transición de etapa** (sirven para exigir la próxima acción y su fecha al cambiar de etapa; con ellas se resuelve la funcionalidad 5 con certeza).

1. Entrar en la cuenta y mirar **arriba a la izquierda**: debe poner Bigin. Anotar el plan (Free, Express o Premier) y la fecha en que caduca la prueba.
2. Mirar la dirección de la página: debe acabar en `.eu` (centro de datos europeo). Si acaba en `.com`, avisar antes de cargar datos de clientes.
3. Hacerlo todo con una cuenta de administrador. Hasta que se confirme el plan, no cargar datos reales de clientes.

## 1. Pipeline de ventas (funcionalidades 1 y 2)

Los registros de venta se ven en **Ciclos de venta** (menú de la izquierda; el módulo se llama «Proceso de venta»). Las etapas se definen en Configuración → **Etapas**.

1. En Configuración → **Etapas**, crear (o renombrar el pipeline existente como) **Ventas Europa**.
2. Añadir estas etapas, en este orden:

| # | Etapa | Tipo |
|---|---|---|
| 1 | Nuevo lead | Abierta |
| 2 | Contactado | Abierta |
| 3 | Interés | Abierta |
| 4 | Reunión / Demo | Abierta |
| 5 | Muestra enviada | Abierta |
| 6 | Prueba / Validación | Abierta |
| 7 | Oferta | Abierta |
| 8 | Negociación | Abierta |
| 9 | Ganado | Cerrada ganada |
| 10 | Perdido | Cerrada perdida |
| 11 | Seguimiento futuro | Cerrada perdida o aplazada (comprobar) |

Si Bigin pide una probabilidad por etapa, poner de 10 % (Nuevo lead) subiendo hasta 90 % (Negociación), 100 % en Ganado y 0 % en Perdido y Seguimiento futuro.

## 2. Campos propios (funcionalidades 3 y 4)

Configuración → **Campos**, eligiendo el módulo (Proceso de venta, Empresas o Contactos).

**En Pipelines (oportunidades):**

| Campo | Tipo | Valores | Obligatorio |
|---|---|---|---|
| Tipo de cuenta | Lista | Distribuidor, Fabricante de ventanas, Instalador, Partner con marca propia | Sí |
| Producto de interés | Lista | Connect (MySmartWindow), EVO, Mando Blue, Wave, ICON | Sí |
| Unidades potenciales al año | Número entero | | No |
| Próxima acción | Texto (200) | | Sí en etapas abiertas (comprobar) |
| Fecha próxima acción | Fecha | | Sí en etapas abiertas (comprobar) |

Origen, Importe (potencial económico), Descripción (observaciones), Propietario (comercial responsable) y Última actividad (último contacto) **ya existen**: no crearlos. En Origen, añadir si faltan: Feria, Web, Recomendación, Llamada en frío, Portal B2B (registro), Agente.

**En Empresas:**

| Campo | Tipo | Valores | Notas |
|---|---|---|---|
| País | Lista | España, Italia, Francia, Portugal, Alemania | Obligatorio |
| CIF | Texto | | Marcar **único** si Bigin lo permite: evita duplicados y es la clave de conexión con la plataforma |

**En Contactos:** nada especial. Usar Cargo, Teléfono y Correo, que ya existen.

**Obligatoriedad de la próxima acción (funcionalidad 5, comprobar):** si Bigin permite hacer un campo obligatorio solo en ciertas etapas, hacerlo obligatorio en las etapas abiertas y opcional en Perdido. Si no, hacerlo obligatorio siempre y poner «Sin acción» y una fecha lejana en las oportunidades perdidas.

## 3. Usuarios, roles y permisos (funcionalidad 8)

Configuración → **Usuarios y controles** → Roles y Perfiles (**requiere plan de pago**).

1. **Perfil «Agente»:** puede ver, crear y editar oportunidades, empresas y contactos. **No** puede borrar ni exportar.
2. **Perfil «Dirección»:** como Agente, más exportar y ver todos los paneles.
3. **Jerarquía de roles** (el que está arriba ve lo de los de abajo):

```
CEO
└── Dirección comercial
    ├── Comercial España
    ├── Agente Italia
    ├── Agente Francia
    ├── Agente Portugal
    └── Agente Alemania
```

4. Invitar a los usuarios con el correo de cada uno, asignando rol y perfil. Para empezar, solo 2 o 3 usuarios piloto.
5. **Visibilidad:** que cada agente vea solo los registros que le pertenecen y los de sus subordinados (opción de compartir datos: «privado» para empresas, contactos y oportunidades) **(comprobar)**.

Prueba: entrar como agente de Italia y comprobar que no ve oportunidades de España.

## 4. Vistas, agenda y avisos (funcionalidades 6, 7 y 19)

**Vistas** (en cada lista, «Crear vista»), sobre Pipelines:

| Vista | Filtro |
|---|---|
| Hoy | Etapa abierta y Fecha próxima acción = hoy y Propietario = yo |
| Vencidas | Etapa abierta y Fecha próxima acción anterior a hoy |
| Próximos 7 días | Etapa abierta y Fecha próxima acción entre mañana y dentro de 7 días |
| Sin próxima acción | Etapa abierta y Próxima acción vacía |
| Revisión semanal | Sin próxima acción, o más de 30 días sin actividad, o Empresa con País vacío |

**Aviso diario de vencidas** (Configuración → **Automatización** → pestaña *Reglas de automatización* → **Flujos de trabajo** → *Nuevo flujo de trabajo*; en la cuenta ya existe uno de ejemplo, «Big Deal Rule», sobre el módulo Proceso de venta): al llegar la Fecha próxima acción de una oportunidad abierta, enviar una alerta o correo al propietario con el nombre de la empresa y la acción pendiente. Comprobar si Bigin permite ejecutarlo «a las 8:00 de cada día» sobre una fecha de campo; si no, usar una tarea automática con vencimiento en esa fecha.

## 5. Panel de dirección (funcionalidad 9)

Dashboards → **Nuevo panel** «Dirección comercial». Un gráfico por bloque:

| Bloque | Gráfico | Datos |
|---|---|---|
| Oportunidades por fase y país | Barras apiladas | Recuento de oportunidades por Etapa, agrupado por País de la empresa |
| Próximas acciones | Tabla o recuento | Las vistas Hoy, Vencidas y Próximos 7 días |
| Pipeline potencial | Barras | Suma de Importe y suma de Unidades al año, por Etapa |
| Actividad | Barras | Reuniones, muestras y ofertas enviadas por mes (recuento de oportunidades que han pasado por esas etapas) |
| Por comercial | Tabla | Abiertas, vencidas y potencial por Propietario |

Compartir el panel solo con los roles Dirección comercial y CEO.

## 6. Importar los datos actuales (funcionalidad 11)

Las plantillas de columnas están en [`plantillas-importacion/`](plantillas-importacion/). Orden obligatorio, porque cada paso se apoya en el anterior:

1. **Empresas** con `1-empresas.csv`.
2. **Contactos** con `2-contactos.csv` (cada contacto apunta a su empresa por el nombre).
3. **Oportunidades** con `3-oportunidades.csv`. Hay un ejemplo en `ejemplo-oportunidad.csv`.

Pasos de cada importación: Importar → archivo CSV o Excel → emparejar columnas con campos → **evitar duplicados** (empresas por CIF, contactos por correo) → importar. Probar primero con 5 filas.

Antes de importar, limpiar el Excel: una fila por empresa, país en uno de los 5 valores, fechas como AAAA-MM-DD, y cada oportunidad abierta con próxima acción y fecha.

## 7. App móvil (funcionalidad 10)

Instalar **Bigin** desde la App Store o Google Play, entrar con el correo del usuario y comprobar que aparecen la vista Hoy y las oportunidades propias.

## 8. Mejoras (funcionalidades 12 a 19), cuando la base ya se use

| # | Qué hacer |
|---|---|
| 12 Motivo de pérdida | Campo lista «Motivo de pérdida»: Precio, Competencia, Sin presupuesto, Producto no encaja, Sin respuesta, Otro. Obligatorio al pasar a Perdido (comprobar) |
| 13 Muestras | Campos «Muestra enviada (fecha)», «Unidades de muestra» y «Resultado» (Pendiente, Positivo, Negativo). Con *Automatización de etapas*: al pasar a Muestra enviada, crear tarea «Revisar resultado» a 15 días |
| 14 Ferias | Campo lista «Feria» con las ferias del año; gráfico de oportunidades y ganadas por feria |
| 15 Paradas | Campo fecha «Fecha cambio de fase» actualizado en cada cambio de etapa (con *Automatización de etapas*, en la misma pantalla de Automatización), y una vista de las abiertas con más de 30 días |
| 16 Objetivos | Medidor de objetivos del panel, uno por agente |
| 17 Plantillas de correo | Una plantilla por idioma (ES, EN, DE, IT, PT) y por tipo: presentación, envío de catálogo, seguimiento de muestra, seguimiento de oferta |
| 18 Correo del comercial | Cada usuario conecta su buzón en Configuración → Canales → **Correo electrónico** |
| 19 Revisión semanal | La vista del punto 4, abierta cada lunes en la reunión |

Si los comerciales envían correo desde Zoho con direcciones @iotfenster.com, añadir en el DNS los registros SPF y DKIM que Zoho indique (ver [`correos.md`](correos.md)).

## 9. Lista de comprobación final

- [ ] Un agente de prueba solo ve su país
- [ ] No se puede guardar una oportunidad abierta sin próxima acción y fecha
- [ ] La vista Hoy y el aviso de vencidas funcionan
- [ ] El panel enseña datos de las oportunidades importadas
- [ ] La app móvil abre la agenda del usuario
- [ ] Las empresas están sin duplicados (por CIF)

## 10. Qué cambia si la cuenta es Zoho CRM

Los pasos son los mismos con estos nombres: Pipelines = Tratos (Deals), Empresas = Cuentas (Accounts), Flujos de trabajo = Reglas de flujo (Workflow rules). Además se pueden usar Blueprint (para obligar a rellenar campos al cambiar de etapa, lo que resuelve la próxima acción obligatoria con certeza) y territorios.
