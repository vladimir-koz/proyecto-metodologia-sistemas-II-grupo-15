# Taller II — Análisis de una decisión de diseño

## 1. Que parte del código analizamos

Elegimos `getAuthenticatedUserId`, una función que obtiene el ID del usuario de una petición y si no encuentra `req.user` lanza el error `usuario no autenticado`, pero no verifica el token proque eso lo hace antes el middleware de autenticacion.

La funcion esta repetida en cuatro controladores:

- [exercise.controller.ts](../backend/src/controllers/exercise.controller.ts), lineas 12–18.
- [muscleGroup.controller.ts](../backend/src/controllers/muscleGroup.controller.ts), lineas 11–17.
- [workoutTemplate.controller.ts](../backend/src/controllers/workoutTemplate.controller.ts), lineas 11–17.
- [workoutTemplateExercise.controller.ts](../backend/src/controllers/workoutTemplateExercise.controller.ts), lineas 11–17.

Tambien existe en [utils/getAuthenticatedUserId.ts](../backend/src/utils/getAuthenticatedUserId.ts), lineas 4–10, para que otros archivos puedan importarla.

## 2. Que problema encontramos

Al comparar las funciones vimos que hacen lo mismo y el problema aparece si mas adelante cambia esa logica porque tendriamos que acordarnos de modificar todas las copias y podriamos olvidarnos de alguna.

Lo relacionamos con la **duplicacion** , un code smells, y entendemos un code smell como una señal para revisar el codigo, no como una prueba de que funciona mal, en este caso encontramos repeticion, pero no comprobamos un error causado por ella.

Tambien se relaciona con la **mantenibilidad**, porque tener la misma regla en un solo lugar facilitaria cambiarla despues.

## 3. Que opciones consideramos

**Dejarlo como esta.** Las funciones son cortas, se entienden y actualmente coinciden, por lo que evitamos tocar los controladores ahora, pero seguimos teniendo varias copias para mantener.

**Usar la funcion compartida.** Podriamos quitar las cuatro funciones locales e importar la que ya existe en `utils` y tendriamos un solo lugar para esa logica, pero habria que revisar los cambios y comprobar que siguen devolviendo el mismo ID y el mismo error cuando falta el usuario.

**Agregar un patron.** No encontramos una razon para hacerlo para este caso, por ejemplo, strategy sirve para intercambiar maneras distintas de hacer algo, como tenemos varias copias que hacen exactamente lo mismo pensamos en el, pero como es algo chico y simple una funcion compartida alcanza.

## 4. Que decidimos por ahora

Por ahora mantenemos el código actual y dejamos como mejora pendiente reutilizar la funcion de `utils`.

No creemos que la repeticion sea lo ideal, pero las copias son pequeñas y no encontramos diferencias entre ellas, por eso, preferimos hacer ese cambio cuando podamos comprobar que conserva el comportamiento, en lugar de darlo por correcto solo porque parece sencillo.

Si reemplazamos las copias manteniendo los mismos resultados y errores, seria un **refactoring** ya que cambiariamos la organizacion interna sin cambiar lo que hace la aplicacion, pero todavia no lo implementamos.

## 5. Evidencia, beneficios y costos

Ademas de las ubicaciones anteriores, en [workout.controller.ts](../backend/src/controllers/workout.controller.ts), lineas 9 y 14, ya se importa y utiliza la funciion compartida, por eso la alternativa no requiere inventar una solucion nueva, tenemos indicios de que hariamos lo correcto.

El beneficio de reutilizarla seria mantener una sola definicion.
El costo sería modificar cuatro controladores y verificar el resultado (podriamos tener un error en esa funcion compartida que podria afectar a los lugares que la usan).

Conservar las copias evita ese cambio inmediato, pero acepta el riesgo de que en el futuro alguna quede distinta.

## Tambien pensamos en Adapter y Strategy para el futuro

**Adapter:** podria servir para incorporar entrenamientos de un reloj o de otra app que use un formato distinto, lo que ayudaria a traducir esos datos al formato de nuestra API, pero no deberiamos implementar un patron solo por prevencion futura, ya que es solo una suposicion, ni siquiera sabemos como deberia ser ese adaptador de manera concreta, pero podemos prepararnos con buenas practicas en lo demas, porque adaptar datos no significa inventarlos, recibir pasos o pulsaciones no es lo mismo que recibir series y repeticiones(primero necesitariamos una integracion concreta para ver que diferencias existen)

**Strategy:** en [metrics.service.ts](../backend/src/services/metrics.service.ts), lineas 56–58, `getEstimatedOneRepMax` usa una formula para estimar el peso de una repeticion maxima. 
Si mas adelante necesitamos elegir entre distintas formulas para esa misma estimacion, podriamos evaluar Strategy, porque las metricas fueron ideas que sirven, pero no estan chequeadas si son representativas realmente para los usuarios (hoy solo hay una formula en esa funcion, asi que mantenerla directa nos parece mas ptactico).
