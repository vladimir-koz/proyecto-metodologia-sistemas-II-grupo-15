import { useEffect, useState } from 'react';
import { escucharPeticiones, limpiarPeticiones, type Peticion } from '../api/cliente';

function claseEstado(estado: number | null): string {
  if (estado === null) return 'text-bg-dark';
  if (estado < 300) return 'text-bg-success';
  if (estado < 500) return 'text-bg-warning';
  return 'text-bg-danger';
}

/** Muestra cada petición que hace la interfaz: lo mismo que se vería en Postman. */
export function PanelPeticiones() {
  const [peticiones, setPeticiones] = useState<Peticion[]>([]);

  useEffect(() => escucharPeticiones(setPeticiones), []);

  return (
    <div className="card shadow-sm">
      <div className="card-header d-flex justify-content-between align-items-center">
        <h2 className="h6 mb-0">Peticiones HTTP</h2>
        <button type="button" className="btn btn-sm btn-link p-0" onClick={limpiarPeticiones}>Limpiar</button>
      </div>
      <ul className="list-group list-group-flush small peticiones">
        {peticiones.length === 0 && <li className="list-group-item text-body-secondary">Todavía no hay peticiones.</li>}
        {peticiones.map(peticion => (
          <li key={peticion.id} className="list-group-item d-flex gap-2 align-items-center">
            <span className={`badge ${claseEstado(peticion.estado)}`}>{peticion.estado ?? 'sin red'}</span>
            <span className="fw-semibold metodo">{peticion.metodo}</span>
            <code className="text-truncate flex-grow-1" title={peticion.ruta}>{peticion.ruta}</code>
            <span className="text-body-secondary text-nowrap">{Math.round(peticion.milisegundos)} ms</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
