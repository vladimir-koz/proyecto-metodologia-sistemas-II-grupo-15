# PowerUp — Frontend de demostración

Aplicación React de una sola página para recorrer el flujo principal de la API en la presentación: ingreso, registro y edición de entrenamientos de fuerza y running, errores de validación, métricas por modalidad y aislamiento entre usuarios.

No contiene reglas de negocio. Valida y calcula la API, y la interfaz muestra sus respuestas tal como llegan, incluidos los errores `400` con el campo inválido. Por eso los formularios no bloquean valores inválidos (usan `noValidate`).

Cómo levantarla y el recorrido sugerido están en el [README principal](../README.md#frontend-de-demostración).

## Tecnologías

React 19, TypeScript estricto, Vite 7, Zod 4, Bootstrap 5 con Sass y Vitest. En Docker, Nginx sirve la versión compilada y reenvía `/api` al servicio `backend`.

## Estructura

```text
src/
  api/cliente.ts        Única salida HTTP: agrega el JWT, valida respuestas con Zod,
                        convierte errores de la API y registra cada petición.
  api/schemas.ts        Contratos de respuesta (docs/API.md) como esquemas Zod.
  dominio/formato.ts    Conversiones de presentación: hh:mm:ss ↔ segundos, ritmo en min/km.
  componentes/
    Acceso.tsx                  Ingreso con la cuenta demo o registro de un usuario nuevo.
    FormularioEntrenamiento.tsx Alta y edición de fuerza (series) y running (distancia y duración).
    ListaEntrenamientos.tsx     GET /api/workouts?modalidad=..., edición y eliminación.
    Metricas.tsx                Resumen por modalidad, progreso por ejercicio y progreso de running.
    PanelPeticiones.tsx         Método, ruta, código HTTP y tiempo de cada petición.
    GuiaPresentacion.tsx        Pasos de la demo y la prueba automatizada que respalda cada uno.
    MensajeError.tsx            Error de la API con código y campos inválidos.
  App.tsx               Sesión (JWT en sessionStorage) y composición de la página.
```

## Comandos

Desde `frontend/`, con Node.js 24:

| Comando | Uso |
| --- | --- |
| `npm ci` | Instala las dependencias del lockfile. |
| `npm run dev` | Servidor de desarrollo en http://localhost:5173. Reenvía `/api` a `http://localhost:3001`, o a la URL de la variable `API_URL`. |
| `npm test` | 13 pruebas unitarias de las conversiones de duración y ritmo. |
| `npm run build` | Verifica los tipos y genera `dist/`. |
