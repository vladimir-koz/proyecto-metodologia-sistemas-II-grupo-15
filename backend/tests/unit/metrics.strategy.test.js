const { getMetricsStrategy } = require('../../dist/services/strategies');

describe('Selección de Strategy por modalidad', () => {
  test('seleccionar fuerza permite calcular su resumen y calendario', () => {
    const result = getMetricsStrategy('fuerza').calculate([{
      id: 1,
      nombre: 'Fuerza libre',
      timestamp: new Date('2026-11-19T12:00:00Z'),
      scheduledWorkoutId: null,
      distanciaKm: null,
      duracionSegundos: null,
      series: [
        { exerciseId: 1, repeticiones: 10, peso: 20, rir: 0, rpe: 8 }
      ]
    }]);

    expect(result).toEqual({
      summary: {
        workouts: 1,
        completedScheduledWorkouts: 0,
        freeWorkouts: 1,
        totalSets: 1,
        totalRepetitions: 10,
        totalVolume: 200,
        averageSetsPerWorkout: 1,
        averageRpe: 8,
        averageRir: 0
      },
      activity: [
        {
          date: '2026-11-19',
          workoutCount: 1,
          completedScheduledWorkouts: 0,
          setCount: 1,
          totalVolume: 200,
          intensityLevel: 4
        }
      ]
    });
  });

  test('seleccionar running permite calcular distancia, duración, ritmo, velocidad y progreso', () => {
    const result = getMetricsStrategy('running').calculate([{
      id: 2,
      nombre: 'Carrera de diez kilómetros',
      timestamp: new Date('2026-11-19T12:00:00Z'),
      scheduledWorkoutId: null,
      distanciaKm: 10,
      duracionSegundos: 3000,
      series: []
    }]);

    expect(result).toEqual({
      summary: {
        workouts: 1,
        totalDistanceKm: 10,
        totalDurationSeconds: 3000,
        averagePaceSecondsPerKm: 300,
        averageSpeedKmH: 12
      },
      activity: [
        {
          date: '2026-11-19',
          workoutCount: 1,
          totalDistanceKm: 10,
          totalDurationSeconds: 3000,
          intensityLevel: 4
        }
      ],
      progress: [
        {
          date: '2026-11-19T12:00:00.000Z',
          workoutId: 2,
          workoutName: 'Carrera de diez kilómetros',
          distanceKm: 10,
          durationSeconds: 3000,
          paceSecondsPerKm: 300,
          speedKmH: 12
        }
      ]
    });
  });

  test.each(['ciclismo', 'toString', '__proto__'])(
    'rechaza la modalidad no soportada "%s" con código 400',
    (modalidad) => {
      expect(() => getMetricsStrategy(modalidad)).toThrow(
        expect.objectContaining({
          message: `Modalidad no soportada: ${modalidad}`,
          statusCode: 400
        })
      );
    }
  );
});
