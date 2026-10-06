# Funcionalidades del CRM

22 funcionalidades. Las 19 primeras se montan dentro de Zoho sin programar; las 3 últimas dependen de conectar Zoho con la plataforma B2B (ver [`integracion-plataforma.md`](integracion-plataforma.md)).

Pensado para **Bigin Premier**. En Zoho CRM existe todo, con menús algo distintos. Las rutas de menú son orientativas; lo marcado **a comprobar** hay que verlo en la cuenta antes de darlo por hecho. La [maqueta](maqueta/index.html) enseña cómo se verían las funcionalidades base.

## Base (lo que pide la presentación)

| # | Funcionalidad | Qué hace | Cómo se monta |
|---|---|---|---|
| 1 | Pipeline de 9 fases | Nuevo lead, Contactado, Interés, Reunión/Demo, Muestra enviada, Prueba/Validación, Oferta, Negociación, Ganado | Ajustes → Pipelines: un pipeline «Ventas Europa» con esas etapas en ese orden |
| 2 | Salidas Perdido y Seguimiento futuro | Cierran la oportunidad sin perderla de vista | Dos etapas más, marcadas como cerradas (perdida y aplazada) |
| 3 | Datos de la oportunidad | Tipo de cuenta, producto de interés, unidades al año, potencial económico, próxima acción y su fecha, origen, observaciones | Ajustes → Módulos → Pipelines → campos. Potencial = Importe; Origen y Descripción ya existen |
| 4 | Datos de empresa y contacto | Empresa con país y CIF; contacto con cargo, teléfono y correo | Campos País y CIF en Empresas. El CIF evita duplicados y sirve para conectar con la plataforma |
| 5 | Próxima acción obligatoria | No deja guardar una oportunidad abierta sin próxima acción y fecha | Marcar los dos campos como obligatorios en el formulario. **A comprobar** si Bigin permite que sea obligatorio solo en fases abiertas |
| 6 | Agenda de hoy | Vencidas, de hoy y próximas, por comercial | Vistas personalizadas filtradas por «Fecha próxima acción» y propietario = yo |
| 7 | Aviso diario de vencidas | Correo al comercial cuando una acción llega a su fecha sin hacerse | Automatización por fecha sobre «Fecha próxima acción» que manda una alerta al propietario |
| 8 | Cada agente ve solo su país | Dirección y CEO ven todo; cada agente, lo suyo | Ajustes → Usuarios → Roles: CEO → Dirección comercial → un rol por país. Perfil «Agente» sin borrar ni exportar |
| 9 | Panel de dirección | Oportunidades por fase y país, vencidas, valor y unidades, actividad, resumen por comercial | Dashboards → nuevo panel con un gráfico por bloque |
| 10 | App móvil | Fichas, llamadas, notas, tareas y agenda en el teléfono | App Bigin (iOS y Android), sin configuración extra |
| 11 | Carga de los Excel actuales | Empresas, contactos y oportunidades que ya tenéis | Importar → Empresas, luego Contactos, luego Pipelines, con una plantilla que use los campos de arriba |

### Campos propios

| Módulo | Campo | Tipo | Valores |
|---|---|---|---|
| Oportunidad | Tipo de cuenta | Lista | Distribuidor, Fabricante de ventanas, Instalador, Partner con marca propia |
| Oportunidad | Producto de interés | Lista | Connect (MySmartWindow), EVO, Mando Blue, Wave, ICON |
| Oportunidad | Unidades potenciales al año | Número | |
| Oportunidad | Próxima acción | Texto | |
| Oportunidad | Fecha próxima acción | Fecha | |
| Empresa | País | Lista | España, Italia, Francia, Portugal, Alemania |
| Empresa | CIF | Texto, único | |

Origen, Importe, Descripción, Propietario y Última actividad son campos estándar.

## Mejoras

| # | Funcionalidad | Qué hace | Cómo se monta |
|---|---|---|---|
| 12 | Motivo de pérdida | Al pasar a Perdido se elige el motivo: precio, competencia, sin presupuesto, producto no encaja, sin respuesta, otro | Campo de lista «Motivo de pérdida». Obligatorio solo al perder: **a comprobar**; si no se puede, una automatización crea una tarea para rellenarlo |
| 13 | Control de muestras | Qué muestra se envió, cuándo, cuántas unidades y qué resultado dio | Campos «Muestra enviada (fecha)», «Unidades de muestra» y «Resultado» (pendiente, positivo, negativo). Al pasar a Muestra enviada se crea la tarea «Revisar resultado» a 15 días |
| 14 | Ferias como origen | Saber qué feria trae más oportunidades y cuáles se ganan | Campo de lista «Feria» que solo se rellena si el origen es Feria, más un gráfico en el panel |
| 15 | Oportunidades paradas | Aviso si una oportunidad lleva más de 30 días en la misma fase | Campo «Fecha cambio de fase» que una automatización actualiza en cada cambio, y otra que avisa al comercial y a dirección a los 30 días. **A comprobar** |
| 16 | Objetivos por agente y país | Meta de ventas o de oportunidades ganadas, con su medidor | Medidor de objetivos del panel de Bigin Premier |
| 17 | Plantillas de correo en 5 idiomas | Presentación, envío de catálogo, seguimiento de muestra y de oferta, en español, inglés, alemán, italiano y portugués | Plantillas de correo de Bigin, una por idioma |
| 18 | Correo del comercial dentro del CRM | Los correos que cruza cada comercial con la empresa se ven en su ficha | Conectar el buzón de cada usuario (Gmail, Outlook o Zoho Mail) en Ajustes → Correo |
| 19 | Revisión semanal de calidad | Lista de oportunidades sin próxima acción, paradas o sin país, para la reunión semanal | Vista «Revisión semanal». Informe programado los lunes al director: **a comprobar**; si no, el director abre la vista |

