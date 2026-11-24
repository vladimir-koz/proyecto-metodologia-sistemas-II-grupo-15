import { describe, expect, test } from 'vitest';
import { ritmoATexto, segundosATexto, textoASegundos } from './formato';

describe('Duración', () => {
  test('30 minutos se envían como 1800 segundos y se muestran como 00:30:00', () => {
    expect(textoASegundos('30:00')).toBe(1800);
    expect(textoASegundos('00:30:00')).toBe(1800);
    expect(segundosATexto(1800)).toBe('00:30:00');
  });

  test('acepta duraciones de más de una hora', () => {
    expect(textoASegundos('1:05:30')).toBe(3930);
    expect(segundosATexto(3930)).toBe('01:05:30');
  });

  test.each(['', '30', '1800', 'abc', '10:75', '1:60:00', '1:2:3:4', '-5:00'])(
    'rechaza el formato inválido "%s"',
    texto => {
      expect(textoASegundos(texto)).toBeNull();
    }
  );
});

describe('Ritmo', () => {
  test('360 s/km se muestra como 6:00 min/km', () => {
    expect(ritmoATexto(360)).toBe('6:00 min/km');
  });

  test('390 s/km es 6:30 min/km, no 6,5', () => {
    expect(ritmoATexto(390)).toBe('6:30 min/km');
  });

  test('sin ritmo muestra un guion', () => {
    expect(ritmoATexto(null)).toBe('—');
  });
});
