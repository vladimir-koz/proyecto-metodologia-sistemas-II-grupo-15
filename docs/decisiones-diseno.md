# Análisis de diseño
[Volver al README](../README.md)

**Índice**

- [Taller II](#taller-ii--análisis-de-una-decisión-de-diseño)
  - [1. Que parte del código analizamos](#1-que-parte-del-código-analizamos)
  - [2. Que problema encontramos](#2-que-problema-encontramos)
  - [3. Que opciones consideramos](#3-que-opciones-consideramos)
  - [4. Que decidimos por ahora](#4-que-decidimos-por-ahora)
  - [5. Evidencia, beneficios y costos](#5-evidencia-beneficios-y-costos)
  - [Tambien pensamos en Adapter y Strategy para el futuro](#tambien-pensamos-en-adapter-y-strategy-para-el-futuro)
- [Taller III](#taller-iii--de-una-formula-a-strategy-por-modalidad)
  - [1. Que cambio en el proyecto](#1-que-cambio-en-el-proyecto)
  - [2. Por que en el Taller II no usamos Strategy y ahora si](#2-por-que-en-el-taller-ii-no-usamos-strategy-y-ahora-si)
  - [3. Alternativas consideradas](#3-alternativas-consideradas)
  - [4. Como quedo implementado](#4-como-quedo-implementado)
  - [5. Beneficios y costos](#5-beneficios-y-costos)
  - [6. Refactoring posterior y como verificamos que no cambio el comportamiento](#6-refactoring-posterior-y-como-verificamos-que-no-cambio-el-comportamiento)
  - [7. Otras mejoras de calidad del Taller III](#7-otras-mejoras-de-calidad-del-taller-iii)

Este documento registra las decisiones de diseño de PowerUp en orden cronológico. La sección del **Taller II** se conserva tal como la entregamos, porque muestra lo que evaluamos en ese momento. Solo agregamos notas marcadas como *Nota Taller III* donde una referencia de código cambió de lugar. La sección del **Taller III** explica lo que implementamos después y por qué algunas decisiones cambiaron.

# Taller II — Análisis de una decisión de diseño

## 1. Que parte del código analizamos

Elegimos `getAuthenticatedUserId`, una función que obtiene el ID del usuario de una petición y si no encuentra `req.user` lanza el error `usuario no autenticado`, pero no verifica el token proque eso lo hace antes el middleware de autenticacion.

La funcion esta repetida en cuatro controladores:

- [exercise.controller.ts](../backend/src/controllers/exercise.controller.ts), lineas 12–18.
- [muscleGroup.controller.ts](../backend/src/controllers/muscleGroup.controller.ts), lineas 11–17.
- [workoutTemplate.controller.ts](../backend/src/controllers/workoutTemplate.controller.ts), lineas 11–17.
- [workoutTemplateExercise.controller.ts](../backend/src/controllers/workoutTemplateExercise.controller.ts), lineas 11–17.

Tambien existe en [utils/getAuthenticatedUserId.ts](../backend/src/utils/getAuthenticatedUserId.ts), lineas 4–10, para que otros archivos puedan importarla.

## 2. Que problema encontramos

Al comparar las funciones vimos que hacen lo mismo y el problema aparece si mas adelante cambia esa logica porque tendriamos que acordarnos de modificar todas las copias y podriamos olvidarnos de alguna.

Lo relacionamos con la **duplicacion** , un code smells, y entendemos un code smell como una señal para revisar el codigo, no como una prueba de que funciona mal, en este caso encontramos repeticion, pero no comprobamos un error causado por ella.

Tambien se relaciona con la **mantenibilidad**, porque tener la misma regla en un solo lugar facilitaria cambiarla despues.

## 3. Que opciones consideramos

**Dejarlo como esta.** Las funciones son cortas, se entienden y actualmente coinciden, por lo que evitamos tocar los controladores ahora, pero seguimos teniendo varias copias para mantener.

**Usar la funcion compartida.** Podriamos quitar las cuatro funciones locales e importar la que ya existe en `utils` y tendriamos un solo lugar para esa logica, pero habria que revisar los cambios y comprobar que siguen devolviendo el mismo ID y el mismo error cuando falta el usuario.

**Agregar un patron.** No encontramos una razon para hacerlo para este caso, por ejemplo, strategy sirve para intercambiar maneras distintas de hacer algo, como tenemos varias copias que hacen exactamente lo mismo pensamos en el, pero como es algo chico y simple una funcion compartida alcanza.

## 4. Que decidimos por ahora

Por ahora mantenemos el código actual y dejamos como mejora pendiente reutilizar la funcion de `utils`.

No creemos que la repeticion sea lo ideal, pero las copias son pequeñas y no encontramos diferencias entre ellas, por eso, preferimos hacer ese cambio cuando podamos comprobar que conserva el comportamiento, en lugar de darlo por correcto solo porque parece sencillo.

Si reemplazamos las copias manteniendo los mismos resultados y errores, seria un **refactoring** ya que cambiariamos la organizacion interna sin cambiar lo que hace la aplicacion, pero todavia no lo implementamos.

## 5. Evidencia, beneficios y costos

Ademas de las ubicaciones anteriores, en [workout.controller.ts](../backend/src/controllers/workout.controller.ts), lineas 9 y 14, ya se importa y utiliza la funciion compartida, por eso la alternativa no requiere inventar una solucion nueva, tenemos indicios de que hariamos lo correcto.

> *Nota Taller III:* en `workout.controller.ts` la importacion y el primer uso ahora estan en las lineas 10 y 15. Las cuatro copias locales siguen en las lineas citadas en la seccion 1. El estado de esta decision se explica en la seccion 7 del Taller III.

El beneficio de reutilizarla seria mantener una sola definicion.
El costo sería modificar cuatro controladores y verificar el resultado (podriamos tener un error en esa funcion compartida que podria afectar a los lugares que la usan).

Conservar las copias evita ese cambio inmediato, pero acepta el riesgo de que en el futuro alguna quede distinta.

## Tambien pensamos en Adapter y Strategy para el futuro

**Adapter:** podria servir para incorporar entrenamientos de un reloj o de otra app que use un formato distinto, lo que ayudaria a traducir esos datos al formato de nuestra API, pero no deberiamos implementar un patron solo por prevencion futura, ya que es solo una suposicion, ni siquiera sabemos como deberia ser ese adaptador de manera concreta, pero podemos prepararnos con buenas practicas en lo demas, porque adaptar datos no significa inventarlos, recibir pasos o pulsaciones no es lo mismo que recibir series y repeticiones(primero necesitariamos una integracion concreta para ver que diferencias existen)

**Strategy:** en [metrics.service.ts](../backend/src/services/metrics.service.ts), lineas 56–58, `getEstimatedOneRepMax` usa una formula para estimar el peso de una repeticion maxima. 
Si mas adelante necesitamos elegir entre distintas formulas para esa misma estimacion, podriamos evaluar Strategy, porque las metricas fueron ideas que sirven, pero no estan chequeadas si son representativas realmente para los usuarios (hoy solo hay una formula en esa funcion, asi que mantenerla directa nos parece mas ptactico).

> *Nota Taller III:* desde el refactoring `1d3c96a`, `getEstimatedOneRepMax` esta en [metrics.helpers.ts](../backend/src/services/strategies/metrics.helpers.ts), linea 14, y `metrics.service.ts` la importa. Sigue habiendo una sola formula (Epley). Strategy finalmente se aplico por otro motivo, que se explica a continuacion.

# Taller III — De una formula a Strategy por modalidad

## 1. Que cambio en el proyecto

En el Taller III incorporamos **running libre** junto al entrenamiento de fuerza. Un entrenamiento tiene una sola modalidad (`fuerza` o `running`). Running registra distancia y duracion, y la API calcula ritmo y velocidad.

Esto cambio el problema de las metricas. Antes habia una sola forma de calcular el resumen y el calendario: series, repeticiones y volumen. Con running aparecio una segunda familia de calculos que no comparte formulas con la primera: distancia total, duracion total, ritmo agregado y velocidad. Los dos tipos de calculo responden a los mismos endpoints (`/metrics/summary` y `/metrics/activity-heatmap`) y se eligen con el parametro `modalidad`.

## 2. Por que en el Taller II no usamos Strategy y ahora si

En el Taller II pensamos en Strategy para **elegir entre varias formulas de 1RM**, pero habia una sola formula y no teniamos un requisito real para agregar otra. Agregar el patron hubiera sido prepararse para un caso hipotetico, y por eso lo descartamos.

En el Taller III el motivo es distinto y concreto: **dos comportamientos de calculo diferentes que ya existen y se seleccionan en tiempo de ejecucion segun la modalidad**. Es exactamente el problema que resuelve Strategy: encapsular algoritmos intercambiables detras de un mismo contrato, para que quien los usa no dependa de cual se ejecuta.

La decision del Taller II no era incorrecta. Cambiaron los requisitos. La formula de 1RM sigue siendo una sola y no la convertimos en Strategy.

## 3. Alternativas consideradas

La revision de cierre precisa que un condicional puede delegar en funciones puras probadas directamente, y que servicios separados pueden compartir la consulta y el rango de fechas. Son alternativas validas; Strategy no es requisito para aislar calculos ni para evitar duplicacion.

| Alternativa | Ventaja | Costo o limite |
| --- | --- | --- |
| **Condicional** (`if`/`switch` por modalidad) | Es simple y puede seleccionar funciones puras probadas por separado. | Requiere mantener la seleccion; si tambien concentra los calculos en el servicio, ese archivo crece. |
| **Servicios separados por modalidad** | Separa los calculos y puede reutilizar la consulta autorizada, el rango y la conversion de datos. | Requiere coordinar ese codigo comun; la duplicacion seria un riesgo de implementacion, no una consecuencia obligatoria. |
| **Strategy con un registro explicito** (elegida) | Cada modalidad calcula en su propia clase. El servicio conserva lo comun: rango, consulta y permisos. | Agrega archivos e indireccion (ver costos). |
| **Factory, clase abstracta o registro dinamico de estrategias** | Mas extensible. | Con dos estrategias fijas no aporta nada que un mapa explicito no haga. Seria agregar un patron por obligacion. |

## 4. Como quedo implementado

```text
HTTP → metrics.controller → metrics.service
         ├─ valida el rango y resuelve la modalidad (fuerza por defecto)
         ├─ metrics.repository: entrenamientos del usuario + rango + modalidad
         ├─ toMetricWorkout: modelos Sequelize → datos planos (MetricWorkout)
         └─ estrategia.calculate(datos) → resultado de la modalidad
```

- **Contrato:** `MetricsStrategy<TMetrics>` en [metrics.types.ts](../backend/src/types/metrics.types.ts). Declara `modalidad` y `calculate(workouts): TMetrics`. Cada estrategia devuelve sus propios tipos de resultado (`StrengthMetrics`, `RunningMetrics`).
- **Estrategias concretas:** [`StrengthStrategy`](../backend/src/services/strategies/strength.strategy.ts) y [`RunningStrategy`](../backend/src/services/strategies/running.strategy.ts).
- **Seleccion:** [`getMetricsStrategy`](../backend/src/services/strategies/index.ts) busca la estrategia en un mapa explicito `{ fuerza, running }`. Una modalidad desconocida responde `400`. No hay Factory.
- **Responsabilidades:** las estrategias solo calculan sobre datos planos. No consultan la base ni verifican permisos. Eso queda en el servicio y el repositorio, que filtran siempre por usuario y modalidad.
- **Fuera de Strategy:** `exercise-progress` (progreso y 1RM por ejercicio) solo existe para fuerza y no varia por modalidad, por eso sigue directamente en el servicio.

Ritmo y velocidad se calculan al consultar y no se guardan, para que no puedan quedar desactualizados respecto de distancia y duracion.

## 5. Beneficios y costos

**Beneficios**

- Los calculos de fuerza no cambian al tocar los de running, y viceversa.
- Cada estrategia se prueba con datos conocidos, sin base de datos (16 pruebas unitarias).
- Las metricas de fuerza conservan su contrato: sin `modalidad`, los endpoints responden como antes de running.

**Costos y limites aceptados**

- Mas archivos y una indireccion adicional para seguir el flujo.
- Con solo dos modalidades, un condicional habria funcionado. Elegimos Strategy por la separacion y la facilidad de prueba, no porque fuera la unica opcion.
- Una modalidad nueva no se resuelve solo con una estrategia. Tambien requiere migracion, validaciones y restricciones SQL. Strategy aisla el calculo, no el modelo de datos.
- No hay un resumen conjunto de fuerza y running.

## 6. Refactoring posterior y como verificamos que no cambio el comportamiento

La secuencia en el historial de `dev` fue:

| Commit | Tipo | Que hizo |
| --- | --- | --- |
| `9c1f91d` | Funcionalidad | Introdujo Strategy en resumen y calendario y agrego el progreso de running. |
| `7bb0195` | Pruebas | Agrego 16 pruebas de regresion de fuerza, running y seleccion de estrategia. |
| `406820c` | Refactoring | Convirtio las estrategias en clases que implementan `MetricsStrategy`. Elimino las conversiones de tipo (`as`) con sobrecargas de `getMetricsStrategy` y con una funcion generica del servicio que recibe la estrategia, en lugar del nombre de la modalidad. |
| `1d3c96a` | Refactoring | Elimino de `metrics.service.ts` cuatro funciones duplicadas (`round`, `getSetVolume`, `getAverage`, `getEstimatedOneRepMax`) que ya existian en `metrics.helpers.ts`. |

Como verificamos que el refactoring no cambio el comportamiento:

- Las pruebas de regresion se escribieron **antes** de los dos commits de refactoring y siguieron pasando despues.
- Desde `7bb0195`, el unico cambio en esas pruebas fue la ruta de importacion, al moverlas a `tests/unit/` (`bc99c4c`). Sus expectativas no se modificaron para que pasaran.
- Despues se agregaron pruebas de integracion de metricas con PostgreSQL real (`4128e0f`), que calculan los resultados a partir de registros persistidos.

Una limitacion que reconocemos: las pruebas de regresion se escribieron despues de introducir Strategy (`9c1f91d`), no antes. Protegen el refactoring posterior, pero no comparan automaticamente los resultados de fuerza con la version previa a Strategy.

## 7. Otras mejoras de calidad del Taller III

Separamos las **correcciones de comportamiento** de los **refactorings**, porque una correccion cambia lo que hace el sistema y un refactoring no.

| Commit | Tipo | Problema y mejora | Evidencia |
| --- | --- | --- | --- |
| `04aa100` | Correccion | La migracion de running podia quedar a medias si fallaba una columna. Ahora es transaccional. | Pruebas de migracion que fuerzan fallos en `up` y `down`. |
| `84e3b3f` | Correccion | La coherencia entre modalidad y campos dependia solo de la API. Se agregaron restricciones `CHECK` en PostgreSQL. | 14 casos de insercion rechazados con codigo `23514`. |
| `422cb72` | Correccion | `duracionSegundos` aceptaba valores mayores al maximo de `INTEGER`. Ahora se valida el rango `1..2147483647`. | `tests/http/workout.duration.test.js`. |
| `3dd25e1` | Refactoring (pruebas) | La configuracion de PostgreSQL estaba repetida en las pruebas de integracion. Se extrajo a `functional-integration/database.js`. | Las suites de integracion siguen pasando. |

Otras herramientas de calidad que usamos: TypeScript con `strict: true` (el build falla ante errores de tipos), validacion de entrada con express-validator, y un workflow de GitHub Actions que compila y ejecuta las pruebas en cada push y pull request (ver [testing.md](testing.md)).

**Lo que sigue pendiente.** La duplicacion de `getAuthenticatedUserId` analizada en el Taller II **todavia no se resolvio**. Cinco controladores (`workout`, `metrics`, `trainingProgram`, `programWeek` y `scheduledWorkout`) usan la funcion compartida de `utils`, pero las cuatro copias locales siguen en `exercise`, `muscleGroup`, `workoutTemplate` y `workoutTemplateExercise`. La cobertura evoluciono: la suite de rutinas ya prueba plantillas y sus asociaciones con usuarios reales, y el E2E crea un ejercicio mediante HTTP. Grupos musculares no tiene una suite de integracion propia. La extraccion de las copias sigue pendiente; la cobertura actual y sus limites se detallan en [testing.md](testing.md#7-limitaciones-y-qué-no-se-prueba).

**Adapter** sigue sin justificarse: no hay una integracion concreta con relojes u otras aplicaciones.
