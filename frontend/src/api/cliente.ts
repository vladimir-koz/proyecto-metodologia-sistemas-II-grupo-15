import type { z } from 'zod';
import {
  EjerciciosSchema,
  EntrenamientoRespuestaSchema,
  EntrenamientosSchema,
  PerfilSchema,
  ProgresoEjercicioSchema,
  ProgresoRunningSchema,
  ResumenFuerzaSchema,
  ResumenRunningSchema,
  SesionSchema,
  type Modalidad
} from './schemas';

const SIN_CONEXION = 'No se pudo conectar con la API. ¿Está levantado el backend en el puerto 3001?';
const FORMATO_INESPERADO = 'La respuesta de la API no tiene el formato esperado';

export interface DetalleValidacion {
  field: string;
  message: string;
}

/** Error devuelto por la API: conserva el código HTTP y los campos inválidos. */
export class ApiError extends Error {
  constructor(message: string, readonly status: number, readonly details: DetalleValidacion[] = []) {
    super(message);
  }
}

/* ---------- Registro de peticiones (panel "Peticiones HTTP") ---------- */

export interface Peticion {
  id: number;
  metodo: string;
  ruta: string;
  estado: number | null;
  milisegundos: number;
}

type Oyente = (historial: Peticion[]) => void;
const MAXIMO_HISTORIAL = 12;
const oyentes = new Set<Oyente>();
let historial: Peticion[] = [];
let siguienteId = 1;

/** El historial vive fuera de React para no perderse al cambiar de pantalla (por ejemplo, al ingresar). */
export function escucharPeticiones(oyente: Oyente): () => void {
  oyentes.add(oyente);
  oyente(historial);
  return () => oyentes.delete(oyente);
}

function registrarPeticion(peticion: Peticion) {
  historial = [peticion, ...historial].slice(0, MAXIMO_HISTORIAL);
  oyentes.forEach(oyente => oyente(historial));
}

export function limpiarPeticiones() {
  historial = [];
  oyentes.forEach(oyente => oyente(historial));
}

/* ---------- Token JWT ---------- */

let token: string | null = null;

export function usarToken(nuevoToken: string | null) {
  token = nuevoToken;
}

/* ---------- Única puerta de salida HTTP ---------- */

async function leerJson(respuesta: Response): Promise<unknown> {
  try {
    return await respuesta.json();
  } catch {
    return undefined;
  }
}

function crearError(estado: number, datos: unknown): Error {
  if (typeof datos === 'object' && datos !== null && 'error' in datos && typeof datos.error === 'string') {
    const details = 'details' in datos && Array.isArray(datos.details) ? (datos.details as DetalleValidacion[]) : [];
    return new ApiError(datos.error, estado, details);
  }
  // Sin el formato { error } de la API: el proxy (Vite o Nginx) no pudo llegar al backend.
  return new Error(SIN_CONEXION);
}

async function solicitar<T>(
  metodo: string,
  ruta: string,
  esquema: z.ZodType<T> | null,
  cuerpo?: unknown
): Promise<T> {
  const inicio = performance.now();
  const peticion: Peticion = { id: siguienteId++, metodo, ruta, estado: null, milisegundos: 0 };
  const headers: Record<string, string> = {};
  if (cuerpo !== undefined) headers['Content-Type'] = 'application/json';
  if (token) headers.Authorization = `Bearer ${token}`;

  let respuesta: Response;
  try {
    respuesta = await fetch(ruta, {
      method: metodo,
      headers,
      body: cuerpo === undefined ? undefined : JSON.stringify(cuerpo)
    });
  } catch {
    registrarPeticion({ ...peticion, milisegundos: performance.now() - inicio });
    throw new Error(SIN_CONEXION);
  }

  registrarPeticion({ ...peticion, estado: respuesta.status, milisegundos: performance.now() - inicio });
  const datos = respuesta.status === 204 ? undefined : await leerJson(respuesta);

  if (!respuesta.ok) {
    throw crearError(respuesta.status, datos);
  }
  if (esquema === null) {
    return undefined as T;
  }

  const resultado = esquema.safeParse(datos);
  if (!resultado.success) {
    throw new Error(FORMATO_INESPERADO);
  }
  return resultado.data;
}

/* ---------- Autenticación ---------- */

export function ingresar(email: string, password: string) {
  return solicitar('POST', '/api/auth/login', SesionSchema, { email, password });
}

export function registrarse(nombre: string, email: string, password: string) {
  return solicitar('POST', '/api/auth/register', SesionSchema, { nombre, email, password });
}

export async function obtenerPerfil() {
  return (await solicitar('GET', '/api/auth/perfil', PerfilSchema)).user;
}

/* ---------- Ejercicios ---------- */

export async function listarEjercicios() {
  return (await solicitar('GET', '/api/exercises', EjerciciosSchema)).exercises;
}

/* ---------- Entrenamientos ---------- */

export interface SerieNueva {
  exerciseId: number;
  repeticiones: number;
  peso: number;
  rir?: number | null;
  rpe?: number | null;
}

export interface DatosEntrenamiento {
  nombre?: string;
  modalidad?: Modalidad;
  timestamp?: string;
  distanciaKm?: number | null;
  duracionSegundos?: number | null;
  series?: SerieNueva[];
}

export async function listarEntrenamientos(modalidad: Modalidad) {
  return (await solicitar('GET', `/api/workouts?modalidad=${modalidad}`, EntrenamientosSchema)).workouts;
}

export async function crearEntrenamiento(datos: DatosEntrenamiento) {
  return (await solicitar('POST', '/api/workouts', EntrenamientoRespuestaSchema, datos)).workout;
}

export async function actualizarEntrenamiento(id: number, datos: DatosEntrenamiento) {
  return (await solicitar('PUT', `/api/workouts/${id}`, EntrenamientoRespuestaSchema, datos)).workout;
}

export function eliminarEntrenamiento(id: number) {
  return solicitar<void>('DELETE', `/api/workouts/${id}`, null);
}

/* ---------- Métricas ---------- */

export interface Rango {
  from?: string;
  to?: string;
}

function consulta(parametros: Record<string, string | number | undefined>): string {
  const busqueda = new URLSearchParams();
  Object.entries(parametros).forEach(([clave, valor]) => {
    if (valor !== undefined && valor !== '') busqueda.set(clave, String(valor));
  });
  const texto = busqueda.toString();
  return texto ? `?${texto}` : '';
}

export async function obtenerResumenFuerza(rango: Rango) {
  const ruta = `/api/metrics/summary${consulta({ modalidad: 'fuerza', ...rango })}`;
  return (await solicitar('GET', ruta, ResumenFuerzaSchema)).summary;
}

export async function obtenerResumenRunning(rango: Rango) {
  const ruta = `/api/metrics/summary${consulta({ modalidad: 'running', ...rango })}`;
  return (await solicitar('GET', ruta, ResumenRunningSchema)).summary;
}

export async function obtenerProgresoRunning(rango: Rango) {
  return (await solicitar('GET', `/api/metrics/running-progress${consulta({ ...rango })}`, ProgresoRunningSchema)).progress;
}

export async function obtenerProgresoEjercicio(exerciseId: number, rango: Rango) {
  const ruta = `/api/metrics/exercise-progress${consulta({ exerciseId, ...rango })}`;
  return (await solicitar('GET', ruta, ProgresoEjercicioSchema)).progress;
}
