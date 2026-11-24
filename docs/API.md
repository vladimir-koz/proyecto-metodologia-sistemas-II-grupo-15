# Documentacion tecnica de la API REST

Referencia del contrato HTTP implementado por el backend de PowerUp. La informacion de este documento surge de las rutas, validadores, servicios, modelos y migraciones vigentes al 23 de noviembre de 2026, e incluye la modalidad running incorporada en el Taller III.

## 1. Informacion general

| Propiedad | Valor |
| --- | --- |
| URL local | `http://localhost:3001` |
| Base de la API | `http://localhost:3001/api` |
| Formato de entrada y salida | JSON (`application/json`) |
| Autenticacion | JWT en el esquema Bearer |
| Duracion del token | 24 horas |
| Persistencia | PostgreSQL mediante Sequelize |

Hay dos healthchecks publicos: `GET /health` y `GET /api/health`. Todos los endpoints bajo `/api`, salvo registro, login y healthcheck, requieren autenticacion.

## 2. Autenticacion y autorizacion

Enviar el token obtenido al registrarse o iniciar sesion:

```http
Authorization: Bearer <token-jwt>
```

La ausencia del encabezado produce `401 { "error": "Token no proporcionado" }`; un esquema incorrecto produce `401 { "error": "Formato de token invalido" }`; un JWT invalido o vencido produce `401 { "error": "Token invalido o expirado" }`.

Los ejercicios, grupos musculares, plantillas y programas con `userId: null` son recursos globales visibles para todos los usuarios autenticados, pero no se pueden modificar ni eliminar. Los recursos con `userId` pertenecen a ese usuario. Las semanas y entrenamientos programados heredan la visibilidad y propiedad de su programa. Los entrenamientos realizados siempre pertenecen al usuario autenticado.

## 3. Convenciones del contrato

- Los IDs recibidos por ruta, query o body son enteros mayores o iguales a `1`.
- Las fechas deben usar un valor ISO 8601, por ejemplo `2026-09-15T18:30:00Z`.
- `diaSemana` usa `1` a `7` (lunes a domingo).
- `peso` admite decimales y debe ser mayor o igual a `0`.
- RIR es un entero entre `0` y `10`; RPE es un numero entre `1` y `10`.
- Los listados no estan paginados.
- Los nombres obligatorios se recortan y deben tener al menos 2 caracteres.
- En `PUT` solo se modifican los campos enviados. En `PUT /workouts/:id`, si se envia `series`, la coleccion completa anterior se reemplaza.
- Los entrenamientos realizados tienen una `modalidad`: `fuerza` o `running`. Si se omite, se asume `fuerza`, tanto al crear como al consultar listados y metricas. Ver la seccion 15.
- Unidades de running: distancia en kilometros (`distanciaKm`), duracion en segundos (`duracionSegundos`), ritmo en segundos por kilometro y velocidad en km/h. Un ritmo de 6:30 min/km equivale a `390` s/km, no a `6.30`.

### Errores

Error de dominio o recurso:

```json
{
  "error": "Descripcion del error"
}
```

Error de validacion (`400`):

```json
{
  "error": "Datos invalidos",
  "details": [
    {
      "field": "nombre",
      "message": "El nombre es obligatorio",
      "value": ""
    }
  ]
}
```

Ruta inexistente (`404`):

```json
{
  "error": "Ruta no encontrada",
  "path": "/api/ruta-inexistente"
}
```

| Codigo | Significado |
| --- | --- |
| `200` | Consulta o actualizacion exitosa |
| `201` | Recurso creado |
| `204` | Eliminacion exitosa sin body, solo para workouts |
| `400` | Datos o relaciones invalidas |
| `401` | Token ausente, invalido o vencido |
| `403` | El usuario intenta modificar un recurso global o ajeno |
| `404` | Ruta o recurso no encontrado/no visible para el usuario |
| `500` | Error interno no controlado |

## 4. Modelos de respuesta

Todos los modelos Sequelize incluyen `createdAt` y `updatedAt` en formato fecha-hora ISO 8601.

### User

