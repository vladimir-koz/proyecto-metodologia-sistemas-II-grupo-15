import { useEffect, useState } from 'react';
import { listarEjercicios, obtenerPerfil, usarToken } from './api/cliente';
import type { Ejercicio, Entrenamiento, Modalidad, Sesion } from './api/schemas';
import { SesionSchema } from './api/schemas';
import { Acceso } from './componentes/Acceso';
import { FormularioEntrenamiento } from './componentes/FormularioEntrenamiento';
import { GuiaPresentacion } from './componentes/GuiaPresentacion';
import { ListaEntrenamientos } from './componentes/ListaEntrenamientos';
import { MensajeError } from './componentes/MensajeError';
import { Metricas } from './componentes/Metricas';
import { PanelPeticiones } from './componentes/PanelPeticiones';

const CLAVE_SESION = 'powerup.sesion';

// La sesión sobrevive a una recarga de la pestaña, pero no se comparte entre pestañas.
function leerSesionGuardada(): Sesion | null {
  try {
    const guardada = sessionStorage.getItem(CLAVE_SESION);
    const resultado = SesionSchema.safeParse(guardada ? JSON.parse(guardada) : null);
    return resultado.success ? resultado.data : null;
  } catch {
    return null;
  }
}

function guardarSesion(sesion: Sesion | null) {
  try {
    if (sesion) sessionStorage.setItem(CLAVE_SESION, JSON.stringify(sesion));
    else sessionStorage.removeItem(CLAVE_SESION);
  } catch {
    // Sin almacenamiento disponible la sesión dura hasta recargar.
  }
}

export function App() {
  const [sesion, setSesion] = useState<Sesion | null>(() => {
    const guardada = leerSesionGuardada();
    usarToken(guardada?.token ?? null);
    return guardada;
  });
  const [ejercicios, setEjercicios] = useState<Ejercicio[]>([]);
  const [error, setError] = useState<unknown>(null);
  const [modalidadLista, setModalidadLista] = useState<Modalidad>('fuerza');
  const [enEdicion, setEnEdicion] = useState<Entrenamiento | null>(null);
  // Cada alta, edición o baja incrementa la versión para recargar lista y métricas.
  const [version, setVersion] = useState(0);

  function iniciarSesion(nueva: Sesion) {
    usarToken(nueva.token);
    guardarSesion(nueva);
    setSesion(nueva);
  }

  function cerrarSesion() {
    usarToken(null);
    guardarSesion(null);
    setSesion(null);
    setEnEdicion(null);
    setEjercicios([]);
    setError(null);
    setModalidadLista('fuerza');
  }

  // Al entrar se confirma el token con el perfil y se cargan los ejercicios visibles.
  useEffect(() => {
    if (sesion === null) return;
    let vigente = true;
    Promise.all([obtenerPerfil(), listarEjercicios()])
      .then(([, lista]) => vigente && setEjercicios(lista))
      .catch(e => {
        if (!vigente) return;
        if (e instanceof Error && 'status' in e && e.status === 401) cerrarSesion();
        else setError(e);
      });
    return () => {
      vigente = false;
    };
  }, [sesion]);

  function alGuardar(entrenamiento: Entrenamiento) {
    setEnEdicion(null);
    setModalidadLista(entrenamiento.modalidad);
    setVersion(actual => actual + 1);
  }

  function alEliminar(id: number) {
    if (enEdicion?.id === id) setEnEdicion(null);
    setVersion(actual => actual + 1);
  }

  return (
    <>
      <header className="navbar navbar-dark bg-primary mb-4">
        <div className="container">
          <span className="navbar-brand fw-bold">PowerUp</span>
          {sesion && (
            <div className="d-flex align-items-center gap-3 text-white small">
              <span>
                {sesion.user.nombre} · {sesion.user.email}
              </span>
              <button type="button" className="btn btn-sm btn-outline-light" onClick={cerrarSesion}>
                Cerrar sesión
              </button>
            </div>
          )}
        </div>
      </header>

      <main className="container pb-5">
        {sesion === null ? (
          <div className="row g-3">
            <div className="col-12">
              <Acceso onSesion={iniciarSesion} />
            </div>
            <div className="col-12 col-lg-7 mx-auto">
              <PanelPeticiones />
            </div>
          </div>
        ) : (
          <>
            <GuiaPresentacion />
            <MensajeError error={error} />
            <div className="row g-3">
              <div className="col-12 col-xl-5">
                <FormularioEntrenamiento
                  ejercicios={ejercicios}
                  enEdicion={enEdicion}
                  onGuardado={alGuardar}
                  onCancelarEdicion={() => setEnEdicion(null)}
                />
                <div className="mt-3">
                  <PanelPeticiones />
                </div>
              </div>
              <div className="col-12 col-xl-7">
                <ListaEntrenamientos
                  modalidad={modalidadLista}
                  onCambiarModalidad={setModalidadLista}
                  version={version}
                  enEdicionId={enEdicion?.id ?? null}
                  onEditar={setEnEdicion}
                  onEliminado={alEliminar}
                />
              </div>
              <div className="col-12">
                <Metricas ejercicios={ejercicios} version={version} />
              </div>
            </div>
          </>
        )}
      </main>
    </>
  );
}
