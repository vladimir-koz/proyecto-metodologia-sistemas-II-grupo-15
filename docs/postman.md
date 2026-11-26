# Pruebas manuales con Postman

[Volver al README](../README.md)

**Índice**

- [1. Qué contiene la colección](#1-qué-contiene-la-colección)
- [2. Preparación](#2-preparación)
- [3. Caso de prueba CP-01: ciclo completo del usuario](#3-caso-de-prueba-cp-01-ciclo-completo-del-usuario)
  - [Relación con el E2E automatizado](#relación-con-el-e2e-automatizado)
  - [Pasos y resultados esperados](#pasos-y-resultados-esperados)
  - [Cálculos esperados](#cálculos-esperados)
  - [Criterio de aprobación](#criterio-de-aprobación)
- [4. Cómo ejecutar el caso](#4-cómo-ejecutar-el-caso)
- [5. Resto de la colección](#5-resto-de-la-colección)
- [6. Registro de ejecución](#6-registro-de-ejecución)
- [7. Limitaciones](#7-limitaciones)

La colección [`postman/PowerUp.postman_collection.json`](../postman/PowerUp.postman_collection.json) permite probar manualmente la API contra un servidor real y mostrar el flujo principal en la presentación. Cada petición incluye tests de Postman que verifican el código HTTP y los datos devueltos, de modo que el resultado no depende de leer la respuesta a simple vista.

Complementa, pero no reemplaza, las [pruebas automatizadas](testing.md). En particular, el caso CP-01 reproduce el camino crítico del E2E del backend ([`backend/e2e/critical-path.test.js`](../backend/e2e/critical-path.test.js)) contra la API levantada con Docker, en lugar de hacerlo dentro de Jest.

## 1. Qué contiene la colección

| Carpeta | Peticiones | Propósito | Depende de |
| --- | ---: | --- | --- |
| `00 - Preparación` | 3 | Healthchecks y login con la cuenta demo. Guarda el JWT en `token`. | — |
| `01 - CP-01 Ciclo completo (camino crítico)` | 21 | **Caso de prueba documentado en la sección 3.** Registro → login → ejercicio → fuerza y running → listados y métricas → edición → eliminación. | Nada: crea su propio usuario |
| `02 - Catálogo: grupos musculares y ejercicios` | 11 | Recursos globales y propios, filtro por grupo y rechazo `403` al modificar recursos globales. | `00` |
| `03 - Rutinas: plantillas y sus ejercicios` | 8 | CRUD de plantillas y de sus ejercicios. | `00`, `02` |
| `04 - Planificación y entrenamiento planificado` | 15 | Programa → semana → sesión programada → entrenamiento registrado desde esa sesión. | `00`, `02`, `03` |
| `05 - Errores, validaciones y permisos` | 16 | `401` sin token o con token inválido, `400` de validación y de reglas de negocio, `404`, y aislamiento entre dos usuarios. | `00` a `04` |
| `06 - Limpieza` | 8 | Elimina, en orden de dependencias, lo creado por las carpetas 02 a 04. | `00` a `05` |
| **Total** | **82** | **146 tests.** Cubre los 49 endpoints de la API (ver la sección 5). | |

Las variables se guardan como variables de la colección: `baseUrl`, credenciales demo, tokens e IDs creados. Al ejecutar las peticiones en orden, cada una toma los IDs que guardó la anterior.

## 2. Preparación

1. Levantar la API y cargar los datos demo con cualquiera de las opciones del [README](../README.md#cómo-levantar-el-proyecto). Con Docker:

   ```bash
   docker compose up -d --build
   docker compose exec backend npm run db:setup
   ```

2. Comprobar que http://localhost:3001/api/health responde `"status": "OK"`.
3. En Postman: **Import** → seleccionar `postman/PowerUp.postman_collection.json`.
4. Si la API usa otro puerto, editar la variable `baseUrl` de la colección (pestaña **Variables**).

No hace falta crear un entorno ni copiar tokens a mano: la colección usa autenticación Bearer con la variable `{{token}}` y los scripts guardan los JWT al iniciar sesión.

## 3. Caso de prueba CP-01: ciclo completo del usuario

| Campo | Descripción |
| --- | --- |
| **Identificador** | CP-01 |
| **Objetivo** | Verificar que un usuario nuevo puede completar el ciclo principal de PowerUp: registrarse, autenticarse, registrar entrenamientos de fuerza y running, obtener métricas correctas, editar un registro y ver el cambio reflejado, y eliminar sus datos. |
| **Tipo** | Prueba funcional de punta a punta sobre la API HTTP, manual o con el Runner de Postman. |
| **Requisitos que cubre** | Autenticación con JWT · ejercicios propios · registro de fuerza con series · registro de running · separación de modalidades en listados y métricas · cálculos de volumen, 1RM, ritmo y velocidad · edición con recálculo · filtro por rango de fechas · eliminación. |
| **Precondiciones** | API en ejecución y accesible en `baseUrl`. No requiere la cuenta demo ni datos previos. |
| **Datos de prueba** | Usuario `Ana Ciclo` con email único `ciclo.<timestamp>@example.com` y contraseña `ClaveCiclo123!` · ejercicio `Sentadilla Ciclo` · fuerza el 01/11/2026 a las 12:00 UTC con dos series (10 × 40 kg y 8 × 50 kg) · running el 02/11/2026 a las 12:00 UTC: 5 km en 1800 s. |
| **Aislamiento** | El email cambia en cada ejecución y todas las peticiones usan el JWT de ese usuario. Por eso los resultados esperados son exactos aunque la base tenga otros datos, y el caso se puede repetir. |
| **Postcondición** | Los entrenamientos y el ejercicio creados quedan eliminados. Solo permanece el usuario registrado, porque la API no ofrece un endpoint para eliminar usuarios. |

### Relación con el E2E automatizado

Los pasos 01, 02 y 04 a 10 reproducen, con los mismos datos y los mismos valores esperados, las aserciones de `backend/e2e/critical-path.test.js`. Los pasos 03 y 11 a 21 extienden el recorrido para **cerrar el ciclo**: consultas derivadas, edición, filtro por rango y eliminación, que el E2E no cubre.

| Camino crítico del E2E | Paso de CP-01 |
| --- | --- |
| Registro → `201`, sin contraseña en la respuesta | 01 |
| Login → `200` y JWT; las peticiones siguientes usan solo ese JWT | 02 |
| Alta de ejercicio propio, sin grupos musculares | 04 |
| Fuerza con 2 series, fecha UTC fija, sin planificación | 05 |
| Running de 5 km en 1800 s → 360 s/km y 10 km/h, sin series | 06 |
| Listado sin modalidad → solo fuerza, con las series y su ejercicio | 07 |
| Listado `modalidad=running` → solo la carrera | 08 |
| Resumen de fuerza: 1 entrenamiento, 2 series, 18 repeticiones, volumen 800 | 09 |
| Resumen de running: 5 km, 1800 s, 360 s/km, 10 km/h | 10 |

### Pasos y resultados esperados

| # | Petición | Acción o datos | Resultado esperado (verificado por los tests) |
| ---: | --- | --- | --- |
| 01 | `POST /api/auth/register` | Usuario `Ana Ciclo` con email único | `201`. Mensaje `Usuario registrado exitosamente`. La respuesta no incluye `password`. |
| 02 | `POST /api/auth/login` | Mismo email y contraseña | `200`. Mensaje `Login exitoso`, mismo `user.id` y JWT, que se guarda en `cicloToken`. |
| 03 | `GET /api/auth/perfil` | JWT del paso 02 | `200`. El perfil corresponde al usuario registrado. |
| 04 | `POST /api/exercises` | `{ "nombre": "Sentadilla Ciclo" }` | `201`. `userId` del usuario y `muscleGroups: []`. |
| 05 | `POST /api/workouts` | Fuerza con series 10 × 40 y 8 × 50 | `201`. `modalidad: fuerza`, fecha `2026-11-01T12:00:00.000Z`, distancia, duración y planificación en `null`, dos series con el ejercicio. |
| 06 | `POST /api/workouts` | Running: 5 km en 1800 s | `201`. `ritmoSegundosPorKm: 360`, `velocidadKmH: 10`, `series: []`, sin plantilla ni sesión programada. |
| 07 | `GET /api/workouts` | Sin `modalidad` | `200`. Un solo entrenamiento, el de fuerza, con 2 series que incluyen `Sentadilla Ciclo`. |
| 08 | `GET /api/workouts?modalidad=running` | — | `200`. Solo la carrera, con ritmo 360 y velocidad 10. |
| 09 | `GET /api/metrics/summary?modalidad=fuerza` | — | `200`. Resumen exacto: 1 entrenamiento libre, 2 series, 18 repeticiones, volumen 800, promedios RPE/RIR `null`. |
| 10 | `GET /api/metrics/summary?modalidad=running` | — | `200`. Resumen exacto: 1 carrera, 5 km, 1800 s, 360 s/km, 10 km/h. |
| 11 | `GET /api/metrics/exercise-progress` | `exerciseId` del paso 04 | `200`. Un registro: 2 series, peso máximo 50, volumen 800, 1RM estimado `63.33`. |
| 12 | `GET /api/metrics/activity-heatmap?modalidad=fuerza` | — | `200`. Un día (`2026-11-01`) con 2 series, volumen 800 e intensidad 4. |
| 13 | `PUT /api/workouts/:id` (carrera) | `{ "duracionSegundos": 1500 }` | `200`. Conserva `modalidad: running` y 5 km; recalcula 300 s/km y 12 km/h. |
| 14 | `GET /api/metrics/running-progress` | — | `200`. La métrica refleja la edición: 1500 s, 300 s/km, 12 km/h. |
| 15 | `GET /api/metrics/summary?modalidad=fuerza&from=…&to=…` | Rango del 02/11 al 30/11 | `200`. 0 entrenamientos: el del 01/11 queda fuera; el rango se devuelve en ISO. |
| 16 | `DELETE /api/workouts/:id` (carrera) | — | `204`. |
| 17 | `DELETE /api/workouts/:id` (fuerza) | — | `204`. Sus series se eliminan en cascada. |
| 18 | `GET /api/workouts/:id` (fuerza) | — | `404` con `Entrenamiento no encontrado`. |
| 19 | `GET /api/metrics/summary?modalidad=fuerza` | — | `200`. Totales en 0 y promedios `null`: las métricas ya no cuentan los datos eliminados. |
| 20 | `DELETE /api/exercises/:id` | — | `200` con `Ejercicio eliminado exitosamente`. |
| 21 | `GET /api/exercises/:id` | — | `404`. |

### Cálculos esperados

| Valor | Cálculo |
| --- | --- |
| Volumen de fuerza: **800** | 10 × 40 + 8 × 50 |
| Repeticiones: **18** | 10 + 8 |
| 1RM estimado: **63,33 kg** | Fórmula de Epley, `peso × (1 + repeticiones / 30)`: 40 × (1 + 10/30) = 53,33 y 50 × (1 + 8/30) = 63,33. Se informa el máximo. |
| Ritmo inicial: **360 s/km** (6:00 min/km) | 1800 s / 5 km |
| Velocidad inicial: **10 km/h** | 5 km / (1800 s / 3600) |
| Ritmo tras editar: **300 s/km** (5:00 min/km) | 1500 s / 5 km |
| Velocidad tras editar: **12 km/h** | 5 km / (1500 s / 3600) |

### Criterio de aprobación

CP-01 **aprueba** si las 21 peticiones se ejecutan en orden y los **42 tests** de la carpeta pasan. Cualquier test fallido hace fallar el caso. El Runner de Postman muestra qué aserción falló y la respuesta obtenida.

## 4. Cómo ejecutar el caso

**Con el Runner (verificación completa):** clic derecho sobre la carpeta `01 - CP-01 Ciclo completo (camino crítico)` → **Run folder** → **Run**. El resultado esperado es `42 passed, 0 failed`.

**Paso a paso (para la presentación):** abrir las peticiones 01 a 21 en orden y pulsar **Send** en cada una. En cada respuesta conviene mostrar:

- el código HTTP y el body;
- la pestaña **Test Results**, donde se ve qué se verificó;
- en los pasos 06, 10, 11, 13 y 14, los valores calculados por la API (ritmo, velocidad, volumen, 1RM) frente a la tabla de [cálculos esperados](#cálculos-esperados).

El caso puede repetirse sin preparar nada: cada ejecución del paso 01 genera un email nuevo.

**Colección completa:** clic derecho sobre la colección → **Run collection**. Ejecuta las 82 peticiones en orden. Al terminar, la carpeta `06 - Limpieza` deja los datos de la cuenta demo como estaban.

## 5. Resto de la colección

| Recurso | Endpoints cubiertos | Carpetas |
| --- | --- | --- |
| Healthchecks | `GET /health`, `GET /api/health` | 00 |
| Autenticación | `POST /register`, `POST /login`, `GET /perfil` | 00, 01, 05 |
| Grupos musculares | GET (listado y por id), POST, PUT, DELETE | 02, 06 |
| Ejercicios | GET (listado, filtro `muscleGroupId` y por id), POST, PUT, DELETE | 01, 02, 05, 06 |
| Plantillas | GET (listado y por id), POST, PUT, DELETE | 03, 06 |
| Ejercicios de plantilla | GET (listado por plantilla y por id), POST, PUT, DELETE | 03, 06 |
| Programas | GET (listado y por id), POST, PUT, DELETE | 04, 05, 06 |
| Semanas | GET (listado por programa y por id), POST, PUT, DELETE | 04, 06 |
| Entrenamientos programados | GET (listado por semana y por id), POST, PUT, DELETE | 04, 06 |
| Entrenamientos realizados | GET (listado por modalidad y por id), POST (libre, planificado y running), PUT, DELETE | 01, 04, 05, 06 |
| Métricas | `summary` (fuerza, running y rango), `activity-heatmap`, `exercise-progress`, `running-progress` | 01, 05 |

Casos de error incluidos en `05`:

| Caso | Esperado |
| --- | --- |
| Petición protegida sin token | `401` `Token no proporcionado` |
| Token inválido | `401` `Token invalido o expirado` |
| Login con contraseña incorrecta | `401`, sin token |
| Registro con email existente | `400` |
| Running con `distanciaKm: 0` | `400` `Datos invalidos`, con `distanciaKm` en `details` |
| Running con series | `400` `Un entrenamiento de running no admite series` |
| Cambiar la modalidad al editar | `400` `La modalidad de un entrenamiento no se puede cambiar` |
| Métricas con `modalidad=ciclismo` | `400`, con `modalidad` en `details` |
| Métricas con `from` posterior a `to` | `400` `from no puede ser posterior a to` |
| Ruta inexistente | `404` con la ruta pedida |
| Otro usuario lista, consulta, modifica o elimina datos ajenos | Listado vacío y `404`; el recurso sigue existiendo para su dueño |

La carpeta `02` también verifica el `403` al modificar un grupo muscular o un ejercicio global.

## 6. Registro de ejecución

| Fecha | Commit base | Entorno | Resultado |
| --- | --- | --- | --- |
| 26/11/2026 | `b36ae9e` (dev) + colección | Windows 11, API con Docker Compose (PostgreSQL 17), base con `db:setup` | Colección completa: 82 peticiones, **146/146 tests**, ejecutada dos veces seguidas. Carpeta CP-01 sola: 21 peticiones, **42/42 tests**. |

Esa verificación se hizo con un ejecutor local que reproduce las funciones de Postman usadas por la colección (`pm.test`, `pm.expect`, variables y Bearer). Antes de presentar conviene ejecutar una vez la carpeta CP-01 con el Runner de Postman y agregar aquí una fila con ese resultado.

## 7. Limitaciones

- Es una verificación **manual o semiautomática**: no forma parte de `npm test` ni de GitHub Actions. La evidencia automatizada sigue siendo la de [testing.md](testing.md).
- Las carpetas 02 a 06 dependen de los datos demo (`npm run db:setup`) y deben ejecutarse en orden. Solo CP-01 es independiente.
- Los usuarios registrados por CP-01 y por la carpeta 05 permanecen en la base, porque la API no permite eliminarlos.
- La colección **no incluye** los [defectos conocidos](API.md#defectos-conocidos-en-campos-nullable) que hoy responden `500` (campos nullable y duplicados de planificación). Se excluyeron a propósito: un test que espera el comportamiento correcto fallaría, y uno que espera el `500` convertiría el defecto en contrato.
- Al eliminar un ejercicio usado en series, esas series también se eliminan (ver la [advertencia en API.md](API.md#delete-exercisesid)). CP-01 elimina primero los entrenamientos para que el orden sea explícito.
