const { strengthStrategy } = require('../../dist/services/strategies/strength.strategy');

describe('Métricas de fuerza', () => {
  const libre = {
    id: 1,
    nombre: 'Fuerza libre',
    timestamp: new Date('2026-11-19T09:00:00Z'),
    scheduledWorkoutId: null,
    distanciaKm: null,
    duracionSegundos: null,
    series: [
      { exerciseId: 1, repeticiones: 10, peso: 20, rir: 0, rpe: 6 },
      { exerciseId: 1, repeticiones: 5, peso: 30, rir: null, rpe: 8 }
    ]
  };

  const programado = {
    id: 2,
    nombre: 'Fuerza programada sin carga',
    timestamp: new Date('2026-11-19T23:59:59Z'),
    scheduledWorkoutId: 10,
    distanciaKm: null,
    duracionSegundos: null,
    series: [
      { exerciseId: 2, repeticiones: 8, peso: 0, rir: 2, rpe: null }
    ]
  };

  const siguienteDia = {
    id: 3,
    nombre: 'Fuerza del día siguiente',
    timestamp: new Date('2026-11-20T00:00:00Z'),
    scheduledWorkoutId: null,
    distanciaKm: null,
    duracionSegundos: null,
    series: [
      { exerciseId: 1, repeticiones: 4, peso: 25, rir: 4, rpe: 7 }
    ]
  };

  test('acumula series, repeticiones y volumen, e incluye RIR cero sin promediar los nulos', () => {
    const result = strengthStrategy.calculate([libre, programado, siguienteDia]);

    expect(result).toEqual({
      summary: {
        workouts: 3,
        completedScheduledWorkouts: 1,
        freeWorkouts: 2,
        totalSets: 4,
        totalRepetitions: 27,
        totalVolume: 450,
        averageSetsPerWorkout: 1.33,
        averageRpe: 7,
        averageRir: 2
      },
      // Volúmenes diarios: 350 y 100. Niveles: 4 y ceil(100 / 350 * 4) = 2.
      activity: [
        {
          date: '2026-11-19',
          workoutCount: 2,
          completedScheduledWorkouts: 1,
          setCount: 3,
          totalVolume: 350,
          intensityLevel: 4
        },
        {
          date: '2026-11-20',
          workoutCount: 1,
          completedScheduledWorkouts: 0,
          setCount: 1,
          totalVolume: 100,
          intensityLevel: 2
        }
      ]
    });
  });

  test('sin entrenamientos devuelve totales cero, promedios nulos y calendario vacío', () => {
    expect(strengthStrategy.calculate([])).toEqual({
      summary: {
        workouts: 0,
        completedScheduledWorkouts: 0,
        freeWorkouts: 0,
        totalSets: 0,
        totalRepetitions: 0,
        totalVolume: 0,
        averageSetsPerWorkout: 0,
        averageRpe: null,
        averageRir: null
      },
      activity: []
    });
  });

  test('un entrenamiento sin series cuenta como actividad sin inventar métricas de series', () => {
    const result = strengthStrategy.calculate([{ ...libre, series: [] }]);

    expect(result).toEqual({
      summary: {
        workouts: 1,
        completedScheduledWorkouts: 0,
        freeWorkouts: 1,
        totalSets: 0,
        totalRepetitions: 0,
        totalVolume: 0,
        averageSetsPerWorkout: 0,
        averageRpe: null,
        averageRir: null
      },
      activity: [
        {
          date: '2026-11-19',
          workoutCount: 1,
          completedScheduledWorkouts: 0,
          setCount: 0,
          totalVolume: 0,
          intensityLevel: 1
        }
      ]
    });
  });

  test('con volumen cero conserva repeticiones y usa la cantidad diaria con nivel máximo cuatro', () => {
    const workouts = Array.from({ length: 5 }, (_, index) => ({
      ...libre,
      id: index + 1,
      series: [
        { exerciseId: 1, repeticiones: 10, peso: 0, rir: null, rpe: null }
      ]
    }));
    workouts.push({
      ...workouts[0],
      id: 6,
      timestamp: new Date('2026-11-20T12:00:00Z')
    });

    const result = strengthStrategy.calculate(workouts);

    expect(result.summary.totalRepetitions).toBe(60);
    expect(result.summary.totalVolume).toBe(0);
    expect(result.summary.averageRpe).toBeNull();
    expect(result.summary.averageRir).toBeNull();
    expect(result.activity).toEqual([
      {
        date: '2026-11-19',
        workoutCount: 5,
        completedScheduledWorkouts: 0,
        setCount: 5,
        totalVolume: 0,
        intensityLevel: 4
      },
      {
        date: '2026-11-20',
        workoutCount: 1,
        completedScheduledWorkouts: 0,
        setCount: 1,
        totalVolume: 0,
        intensityLevel: 1
      }
    ]);
  });

  test('redondea el volumen después de sumar las series, tanto en resumen como en calendario', () => {
    const result = strengthStrategy.calculate([{
      ...libre,
      series: Array.from({ length: 3 }, () => ({
        exerciseId: 1, repeticiones: 1, peso: 0.333, rir: null, rpe: null
      }))
    }]);

    // 0.333 + 0.333 + 0.333 = 0.999, que redondea a 1; no a 0.99.
    expect(result.summary.totalVolume).toBe(1);
    expect(result.activity[0].totalVolume).toBe(1);
  });
});