```json
{
  "id": 1,
  "nombre": "Usuario Demo",
  "email": "demo@powerup.com",
  "createdAt": "2026-07-26T00:00:00.000Z",
  "updatedAt": "2026-07-26T00:00:00.000Z"
}
```

La propiedad `password` nunca se expone en las respuestas de autenticacion.

### Exercise

```json
{
  "id": 3,
  "nombre": "Sentadilla",
  "descripcion": "Ejercicio compuesto",
  "userId": null,
  "dificultad": "intermedio",
  "imagen": null,
  "createdAt": "2026-06-22T00:00:00.000Z",
  "updatedAt": "2026-06-22T00:00:00.000Z",
  "muscleGroups": [
    { "id": 3, "nombre": "Piernas", "userId": null }
  ]
}
```

### MuscleGroup

Campos: `id`, `nombre`, `userId`, `createdAt`, `updatedAt`.

### WorkoutTemplate

Campos: `id`, `nombre`, `descripcion`, `tipo`, `userId`, `grupoMuscularEtiqueta`, `dificultad`, `tiempoEstimado`, `createdAt`, `updatedAt`.

### WorkoutTemplateExercise

Campos: `id`, `workoutTemplateId`, `exerciseId`, `orden`, `repeticiones`, `peso`, `rirObjetivo`, `rpeObjetivo`, `createdAt`, `updatedAt`. Las consultas GET tambien incluyen `exercise`.

### TrainingProgram

Campos: `id`, `nombre`, `descripcion`, `objetivo`, `userId`, `fechaInicio`, `fechaFin`, `estado`, `createdAt`, `updatedAt`.

### ProgramWeek

Campos: `id`, `trainingProgramId`, `numeroSemana`, `nombre`, `objetivo`, `notas`, `esDescarga`, `createdAt`, `updatedAt`.

### ScheduledWorkout

Campos: `id`, `programWeekId`, `workoutTemplateId`, `nombre`, `diaSemana`, `fechaProgramada`, `orden`, `notas`, `createdAt`, `updatedAt`.

### Workout y WorkoutSet

Campos comunes: `id`, `timestamp`, `nombre`, `userId`, `modalidad`, `distanciaKm`, `duracionSegundos`, `grupoMuscularEtiqueta`, `workoutTemplateId`, `scheduledWorkoutId`, `createdAt`, `updatedAt`, `series`, `workoutTemplate` y `scheduledWorkout`.

Entrenamiento de fuerza (`distanciaKm` y `duracionSegundos` son siempre `null`):

```json
{
  "id": 15,
  "timestamp": "2026-09-15T18:30:00.000Z",
  "nombre": "Sesion de piernas",
  "userId": 1,
  "modalidad": "fuerza",
  "distanciaKm": null,
  "duracionSegundos": null,
  "grupoMuscularEtiqueta": "Piernas",
  "workoutTemplateId": 3,
  "scheduledWorkoutId": 10,
  "series": [
    {
      "id": 45,
      "repeticiones": 8,
      "peso": 100,
      "rir": 2,
      "rpe": 8.5,
      "exerciseId": 3,
      "workoutId": 15,
      "exercise": { "id": 3, "nombre": "Sentadilla" }
    }
  ],
  "workoutTemplate": {},
  "scheduledWorkout": {}
}
```

Entrenamiento de running. No tiene series, plantilla ni entrenamiento programado. La respuesta agrega `ritmoSegundosPorKm` y `velocidadKmH`, que se calculan al consultar y no se guardan en la base:

```json
{
  "id": 16,
  "timestamp": "2026-09-16T07:00:00.000Z",
  "nombre": "Carrera libre",
  "userId": 1,
  "modalidad": "running",
  "distanciaKm": 5,
  "duracionSegundos": 1800,
  "grupoMuscularEtiqueta": null,
  "workoutTemplateId": null,
  "scheduledWorkoutId": null,
  "series": [],
  "workoutTemplate": null,
  "scheduledWorkout": null,
  "ritmoSegundosPorKm": 360,
  "velocidadKmH": 10
}
```

`ritmoSegundosPorKm = duracionSegundos / distanciaKm` y `velocidadKmH = distanciaKm / (duracionSegundos / 3600)`, redondeados a dos decimales. En el ejemplo, 5 km en 1800 s (00:30:00) equivalen a 6:00 min/km y 10 km/h.

