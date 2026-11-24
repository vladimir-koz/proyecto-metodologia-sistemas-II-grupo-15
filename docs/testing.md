# Pruebas automatizadas

Este documento explica qué pruebas tiene el backend de PowerUp, qué comportamiento verifica cada grupo, cómo ejecutarlas, cómo leer sus resultados y qué queda sin probar.

Herramientas: **Jest** (ejecución y aserciones), **Supertest** (peticiones HTTP contra la aplicación Express real, sin levantar un servidor) y **PostgreSQL 17** real para las suites de integración. No se agregaron otras dependencias.

## 1. Resumen de las suites

| Grupo | Archivos | Pruebas | Comando | ¿Necesita PostgreSQL? |
| --- | --- | ---: | --- | --- |
| Unitarias de Strategy | `backend/tests/unit/*.test.js` | 16 | `npm run test:unit` | No |
| HTTP (rutas, autenticación, validaciones) | `backend/tests/http/*.test.js` | 17 | `npm run test:http` | No |
| Migraciones y restricciones SQL | `backend/integration/workout.migrations.test.js` | 20 | `npm run test:migrations` | Sí |
| Integración de autenticación | `backend/functional-integration/auth.test.js` | 4 | `npm run test:auth` | Sí |
| Integración de entrenamientos | `backend/functional-integration/workouts.test.js` | 4 | `npm run test:workouts` | Sí |
| Integración de métricas | `backend/functional-integration/metrics.test.js` | 3 | `npm run test:metrics` | Sí |
| **Total** | 9 archivos | **64** | | |

`npm test` ejecuta juntas las unitarias y las HTTP (33 pruebas). Las suites con PostgreSQL tienen comandos propios porque requieren una base de prueba preparada (sección 3).

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

Estas suites crean tablas, insertan datos y los borran. Para que nunca toquen la base de desarrollo, **se niegan a ejecutarse** si la conexión no cumple todas estas condiciones:

- La URL apunta a `localhost`, `127.0.0.1` o `[::1]`, con puerto explícito.
- El nombre de la base y el usuario son exactamente los esperados por cada suite.
- El servidor es PostgreSQL 17 (solo en las suites de `functional-integration/`).
- No se lee el `.env` del proyecto.

Además, cada suite de `functional-integration/` trabaja en un esquema con nombre aleatorio (`integration_test_<uuid>`) que se crea al empezar y se elimina al terminar. La suite de migraciones verifica antes de empezar que la base no contenga las tablas que va a crear, para no modificar ni borrar objetos existentes.

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

Debe mostrar cuatro `CREATE ROLE` y cuatro `CREATE DATABASE`.

### Paso 3 — Definir las variables de conexión

| Variable | Suite | Base | Usuario |
| --- | --- | --- | --- |
| `TEST_DATABASE_URL` | Migraciones | `powerup_running_migration_test` | `powerup_migration_test` |
| `AUTH_TEST_DATABASE_URL` | Autenticación | `powerup_auth_integration_test` | `powerup_auth_test` |
| `WORKOUTS_TEST_DATABASE_URL` | Entrenamientos | `powerup_workouts_integration_test` | `powerup_workouts_test` |
| `METRICS_TEST_DATABASE_URL` | Métricas | `powerup_metrics_integration_test` | `powerup_metrics_test` |

La contraseña de los cuatro usuarios es `powerup_test`, solamente para este entorno local.

Linux, macOS o Git Bash (en la misma terminal donde se ejecutarán las pruebas):

```bash
cd backend
export TEST_DATABASE_URL=postgres://powerup_migration_test:powerup_test@localhost:55432/powerup_running_migration_test
export AUTH_TEST_DATABASE_URL=postgres://powerup_auth_test:powerup_test@localhost:55432/powerup_auth_integration_test
export WORKOUTS_TEST_DATABASE_URL=postgres://powerup_workouts_test:powerup_test@localhost:55432/powerup_workouts_integration_test
export METRICS_TEST_DATABASE_URL=postgres://powerup_metrics_test:powerup_test@localhost:55432/powerup_metrics_integration_test
```

Windows PowerShell:

```powershell
cd backend
$env:TEST_DATABASE_URL = "postgres://powerup_migration_test:powerup_test@localhost:55432/powerup_running_migration_test"
$env:AUTH_TEST_DATABASE_URL = "postgres://powerup_auth_test:powerup_test@localhost:55432/powerup_auth_integration_test"
$env:WORKOUTS_TEST_DATABASE_URL = "postgres://powerup_workouts_test:powerup_test@localhost:55432/powerup_workouts_integration_test"
$env:METRICS_TEST_DATABASE_URL = "postgres://powerup_metrics_test:powerup_test@localhost:55432/powerup_metrics_integration_test"
```

### Paso 4 — Ejecutar

```bash
npm run test:migrations
npm run test:auth
npm run test:workouts
npm run test:metrics
```

Cada suite puede ejecutarse sola y repetirse: los datos de una ejecución no quedan para la siguiente.

### Paso 5 — Eliminar el entorno de prueba

```bash
docker rm -f powerup-test-db
```

Borra el contenedor y todas las bases de prueba. No afecta a la base de desarrollo de Docker Compose.

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

Usan la aplicación Express real con Supertest, sin base de datos. Verifican lo que ocurre **antes** de llegar a la base.

