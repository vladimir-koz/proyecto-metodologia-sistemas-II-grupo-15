import { z } from 'zod';

// Contratos de respuesta documentados en docs/API.md. Solo se declaran los
// campos que usa la interfaz; los demás se ignoran.

export const ModalidadSchema = z.enum(['fuerza', 'running']);
export type Modalidad = z.infer<typeof ModalidadSchema>;

export const UsuarioSchema = z.object({
  id: z.number(),
  nombre: z.string(),
  email: z.string()
});
export type Usuario = z.infer<typeof UsuarioSchema>;

export const SesionSchema = z.object({
  user: UsuarioSchema,
  token: z.string()
});
export type Sesion = z.infer<typeof SesionSchema>;

export const PerfilSchema = z.object({ user: UsuarioSchema });

export const EjercicioSchema = z.object({
  id: z.number(),
  nombre: z.string(),
  userId: z.number().nullable()
});
export type Ejercicio = z.infer<typeof EjercicioSchema>;

export const EjerciciosSchema = z.object({ exercises: z.array(EjercicioSchema) });

export const SerieSchema = z.object({
  id: z.number(),
  exerciseId: z.number(),
  repeticiones: z.number(),
  peso: z.number(),
  rir: z.number().nullable(),
  rpe: z.number().nullable(),
  exercise: z.object({ id: z.number(), nombre: z.string() }).nullish()
});
export type Serie = z.infer<typeof SerieSchema>;

export const EntrenamientoSchema = z.object({
  id: z.number(),
  nombre: z.string(),
  timestamp: z.string(),
  modalidad: ModalidadSchema,
  distanciaKm: z.number().nullable(),
  duracionSegundos: z.number().nullable(),
  series: z.array(SerieSchema),
  // Solo running: calculados por la API al consultar.
  ritmoSegundosPorKm: z.number().nullable().optional(),
  velocidadKmH: z.number().nullable().optional()
});
export type Entrenamiento = z.infer<typeof EntrenamientoSchema>;

export const EntrenamientoRespuestaSchema = z.object({ workout: EntrenamientoSchema });
export const EntrenamientosSchema = z.object({ workouts: z.array(EntrenamientoSchema) });

const RangoSchema = z.object({ from: z.string().nullable(), to: z.string().nullable() });

export const ResumenFuerzaSchema = z.object({
  summary: z.object({
    workouts: z.number(),
    completedScheduledWorkouts: z.number(),
    freeWorkouts: z.number(),
    totalSets: z.number(),
    totalRepetitions: z.number(),
    totalVolume: z.number(),
    averageSetsPerWorkout: z.number(),
    averageRpe: z.number().nullable(),
    averageRir: z.number().nullable(),
    range: RangoSchema
  })
});
export type ResumenFuerza = z.infer<typeof ResumenFuerzaSchema>['summary'];

export const ResumenRunningSchema = z.object({
  summary: z.object({
    workouts: z.number(),
    totalDistanceKm: z.number(),
    totalDurationSeconds: z.number(),
    averagePaceSecondsPerKm: z.number().nullable(),
    averageSpeedKmH: z.number().nullable(),
    range: RangoSchema
  })
});
export type ResumenRunning = z.infer<typeof ResumenRunningSchema>['summary'];

export const ProgresoRunningSchema = z.object({
  progress: z.array(z.object({
    date: z.string(),
    workoutId: z.number(),
    workoutName: z.string(),
    distanceKm: z.number(),
    durationSeconds: z.number(),
    paceSecondsPerKm: z.number().nullable(),
    speedKmH: z.number().nullable()
  }))
});
export type ProgresoRunning = z.infer<typeof ProgresoRunningSchema>['progress'];

export const ProgresoEjercicioSchema = z.object({
  exercise: z.object({ id: z.number(), nombre: z.string() }),
  progress: z.array(z.object({
    date: z.string(),
    workoutId: z.number(),
    workoutName: z.string(),
    setCount: z.number(),
    maxWeight: z.number(),
    maxRepetitions: z.number(),
    totalVolume: z.number(),
    estimatedOneRepMax: z.number(),
    averageRpe: z.number().nullable(),
    averageRir: z.number().nullable()
  }))
});
export type ProgresoEjercicio = z.infer<typeof ProgresoEjercicioSchema>['progress'];