## 5. Resumen de endpoints

| Metodo | Ruta | Auth | Resultado exitoso |
| --- | --- | --- | --- |
| GET | `/health` | No | `200` estado basico |
| GET | `/api/health` | No | `200` estado detallado |
| POST | `/api/auth/register` | No | `201` usuario y token |
| POST | `/api/auth/login` | No | `200` usuario y token |
| GET | `/api/auth/perfil` | Si | `200` perfil |
| GET, POST | `/api/exercises` | Si | `200` listado / `201` alta |
| GET, PUT, DELETE | `/api/exercises/:id` | Si | `200` |
| GET, POST | `/api/muscle-groups` | Si | `200` listado / `201` alta |
| GET, PUT, DELETE | `/api/muscle-groups/:id` | Si | `200` |
| GET, POST | `/api/workout-templates` | Si | `200` listado / `201` alta |
| GET, PUT, DELETE | `/api/workout-templates/:id` | Si | `200` |
| GET, POST | `/api/workout-template-exercises` | Si | `200` listado / `201` alta |
| GET, PUT, DELETE | `/api/workout-template-exercises/:id` | Si | `200` |
| GET, POST | `/api/training-programs` | Si | `200` listado / `201` alta |
| GET, PUT, DELETE | `/api/training-programs/:id` | Si | `200` |
| GET, POST | `/api/program-weeks` | Si | `200` listado / `201` alta |
| GET, PUT, DELETE | `/api/program-weeks/:id` | Si | `200` |
| GET, POST | `/api/scheduled-workouts` | Si | `200` listado / `201` alta |
| GET, PUT, DELETE | `/api/scheduled-workouts/:id` | Si | `200` |
| GET, POST | `/api/workouts` | Si | `200` listado (filtro `modalidad`) / `201` alta |
| GET, PUT, DELETE | `/api/workouts/:id` | Si | `200` / DELETE `204` |
| GET | `/api/metrics/summary` | Si | `200` resumen por modalidad |
| GET | `/api/metrics/activity-heatmap` | Si | `200` actividad diaria por modalidad |
| GET | `/api/metrics/exercise-progress` | Si | `200` progreso de un ejercicio de fuerza |
| GET | `/api/metrics/running-progress` | Si | `200` progreso de las carreras |

## 6. Healthchecks

### `GET /health`

Respuesta `200`:

```json
{ "status": "ok", "message": "Backend funcionando" }
```

### `GET /api/health`

Respuesta `200`:

```json
{
  "status": "OK",
  "message": "API funcionando correctamente",
  "timestamp": "2026-09-11T12:00:00.000Z",
  "environment": "development"
}
```

## 7. Autenticacion (`/api/auth`)

### `POST /auth/register`

Body:

| Campo | Tipo | Obligatorio | Regla |
| --- | --- | --- | --- |
| `nombre` | string | Si | Minimo 2 caracteres |
| `email` | string | Si | Email valido y unico; se normaliza |
| `password` | string | Si | Minimo 6 caracteres |

Respuesta `201`: `{ "message": "Usuario registrado exitosamente", "user": User, "token": "..." }`.

Errores propios: `400` si el email ya esta registrado.

### `POST /auth/login`

Body: `email` y `password`, ambos string obligatorios; `email` debe ser valido.

Respuesta `200`: `{ "message": "Login exitoso", "user": User, "token": "..." }`.

Errores propios: `401 { "error": "Credenciales invalidas" }`.

### `GET /auth/perfil`

Respuesta `200`: `{ "user": User }`. Puede responder `404` si el usuario del token ya no existe.

## 8. Ejercicios (`/api/exercises`)

### `GET /exercises`

Query opcional: `muscleGroupId` (entero positivo). Devuelve ejercicios globales y propios, opcionalmente filtrados por grupo.

Respuesta `200`: `{ "exercises": Exercise[] }`.

### `GET /exercises/:id`

Respuesta `200`: `{ "exercise": Exercise }`. Responde `404` si el ejercicio no existe o no es visible.

### `POST /exercises`

