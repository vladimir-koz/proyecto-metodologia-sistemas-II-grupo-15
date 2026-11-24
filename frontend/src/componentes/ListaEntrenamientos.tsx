import { useEffect, useState } from 'react';
import { eliminarEntrenamiento, listarEntrenamientos } from '../api/cliente';
import type { Entrenamiento, Modalidad } from '../api/schemas';
import { fechaATexto, numeroATexto, ritmoATexto, segundosATexto } from '../dominio/formato';
import { MensajeError } from './MensajeError';

interface Props {
  modalidad: Modalidad;
  onCambiarModalidad: (modalidad: Modalidad) => void;
  version: number;
  enEdicionId: number | null;
  onEditar: (entrenamiento: Entrenamiento) => void;
  onEliminado: (id: number) => void;
}

function resumenSeries(entrenamiento: Entrenamiento): string {
  if (entrenamiento.series.length === 0) return 'Sin series';
  return entrenamiento.series
    .map(serie => `${serie.exercise?.nombre ?? `Ejercicio ${serie.exerciseId}`} ${serie.repeticiones}×${numeroATexto(serie.peso)} kg`)
    .join(' · ');
}

export function ListaEntrenamientos({ modalidad, onCambiarModalidad, version, enEdicionId, onEditar, onEliminado }: Props) {
  const [entrenamientos, setEntrenamientos] = useState<Entrenamiento[] | null>(null);
  const [error, setError] = useState<unknown>(null);

  useEffect(() => {
    let vigente = true;
    setError(null);
    listarEntrenamientos(modalidad)
      .then(lista => vigente && setEntrenamientos(lista))
      .catch(e => vigente && setError(e));
    return () => {
      vigente = false;
    };
  }, [modalidad, version]);

  async function eliminar(entrenamiento: Entrenamiento) {
    if (!window.confirm(`¿Eliminar "${entrenamiento.nombre}"?`)) return;
    try {
      await eliminarEntrenamiento(entrenamiento.id);
      onEliminado(entrenamiento.id);
    } catch (e) {
      setError(e);
    }
  }

  return (
    <div className="card shadow-sm h-100">
      <div className="card-header">
        <div className="d-flex justify-content-between align-items-center">
          <h2 className="h5 mb-0">Mis entrenamientos</h2>
          <code className="small">GET /api/workouts?modalidad={modalidad}</code>
        </div>
        <ul className="nav nav-tabs card-header-tabs mt-2">
          {(['fuerza', 'running'] as const).map(opcion => (
            <li className="nav-item" key={opcion}>
              <button type="button" className={`nav-link ${modalidad === opcion ? 'active' : ''}`} onClick={() => onCambiarModalidad(opcion)}>
                {opcion === 'fuerza' ? 'Fuerza' : 'Running'}
              </button>
            </li>
          ))}
        </ul>
      </div>
      <div className="card-body">
        <MensajeError error={error} />
        {entrenamientos === null && error === null && <p className="text-body-secondary">Cargando…</p>}
        {entrenamientos?.length === 0 && (
          <p className="text-body-secondary mb-0">
            Este usuario no tiene entrenamientos de {modalidad}. Cada usuario solo ve los propios.
          </p>
        )}
        {entrenamientos !== null && entrenamientos.length > 0 && (
          <div className="table-responsive">
            <table className="table table-sm align-middle mb-0">
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Nombre</th>
                  {modalidad === 'running' ? (
                    <>
                      <th className="text-end">Distancia</th>
                      <th className="text-end">Duración</th>
                      <th className="text-end">Ritmo</th>
                      <th className="text-end">Velocidad</th>
                    </>
                  ) : (
                    <th>Series</th>
                  )}
                  <th />
                </tr>
              </thead>
              <tbody>
                {entrenamientos.map(entrenamiento => (
                  <tr key={entrenamiento.id} className={entrenamiento.id === enEdicionId ? 'table-warning' : ''}>
                    <td className="text-nowrap small">{fechaATexto(entrenamiento.timestamp)}</td>
                    <td>{entrenamiento.nombre}</td>
                    {modalidad === 'running' ? (
                      <>
                        <td className="text-end text-nowrap">{numeroATexto(entrenamiento.distanciaKm, 'km')}</td>
                        <td className="text-end">{entrenamiento.duracionSegundos === null ? '—' : segundosATexto(entrenamiento.duracionSegundos)}</td>
                        <td className="text-end text-nowrap">{ritmoATexto(entrenamiento.ritmoSegundosPorKm)}</td>
                        <td className="text-end text-nowrap">{numeroATexto(entrenamiento.velocidadKmH, 'km/h')}</td>
                      </>
                    ) : (
                      <td className="small">{resumenSeries(entrenamiento)}</td>
                    )}
                    <td className="text-end text-nowrap">
                      <button type="button" className="btn btn-sm btn-outline-primary me-1" onClick={() => onEditar(entrenamiento)}>
                        Editar
                      </button>
                      <button type="button" className="btn btn-sm btn-outline-danger" onClick={() => eliminar(entrenamiento)}>
                        Eliminar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
