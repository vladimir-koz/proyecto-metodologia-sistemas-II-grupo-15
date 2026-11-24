import { useEffect, useState } from 'react';
import {
  obtenerProgresoEjercicio,
  obtenerProgresoRunning,
  obtenerResumenFuerza,
  obtenerResumenRunning,
  type Rango
} from '../api/cliente';
import type {
  Ejercicio,
  Modalidad,
  ProgresoEjercicio,
  ProgresoRunning,
  ResumenFuerza,
  ResumenRunning
} from '../api/schemas';
import { fechaATexto, numeroATexto, ritmoATexto, segundosATexto } from '../dominio/formato';
import { MensajeError } from './MensajeError';

type Datos =
  | { modalidad: 'fuerza'; resumen: ResumenFuerza; progreso: ProgresoEjercicio }
  | { modalidad: 'running'; resumen: ResumenRunning; progreso: ProgresoRunning };

interface Props {
  ejercicios: Ejercicio[];
  version: number;
}

function Indicador({ titulo, valor }: { titulo: string; valor: string }) {
  return (
    <div className="col-6 col-md-4 col-xl-2">
      <div className="indicador border rounded p-2 h-100">
        <div className="small text-body-secondary">{titulo}</div>
        <div className="fs-5 fw-semibold">{valor}</div>
      </div>
    </div>
  );
}

// Las fechas del filtro se interpretan en hora local y se envían en ISO 8601.
function armarRango(desde: string, hasta: string): Rango {
  return {
    from: desde ? new Date(`${desde}T00:00:00`).toISOString() : undefined,
    to: hasta ? new Date(`${hasta}T23:59:59`).toISOString() : undefined
  };
}