| Campo | Tipo | Obligatorio | Regla |
| --- | --- | --- | --- |
| `nombre` | string | Si | Minimo 2 caracteres |
| `descripcion` | string/null | No | Texto |
| `dificultad` | string/null | No | `principiante`, `intermedio` o `avanzado` |
| `imagen` | string/null | No | Texto, normalmente URL |
| `muscleGroupIds` | integer[] | No | Cada ID debe ser positivo y visible |

Respuesta `201`: `{ "message": "Ejercicio creado exitosamente", "exercise": Exercise }`.

### `PUT /exercises/:id`

Acepta los mismos campos, todos opcionales. Respuesta `200`: `{ "message": "Ejercicio actualizado exitosamente", "exercise": Exercise }`. Responde `403` al intentar modificar un ejercicio global.

### `DELETE /exercises/:id`

Respuesta `200`: `{ "message": "Ejercicio eliminado exitosamente" }`. Responde `403` al intentar eliminar uno global.

## 9. Grupos musculares (`/api/muscle-groups`)

### `GET /muscle-groups`

Respuesta `200`: `{ "muscleGroups": MuscleGroup[] }`, con grupos globales y propios.

### `GET /muscle-groups/:id`

Respuesta `200`: `{ "muscleGroup": MuscleGroup }` o `404`.

### `POST /muscle-groups`

Body: `nombre` (string obligatorio, minimo 2 caracteres).

Respuesta `201`: `{ "message": "Grupo muscular creado exitosamente", "muscleGroup": MuscleGroup }`.

### `PUT /muscle-groups/:id`

Body: `nombre` opcional, minimo 2 caracteres si se envia.

Respuesta `200`: `{ "message": "Grupo muscular actualizado exitosamente", "muscleGroup": MuscleGroup }`. Responde `403` para un grupo global.

### `DELETE /muscle-groups/:id`

Respuesta `200`: `{ "message": "Grupo muscular eliminado exitosamente" }`. Responde `403` para un grupo global.

## 10. Plantillas (`/api/workout-templates`)

### `GET /workout-templates`

Respuesta `200`: `{ "workoutTemplates": WorkoutTemplate[] }`, con plantillas globales y propias.

### `GET /workout-templates/:id`

Respuesta `200`: `{ "workoutTemplate": WorkoutTemplate }` o `404`.

### `POST /workout-templates`

| Campo | Tipo | Obligatorio | Regla |
| --- | --- | --- | --- |
| `nombre` | string | Si | Minimo 2 caracteres |
| `descripcion` | string/null | No | Texto |
| `tipo` | string/null | No | Texto libre |
| `grupoMuscularEtiqueta` | string/null | No | Texto libre |
| `dificultad` | string/null | No | Texto libre |
| `tiempoEstimado` | integer/null | No | Mayor o igual a 1, en minutos |

Respuesta `201`: `{ "message": "Plantilla de entrenamiento creada exitosamente", "workoutTemplate": WorkoutTemplate }`.

### `PUT /workout-templates/:id`

Acepta los mismos campos, todos opcionales. Respuesta `200`: `{ "message": "Plantilla de entrenamiento actualizada exitosamente", "workoutTemplate": WorkoutTemplate }`. Responde `403` para una plantilla global.

### `DELETE /workout-templates/:id`

Respuesta `200`: `{ "message": "Plantilla de entrenamiento eliminada exitosamente" }`. Responde `403` para una plantilla global.

## 11. Ejercicios de plantilla (`/api/workout-template-exercises`)

### `GET /workout-template-exercises`

Query obligatorio: `workoutTemplateId` (entero positivo). La plantilla debe ser global o propia.

Respuesta `200`: `{ "workoutTemplateExercises": WorkoutTemplateExercise[] }`, ordenado por `orden` ascendente.

### `GET /workout-template-exercises/:id`

Respuesta `200`: `{ "workoutTemplateExercise": WorkoutTemplateExercise }` o `404`.

### `POST /workout-template-exercises`

