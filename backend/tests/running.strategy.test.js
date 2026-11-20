const { runningStrategy } = require('../dist/services/strategies/running.strategy');

describe('Métricas de running', () => {
  const cincoKm = {
    id: 1,
    nombre: 'Carrera de cinco kilómetros',
    timestamp: new Date('2026-11-19T09:00:00Z'),
    scheduledWorkoutId: null,
    distanciaKm: 5,
    duracionSegundos: 1800,
    series: []
  };

  const diezKm = {
    id: 2,
    nombre: 'Carrera de diez kilómetros',
    timestamp: new Date('2026-11-20T12:00:00Z'),
    scheduledWorkoutId: null,
    distanciaKm: 10,
    duracionSegundos: 3000,
    series: []
  };

  test('cinco kilómetros en treinta minutos producen ritmo de 360 s/km y velocidad de 10 km/h', () => {
    const result = runningStrategy.calculate([cincoKm]);

    expect(result.summary).toEqual({
      workouts: 1,
      totalDistanceKm: 5,
      totalDurationSeconds: 1800,
      averagePaceSecondsPerKm: 360,
      averageSpeedKmH: 10
    });
  });

  test('calcula ritmo y velocidad agregados usando los totales, sin promediar ritmos individuales', () => {
    const result = runningStrategy.calculate([cincoKm, diezKm]);

    // 4800 s / 15 km = 320 s/km; promediar 360 y 300 daría incorrectamente 330.
    expect(result.summary).toEqual({
      workouts: 2,
      totalDistanceKm: 15,
      totalDurationSeconds: 4800,
      averagePaceSecondsPerKm: 320,
      averageSpeedKmH: 11.25
    });
  });

  test('redondea a dos decimales el ritmo del resumen y del progreso', () => {
    const result = runningStrategy.calculate([{
      ...cincoKm,
      distanciaKm: 3,
      duracionSegundos: 1000
    }]);

    expect(result.summary.averagePaceSecondsPerKm).toBe(333.33);
    expect(result.summary.averageSpeedKmH).toBe(10.8);
    expect(result.progress[0].paceSecondsPerKm).toBe(333.33);
    expect(result.progress[0].speedKmH).toBe(10.8);
  });

  test('sin carreras devuelve totales cero, promedios nulos y listas vacías', () => {
    expect(runningStrategy.calculate([])).toEqual({
      summary: {
        workouts: 0,
        totalDistanceKm: 0,
        totalDurationSeconds: 0,
        averagePaceSecondsPerKm: null,
        averageSpeedKmH: null
      },
      activity: [],
      progress: []
    });
  });

  test('agrupa carreras por día UTC, suma sus medidas y calcula niveles relativos a la distancia', () => {
    const result = runningStrategy.calculate([
      cincoKm,
      { ...diezKm, timestamp: new Date('2026-11-19T23:59:59Z') },
      {
        ...cincoKm,
        id: 3,
        timestamp: new Date('2026-11-20T00:00:00Z'),
        duracionSegundos: 1500
      }
    ]);

    // Distancias diarias: 15 y 5 km. Niveles: 4 y ceil(5 / 15 * 4) = 2.
    expect(result.activity).toEqual([
      {
        date: '2026-11-19',
        workoutCount: 2,
        totalDistanceKm: 15,
        totalDurationSeconds: 4800,
        intensityLevel: 4
      },
      {
        date: '2026-11-20',
        workoutCount: 1,
        totalDistanceKm: 5,
        totalDurationSeconds: 1500,
        intensityLevel: 2
      }
    ]);
  });

  test('el progreso conserva el orden recibido y los datos y métricas propios de cada carrera', () => {
    // La consulta ordena los datos; la estrategia debe conservar el orden recibido.
    const result = runningStrategy.calculate([diezKm, cincoKm]);

    expect(result.progress).toEqual([
      {
        date: '2026-11-20T12:00:00.000Z',
        workoutId: 2,
        workoutName: 'Carrera de diez kilómetros',
        distanceKm: 10,
        durationSeconds: 3000,
        paceSecondsPerKm: 300,
        speedKmH: 12
      },
      {
        date: '2026-11-19T09:00:00.000Z',
        workoutId: 1,
        workoutName: 'Carrera de cinco kilómetros',
        distanceKm: 5,
        durationSeconds: 1800,
        paceSecondsPerKm: 360,
        speedKmH: 10
      }
    ]);
  });
});
