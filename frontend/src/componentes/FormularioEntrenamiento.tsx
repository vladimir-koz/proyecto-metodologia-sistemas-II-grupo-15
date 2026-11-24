import { useEffect, useState, type FormEvent } from 'react';
import { actualizarEntrenamiento, crearEntrenamiento, type DatosEntrenamiento } from '../api/cliente';
import type { Ejercicio, Entrenamiento, Modalidad } from '../api/schemas';
import { fechaLocalAIso, isoAFechaLocal, segundosATexto, textoASegundos } from '../dominio/formato';
import { MensajeError } from './MensajeError';

interface FilaSerie {
  clave: number;
  exerciseId: string;
  repeticiones: string;
  peso: string;
  rir: string;
  rpe: string;
}

interface Props {
  ejercicios: Ejercicio[];
  enEdicion: Entrenamiento | null;
  onGuardado: (entrenamiento: Entrenamiento) => void;
  onCancelarEdicion: () => void;
}

let siguienteClave = 1;

function filaVacia(ejercicios: Ejercicio[]): FilaSerie {
  return { clave: siguienteClave++, exerciseId: String(ejercicios[0]?.id ?? ''), repeticiones: '10', peso: '40', rir: '2', rpe: '8' };
}

const opcional = (valor: string) => (valor.trim() === '' ? null : Number(valor));

/**
 * Alta y edición de entrenamientos. La validación la hace la API: el formulario
 * no bloquea valores inválidos para que se vea la respuesta 400 del backend.
 */