| Campo | Tipo | Obligatorio | Regla |
| --- | --- | --- | --- |
| `workoutTemplateId` | integer | Si | Plantilla propia; no se alteran plantillas globales |
| `exerciseId` | integer | Si | Ejercicio global o propio |
| `orden` | integer | Si | Mayor o igual a 1 |
| `repeticiones` | integer | Si | Mayor o igual a 1 |
| `peso` | number/null | No | Mayor o igual a 0 |
| `rirObjetivo` | integer/null | No | Entre 0 y 10 |
| `rpeObjetivo` | number/null | No | Entre 1 y 10 |

Respuesta `201`: `{ "message": "Ejercicio de plantilla creado exitosamente", "workoutTemplateExercise": WorkoutTemplateExercise }`.

### `PUT /workout-template-exercises/:id`

Acepta todos los campos anteriores como opcionales. Si cambia `workoutTemplateId`, el destino tambien debe ser propio. Respuesta `200`: `{ "message": "Ejercicio de plantilla actualizado exitosamente", "workoutTemplateExercise": WorkoutTemplateExercise }`.

### `DELETE /workout-template-exercises/:id`

Respuesta `200`: `{ "message": "Ejercicio de plantilla eliminado exitosamente" }`.

## 12. Programas (`/api/training-programs`)

### `GET /training-programs`

Respuesta `200`: `{ "trainingPrograms": TrainingProgram[] }`, con programas globales y propios.

### `GET /training-programs/:id`

Respuesta `200`: `{ "trainingProgram": TrainingProgram }` o `404`.

### `POST /training-programs`

| Campo | Tipo | Obligatorio | Regla |
| --- | --- | --- | --- |
| `nombre` | string | Si | Minimo 2 caracteres |
| `descripcion` | string/null | No | Texto |
| `objetivo` | string/null | No | Texto |
| `estado` | string/null | No | Texto libre; por defecto `activo` |
| `fechaInicio` | string/null | No | Fecha ISO 8601 |
| `fechaFin` | string/null | No | Fecha ISO 8601 |

Respuesta `201`: `{ "message": "Programa de entrenamiento creado exitosamente", "trainingProgram": TrainingProgram }`.

### `PUT /training-programs/:id`

Acepta los mismos campos, todos opcionales. Respuesta `200`: `{ "message": "Programa de entrenamiento actualizado exitosamente", "trainingProgram": TrainingProgram }`. Responde `403` para un programa global.

### `DELETE /training-programs/:id`

Respuesta `200`: `{ "message": "Programa de entrenamiento eliminado exitosamente" }`. La eliminacion en cascada alcanza sus semanas y entrenamientos programados.

## 13. Semanas de programa (`/api/program-weeks`)

### `GET /program-weeks`

Query obligatorio: `trainingProgramId` (entero positivo). Respuesta `200`: `{ "programWeeks": ProgramWeek[] }`, ordenado por `numeroSemana`.

### `GET /program-weeks/:id`

Respuesta `200`: `{ "programWeek": ProgramWeek }` o `404`.

### `POST /program-weeks`

| Campo | Tipo | Obligatorio | Regla |
| --- | --- | --- | --- |
| `trainingProgramId` | integer | Si | Programa propio |
| `numeroSemana` | integer | Si | Mayor o igual a 1; unico dentro del programa |
| `nombre` | string/null | No | Texto |
| `objetivo` | string/null | No | Texto |
| `notas` | string/null | No | Texto |
| `esDescarga` | boolean | No | Por defecto `false` |

Respuesta `201`: `{ "message": "Semana de programa creada exitosamente", "programWeek": ProgramWeek }`.

### `PUT /program-weeks/:id`

Acepta los mismos campos como opcionales. Un nuevo `trainingProgramId` debe ser propio. Respuesta `200`: `{ "message": "Semana de programa actualizada exitosamente", "programWeek": ProgramWeek }`.

### `DELETE /program-weeks/:id`

Respuesta `200`: `{ "message": "Semana de programa eliminada exitosamente" }`.

## 14. Entrenamientos programados (`/api/scheduled-workouts`)

### `GET /scheduled-workouts`

Query obligatorio: `programWeekId` (entero positivo). Respuesta `200`: `{ "scheduledWorkouts": ScheduledWorkout[] }`, ordenado por `orden`.

### `GET /scheduled-workouts/:id`

