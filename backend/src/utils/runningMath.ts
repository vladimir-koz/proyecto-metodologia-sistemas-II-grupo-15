/**
 * Calculos puros de running. Unidades internas:
 * - distancia: kilometros
 * - duracion: segundos
 * - ritmo: segundos por kilometro (6:30 min/km = 390 s/km, no 6,30)
 * - velocidad: kilometros por hora
 */

export function roundTo(value: number, decimals = 2): number {
  return Number(value.toFixed(decimals));
}

export function calcularRitmoSegundosPorKm(
  distanciaKm: number | null | undefined,
  duracionSegundos: number | null | undefined
): number | null {
  if (!distanciaKm || !duracionSegundos || distanciaKm <= 0 || duracionSegundos <= 0) {
    return null;
  }

  return roundTo(duracionSegundos / distanciaKm);
}

export function calcularVelocidadKmH(
  distanciaKm: number | null | undefined,
  duracionSegundos: number | null | undefined
): number | null {
  if (!distanciaKm || !duracionSegundos || distanciaKm <= 0 || duracionSegundos <= 0) {
    return null;
  }

  return roundTo(distanciaKm / (duracionSegundos / 3600));
}