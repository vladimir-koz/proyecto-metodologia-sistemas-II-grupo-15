# Pruebas automatizadas

[Volver al README](../README.md)

**Índice**

- [1. Resumen de las suites](#1-resumen-de-las-suites)
- [2. Pruebas sin base de datos (`npm test`)](#2-pruebas-sin-base-de-datos-npm-test)
- [3. Pruebas de integración con PostgreSQL](#3-pruebas-de-integración-con-postgresql)
  - [Por qué se ejecutan aparte](#por-qué-se-ejecutan-aparte)
  - [Paso 1 — Levantar un PostgreSQL 17 descartable](#paso-1--levantar-un-postgresql-17-descartable)
  - [Paso 2 — Crear las bases y usuarios de prueba](#paso-2--crear-las-bases-y-usuarios-de-prueba)
  - [Paso 3 — Definir las variables de conexión](#paso-3--definir-las-variables-de-conexión)
  - [Paso 4 — Ejecutar](#paso-4--ejecutar)
  - [Paso 5 — Eliminar el entorno de prueba](#paso-5--eliminar-el-entorno-de-prueba)
- [4. Qué verifica cada grupo y por qué elegimos esos casos](#4-qué-verifica-cada-grupo-y-por-qué-elegimos-esos-casos)
  - [Unitarias de Strategy (16) — `tests/unit/`](#unitarias-de-strategy-16--testsunit)
  - [HTTP (17) — `tests/http/`](#http-17--testshttp)
  - [Migraciones y restricciones SQL (20) — `integration/`](#migraciones-y-restricciones-sql-20--integration)
  - [Integración funcional (18) — `functional-integration/`](#integración-funcional-18--functional-integration)
  - [E2E del backend (1) — `e2e/`](#e2e-del-backend-1--e2e)
- [5. Cómo interpretar los resultados](#5-cómo-interpretar-los-resultados)
  - [Última ejecución registrada](#última-ejecución-registrada)
  - [Auditoría definitiva del 24/11/2026](#auditoría-definitiva-del-24112026)
- [6. Decisiones sobre las pruebas](#6-decisiones-sobre-las-pruebas)
- [7. Limitaciones y qué no se prueba](#7-limitaciones-y-qué-no-se-prueba)
  - [Alertas de dependencias pendientes](#alertas-de-dependencias-pendientes)
- [8. Integración continua](#8-integración-continua)

Este documento explica qué pruebas tiene el backend de PowerUp, qué comportamiento verifica cada grupo, cómo ejecutarlas, cómo leer sus resultados y qué queda sin probar.

Herramientas: **Jest** (ejecución y aserciones), **Supertest** (peticiones HTTP contra la aplicación Express real) y **PostgreSQL 17** real para integración y E2E del backend. Supertest utiliza un servidor HTTP efímero dentro del proceso de pruebas; no arranca el servidor de despliegue. No se agregaron otras dependencias.

## 1. Resumen de las suites

| Grupo | Archivos | Pruebas | Comando | ¿Necesita PostgreSQL? |
| --- | --- | ---: | --- | --- |
| Unitarias de Strategy | `backend/tests/unit/*.test.js` | 16 | `npm run test:unit` | No |
| HTTP (rutas, autenticación, validaciones) | `backend/tests/http/*.test.js` | 17 | `npm run test:http` | No |
| Migraciones y restricciones SQL | `backend/integration/workout.migrations.test.js` | 20 | `npm run test:migrations` | Sí |
| Integración de autenticación | `backend/functional-integration/auth.test.js` | 4 | `npm run test:auth` | Sí |
| Integración de entrenamientos | `backend/functional-integration/workouts.test.js` | 4 | `npm run test:workouts` | Sí |
| Integración de métricas | `backend/functional-integration/metrics.test.js` | 3 | `npm run test:metrics` | Sí |
| Integración de rutinas | `backend/functional-integration/routines.test.js` | 4 | `npm run test:routines` | Sí |
| Integración de planificación | `backend/functional-integration/planning.test.js` | 3 | `npm run test:planning` | Sí |
| E2E del backend | `backend/e2e/critical-path.test.js` | 1 | `npm run test:e2e` | Sí |
| **Total** | 12 archivos | **72** | | |

`npm test` ejecuta juntas las unitarias y las HTTP (33 pruebas). Las suites con PostgreSQL, incluido el E2E, tienen comandos propios porque requieren una base de prueba preparada (sección 3).

Todos los comandos se ejecutan desde `backend/`. Salvo `test:migrations`, cada comando compila primero con `npm run build`, porque las pruebas importan el código compilado de `dist/`. Si se ejecuta `npx jest` directamente sin compilar, se prueba la última compilación y no el código actual.

## 2. Pruebas sin base de datos (`npm test`)

Con el backend local (opciones 2 y 3 del README):

```bash
cd backend
npm ci
npm test
```

Con todo en Docker (opción 1 del README), desde la raíz del repositorio:

```bash
docker compose exec backend npm test
```

Resultado esperado al final de la salida:

```text
Test Suites: 5 passed, 5 total
Tests:       33 passed, 33 total
```

Las líneas como `POST /api/auth/register 400 67.994 ms` que aparecen durante la ejecución son el registro de peticiones de la API (morgan). No son errores: muchas pruebas envían datos inválidos a propósito y esperan un `400` o un `401`.

## 3. Pruebas de integración con PostgreSQL

### Por qué se ejecutan aparte

Estas suites crean tablas, insertan datos y los borran. Para reducir el riesgo de usar otra conexión, aplican las siguientes comprobaciones y configuración:

- La URL apunta a `localhost`, `127.0.0.1` o `[::1]` y el nombre de la base es el esperado por cada suite.
- Las suites de `functional-integration/` y `e2e/` exigen además puerto explícito y el usuario esperado; la suite de migraciones no comprueba esos dos campos.
- Entrenamientos, métricas, rutinas, planificación y E2E comprueban que el servidor sea PostgreSQL 17. Autenticación no verifica su versión, aunque el entorno documentado y CI usan PostgreSQL 17.
- No se lee el `.env` del proyecto.

Estas comprobaciones **no garantizan por sí solas que una base sea descartable**. Antes de ejecutar SQL hay que crear y reconocer una instancia de pruebas separada, y verificar su host, puerto, base y usuario. Que la URL sea local y tenga el nombre esperado no acredita que sus datos puedan eliminarse.

Además, cada suite de `functional-integration/` y `e2e/` trabaja en un esquema con nombre aleatorio (`integration_test_<uuid>`) que se crea al empezar y se elimina al terminar. La suite de migraciones verifica antes de empezar que la base no contenga las tablas que va a crear, para no modificar ni borrar objetos existentes.

Requieren **Node.js 24 instalado localmente**. No se pueden correr dentro del contenedor `backend`, porque la base de prueba tiene que ser accesible como `localhost`.

### Paso 1 — Levantar un PostgreSQL 17 descartable

Se usa un contenedor separado, en el puerto `55432`, para no mezclarlo con la base de desarrollo (`5432`). Desde la raíz del repositorio:

```bash
docker run -d --name powerup-test-db -e POSTGRES_PASSWORD=postgres -p 55432:5432 postgres:17-alpine
docker exec powerup-test-db pg_isready -U postgres
```

Repetir el segundo comando hasta que responda `accepting connections` (unos segundos).

### Paso 2 — Crear las bases y usuarios de prueba

El script [`backend/integration/setup-test-databases.sql`](../backend/integration/setup-test-databases.sql) crea una base y un usuario por suite. Se ejecuta una sola vez.

Linux, macOS o Git Bash:

```bash
docker exec -i powerup-test-db psql -U postgres -v ON_ERROR_STOP=1 < backend/integration/setup-test-databases.sql
```

Windows PowerShell:

```powershell
Get-Content backend/integration/setup-test-databases.sql | docker exec -i powerup-test-db psql -U postgres -v ON_ERROR_STOP=1
```

Debe mostrar siete `CREATE ROLE` y siete `CREATE DATABASE`.

### Paso 3 — Definir las variables de conexión

| Variable | Suite | Base | Usuario |
| --- | --- | --- | --- |
| `TEST_DATABASE_URL` | Migraciones | `powerup_running_migration_test` | `powerup_migration_test` |
| `AUTH_TEST_DATABASE_URL` | Autenticación | `powerup_auth_integration_test` | `powerup_auth_test` |
| `WORKOUTS_TEST_DATABASE_URL` | Entrenamientos | `powerup_workouts_integration_test` | `powerup_workouts_test` |
| `METRICS_TEST_DATABASE_URL` | Métricas | `powerup_metrics_integration_test` | `powerup_metrics_test` |
| `ROUTINES_TEST_DATABASE_URL` | Rutinas | `powerup_routines_integration_test` | `powerup_routines_test` |
| `PLANNING_TEST_DATABASE_URL` | Planificación | `powerup_planning_integration_test` | `powerup_planning_test` |
| `E2E_TEST_DATABASE_URL` | E2E del backend | `powerup_e2e_test` | `powerup_e2e_test` |

La contraseña de los siete usuarios es `powerup_test`, solamente para este entorno local.

Linux, macOS o Git Bash (en la misma terminal donde se ejecutarán las pruebas):

```bash
cd backend
export TEST_DATABASE_URL=postgres://powerup_migration_test:powerup_test@localhost:55432/powerup_running_migration_test
export AUTH_TEST_DATABASE_URL=postgres://powerup_auth_test:powerup_test@localhost:55432/powerup_auth_integration_test
export WORKOUTS_TEST_DATABASE_URL=postgres://powerup_workouts_test:powerup_test@localhost:55432/powerup_workouts_integration_test
export METRICS_TEST_DATABASE_URL=postgres://powerup_metrics_test:powerup_test@localhost:55432/powerup_metrics_integration_test
export ROUTINES_TEST_DATABASE_URL=postgres://powerup_routines_test:powerup_test@localhost:55432/powerup_routines_integration_test
export PLANNING_TEST_DATABASE_URL=postgres://powerup_planning_test:powerup_test@localhost:55432/powerup_planning_integration_test
export E2E_TEST_DATABASE_URL=postgres://powerup_e2e_test:powerup_test@localhost:55432/powerup_e2e_test
```

Windows PowerShell:

```powershell
cd backend
$env:TEST_DATABASE_URL = "postgres://powerup_migration_test:powerup_test@localhost:55432/powerup_running_migration_test"
$env:AUTH_TEST_DATABASE_URL = "postgres://powerup_auth_test:powerup_test@localhost:55432/powerup_auth_integration_test"
$env:WORKOUTS_TEST_DATABASE_URL = "postgres://powerup_workouts_test:powerup_test@localhost:55432/powerup_workouts_integration_test"
$env:METRICS_TEST_DATABASE_URL = "postgres://powerup_metrics_test:powerup_test@localhost:55432/powerup_metrics_integration_test"
$env:ROUTINES_TEST_DATABASE_URL = "postgres://powerup_routines_test:powerup_test@localhost:55432/powerup_routines_integration_test"
$env:PLANNING_TEST_DATABASE_URL = "postgres://powerup_planning_test:powerup_test@localhost:55432/powerup_planning_integration_test"
$env:E2E_TEST_DATABASE_URL = "postgres://powerup_e2e_test:powerup_test@localhost:55432/powerup_e2e_test"
```

### Paso 4 — Ejecutar

```bash
npm run test:migrations
npm run test:auth
npm run test:workouts
npm run test:metrics
npm run test:routines
npm run test:planning
npm run test:e2e
```

Cada suite puede ejecutarse sola y repetirse: los datos de una ejecución no quedan para la siguiente.

### Paso 5 — Eliminar el entorno de prueba

```bash
docker rm -fv powerup-test-db
```

Borra el contenedor y sus volúmenes anónimos asociados, que contienen las bases de prueba. No afecta a la base de desarrollo de Docker Compose.

## 4. Qué verifica cada grupo y por qué elegimos esos casos

Clasificamos los casos en **normales** (uso esperado), **límites** (bordes donde un cálculo o una validación suele fallar) y **errores** (entradas o situaciones que deben rechazarse sin dejar datos inconsistentes). No buscamos probar cada función ni un porcentaje de cobertura, sino los comportamientos con más riesgo: cálculos, permisos entre usuarios, persistencia y compatibilidad de fuerza al incorporar running.

### Unitarias de Strategy (16) — `tests/unit/`

Prueban los cálculos de [`StrengthStrategy`](../backend/src/services/strategies/strength.strategy.ts), [`RunningStrategy`](../backend/src/services/strategies/running.strategy.ts) y la selección en [`getMetricsStrategy`](../backend/src/services/strategies/index.ts) con datos planos conocidos, sin base de datos. Las estrategias solo calculan: no consultan la base ni verifican permisos, por lo que se pueden probar aisladas.

| Caso | Tipo | Por qué lo elegimos |
| --- | --- | --- |
| 5 km en 1800 s → 360 s/km y 10 km/h | Normal | Es el ejemplo de aceptación acordado para running. |
| Ritmo agregado = duración total / distancia total | Normal | Promediar ritmos individuales da un resultado incorrecto y es un error fácil de cometer. |
| Redondeo a dos decimales en resumen y progreso | Límite | Los decimales binarios pueden producir valores como `333.3333…`. |
| Sin registros: totales en cero, promedios `null`, listas vacías | Límite | Evita divisiones por cero y `NaN` en la respuesta. |
| Agrupación diaria por fecha UTC y nivel de intensidad 1–4 | Normal | El calendario depende de agrupar bien días y comparar contra el máximo. |
| Fuerza: RIR `0` se promedia, `null` no | Límite | En JavaScript `0` es falsy; un filtro mal escrito lo descartaría. |
| Fuerza: entrenamiento sin series, volumen cero, redondeo después de sumar | Límite | Bordes del cálculo de volumen y del calendario. |
| Selección de la estrategia de fuerza y de running | Normal | Comprueba resultados reales de la estrategia elegida, no solo que se llamó un método. |
| Modalidad `ciclismo`, `toString`, `__proto__` → error 400 | Error | Una modalidad desconocida no debe resolverse por accidente con propiedades heredadas de los objetos de JavaScript. |

### HTTP (17) — `tests/http/`

Usan la aplicación Express real con Supertest, sin PostgreSQL. Comprueban las respuestas de los casos indicados; no verifican persistencia ni operaciones de negocio exitosas.

| Caso | Tipo | Por qué lo elegimos |
| --- | --- | --- |
| `GET /health` y `GET /api/health` responden `200` | Normal | Comprueban el estado y mensaje de esas dos rutas, sin verificar conexión a PostgreSQL ni el despliegue. |
| Ruta inexistente → `404` con la ruta pedida | Error | Contrato de errores documentado en [API.md](API.md). |
| `GET /api/workouts` y `GET /api/metrics/summary` sin token → `401` | Error | En esas dos rutas se comprueba el mensaje `Token no proporcionado`; no se prueban todos los recursos privados. |
| Registro, login, ejercicios, programas, semanas y sesiones inválidos → `400` | Error | Se comprueba el mensaje general `Datos invalidos`. Registro y login también exigen una lista de detalles no vacía; no se comprueba cada campo o mensaje específico. |
| Filtro de ejercicios con `muscleGroupId=abc` → `400` | Error | Además del mensaje general, se verifica que `details` identifica `muscleGroupId`. |
| Fechas e IDs inválidos en métricas y rutas → `400` | Error | Se comprueban el estado y el mensaje general `Datos invalidos` para las entradas elegidas. |
| `duracionSegundos = 2147483648` al crear y al editar → `400` sin invocar el servicio | Límite | Es el máximo de `INTEGER` en PostgreSQL más uno. Antes de la corrección (commit `422cb72`), ese valor superaba la validación y llegaba a la base. La prueba usa un espía de Jest para demostrar que el servicio no se ejecuta. |

Los casos de `api.basic.test.js` no instrumentan el servicio o la base para demostrar que nunca se consultaron. Esa comprobación explícita se realiza solamente en las dos pruebas del límite de duración mediante un espía sobre el servicio.

### Migraciones y restricciones SQL (20) — `integration/`

Ejecutan las migraciones de running directamente sobre PostgreSQL, sin cargar la API.

| Caso | Tipo | Por qué lo elegimos |
| --- | --- | --- |
| `up` agrega `modalidad`, `distanciaKm` y `duracionSegundos` conservando los entrenamientos históricos como fuerza; `down` restaura el esquema anterior | Normal | Los datos previos a running no deben perderse ni cambiar. |
| Falla a mitad de `up` o de `down` → se revierte todo | Error | Demuestra que la migración es transaccional. Esto no se puede probar con mocks. |
| 14 inserciones inválidas rechazadas por `CHECK` sin modificar registros: modalidad desconocida, distancia o duración en fuerza, running sin distancia o duración, valores cero, negativos, `Infinity`, `-Infinity`, `NaN`, running con rutina o sesión programada | Error y límite | La base rechaza datos incoherentes aunque no pasen por la API. Se verifica el código `23514` de PostgreSQL (violación de `CHECK`), no cualquier error. |
| Actualización inválida de running → registro intacto | Error | La restricción también protege los `UPDATE`. |
| Datos incompatibles impiden agregar las restricciones; tras corregirlos se puede reintentar | Error | La migración de restricciones no deja la base a medias. |

### Integración funcional (18) — `functional-integration/`

Los escenarios HTTP recorren validadores → controladores → servicios → repositorios → Sequelize → PostgreSQL y consultan la base para comprobar el estado guardado. La excepción es la prueba de rollback de entrenamientos: invoca directamente `createWorkoutForUser()` del repositorio para provocar un fallo real de FK dentro de la transacción; no atraviesa HTTP ni el servicio.

| Suite | Caso | Tipo | Qué se verifica además del código HTTP |
| --- | --- | --- | --- |
| Autenticación | Registro exitoso | Normal | La contraseña se guarda con hash bcrypt y no aparece en la respuesta. |
| Autenticación | Login → JWT → `GET /api/auth/perfil` | Normal | El token emitido sirve para consultar el perfil correcto. |
| Autenticación | Contraseña incorrecta → `401` | Error | No se entrega token. |
| Autenticación | Email duplicado → `400` | Error | Sigue existiendo un único usuario y no se modifica. |
| Entrenamientos | Alta y consulta de fuerza con series | Normal | Series y ejercicio asociados quedan persistidos. |
| Entrenamientos | Alta y edición de running | Normal | Distancia y duración persistidas, ritmo y velocidad calculados, modalidad conservada al editar, sin series. |
| Entrenamientos | Otro usuario intenta consultar, editar y borrar | Error | Recibe `404` y el registro queda igual en la base. |
| Entrenamientos | Serie con ejercicio inexistente, guardada llamando directamente al repositorio | Error | La clave foránea falla (código `23503`) y no queda ni el entrenamiento ni las series: rollback real de la transacción. Se llama al repositorio porque el servicio rechazaría antes el ejercicio inexistente con un `400`, y así no se podría provocar el fallo en la base. |
| Métricas | Resumen de fuerza | Normal | Cálculos sobre registros reales. |
| Métricas | Resumen y progreso de running | Normal | Ritmo agregado ponderado (10 km en 4200 s → 420 s/km, no 375) y progreso en orden cronológico. |
| Métricas | Dos usuarios, dos modalidades y rango de fechas | Límite y error | No se mezclan usuarios ni modalidades, y el rango excluye los registros fuera de los extremos. |
| Rutinas | Alta de rutina, asociación de ejercicio y consultas | Normal | Persisten la rutina y su relación con el ejercicio; se recuperan mediante HTTP. |
| Rutinas | Edición de una asociación | Normal | Repeticiones y peso actualizados quedan guardados en PostgreSQL. |
| Rutinas | Otro usuario intenta editar o borrar rutina y asociación | Error | Recibe `404` y los registros originales permanecen intactos. |
| Rutinas | Actualización de campos nullable | Normal y límite | `null` borra los cuatro campos de texto opcionales; los omitidos conservan su valor y los strings se recortan. Se comprueban respuestas HTTP y persistencia real. |
| Planificación | Alta de programa, semana y sesión; listados de semanas y sesiones | Normal | Persisten las relaciones con el usuario, el programa, la semana y la plantilla. Ambos GET aceptan los IDs sanitizados por los validadores y devuelven los registros creados. |
| Planificación | Edición de semana y sesión | Normal | Nombre, descarga y día de la semana actualizados se guardan sin perder las asociaciones originales. |
| Planificación | Otro usuario intenta editar o borrar programa, semana y sesión | Error | Las seis operaciones reciben `404`; los tres registros originales permanecen intactos. |

### E2E del backend (1) — `e2e/`

Es un único recorrido de usuario que combina funcionalidades previamente probadas por separado. Todos los datos funcionales se crean mediante HTTP, sin seeders, inserciones directas ni mocks. Solo el esquema y las migraciones se preparan directamente.

- Registro → login: se comprueban usuario y mensajes, no se expone la contraseña y las peticiones protegidas usan el JWT obtenido en el login.
- Se crea una sentadilla y un entrenamiento libre de fuerza con dos series: 10 repeticiones de 40 kg y 8 de 50 kg. Se verifican propietario, fecha UTC fija, series y asociación con el ejercicio.
- Se registra una carrera libre de 5 km en 1800 segundos. Se comprueban 360 s/km (6 min/km), 10 km/h y ausencia de series o planificación.
- Los listados recuperan los entrenamientos guardados: sin modalidad solo fuerza y con `modalidad=running` solo la carrera. Los resúmenes comprueban fuerza con 1 entrenamiento, 2 series, 18 repeticiones y volumen 800; running con 1 entrenamiento, 5 km, 1800 s, 360 s/km y 10 km/h.

Esto recorre HTTP → Express → validadores/controladores → servicios → repositorios → Sequelize → PostgreSQL real. Es E2E a nivel del backend: no incluye navegador, frontend, proceso de despliegue ni infraestructura completa.

## 5. Cómo interpretar los resultados

- `PASS` indica que todas las aserciones del archivo se cumplieron. `FAIL` muestra el nombre de la prueba, el valor esperado (`Expected`) y el obtenido (`Received`). Esa diferencia es el punto de partida para buscar el defecto.
- El nombre de cada prueba describe el comportamiento verificado, por lo que la salida de Jest se puede leer como una lista de requisitos cumplidos.
- Un error como `AUTH_TEST_DATABASE_URL debe indicar PostgreSQL local descartable...` **no es un fallo del código**: la suite se negó a ejecutarse porque falta la variable o no apunta a la base de prueba. Revisar el paso 3.
- `La base ya contiene objetos de la prueba` (migraciones) indica que la base no está vacía. Recrear el entorno con los pasos 1 y 2.
- Un fallo de versión en `beforeAll` indica que el servidor no es PostgreSQL 17.

### Última ejecución registrada

| Fecha | Commit base | Entorno | Resultado |
| --- | --- | --- | --- |
| 23/11/2026 | `d5ed072` (dev) | Windows 11, Node.js 24.21, PostgreSQL 17 en Docker | Unitarias + HTTP 33/33 · Migraciones 20/20 · Autenticación 4/4 · Entrenamientos 4/4 · Métricas 3/3 · **64/64** |
| 24/11/2026 | `f649b16` + cambios locales de cierre de rutinas | Linux, Node.js 24.13.0, PostgreSQL 17.9 descartable en Docker | Unitarias + HTTP 33/33 · Migraciones 20/20 · Autenticación 4/4 · Entrenamientos 4/4 · Métricas 3/3 · Rutinas 4/4 · **68/68** |
| 24/11/2026 | `981c1b6` + cambios locales de cierre de planificación | Linux, Node.js 24.13.0, PostgreSQL 17.9 descartable en Docker | Unitarias + HTTP 33/33 · Migraciones 20/20 · Autenticación 4/4 · Entrenamientos 4/4 · Métricas 3/3 · Rutinas 4/4 · Planificación 3/3 · **71/71** |
| 24/11/2026 | `31ae493` + cambios locales del E2E | Linux, Node.js 24.13.0, PostgreSQL 17.9 descartable en Docker | Unitarias + HTTP 33/33 · Migraciones 20/20 · Autenticación 4/4 · Entrenamientos 4/4 · Métricas 3/3 · Rutinas 4/4 · Planificación 3/3 · E2E 1/1 · **72/72** |
| 24/11/2026 | `71c5e5c` (auditoría definitiva) | Linux, Node.js 24.13.0 local y 24.22.3 en Docker, PostgreSQL 17.9 descartable | Unitarias + HTTP 33/33 · Migraciones 20/20 · Autenticación 4/4 · Entrenamientos 4/4 · Métricas 3/3 · Rutinas 4/4 · Planificación 3/3 · E2E 1/1 · **72/72** |

En el cierre de planificación se reprodujo primero el fallo original (2/3): los dos GET por query respondían `400` ante IDs válidos. Tras corregir los controladores, las tres pruebas originales pasaron sin modificar sus aserciones. También se verificaron, mediante una sonda temporal fuera de la suite versionada, diez rechazos `400` de validación: parámetro ausente, texto, cero, negativo y decimal en cada endpoint. Estos diagnósticos no se cuentan como pruebas nuevas. `npm test` pasó con el PostgreSQL descartable ya eliminado y sin variables de conexión.

En el cierre del E2E, el SQL actualizado creó siete bases y siete usuarios en un PostgreSQL nuevo y descartable. Se ejecutaron todas las suites sobre una copia temporal del contenido final, y después se comprobó que no quedaran esquemas de las suites ni tablas en `public`. Se eliminó el contenedor propio y `npm test` volvió a pasar (33/33) sin PostgreSQL ni variables de conexión. Esta ejecución local no demuestra la ejecución del workflow ampliado en GitHub.

### Auditoría definitiva del 24/11/2026

Se verificó una copia limpia de `71c5e5c` obtenida con `git archive HEAD`, sin modificar el repositorio original. Los siguientes resultados son locales y corresponden a esa revisión:

- `npm ci` y compilación correctos, también compilación dentro del contenedor. El procedimiento equivalente a los comandos del workflow aprobó las 72 pruebas; no demuestra una ejecución en GitHub Actions.
- Docker Compose arrancó backend, PostgreSQL y pgAdmin. `db:setup` aplicó tres migraciones y cinco seeders; los healthchecks y el login demo funcionaron. Se usaron proyecto, recursos y puertos propios para mantener el aislamiento.
- El backend local funcionó con `.env.example`, otra base nueva en PostgreSQL 17 descartable y puertos propios. No se verificó una instalación nativa de PostgreSQL sin Docker ni se ejecutó PowerShell.
- Se ejecutaron las 59 peticiones de `requests.http` contra el servidor real, con los códigos esperados. También se comprobaron valores representativos, como volumen 312 y estimación Epley 36,4 en el progreso por ejercicio. Son verificaciones de auditoría, no 59 pruebas nuevas de Jest.
- El SQL de preparación creó siete bases y siete usuarios. Tras comprobar la limpieza de las suites, se eliminaron los recursos Docker propios. `npm test` volvió a aprobar 33/33 sin ese PostgreSQL ni variables de conexión. Las 16 unitarias también aprobaron con `TZ=America/Argentina/Buenos_Aires`.

Las suites con PostgreSQL tardaron entre 1,63 y 5,13 segundos por comando, incluyendo compilación cuando corresponde. La compilación local separada tardó 2,62 segundos y `npm test`, 4,35 segundos. Estos resultados no certifican preparación para producción ni ausencia de defectos fuera de los casos probados.

## 6. Decisiones sobre las pruebas

- **Base real para persistencia, no mocks.** Un mock no demuestra un rollback ni una restricción `CHECK`, y un `400` no demuestra por sí solo que no se haya escrito nada. Por eso las suites de integración consultan la base después de cada operación.
- **Mocks solo donde aportan.** La prueba de duración usa un espía sobre el servicio para demostrar que la validación corta la petición antes de llegar a él.
- **Cálculos sin base.** Las estrategias reciben datos planos (`MetricWorkout`), lo que permite probar fórmulas y bordes rápido y sin infraestructura.
- **Aislamiento.** Hay una base y un usuario por suite y un esquema aleatorio por ejecución. Los datos se crean en cada escenario; en el E2E se crean mediante HTTP dentro de la única prueba. Ninguna prueba depende del orden ni de datos que haya dejado otra.
- **Pruebas de regresión antes de refactorizar.** Las pruebas unitarias de Strategy (commit `7bb0195`) se escribieron antes del refactoring de métricas (`406820c`, `1d3c96a`) y sus expectativas no cambiaron después. Ver [decisiones-diseno.md](decisiones-diseno.md).

## 7. Limitaciones y qué no se prueba

- **La suite de rutinas** tiene cuatro pruebas de integración para alta, relaciones, edición, campos nullable y rechazo de modificaciones ajenas. No se comprueban la eliminación exitosa, las cascadas ni todos los casos de lectura y validación.
- **La suite de planificación** conserva las tres pruebas originales: alta y relaciones, listados por query, edición y rechazo de modificaciones ajenas. No comprueba eliminación exitosa, cascadas, consultas ajenas ni todas las reglas de validación o conflictos.
- **Ejercicios** y **grupos musculares** no tienen suites de integración propias. El E2E cubre el alta de un ejercicio y su asociación con series; no cubre grupos musculares. Sus permisos y eliminaciones no se verifican exhaustivamente.
- **El E2E del backend** cubre un recorrido exitoso con un usuario; no cubre edición, eliminación, errores ni planificación. Los permisos entre usuarios se comprueban en otras suites. No se verifica navegador, frontend, despliegue, rendimiento ni infraestructura completa.
- `GET /api/metrics/activity-heatmap` y `GET /api/metrics/exercise-progress` no tienen pruebas automatizadas de integración con datos reales. El calendario se verifica en unitarias; en la suite automatizada, el progreso por ejercicio y 1RM (Epley) solo tienen validaciones HTTP. Las peticiones de auditoría anteriores no amplían esa cobertura automatizada.
- No se prueban el token vencido ni el formato de token incorrecto. Sí se prueba la ausencia de token.
- Los seeders y el arranque con Docker Compose no forman parte de las 72 pruebas automatizadas; se comprobaron durante la auditoría local siguiendo el README.
- Se registraron ejecuciones exitosas de GitHub Actions para la PR #17 y su integración en `dev`, y ambos jobs exitosos para la PR #18 de rutinas. Las ejecuciones confirmadas de planificación y E2E figuran en la sección 8; son evidencia distinta de la auditoría local, que no consultó GitHub.
- Las 72 pruebas aprobadas no cubren los [defectos nullable conocidos](API.md#defectos-conocidos-en-campos-nullable), los errores 500 por duplicados de planificación ni la pérdida de series al eliminar ejercicios, documentados en la API. Siguen pendientes de corrección o revisión funcional.
- No se mide cobertura. La consigna no la exige y preferimos elegir casos por riesgo.

### Alertas de dependencias pendientes

En la auditoría de `71c5e5c`, `npm ci` y `npm audit` informaron **13 alertas: 10 moderadas, 2 altas y 1 crítica** sobre las versiones del lockfile. Es un resultado fechado; puede variar al actualizarse la información de las dependencias.

Entre las alertas están `body-parser 1.20.8` (alta, denegación de servicio; la aplicación usa `express.json()`) y `proxy-addr 2.0.7` (crítica, asociada a determinadas configuraciones de confianza en proxies). La auditoría no realizó pruebas de explotación ni demostró explotación en PowerUp; no se encontró configuración de `trust proxy` ni autorización basada en IP. La severidad del aviso no prueba por sí sola que esa condición sea explotable en esta aplicación.

Queda pendiente evaluar alcance y actualizaciones compatibles antes de una exposición pública. No se modificaron dependencias ni se aplicaron correcciones automáticas; las alertas no deben presentarse como vulnerabilidades explotadas ni como resueltas.

## 8. Integración continua

El workflow [`.github/workflows/tests.yml`](../.github/workflows/tests.yml) automatiza la compilación y las 72 pruebas en GitHub Actions, en cada `push` y `pull request` hacia `dev` o `main`:

1. **Compilación y pruebas sin base:** `npm ci` y `npm test`.
2. **Integración con PostgreSQL:** levanta un servicio `postgres:17-alpine`, ejecuta `setup-test-databases.sql`, define las siete variables de la sección 3 (con el puerto `5432` del servicio) y corre migraciones, las cinco suites de integración funcional y el E2E del backend.

CI no automatiza todas las comprobaciones adicionales de la auditoría local: el arranque con Docker Compose, los seeders, el backend local y la ejecución de las 59 peticiones de `requests.http` se verificaron por separado.

El equipo verificó directamente estas ejecuciones exitosas de GitHub Actions:

| Ejecución | Run exitoso |
| --- | --- |
| PR #19 de planificación | [45515072088](https://github.com/vladimir-koz/proyecto-metodologia-sistemas-II-grupo-15/actions/runs/45515072088) |
| Integración de planificación en `dev` | [45515202771](https://github.com/vladimir-koz/proyecto-metodologia-sistemas-II-grupo-15/actions/runs/45515202771) |
| PR #20 de E2E | [45519596994](https://github.com/vladimir-koz/proyecto-metodologia-sistemas-II-grupo-15/actions/runs/45519596994) |
| Integración de E2E en `dev`, commit `b970235` | [45519748122](https://github.com/vladimir-koz/proyecto-metodologia-sistemas-II-grupo-15/actions/runs/45519748122) |

Es una mejora opcional: la consigna no exige CI. Sirve para detectar regresiones antes de integrar una rama, sin depender de que alguien recuerde ejecutar las suites a mano. No incluye despliegue.