Respuesta `200`: `{ "scheduledWorkout": ScheduledWorkout }` o `404`.

### `POST /scheduled-workouts`

| Campo | Tipo | Obligatorio | Regla |
| --- | --- | --- | --- |
| `programWeekId` | integer | Si | Semana de un programa propio |
| `workoutTemplateId` | integer | Si | Plantilla global o propia |
| `nombre` | string | Si | Minimo 2 caracteres |
| `orden` | integer | Si | Mayor o igual a 1; unico dentro de la semana |
| `diaSemana` | integer/null | No | Entre 1 y 7 |
| `fechaProgramada` | string/null | No | Fecha ISO 8601 |
| `notas` | string/null | No | Texto |

Respuesta `201`: `{ "message": "Entrenamiento programado creado exitosamente", "scheduledWorkout": ScheduledWorkout }`.

### `PUT /scheduled-workouts/:id`

Acepta los mismos campos como opcionales. Respuesta `200`: `{ "message": "Entrenamiento programado actualizado exitosamente", "scheduledWorkout": ScheduledWorkout }`.

### `DELETE /scheduled-workouts/:id`

Respuesta `200`: `{ "message": "Entrenamiento programado eliminado exitosamente" }`.

## 15. Entrenamientos realizados (`/api/workouts`)

Cada entrenamiento tiene una sola modalidad:

- **`fuerza`** (por defecto): series de ejercicios; puede vincularse a una plantilla o a un entrenamiento programado.
- **`running`**: carrera libre con distancia y duracion. No admite series, plantilla ni entrenamiento programado; la planificacion de running no forma parte del alcance actual.

Una actividad mixta se registra como dos entrenamientos separados.

### `GET /workouts`

Query opcional: `modalidad` (`fuerza` o `running`). **Sin `modalidad` devuelve solo entrenamientos de fuerza**, para conservar el comportamiento anterior a running. Para obtener carreras se usa `GET /workouts?modalidad=running`. No hay un listado conjunto de ambas modalidades.

Devuelve solo los entrenamientos del usuario, en orden descendente por `timestamp`.

Respuesta `200`: `{ "workouts": Workout[] }`. Cada elemento incluye `series` con su `exercise`, `workoutTemplate` y `scheduledWorkout` (este ultimo incluye su plantilla). Los de running incluyen ademas `ritmoSegundosPorKm` y `velocidadKmH`.

Una `modalidad` distinta de `fuerza` o `running` responde `400`.

### `GET /workouts/:id`

Devuelve el entrenamiento de cualquier modalidad. Respuesta `200`: `{ "workout": Workout }` o `404` si no existe o no pertenece al usuario.

### `POST /workouts`

| Campo | Tipo | Obligatorio | Regla |
| --- | --- | --- | --- |
| `nombre` | string | Si | Minimo 2 caracteres |
| `modalidad` | string | No | `fuerza` (por defecto) o `running` |
| `timestamp` | string | No | Fecha-hora ISO 8601; por defecto, fecha actual |
| `grupoMuscularEtiqueta` | string/null | No | Texto libre |
| `distanciaKm` | number/null | Solo running | Numero finito mayor que 0, en km |
| `duracionSegundos` | integer/null | Solo running | Entero entre `1` y `2147483647`, en segundos |
| `workoutTemplateId` | integer/null | No (solo fuerza) | Plantilla visible |
| `scheduledWorkoutId` | integer/null | No (solo fuerza) | Entrenamiento programado visible |
| `series` | array | No | Por defecto `[]`; en running debe omitirse o estar vacio |
| `series[].exerciseId` | integer | Si, por serie | Ejercicio visible |
| `series[].repeticiones` | integer | Si, por serie | Mayor o igual a 1 |
| `series[].peso` | number | Si, por serie | Mayor o igual a 0 |
| `series[].rir` | integer/null | No | Entre 0 y 10 |
| `series[].rpe` | number/null | No | Entre 1 y 10 |

Reglas de fuerza:

- Si se envia `scheduledWorkoutId`, la API toma de alli el `workoutTemplateId`. Si tambien se envia este ultimo, ambos deben coincidir.
- `distanciaKm` y `duracionSegundos` deben omitirse o enviarse como `null`.

