import { useState, type FormEvent } from 'react';
import { ingresar, registrarse } from '../api/cliente';
import type { Sesion } from '../api/schemas';
import { MensajeError } from './MensajeError';

type Modo = 'ingresar' | 'registrarse';

// Cuenta creada por los seeders (npm run db:setup).
const CUENTA_DEMO = { email: 'demo@powerup.com', password: 'Demo1234!' };

export function Acceso({ onSesion }: { onSesion: (sesion: Sesion) => void }) {
  const [modo, setModo] = useState<Modo>('ingresar');
  const [nombre, setNombre] = useState('');
  const [email, setEmail] = useState(CUENTA_DEMO.email);
  const [password, setPassword] = useState(CUENTA_DEMO.password);
  const [error, setError] = useState<unknown>(null);
  const [enviando, setEnviando] = useState(false);

  function cambiarModo(nuevo: Modo) {
    setModo(nuevo);
    setError(null);
    if (nuevo === 'registrarse') {
      // Un usuario nuevo permite mostrar que no ve los datos de otro.
      setNombre('Usuario Presentación');
      setEmail(`presentacion-${Date.now()}@powerup.com`);
      setPassword('Clave1234!');
    } else {
      setEmail(CUENTA_DEMO.email);
      setPassword(CUENTA_DEMO.password);
    }
  }

  async function enviar(evento: FormEvent) {
    evento.preventDefault();
    setEnviando(true);
    setError(null);
    try {
      onSesion(modo === 'ingresar' ? await ingresar(email, password) : await registrarse(nombre, email, password));
    } catch (e) {
      setError(e);
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="row justify-content-center">
      <div className="col-12 col-md-7 col-lg-5">
        <div className="card shadow-sm">
          <div className="card-header">
            <ul className="nav nav-tabs card-header-tabs">
              {(['ingresar', 'registrarse'] as const).map(opcion => (
                <li className="nav-item" key={opcion}>
                  <button
                    type="button"
                    className={`nav-link ${modo === opcion ? 'active' : ''}`}
                    onClick={() => cambiarModo(opcion)}
                  >
                    {opcion === 'ingresar' ? 'Ingresar' : 'Registrarse'}
                  </button>
                </li>
              ))}
            </ul>
          </div>
          <form className="card-body" onSubmit={enviar} noValidate>
            <p className="text-body-secondary small">
              {modo === 'ingresar'
                ? 'Los datos de la cuenta demo ya están completos.'
                : 'Se propone un email único para crear un segundo usuario.'}
            </p>
            <MensajeError error={error} />
            {modo === 'registrarse' && (
              <div className="mb-3">
                <label className="form-label" htmlFor="nombre">Nombre</label>
                <input id="nombre" className="form-control" value={nombre} onChange={e => setNombre(e.target.value)} />
              </div>
            )}
            <div className="mb-3">
              <label className="form-label" htmlFor="email">Email</label>
              <input id="email" type="email" className="form-control" value={email} onChange={e => setEmail(e.target.value)} />
            </div>
            <div className="mb-3">
              <label className="form-label" htmlFor="password">Contraseña</label>
              <input
                id="password"
                type="password"
                className="form-control"
                value={password}
                onChange={e => setPassword(e.target.value)}
              />
            </div>
            <button type="submit" className="btn btn-primary w-100" disabled={enviando}>
              {enviando ? 'Enviando…' : modo === 'ingresar' ? 'Ingresar' : 'Crear cuenta'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
