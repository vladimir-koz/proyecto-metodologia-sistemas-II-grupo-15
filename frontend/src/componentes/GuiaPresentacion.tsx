// Recorrido sugerido para la presentación. Cada paso corresponde a un
// comportamiento verificado por las pruebas automatizadas (docs/testing.md).
const PASOS = [
  { accion: 'Ingresar con la cuenta demo.', prueba: 'auth: login → JWT → perfil' },
  { accion: 'Registrar un entrenamiento de fuerza con series.', prueba: 'workouts: fuerza con series' },
  { accion: 'Registrar una carrera de 5 km en 30:00 → 6:00 min/km y 10 km/h.', prueba: 'running.strategy y workouts: running' },
  { accion: 'Editar la carrera a 25:00 → 5:00 min/km y 12 km/h. La modalidad queda bloqueada.', prueba: 'workouts: conserva modalidad al editar' },
  { accion: 'Probar distancia 0 o una serie con 0 repeticiones → la API responde 400.', prueba: 'HTTP: validaciones' },
  { accion: 'Ver métricas de fuerza y de running por separado; filtrar por fechas.', prueba: 'metrics: modalidades y rango' },
  { accion: 'Cerrar sesión y registrar otro usuario → no ve los datos del primero.', prueba: 'workouts y metrics: aislamiento por usuario' }
];

export function GuiaPresentacion() {
  return (
    <details className="card shadow-sm mb-3 guia">
      <summary className="card-header fw-semibold">Recorrido sugerido para la presentación</summary>
      <ol className="list-group list-group-flush list-group-numbered small">
        {PASOS.map(paso => (
          <li key={paso.accion} className="list-group-item d-flex justify-content-between gap-2">
            <span>{paso.accion}</span>
            <span className="badge text-bg-light border text-wrap text-end">{paso.prueba}</span>
          </li>
        ))}
      </ol>
    </details>
  );
}
