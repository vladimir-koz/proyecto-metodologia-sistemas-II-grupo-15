# PowerUp — API de entrenamientos

**Índice**

- [Documentación](#documentación)
- [Cómo levantar el proyecto](#cómo-levantar-el-proyecto)
  - [Opción 1 — Todo con Docker (recomendada)](#opción-1--todo-con-docker-recomendada)
  - [Opción 2 — Backend local y PostgreSQL con Docker](#opción-2--backend-local-y-postgresql-con-docker)
  - [Opción 3 — Todo local, sin Docker](#opción-3--todo-local-sin-docker)
- [Verificación y accesos](#verificación-y-accesos)
- [Usar requests.http en VS Code](#usar-requestshttp-en-vs-code)
- [Configuración reproducible](#configuración-reproducible)
- [Comandos del backend](#comandos-del-backend)
- [Pruebas](#pruebas)
- [Organización](#organización)
- [Problemas frecuentes](#problemas-frecuentes)
  - [Puerto ocupado](#puerto-ocupado)
  - [Backend `unhealthy` o error `EAI_AGAIN database`](#backend-unhealthy-o-error-eai_again-database)
  - [Error `EACCES` en `backend/node_modules`](#error-eacces-en-backendnode_modules)
  - [Borrar la base Docker y comenzar de nuevo](#borrar-la-base-docker-y-comenzar-de-nuevo)
- [Integrantes](#integrantes)

PowerUp es una API REST para registrar y analizar entrenamientos. Permite gestionar ejercicios, grupos musculares, rutinas y programas semanales, y registrar dos modalidades de entrenamiento:

- **Fuerza:** series con repeticiones, peso, RIR y RPE. Puede vincularse a una rutina o a una sesión programada.
- **Running libre:** distancia en kilómetros y duración en segundos. La API calcula ritmo (segundos/km) y velocidad (km/h).

Las métricas (resumen, calendario de actividad y progreso) se calculan por separado para cada modalidad mediante el patrón Strategy.

Proyecto de Metodología de Sistemas II, desarrollado con Node.js 24, TypeScript, Express, Sequelize y PostgreSQL 17.

## Documentación

| Documento | Contenido |
| --- | --- |
| Este README | Instalación, configuración, ejecución y comandos. |
| [docs/API.md](docs/API.md) | Contrato de todos los endpoints: campos, validaciones, respuestas y errores. |
| [requests.http](requests.http) | Colección de peticiones de ejemplo para la extensión REST Client de VS Code. |
| [docs/testing.md](docs/testing.md) | Pruebas automatizadas: qué verifican, cómo ejecutarlas, cómo interpretar los resultados y sus limitaciones. |
| [docs/decisiones-diseno.md](docs/decisiones-diseno.md) | Decisiones de diseño y refactoring de los Talleres II y III, incluido el uso de Strategy. |

## Cómo levantar el proyecto

La versión actualizada del Taller III está en la rama **`dev`**. Los comandos siguientes la seleccionan explícitamente al clonar. Elegir **una sola** opción; cada una comienza desde un clon nuevo y no depende de haber ejecutado las anteriores.

### Opción 1 — Todo con Docker (recomendada)

Requisitos:

- Git.
- Docker Desktop o Docker Engine en ejecución.
- Docker Compose v2.

No requiere instalar Node.js ni PostgreSQL.

Desde una terminal:

```bash
git clone --branch dev https://github.com/vladimir-koz/proyecto-metodologia-sistemas-II-grupo-15.git
cd proyecto-metodologia-sistemas-II-grupo-15
docker compose up -d --build
docker compose exec backend npm run db:setup
curl http://localhost:3001/api/health
```

En Windows PowerShell, utilizar `curl.exe` en el último comando.

Para detener todo sin borrar la base:

```bash
docker compose down
```

### Opción 2 — Backend local y PostgreSQL con Docker

Requisitos:

- Git.
- Docker Desktop o Docker Engine en ejecución.
- Docker Compose v2.
- Node.js 24 y npm.

Desde una terminal:

```bash
git clone --branch dev https://github.com/vladimir-koz/proyecto-metodologia-sistemas-II-grupo-15.git
cd proyecto-metodologia-sistemas-II-grupo-15
docker compose up -d database pgadmin
cd backend
cp .env.example .env
node --version
npm ci
npm run db:setup
npm run dev
```

En Windows PowerShell, reemplazar la copia del archivo por:

```powershell
Copy-Item .env.example .env
```

Dejar `npm run dev` ejecutándose. En otra terminal comprobar:

```bash
curl http://localhost:3001/api/health
```

Para detener la API, presionar `Ctrl+C`. Para detener PostgreSQL y pgAdmin:

```bash
cd ..
docker compose down
```

### Opción 3 — Todo local, sin Docker

Requisitos:

- Git.
- Node.js 24 y npm.
- PostgreSQL 17 instalado y en ejecución.

Primero abrir PostgreSQL como administrador. En Linux normalmente se utiliza `sudo -u postgres psql`; en Windows se puede usar SQL Shell (`psql`) o `psql -U postgres`. Ejecutar una sola vez:

```sql
CREATE USER app_user WITH PASSWORD 'app_password';
CREATE DATABASE app_database OWNER app_user;
\q
```

Después, desde una terminal:

```bash
git clone --branch dev https://github.com/vladimir-koz/proyecto-metodologia-sistemas-II-grupo-15.git
cd proyecto-metodologia-sistemas-II-grupo-15/backend
cp .env.example .env
node --version
npm ci
npm run db:setup
npm run dev
```

En Windows PowerShell, reemplazar `cp .env.example .env` por `Copy-Item .env.example .env`.

Dejar `npm run dev` ejecutándose. En otra terminal comprobar:

```bash
curl http://localhost:3001/api/health
```

Para detener la API, presionar `Ctrl+C`. PostgreSQL se detiene desde el administrador de servicios del sistema operativo.

## Verificación y accesos

- API: http://localhost:3001/api
- Healthcheck: http://localhost:3001/api/health
- PostgreSQL: `localhost:5432`
- pgAdmin, solamente en las opciones 1 y 2: http://localhost:5050

El healthcheck debe responder con `"status": "OK"`.

Credenciales locales:

| Uso | Usuario | Contraseña |
| --- | --- | --- |
| Cuenta demo de la API | `demo@powerup.com` | `Demo1234!` |
| pgAdmin | `admin@admin.com` | `admin` |
| PostgreSQL | `app_user` | `app_password` |

En pgAdmin conectar al host `database`, puerto `5432` y base `app_database`. Estas credenciales son únicamente para desarrollo local.

## Usar requests.http en VS Code

Con la API en ejecución y `npm run db:setup` completado:

1. Instalar la extensión **REST Client** en VS Code y abrir [requests.http](requests.http).
2. Revisar `@host` al principio del archivo: por defecto usa `http://localhost:3001`.
3. Pulsar **Send Request** sobre **Login demo** antes de ejecutar peticiones protegidas. REST Client reutiliza el JWT de esa respuesta.
4. Seguir las secciones de creación en orden: las peticiones con `# @name` guardan las respuestas cuyos IDs utilizan las siguientes. Las escrituras afectan recursos del usuario demo. Si se repite el registro de usuario, cambiar su email.
5. Para retirar los recursos creados, ejecutar las peticiones de limpieza en el orden indicado al final del archivo.

Esta colección permite comprobar manualmente la API; no sustituye las pruebas automatizadas.

## Configuración reproducible

- Node.js debe ser versión 24. `node --version` debe comenzar con `v24`.
- En Linux y macOS, `backend/.nvmrc` permite seleccionar esa versión con `nvm use`; NVM es opcional. En Windows se puede instalar Node.js 24 directamente o utilizar un administrador de versiones compatible.
- `package-lock.json` se versiona y las dependencias se instalan con `npm ci`.
- Para ejecutar la API local se copia `.env.example` como `.env`.
- Docker Compose ya aporta sus variables y no necesita ese `.env`.
- `.env`, `node_modules`, `dist`, cobertura, logs y secretos no se versionan.

Dentro de Docker, la API usa `database:5432`; ejecutada localmente usa `localhost:5432`. `JWT_SECRET` es obligatorio.

## Comandos del backend

Esta sección es una referencia para desarrollar y mantener el backend; **no es una cuarta forma de levantar el proyecto**. Para el primer arranque se debe seguir completa una de las opciones 1, 2 o 3.

La forma de ejecutar estos comandos depende de la opción elegida:

- En la opción 1, desde la raíz: `docker compose exec backend <COMANDO>`; por ejemplo, `docker compose exec backend npm test`.
- En las opciones 2 y 3, entrar en `backend/` y ejecutar el comando directamente.
- `npm ci` se ejecuta en la computadora solamente en las opciones 2 y 3. En la opción 1 las dependencias se instalan al construir la imagen Docker.

| Comando | Cuándo utilizarlo |
| --- | --- |
| `npm ci` | Después de clonar o cuando cambia `package-lock.json`. Reinstala exactamente las dependencias registradas en el lockfile. |
| `npm run dev` | Para desarrollar en las opciones 2 o 3. Inicia la API con recarga automática y mantiene ocupada la terminal. |
| `npm run build` | Para comprobar que TypeScript compila. Genera el directorio `dist/`. |
| `npm start` | Para ejecutar el contenido ya compilado de `dist/`, sin recarga automática. Antes requiere `npm run build`. |
| `npm run migrate` | Cuando solamente se necesita crear o actualizar las tablas de PostgreSQL. No carga datos demo. |
| `npm run seed` | Cuando las tablas ya existen y solamente se necesitan los datos demo. |
| `npm run db:setup` | En el primer arranque. Ejecuta migraciones y luego seeders; es el comando habitual para preparar la base. |
| `npm test` | Para verificar cambios. Compila el proyecto y ejecuta las 33 pruebas unitarias y HTTP. No necesita base de datos. |
| `npm run test:unit` / `npm run test:http` | Para ejecutar solo las pruebas unitarias (16) o solo las HTTP (17). |
| `npm run test:migrations`, `test:auth`, `test:workouts`, `test:metrics`, `test:routines`, `test:planning` | Pruebas de integración con PostgreSQL real. Requieren una base de prueba descartable: ver [docs/testing.md](docs/testing.md#3-pruebas-de-integración-con-postgresql). |
| `npm run test:e2e` | Recorrido completo de un usuario por la API del backend, con PostgreSQL descartable y `E2E_TEST_DATABASE_URL`: ver [docs/testing.md](docs/testing.md#3-pruebas-de-integración-con-postgresql). No incluye navegador ni frontend. |

Los comandos `npm` y `docker compose` son iguales en Linux, macOS y PowerShell. Las diferencias necesarias ya están indicadas en las opciones de arranque: `cp` en Linux/macOS, `Copy-Item` en PowerShell y el acceso a PostgreSQL como administrador en la opción 3.

## Pruebas

El backend tiene 72 pruebas automatizadas con Jest y Supertest:

| Grupo | Pruebas | Qué comprueban | Comando |
| --- | ---: | --- | --- |
| Unitarias | 16 | Cálculos de fuerza y running, y selección de la estrategia de métricas. | `npm run test:unit` |
| HTTP | 17 | Healthchecks, rutas inexistentes, rechazo sin token en workouts/metrics y algunas validaciones. | `npm run test:http` |
| Migraciones | 20 | Migraciones de running, restricciones SQL, conservación de datos y reversión. | `npm run test:migrations` |
| Integración | 18 | Autenticación, entrenamientos, métricas, rutinas y planificación sobre PostgreSQL real: persistencia, permisos entre usuarios y atomicidad. | `npm run test:auth`, `test:workouts`, `test:metrics`, `test:routines`, `test:planning` |
| E2E del backend | 1 | Registro y login reales, ejercicio, fuerza, running, listados y métricas conocidas, con todos los datos funcionales creados por HTTP. | `npm run test:e2e` |

Verificación rápida, sin base de datos:

```bash
cd backend
npm test
```

En la opción 1 (todo con Docker): `docker compose exec backend npm test`. El resultado esperado es `Tests: 33 passed, 33 total`.

Las suites de migraciones, integración funcional y E2E del backend usan un PostgreSQL 17 descartable, separado de la base de desarrollo. [docs/testing.md](docs/testing.md) explica cómo prepararlo, qué casos se eligieron y por qué, y qué queda sin probar.

En GitHub, el workflow [`.github/workflows/tests.yml`](.github/workflows/tests.yml) ejecuta las mismas pruebas en cada push y pull request hacia `dev` o `main`.

Los resultados locales de la auditoría están registrados en [docs/testing.md](docs/testing.md#auditoría-definitiva-del-24112026). Permanecen [defectos y limitaciones conocidos de la API](docs/API.md#defectos-conocidos-en-campos-nullable) y [alertas de dependencias pendientes de evaluación](docs/testing.md#alertas-de-dependencias-pendientes). Las pruebas aprobadas no certifican que el proyecto esté preparado para producción.

## Organización

El flujo principal es `routes → validators/middlewares → controllers → services → repositories → Sequelize → PostgreSQL`.

| Ruta | Contenido |
| --- | --- |
| `backend/src` | Código de la API. Las estrategias de métricas por modalidad están en `services/strategies/`. |
| `backend/migrations` | Esquema de la base, incluida la incorporación de running y sus restricciones. |
| `backend/seeders` | Datos demo. |
| `backend/tests/unit`, `backend/tests/http` | Pruebas que no necesitan base de datos (`npm test`). |
| `backend/integration`, `backend/functional-integration`, `backend/e2e` | Migraciones, integración funcional y E2E del backend con PostgreSQL real; incluye el script que prepara sus bases. |
| `docs/` | Documentación técnica (ver [Documentación](#documentación)). |

## Problemas frecuentes

### Puerto ocupado

Los puertos utilizados son 3001, 5432 y 5050. Ver contenedores que ya los estén usando:

```bash
docker ps --format "table {{.Names}}\t{{.Ports}}"
```

En Windows PowerShell:

```powershell
Get-NetTCPConnection -State Listen |
  Where-Object { $_.LocalPort -in 3001, 5432, 5050 }
```

Detener solamente el proceso o contenedor conocido que provoca el conflicto.

### Backend `unhealthy` o error `EAI_AGAIN database`

Desde la raíz, recrear los contenedores sin borrar la base:

```bash
docker compose down
docker compose up -d --build --force-recreate
docker compose ps
```

### Error `EACCES` en `backend/node_modules`

Este problema puede aparecer al pasar del backend en Docker al backend local. Desde la raíz:

```bash
docker compose stop backend
rmdir backend/node_modules
cd backend
npm ci
```

No ejecutar `sudo npm ci`. `rmdir` solamente elimina el directorio si está vacío.

### Borrar la base Docker y comenzar de nuevo

El siguiente comando es destructivo y elimina todos los datos locales:

```bash
docker compose down -v
docker compose up -d --build
docker compose exec backend npm run db:setup
```

## Integrantes
- Conrado Lanusse
- Francisco Jaszczuk
- Jano Rodriguez
- Vladimir Kozik