| Caso | Tipo | Por qué lo elegimos |
| --- | --- | --- |
| `GET /health` y `GET /api/health` responden `200` | Normal | Comprueban que la aplicación arranca. |
| Ruta inexistente → `404` con la ruta pedida | Error | Contrato de errores documentado en [API.md](API.md). |
| Rutas protegidas sin token → `401` (workouts, metrics) | Error | La autenticación protege todos los recursos privados. |
| Registro, login, ejercicios, programas, semanas y sesiones inválidos → `400` con el campo que falló | Error | Las validaciones rechazan datos antes de consultar la base. |
| Fechas e IDs inválidos en métricas y rutas → `400` | Error | Parámetros de consulta mal formados. |
| `duracionSegundos = 2147483648` al crear y al editar → `400` sin invocar el servicio | Límite | Es el máximo de `INTEGER` en PostgreSQL más uno. Antes de la corrección (commit `422cb72`), ese valor superaba la validación y llegaba a la base. La prueba usa un espía de Jest para demostrar que el servicio no se ejecuta. |

### Migraciones y restricciones SQL (20) — `integration/`

Ejecutan las migraciones de running directamente sobre PostgreSQL, sin cargar la API.

| Caso | Tipo | Por qué lo elegimos |
| --- | --- | --- |
| `up` agrega `modalidad`, `distanciaKm` y `duracionSegundos` conservando los entrenamientos históricos como fuerza; `down` restaura el esquema anterior | Normal | Los datos previos a running no deben perderse ni cambiar. |
| Falla a mitad de `up` o de `down` → se revierte todo | Error | Demuestra que la migración es transaccional. Esto no se puede probar con mocks. |
| 14 inserciones inválidas rechazadas por `CHECK` sin modificar registros: modalidad desconocida, distancia o duración en fuerza, running sin distancia o duración, valores cero, negativos, `Infinity`, `-Infinity`, `NaN`, running con rutina o sesión programada | Error y límite | La base rechaza datos incoherentes aunque no pasen por la API. Se verifica el código `23514` de PostgreSQL (violación de `CHECK`), no cualquier error. |
| Actualización inválida de running → registro intacto | Error | La restricción también protege los `UPDATE`. |
| Datos incompatibles impiden agregar las restricciones; tras corregirlos se puede reintentar | Error | La migración de restricciones no deja la base a medias. |

### Integración funcional (11) — `functional-integration/`

Recorren la aplicación completa: HTTP → validadores → controladores → servicios → repositorios → Sequelize → PostgreSQL. Además de la respuesta HTTP, consultan la base para comprobar el estado guardado.

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

## 6. Decisiones sobre las pruebas

- **Base real para persistencia, no mocks.** Un mock no demuestra un rollback ni una restricción `CHECK`, y un `400` no demuestra por sí solo que no se haya escrito nada. Por eso las suites de integración consultan la base después de cada operación.
- **Mocks solo donde aportan.** La prueba de duración usa un espía sobre el servicio para demostrar que la validación corta la petición antes de llegar a él.
- **Cálculos sin base.** Las estrategias reciben datos planos (`MetricWorkout`), lo que permite probar fórmulas y bordes rápido y sin infraestructura.
- **Aislamiento.** Hay una base y un usuario por suite, un esquema aleatorio por ejecución y datos creados en cada escenario (`beforeEach`). Ninguna prueba depende del orden ni de datos que haya dejado otra.
- **Pruebas de regresión antes de refactorizar.** Las pruebas unitarias de Strategy (commit `7bb0195`) se escribieron antes del refactoring de métricas (`406820c`, `1d3c96a`) y sus expectativas no cambiaron después. Ver [decisiones-diseno.md](decisiones-diseno.md).

## 7. Limitaciones y qué no se prueba

- **Rutinas** (`workout-templates`, `workout-template-exercises`), **planificación** (`training-programs`, `program-weeks`, `scheduled-workouts`), **ejercicios** y **grupos musculares** solo tienen pruebas HTTP de validación (`400`). No tienen pruebas de integración con la base, de modo que permisos, relaciones y eliminaciones en cascada no están verificados automáticamente.
- `GET /api/metrics/activity-heatmap` y `GET /api/metrics/exercise-progress` no tienen pruebas de integración con datos reales. El calendario se verifica en las pruebas unitarias de las estrategias. El progreso por ejercicio y la fórmula de 1RM (Epley) solo tienen pruebas de validación HTTP.
- No se prueban el token vencido ni el formato de token incorrecto. Sí se prueba la ausencia de token.
- Los seeders y el arranque con Docker Compose no se verifican con pruebas automatizadas, sino siguiendo el README.
- La integración continua (sección 8) todavía no se ejecutó en GitHub. Las suites con PostgreSQL se ejecutaron manualmente con el procedimiento de la sección 3.
- No se mide cobertura. La consigna no la exige y preferimos elegir casos por riesgo.

## 8. Integración continua

El workflow [`.github/workflows/tests.yml`](../.github/workflows/tests.yml) automatiza en GitHub Actions las mismas verificaciones de este documento, en cada `push` y `pull request` hacia `dev` o `main`:

1. **Compilación y pruebas sin base:** `npm ci` y `npm test`.
2. **Integración con PostgreSQL:** levanta un servicio `postgres:17-alpine`, ejecuta `setup-test-databases.sql`, define las cuatro variables de la sección 3 (con el puerto `5432` del servicio) y corre las cuatro suites.

Es una mejora opcional: la consigna no exige CI. Sirve para detectar regresiones antes de integrar una rama, sin depender de que alguien recuerde ejecutar las suites a mano. No incluye despliegue.