Reglas de running:

- `distanciaKm` y `duracionSegundos` son obligatorios.
- No se admiten series no vacias, `workoutTemplateId` ni `scheduledWorkoutId`.

Ejemplo de alta de running:

```json
{
  "nombre": "Carrera libre",
  "modalidad": "running",
  "timestamp": "2026-09-16T07:00:00Z",
  "distanciaKm": 5,
  "duracionSegundos": 1800
}
```

Respuesta `201`: `{ "workout": Workout }`.

Errores propios de las modalidades (`400 { "error": "..." }`):

| Situacion | Mensaje |
| --- | --- |
| Running sin distancia | `distanciaKm es obligatoria para running` |
| Running sin duracion | `duracionSegundos es obligatoria para running` |
| Running con series | `Un entrenamiento de running no admite series` |
| Running con plantilla o sesion programada | `Un entrenamiento de running no admite plantilla ni entrenamiento programado` |
| Fuerza con distancia o duracion | `distanciaKm y duracionSegundos solo se admiten en running` |

Los valores con formato invalido (por ejemplo `distanciaKm: 0` o `duracionSegundos: 2147483648`) se rechazan antes, con el formato de error de validacion `Datos invalidos` y el campo en `details`.

La base de datos aplica las mismas reglas con restricciones `CHECK` (migracion `20261119000000-add-workout-running-constraints`), por lo que un registro incoherente tampoco puede guardarse sin pasar por la API.

### `PUT /workouts/:id`

Acepta los mismos campos, todos opcionales. Los campos omitidos conservan su valor; las reglas de la modalidad se validan sobre el resultado final (lo guardado combinado con lo enviado).

- **La modalidad no se puede cambiar.** Enviar una `modalidad` distinta de la actual responde `400 { "error": "La modalidad de un entrenamiento no se puede cambiar" }`. Enviar la misma es valido.
- En fuerza, enviar `series` reemplaza todas las series existentes dentro de una transaccion; omitirlo conserva las actuales.
- En running se puede editar, por ejemplo, solo `duracionSegundos`: la respuesta recalcula ritmo y velocidad.

Respuesta `200`: `{ "workout": Workout }`.

### `DELETE /workouts/:id`

Respuesta `204` sin contenido. Las series se eliminan en cascada.

## 16. Metricas (`/api/metrics`)

Todas las consultas admiten `from` y `to` opcionales en formato ISO 8601. El rango es inclusivo y `from` no puede ser posterior a `to`. Solo se consideran entrenamientos del usuario autenticado.

Las metricas se calculan por modalidad y nunca mezclan fuerza con running:

| Endpoint | Modalidad |
| --- | --- |
| `summary`, `activity-heatmap` | Query opcional `modalidad`: `fuerza` (por defecto) o `running`. Cualquier otro valor responde `400`. |
| `exercise-progress` | Siempre fuerza (series de un ejercicio). |
| `running-progress` | Siempre running. |

Internamente, el servicio de metricas consulta los entrenamientos autorizados de la modalidad pedida y delega el calculo en la estrategia correspondiente (`StrengthStrategy` o `RunningStrategy`). Ver [decisiones-diseno.md](decisiones-diseno.md).

### `GET /metrics/summary`

Respuesta `200` para fuerza (sin `modalidad` o con `modalidad=fuerza`):

```json
{
  "summary": {
    "workouts": 12,
    "completedScheduledWorkouts": 10,
    "freeWorkouts": 2,
    "totalSets": 48,
    "totalRepetitions": 480,
    "totalVolume": 28500.5,
    "averageSetsPerWorkout": 4,
    "averageRpe": 7.75,
    "averageRir": 2.1,
    "range": {
      "from": "2026-08-01T00:00:00.000Z",
      "to": "2026-09-30T23:59:59.000Z"
    }
  }
}
```

Los promedios de RPE/RIR son `null` cuando no hay valores. El volumen se calcula como la suma de `repeticiones * peso`.

Respuesta `200` para `modalidad=running`:

```json
{
  "summary": {
    "workouts": 2,
    "totalDistanceKm": 10,
    "totalDurationSeconds": 4200,
    "averagePaceSecondsPerKm": 420,
    "averageSpeedKmH": 8.57,
    "range": { "from": null, "to": null }
  }
}
```