## Conexión con la plataforma B2B

| # | Funcionalidad | Qué hace | Qué hace falta |
|---|---|---|---|
| 20 | Empresas y pedidos en el CRM | Cada empresa de la plataforma aparece en Zoho (por CIF) con su marca, tipo y estado. Cada pedido suma a su ficha: código PED, PO, fecha, total y estado. Las solicitudes de registro entran como Nuevo lead | Código en la plataforma. En Zoho, una clave de acceso a la API. En el entorno de nube, permitir los dominios de Zoho |
| 21 | Cliente ganado al panel de admin | Al pasar una oportunidad a Ganado, la empresa llega al panel de admin como pendiente de aprobar. El admin sigue aprobando como ahora | Un aviso (webhook) en Zoho y su recepción en la plataforma |
| 22 | Clientes que dejan de comprar | Si un distribuidor no hace pedidos en 60 días, se crea una tarea de seguimiento para su comercial | Depende de la 20; la plataforma revisa cada noche la fecha del último pedido |

Nada sensible sale de la plataforma: ni usuarios, ni contraseñas, ni precios por empresa. El descuento de cada empresa solo se envía si se decide que los agentes lo vean.

## Lista de implantación

Los números entre paréntesis son las funcionalidades de las tablas.

**Antes de empezar**

- [ ] Confirmar si la cuenta es Bigin o Zoho CRM, que está en el centro de datos europeo (`.eu`) y cuándo caduca la prueba
- [ ] Elegir plan (recomendado Bigin Premier) antes de que caduque, para no perder la configuración
- [ ] Validar con la dirección comercial las fases, los campos y quién ve qué, con la maqueta

**Montar la base**

- [ ] Crear el pipeline y sus 11 etapas (1, 2)
- [ ] Crear los campos de oportunidad, empresa y contacto (3, 4)
- [ ] Hacer obligatorias la próxima acción y su fecha (5)
- [ ] Crear roles y perfil de agente, y dar de alta a los usuarios (8)
- [ ] Crear las vistas de agenda (6) y el aviso de vencidas (7)
- [ ] Montar el panel de dirección (9)
- [ ] Importar los Excel: primero empresas, luego contactos, luego oportunidades (11)
- [ ] Instalar la app en el móvil de los usuarios piloto (10)
- [ ] Probar unas semanas con 2 o 3 comerciales

**Añadir las mejoras**

- [ ] Motivo de pérdida y control de muestras (12, 13)
- [ ] Ferias, oportunidades paradas y objetivos (14, 15, 16)
- [ ] Plantillas en 5 idiomas y buzones conectados (17, 18)
- [ ] Revisión semanal (19)
- [ ] Si los comerciales envían desde Zoho, añadir los registros SPF y DKIM de Zoho al DNS (ver [`correos.md`](correos.md))

**Conectar con la plataforma**

- [ ] Crear en Zoho la clave de acceso a la API y guardarla como secreto del entorno
- [ ] Permitir en el entorno de nube `accounts.zoho.eu` y `www.zohoapis.eu`
- [ ] Empresas, pedidos y solicitudes de registro en el CRM (20)
- [ ] Cliente ganado al panel de admin (21)
- [ ] Aviso de clientes que dejan de comprar (22)

## Planes y precios de referencia

Consultados el 2026-10-05, en dólares, facturación anual, sin impuestos.

| Producto | Plan | Precio | Notas |
|---|---|---|---|
| Bigin | Free | 0 | 1 usuario, 1 pipeline, 3 automatizaciones |
| Bigin | Express | 7 $/usuario/mes | 3 pipelines, 10 campos propios por módulo, 30 automatizaciones, roles y perfiles |
| Bigin | **Premier** | 12 $/usuario/mes | 5 pipelines, 25 campos propios por módulo, 50 automatizaciones, medidor de objetivos |
| Zoho CRM | Standard / Professional / Enterprise | 14 / 23 / 40 $/usuario/mes | Territorios desde Enterprise; Blueprint desde Professional |

Bigin no tiene territorios ni módulo de pedidos de venta. Si hiciera falta, Zoho migra a Zoho CRM empresas, contactos, oportunidades, notas, tareas y eventos.

Fuentes: [precios de Bigin](https://www.bigin.com/pricing.html), [FAQ de Bigin](https://www.bigin.com/articles/faqs-about-bigin.html), [comparativa de ediciones de Zoho CRM](https://www.zoho.com/crm/comparison.html), [resumen de precios de Zoho CRM](https://meetergo.com/en/magazine/zoho-crm-pricing).
