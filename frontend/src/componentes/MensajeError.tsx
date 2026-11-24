import { ApiError } from '../api/cliente';

/** Muestra el error tal como lo devolvió la API: código HTTP, mensaje y campos inválidos. */
export function MensajeError({ error }: { error: unknown }) {
  if (error === null || error === undefined) return null;

  const mensaje = error instanceof Error ? error.message : 'Ocurrió un error inesperado';

  return (
    <div role="alert" className="alert alert-danger py-2 small mb-3">
      {error instanceof ApiError && <span className="badge text-bg-danger me-2">HTTP {error.status}</span>}
      {mensaje}
      {error instanceof ApiError && error.details.length > 0 && (
        <ul className="mb-0 mt-1">
          {error.details.map(detalle => (
            <li key={`${detalle.field}-${detalle.message}`}>
              <code>{detalle.field}</code>: {detalle.message}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