export function FormularioEntrenamiento({ ejercicios, enEdicion, onGuardado, onCancelarEdicion }: Props) {
  const [modalidad, setModalidad] = useState<Modalidad>('fuerza');
  const [nombre, setNombre] = useState('Entrenamiento de piernas');
  const [fecha, setFecha] = useState(() => isoAFechaLocal(new Date().toISOString()));
  const [series, setSeries] = useState<FilaSerie[]>([]);
  const [distanciaKm, setDistanciaKm] = useState('5');
  const [duracion, setDuracion] = useState('30:00');
  const [error, setError] = useState<unknown>(null);
  const [enviando, setEnviando] = useState(false);

  // Al editar se cargan los datos guardados; al terminar se vuelve a un alta nueva.
  useEffect(() => {
    setError(null);
    if (enEdicion === null) {
      setSeries(ejercicios.length > 0 ? [filaVacia(ejercicios)] : []);
      return;
    }
    setModalidad(enEdicion.modalidad);
    setNombre(enEdicion.nombre);
    setFecha(isoAFechaLocal(enEdicion.timestamp));
    setSeries(enEdicion.series.map(serie => ({
      clave: siguienteClave++,
      exerciseId: String(serie.exerciseId),
      repeticiones: String(serie.repeticiones),
      peso: String(serie.peso),
      rir: serie.rir === null ? '' : String(serie.rir),
      rpe: serie.rpe === null ? '' : String(serie.rpe)
    })));
    setDistanciaKm(String(enEdicion.distanciaKm ?? ''));
    setDuracion(enEdicion.duracionSegundos === null ? '' : segundosATexto(enEdicion.duracionSegundos));
  }, [enEdicion, ejercicios]);

  function elegirModalidad(nueva: Modalidad) {
    setModalidad(nueva);
    setNombre(nueva === 'fuerza' ? 'Entrenamiento de piernas' : 'Carrera libre');
    setError(null);
  }

  function cambiarSerie(clave: number, campo: keyof Omit<FilaSerie, 'clave'>, valor: string) {
    setSeries(actuales => actuales.map(fila => (fila.clave === clave ? { ...fila, [campo]: valor } : fila)));
  }

  function armarDatos(): DatosEntrenamiento | null {
    const comunes = { nombre, timestamp: fechaLocalAIso(fecha) };

    if (modalidad === 'running') {
      const duracionSegundos = textoASegundos(duracion);
      if (duracionSegundos === null) {
        setError(new Error('La duración debe tener el formato hh:mm:ss o mm:ss (por ejemplo 30:00).'));
        return null;
      }
      return { ...comunes, modalidad, distanciaKm: Number(distanciaKm), duracionSegundos };
    }

    return {
      ...comunes,
      modalidad,
      series: series.map(fila => ({
        exerciseId: Number(fila.exerciseId),
        repeticiones: Number(fila.repeticiones),
        peso: Number(fila.peso),
        rir: opcional(fila.rir),
        rpe: opcional(fila.rpe)
      }))
    };
  }

  async function enviar(evento: FormEvent) {
    evento.preventDefault();
    setError(null);
    const datos = armarDatos();
    if (datos === null) return;

    setEnviando(true);
    try {
      const guardado = enEdicion === null
        ? await crearEntrenamiento(datos)
        : await actualizarEntrenamiento(enEdicion.id, datos);
      onGuardado(guardado);
    } catch (e) {
      setError(e);
    } finally {
      setEnviando(false);
    }
  }

  const editando = enEdicion !== null;

  return (
    <form className="card shadow-sm" onSubmit={enviar} noValidate>
      <div className="card-header d-flex justify-content-between align-items-center">
        <h2 className="h5 mb-0">{editando ? `Editar entrenamiento #${enEdicion.id}` : 'Registrar entrenamiento'}</h2>
        {editando && <span className="badge text-bg-warning">Modo edición</span>}
      </div>
      <div className="card-body">
        <div className="btn-group w-100 mb-3" role="group" aria-label="Modalidad del entrenamiento">
          {(['fuerza', 'running'] as const).map(opcion => (
            <button
              key={opcion}
              type="button"
              className={`btn ${modalidad === opcion ? 'btn-primary' : 'btn-outline-primary'}`}
              onClick={() => elegirModalidad(opcion)}
              disabled={editando && modalidad !== opcion}
            >
              {opcion === 'fuerza' ? 'Fuerza' : 'Running'}
            </button>
          ))}
        </div>
        {editando && (
          <p className="small text-body-secondary">La modalidad no se puede cambiar al editar: la API lo rechaza con 400.</p>
        )}

        <MensajeError error={error} />

        <div className="row g-2 mb-3">
          <div className="col-12 col-sm-7">
            <label className="form-label" htmlFor="nombre-entrenamiento">Nombre</label>
            <input id="nombre-entrenamiento" className="form-control" value={nombre} onChange={e => setNombre(e.target.value)} />
          </div>
          <div className="col-12 col-sm-5">
            <label className="form-label" htmlFor="fecha">Fecha y hora</label>
            <input id="fecha" type="datetime-local" className="form-control" value={fecha} onChange={e => setFecha(e.target.value)} />
          </div>
        </div>

        {modalidad === 'running' ? (
          <div className="row g-2 mb-3">
            <div className="col-6">
              <label className="form-label" htmlFor="distancia">Distancia (km)</label>
              <input id="distancia" type="number" step="0.01" className="form-control" value={distanciaKm} onChange={e => setDistanciaKm(e.target.value)} />
            </div>
            <div className="col-6">
              <label className="form-label" htmlFor="duracion">Duración (hh:mm:ss)</label>
              <input id="duracion" className="form-control" value={duracion} onChange={e => setDuracion(e.target.value)} placeholder="30:00" />
            </div>
            <div className="col-12 form-text">
              Se envía <code>duracionSegundos: {textoASegundos(duracion) ?? '—'}</code>. El ritmo y la velocidad los calcula la API.
            </div>
          </div>
        ) : (
          <div className="mb-3">
            <div className="d-flex justify-content-between align-items-center mb-2">
              <span className="form-label mb-0">Series</span>
              <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => setSeries([...series, filaVacia(ejercicios)])}>
                + Agregar serie
              </button>
            </div>
            {series.length === 0 && <p className="small text-body-secondary">Sin series.</p>}
            {series.map((fila, indice) => (
              <div className="serie row g-1 align-items-end mb-2" key={fila.clave}>
                <div className="col-12 col-sm-4">
                  <label className="form-label small mb-0" htmlFor={`ejercicio-${fila.clave}`}>Ejercicio {indice + 1}</label>
                  <select
                    id={`ejercicio-${fila.clave}`}
                    className="form-select form-select-sm"
                    value={fila.exerciseId}
                    onChange={e => cambiarSerie(fila.clave, 'exerciseId', e.target.value)}
                  >
                    {ejercicios.map(ejercicio => (
                      <option key={ejercicio.id} value={ejercicio.id}>{ejercicio.nombre}</option>
                    ))}
                  </select>
                </div>
                {([['repeticiones', 'Reps'], ['peso', 'Kg'], ['rir', 'RIR'], ['rpe', 'RPE']] as const).map(([campo, etiqueta]) => (
                  <div className="col" key={campo}>
                    <label className="form-label small mb-0" htmlFor={`${campo}-${fila.clave}`}>{etiqueta}</label>
                    <input
                      id={`${campo}-${fila.clave}`}
                      type="number"
                      className="form-control form-control-sm"
                      value={fila[campo]}
                      onChange={e => cambiarSerie(fila.clave, campo, e.target.value)}
                    />
                  </div>
                ))}
                <div className="col-auto">
                  <button
                    type="button"
                    className="btn btn-sm btn-outline-danger"
                    aria-label={`Quitar serie ${indice + 1}`}
                    onClick={() => setSeries(series.filter(otra => otra.clave !== fila.clave))}
                  >
                    ×
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="d-flex gap-2">
          <button type="submit" className="btn btn-primary flex-grow-1" disabled={enviando}>
            {enviando ? 'Guardando…' : editando ? 'Guardar cambios' : 'Registrar'}
          </button>
          {editando && (
            <button type="button" className="btn btn-outline-secondary" onClick={onCancelarEdicion}>
              Cancelar
            </button>
          )}
        </div>
      </div>
    </form>
  );
}
