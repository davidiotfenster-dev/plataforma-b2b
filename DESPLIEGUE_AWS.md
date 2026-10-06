# Despliegue en AWS: base de datos, Redis y copias de seguridad

Decisión (6/10/2026): la base de datos va en un servicio gestionado de AWS.
Este documento dice cómo montar PostgreSQL y Redis en producción, qué variables
necesita el backend y cómo se hacen las copias de seguridad. El `docker-compose.yml`
de la raíz es solo para desarrollo local.

## 0. Qué hace falta (resumen)

| Pieza | Tecnología | Servicio de AWS recomendado |
|---|---|---|
| Servidor de la web (frontend) | Next.js 16 + React 19 sobre **Node.js 22 LTS** (`npm run build` y `npm run start`) | EC2 (misma máquina que el backend) |
| Servidor del API (backend) | NestJS 12 sobre **Node.js 22 LTS** (`npm run build` y `node dist/main`) | EC2 `t4g.small` con Nginx y PM2 |
| Base de datos | **PostgreSQL 16** | Amazon RDS (apartado 1) |
| Caché | Redis 7 (opcional) | ElastiCache, o ninguno (apartado 2) |
| Fotos de productos | Ficheros en disco (`UPLOADS_DIR`) | Disco EBS del EC2, con instantáneas diarias de AWS Backup |
| Correo (altas, pedidos, contraseñas) | Amazon SES, ya integrado (`EMAIL_PROVEEDOR=ses`) | SES con el dominio verificado (SPF, DKIM y DMARC) y fuera del modo sandbox |
| PDF y Excel | PDFKit y ExcelJS dentro del backend | Nada aparte |
| Dominio y HTTPS | Dos subdominios del mismo dominio, p. ej. `portal.iotfenster.com` (web) y `api.iotfenster.com` (API). **Tienen que ser del mismo dominio**: la cookie de sesión es `SameSite=Strict`. | Route 53 (o el DNS actual) + certificado de ACM en un balanceador, o Let's Encrypt en Nginx |
| Secretos | `JWT_SECRET`, contraseñas de la base de datos y de Redis | Secrets Manager o Parameter Store |
| Logs | El backend escribe la auditoría en JSON por la salida estándar | CloudWatch Logs |

**Por qué un EC2 y no contenedores:** las fotos que sube el admin se guardan en el disco
del servidor. En un EC2 con disco EBS se conservan entre reinicios. Si más adelante se
pasa a contenedores (ECS Fargate), habrá que montar EFS en `UPLOADS_DIR` o mover las
fotos a S3.

**Al compilar el frontend**, `NEXT_PUBLIC_API_URL` tiene que valer la URL pública del API
(p. ej. `https://api.iotfenster.com`): se fija en el `npm run build`, no al arrancar.

**Nginx delante** de los dos servidores: HTTPS, redirección de http a https y proxy a los
puertos de Node. Por eso en el backend va `TRUST_PROXY=1`, o `2` si además hay un
balanceador delante.

## 1. PostgreSQL: Amazon RDS

| Ajuste | Valor |
|---|---|
| Motor | PostgreSQL 16 |
| Tamaño inicial | `db.t4g.small` (2 GB). Sobra para miles de pedidos; se puede subir sin perder datos. |
| Disco | gp3, 20 GB, con autoescalado de almacenamiento activado |
| Región | `eu-west-1` (Irlanda) o `eu-south-2` (España): datos dentro de la UE |
| Red | Subred privada. **Acceso público: No.** |
| Security group | Entrada 5432 solo desde el security group del backend. Nada desde Internet. |
| Cifrado | Activado (KMS) |
| Protección contra borrado | Activada |
| Multi-AZ | Recomendado en cuanto haya clientes reales (copia en espera en otra zona) |
| Copias automáticas | 30 días de retención (recuperación a cualquier momento de esos 30 días) |
| Parámetros | `rds.force_ssl = 1` (por defecto en PostgreSQL 16) |

### Usuarios de la base

El usuario maestro de RDS solo se usa para crear la base y estos dos usuarios. La
aplicación no debe conectarse con él.

```sql
CREATE DATABASE fenster;
\c fenster

-- Dueño del esquema: con él se ejecutan las migraciones.
CREATE ROLE fenster_migraciones LOGIN PASSWORD '<contraseña larga aleatoria>';
GRANT ALL ON SCHEMA public TO fenster_migraciones;
ALTER DATABASE fenster OWNER TO fenster_migraciones;

-- La aplicación: leer y escribir datos, sin poder cambiar la estructura.
CREATE ROLE fenster_app LOGIN PASSWORD '<otra contraseña larga aleatoria>';
GRANT CONNECT ON DATABASE fenster TO fenster_app;
GRANT USAGE ON SCHEMA public TO fenster_app;
ALTER DEFAULT PRIVILEGES FOR ROLE fenster_migraciones IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO fenster_app;
ALTER DEFAULT PRIVILEGES FOR ROLE fenster_migraciones IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO fenster_app;
```

Las contraseñas se guardan en AWS Secrets Manager (o en las variables cifradas del
servicio donde corra el backend), nunca en el repositorio.

### Conexión cifrada

