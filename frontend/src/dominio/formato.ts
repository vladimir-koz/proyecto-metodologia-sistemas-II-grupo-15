// Conversiones de presentación. La API trabaja en segundos y kilómetros;
// la interfaz muestra y acepta horas:minutos:segundos y min/km.

const dosDigitos = (valor: number) => String(valor).padStart(2, '0');

/** 1800 → "00:30:00". */
export function segundosATexto(segundos: number): string {
  const horas = Math.floor(segundos / 3600);
  const minutos = Math.floor((segundos % 3600) / 60);
  const resto = Math.round(segundos % 60);
  return `${dosDigitos(horas)}:${dosDigitos(minutos)}:${dosDigitos(resto)}`;
}

/**
 * Acepta "hh:mm:ss" o "mm:ss" y devuelve segundos.
 * Devuelve null si el texto no tiene ese formato; los límites los valida la API.
 */
export function textoASegundos(texto: string): number | null {
  const partes = texto.trim().split(':');
  if (partes.length < 2 || partes.length > 3 || partes.some(parte => !/^\d+$/.test(parte))) {
    return null;
  }

  const numeros = partes.map(Number);
  const [horas, minutos, segundos] = numeros.length === 3 ? numeros : [0, ...numeros];
  if (minutos > 59 || segundos > 59) {
    return null;
  }
  return horas * 3600 + minutos * 60 + segundos;
}

/** 390 s/km → "6:30 min/km" (no 6,5). */
export function ritmoATexto(segundosPorKm: number | null | undefined): string {
  if (segundosPorKm === null || segundosPorKm === undefined) {
    return '—';
  }
  const total = Math.round(segundosPorKm);
  return `${Math.floor(total / 60)}:${dosDigitos(total % 60)} min/km`;
}

export function numeroATexto(valor: number | null | undefined, unidad = ''): string {
  if (valor === null || valor === undefined) {
    return '—';
  }
  const texto = valor.toLocaleString('es-AR', { maximumFractionDigits: 2 });
  return unidad ? `${texto} ${unidad}` : texto;
}

/** Valor para <input type="datetime-local"> en hora local: "2026-11-24T18:30". */
export function isoAFechaLocal(iso: string): string {
  const fecha = new Date(iso);
  const local = new Date(fecha.getTime() - fecha.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
}

export function fechaLocalAIso(valor: string): string {
  return new Date(valor).toISOString();
}

export function fechaATexto(iso: string): string {
  return new Date(iso).toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' });
}