El ritmo y la velocidad promedio se calculan sobre los totales (`4200 s / 10 km = 420 s/km`), no promediando los ritmos de cada carrera: una carrera de 2 km a 300 s/km y otra de 8 km a 450 s/km dan 420 s/km, no 375. Sin carreras, los totales son `0` y los promedios `null`.

### `GET /metrics/activity-heatmap`

Respuesta `200` para fuerza:

```json
{
  "activity": [
    {
      "date": "2026-09-15",
      "workoutCount": 1,
      "completedScheduledWorkouts": 1,
      "setCount": 4,
      "totalVolume": 3200,
      "intensityLevel": 4
    }
  ]
}
```

Respuesta `200` para `modalidad=running`:

```json
{
  "activity": [
    {
      "date": "2026-09-16",
      "workoutCount": 1,
      "totalDistanceKm": 5,
      "totalDurationSeconds": 1800,
      "intensityLevel": 4
    }
  ]
}
```

Los dias se agrupan por fecha UTC. `intensityLevel` va de 1 a 4 y compara el volumen diario (fuerza) o la distancia diaria (running) contra el maximo del rango.

### `GET /metrics/exercise-progress`

Query obligatorio adicional: `exerciseId` (entero positivo y visible). Solo considera entrenamientos de fuerza.

Respuesta `200`:

```json
{
  "exercise": { "id": 3, "nombre": "Sentadilla" },
  "progress": [
    {
      "date": "2026-09-15T18:30:00.000Z",
      "workoutId": 15,
      "workoutName": "Sesion de piernas",
      "setCount": 3,
      "maxWeight": 100,
      "maxRepetitions": 10,
      "totalVolume": 2800,
      "estimatedOneRepMax": 126.67,
      "averageRpe": 8.5,
      "averageRir": 1.67
    }
  ]
}
```

La estimacion de una repeticion maxima usa la formula de Epley: `peso * (1 + repeticiones / 30)`.

### `GET /metrics/running-progress`

Query opcional: `from` y `to`. Devuelve cada carrera del usuario en orden cronologico ascendente, con sus medidas y metricas propias.

Respuesta `200`:

```json
{
  "progress": [
    {
      "date": "2026-11-10T12:00:00.000Z",
      "workoutId": 21,
      "workoutName": "Carrera corta",
      "distanceKm": 2,
      "durationSeconds": 600,
      "paceSecondsPerKm": 300,
      "speedKmH": 12
    },
    {
      "date": "2026-11-12T12:00:00.000Z",
      "workoutId": 20,
      "workoutName": "Carrera larga",
      "distanceKm": 8,
      "durationSeconds": 3600,
      "paceSecondsPerKm": 450,
      "speedKmH": 8
    }
  ]
}
```

Sin carreras en el rango devuelve `{ "progress": [] }`.

## 17. Datos iniciales utiles

Al ejecutar `npm run db:setup` se crea la cuenta `demo@powerup.com` con password `Demo1234!`, 10 grupos musculares, 12 ejercicios globales, 3 plantillas globales y el programa global de cuatro semanas `Hipertrofia base 4 semanas`. Los IDs de los datos iniciales comienzan en `1`, pero conviene obtenerlos con los endpoints GET y no asumirlos en clientes reales.

## 18. Flujo recomendado

1. Registrar un usuario o iniciar sesion y conservar el JWT.
2. Consultar ejercicios y grupos musculares globales, o crear recursos propios.
3. Crear una plantilla propia y agregarle ejercicios.
4. Crear un programa propio, sus semanas y entrenamientos programados.
5. Registrar entrenamientos de fuerza con sus series.
6. Registrar carreras con `modalidad: "running"`, distancia y duracion.
7. Consultar resumen, actividad y progreso por ejercicio (fuerza), y resumen, actividad y progreso de running con `modalidad=running` o `running-progress`.

La coleccion [`requests.http`](../requests.http) implementa este flujo y captura automaticamente el token y los IDs creados cuando se ejecuta en orden con la extension REST Client de VS Code.