RDS exige SSL. El backend (driver `pg`) debe verificar el certificado de RDS:

1. Descargar el paquete de certificados de AWS (`global-bundle.pem`) de
   https://truststore.pki.rds.amazonaws.com/global/global-bundle.pem y copiarlo junto
   al backend, por ejemplo en `/app/certs/rds-global-bundle.pem`.
2. `DATABASE_URL` de la aplicación:
   `postgresql://fenster_app:<pass>@<endpoint-rds>:5432/fenster?sslmode=verify-full&sslrootcert=/app/certs/rds-global-bundle.pem`

Para las migraciones (`npx prisma migrate deploy`) se usa el usuario
`fenster_migraciones` con `?sslmode=require`. Comprobarlo en el primer despliegue:
si Prisma rechaza el certificado, añadir `&sslaccept=accept_invalid_certs` solo para
ese comando y no para la aplicación.

## 2. Redis: Amazon ElastiCache (opcional)

Redis solo guarda 2 minutos las estadísticas del panel de administración; la web
funciona igual sin él. Dos opciones:

- **Recomendada:** ElastiCache for Redis OSS (o Valkey), `cache.t4g.micro`, una sola
  instancia, en la misma subred privada, con **cifrado en tránsito** y **token AUTH**.
  `REDIS_URL=rediss://:<token>@<endpoint>:6379` (fíjate en la doble `s` de `rediss`).
- **Más barata:** no crear Redis. El backend avisa en el log al arrancar y en cada
  intento de conexión, y las estadísticas se calculan siempre en PostgreSQL
  (unos 150 ms con 56.000 pedidos).

Si algún día hay más de una instancia del backend, conviene guardar en Redis también el
límite de intentos de login (ahora va en memoria de cada instancia).

## 3. Variables del backend en producción

| Variable | Valor |
|---|---|
| `DATABASE_URL` | La de `fenster_app` con `sslmode=verify-full` (arriba) |
| `JWT_SECRET` | Nueva, aleatoria, 64 caracteres o más (`openssl rand -base64 48`). Nunca la de desarrollo. |
| `REDIS_URL` | `rediss://…` de ElastiCache, o sin definir |
| `FRONTEND_URL` | La URL pública del portal (`https://…`) |
| `TRUST_PROXY` | `1` si delante hay un balanceador (ALB) o CloudFront; `2` si hay CloudFront + ALB |
| `EMAIL_PROVEEDOR` | `ses` |
| `AWS_SES_REGION` | La región donde se verificó el dominio en SES |
| `EMAIL_FROM` / `EMAIL_REPLY_TO` | Direcciones del dominio verificado |
| `COOKIE_SAME_SITE` | Sin definir (Strict). `none` es solo para demos por túnel. |
| `PORT` | El puerto interno al que apunta Nginx |
| `UPLOADS_DIR` | Carpeta persistente de las fotos (p. ej. `/srv/fenster/uploads/productos`). Copiar ahí las `default-*.png` de `backend/uploads/productos`. |

El backend no arranca si falta `DATABASE_URL` o si `JWT_SECRET` tiene menos de 32
caracteres, y avisa en el log si faltan Redis, `FRONTEND_URL` o el correo.

## 4. Copias de seguridad

1. **Automáticas de RDS**: retención de 30 días, con recuperación a un momento dado
   (por ejemplo, «cómo estaba la base ayer a las 10:32»). Restaurar crea una base
   nueva; luego se apunta el backend a ella.
2. **Instantánea manual antes de cada despliegue** que lleve migraciones:
   `aws rds create-db-snapshot --db-instance-identifier <id> --db-snapshot-identifier antes-<fecha>`.
   Las manuales no caducan; borrar las viejas a mano.
3. **Copia fuera de la región** (recomendable): un plan de AWS Backup que copie la
   instantánea diaria a otra región de la UE y la guarde 90 días.
4. **Prueba de restauración una vez al mes**: restaurar la última copia en una
   instancia temporal, comprobar que tiene los pedidos del día anterior y borrarla.
   Una copia que nunca se ha restaurado no está comprobada.

## 5. Pasos de cada despliegue

1. Instantánea manual de RDS (punto 4.2).
2. `cd backend && DATABASE_URL=<url de fenster_migraciones> npx prisma migrate deploy`
3. `npx prisma generate && npm run build`
4. Publicar backend y frontend a la vez.
5. Solo la primera vez: `npm run seed:admin` y la carga del catálogo
   (ver `PROCESO_CARGA_CATALOGO.md`). Las cuentas de prueba no se crean en producción.
6. Comprobar `npx prisma migrate status` → «Database schema is up to date».

## 6. Auditoría

La tabla `AuditLog` guarda una fila por petición (unos 200 bytes) y crece sin límite.
Los textos legales dicen que los registros de seguridad se guardan como máximo 12 meses,
así que hace falta una tarea programada (por ejemplo, diaria) que borre lo anterior:

```sql
DELETE FROM "AuditLog" WHERE "timestamp" < NOW() - INTERVAL '12 months';
```

Pendiente de implementar como tarea del backend o como programación en AWS
(EventBridge Scheduler + Lambda, o `pg_cron` en RDS).