export function Metricas({ ejercicios, version }: Props) {
  const [modalidad, setModalidad] = useState<Modalidad>('fuerza');
  const [desde, setDesde] = useState('');
  const [hasta, setHasta] = useState('');
  const [ejercicioId, setEjercicioId] = useState<number | null>(null);
  const [datos, setDatos] = useState<Datos | null>(null);
  const [error, setError] = useState<unknown>(null);

  const ejercicioElegido = ejercicioId ?? ejercicios[0]?.id ?? null;

  useEffect(() => {
    let vigente = true;
    const rango = armarRango(desde, hasta);
    setError(null);

    const consulta: Promise<Datos> = modalidad === 'running'
      ? Promise.all([obtenerResumenRunning(rango), obtenerProgresoRunning(rango)])
        .then(([resumen, progreso]) => ({ modalidad: 'running' as const, resumen, progreso }))
      : Promise.all([
        obtenerResumenFuerza(rango),
        ejercicioElegido === null ? Promise.resolve([]) : obtenerProgresoEjercicio(ejercicioElegido, rango)
      ]).then(([resumen, progreso]) => ({ modalidad: 'fuerza' as const, resumen, progreso }));

    consulta
      .then(resultado => vigente && setDatos(resultado))
      .catch(e => vigente && setError(e));
    return () => {
      vigente = false;
    };
  }, [modalidad, desde, hasta, ejercicioElegido, version]);

  return (
    <div className="card shadow-sm">
      <div className="card-header d-flex flex-wrap gap-2 justify-content-between align-items-center">
        <h2 className="h5 mb-0">Métricas</h2>
        <code className="small">GET /api/metrics/summary?modalidad={modalidad}</code>
      </div>
      <div className="card-body">
        <div className="row g-2 align-items-end mb-3">
          <div className="col-12 col-md-4">
            <div className="btn-group w-100" role="group" aria-label="Modalidad de las métricas">
              {(['fuerza', 'running'] as const).map(opcion => (
                <button
                  key={opcion}
                  type="button"
                  className={`btn ${modalidad === opcion ? 'btn-primary' : 'btn-outline-primary'}`}
                  onClick={() => setModalidad(opcion)}
                >
                  {opcion === 'fuerza' ? 'Fuerza' : 'Running'}
                </button>
              ))}
            </div>
          </div>
          <div className="col-6 col-md-3">
            <label className="form-label small mb-0" htmlFor="desde">Desde</label>
            <input id="desde" type="date" className="form-control form-control-sm" value={desde} onChange={e => setDesde(e.target.value)} />
          </div>
          <div className="col-6 col-md-3">
            <label className="form-label small mb-0" htmlFor="hasta">Hasta</label>
            <input id="hasta" type="date" className="form-control form-control-sm" value={hasta} onChange={e => setHasta(e.target.value)} />
          </div>
          <div className="col-12 col-md-2">
            <button type="button" className="btn btn-sm btn-outline-secondary w-100" onClick={() => { setDesde(''); setHasta(''); }}>
              Sin rango
            </button>
          </div>
        </div>

        <MensajeError error={error} />

        {datos?.modalidad === 'fuerza' && (
          <>
            <div className="row g-2 mb-3">
              <Indicador titulo="Entrenamientos" valor={numeroATexto(datos.resumen.workouts)} />
              <Indicador titulo="Series" valor={numeroATexto(datos.resumen.totalSets)} />
              <Indicador titulo="Repeticiones" valor={numeroATexto(datos.resumen.totalRepetitions)} />
              <Indicador titulo="Volumen" valor={numeroATexto(datos.resumen.totalVolume, 'kg')} />
              <Indicador titulo="RPE promedio" valor={numeroATexto(datos.resumen.averageRpe)} />
              <Indicador titulo="RIR promedio" valor={numeroATexto(datos.resumen.averageRir)} />
            </div>
            <p className="small text-body-secondary">Volumen = suma de repeticiones × peso de todas las series.</p>

            <div className="d-flex flex-wrap gap-2 align-items-center mb-2">
              <h3 className="h6 mb-0">Progreso por ejercicio</h3>
              <select
                className="form-select form-select-sm w-auto"
                aria-label="Ejercicio"
                value={ejercicioElegido ?? ''}
                onChange={e => setEjercicioId(Number(e.target.value))}
              >
                {ejercicios.map(ejercicio => (
                  <option key={ejercicio.id} value={ejercicio.id}>{ejercicio.nombre}</option>
                ))}
              </select>
              <code className="small">GET /api/metrics/exercise-progress</code>
            </div>
            {datos.progreso.length === 0 ? (
              <p className="small text-body-secondary mb-0">Sin series de este ejercicio en el rango.</p>
            ) : (
              <div className="table-responsive">
                <table className="table table-sm mb-0">
                  <thead>
                    <tr>
                      <th>Fecha</th>
                      <th>Entrenamiento</th>
                      <th className="text-end">Series</th>
                      <th className="text-end">Peso máx.</th>
                      <th className="text-end">Volumen</th>
                      <th className="text-end">1RM estimado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {datos.progreso.map(fila => (
                      <tr key={fila.workoutId}>
                        <td className="small">{fechaATexto(fila.date)}</td>
                        <td>{fila.workoutName}</td>
                        <td className="text-end">{fila.setCount}</td>
                        <td className="text-end">{numeroATexto(fila.maxWeight, 'kg')}</td>
                        <td className="text-end">{numeroATexto(fila.totalVolume, 'kg')}</td>
                        <td className="text-end">{numeroATexto(fila.estimatedOneRepMax, 'kg')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <p className="small text-body-secondary mt-1 mb-0">1RM estimado con la fórmula de Epley: peso × (1 + repeticiones / 30).</p>
              </div>
            )}
          </>
        )}

        {datos?.modalidad === 'running' && (
          <>
            <div className="row g-2 mb-3">
              <Indicador titulo="Carreras" valor={numeroATexto(datos.resumen.workouts)} />
              <Indicador titulo="Distancia" valor={numeroATexto(datos.resumen.totalDistanceKm, 'km')} />
              <Indicador titulo="Duración" valor={segundosATexto(datos.resumen.totalDurationSeconds)} />
              <Indicador titulo="Ritmo promedio" valor={ritmoATexto(datos.resumen.averagePaceSecondsPerKm)} />
              <Indicador titulo="Velocidad promedio" valor={numeroATexto(datos.resumen.averageSpeedKmH, 'km/h')} />
            </div>
            <p className="small text-body-secondary">
              El ritmo promedio es la duración total dividida por la distancia total, no el promedio de los ritmos.
            </p>

            <div className="d-flex flex-wrap gap-2 align-items-center mb-2">
              <h3 className="h6 mb-0">Progreso de running</h3>
              <code className="small">GET /api/metrics/running-progress</code>
            </div>
            {datos.progreso.length === 0 ? (
              <p className="small text-body-secondary mb-0">Sin carreras en el rango.</p>
            ) : (
              <div className="table-responsive">
                <table className="table table-sm mb-0">
                  <thead>
                    <tr>
                      <th>Fecha</th>
                      <th>Carrera</th>
                      <th className="text-end">Distancia</th>
                      <th className="text-end">Duración</th>
                      <th className="text-end">Ritmo</th>
                      <th className="text-end">Velocidad</th>
                    </tr>
                  </thead>
                  <tbody>
                    {datos.progreso.map(fila => (
                      <tr key={fila.workoutId}>
                        <td className="small">{fechaATexto(fila.date)}</td>
                        <td>{fila.workoutName}</td>
                        <td className="text-end">{numeroATexto(fila.distanceKm, 'km')}</td>
                        <td className="text-end">{segundosATexto(fila.durationSeconds)}</td>
                        <td className="text-end">{ritmoATexto(fila.paceSecondsPerKm)}</td>
                        <td className="text-end">{numeroATexto(fila.speedKmH, 'km/h')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
