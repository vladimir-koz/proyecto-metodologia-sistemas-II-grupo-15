const { configureIntegrationDatabase } = require('./database');
const { connection, schema } = configureIntegrationDatabase(
  'METRICS_TEST_DATABASE_URL', 'powerup_metrics_integration_test', 'powerup_metrics_test'
);

const { randomUUID } = require('node:crypto');
const request = require('supertest');
const jwt = require('jsonwebtoken');
const { sequelize, Sequelize, User, Exercise, Workout, WorkoutSet } = require('../dist/models');
const app = require('../dist/app').default;
const initialMigration = require('../migrations/20260622000000-create-training-schema');
const runningMigration = require('../migrations/20261114000000-add-running-to-workouts');
const constraintsMigration = require('../migrations/20261119000000-add-workout-running-constraints');
let schemaCreated = false;
let user;
let exercise;
let token;

if (
  sequelize.config.database !== 'powerup_metrics_integration_test' ||
  sequelize.config.host !== connection.hostname ||
  Number(sequelize.config.port) !== Number(connection.port) ||
  sequelize.config.username !== 'powerup_metrics_test'
) {
  throw new Error('Sequelize no apunta a la conexión explícita de integración.');
}
// El DDL y las consultas deben usar exclusivamente el esquema creado por esta suite.
sequelize.options.schema = schema;

describe('Métricas con Express, Sequelize y PostgreSQL reales', () => {
  beforeAll(async () => {
    const [destination] = await sequelize.query(`
      SELECT current_database() AS database, current_setting('search_path') AS search_path,
             current_setting('server_version_num')::integer AS version
    `);
    expect(destination).toEqual([{
      database: 'powerup_metrics_integration_test', search_path: schema,
      version: expect.any(Number)
    }]);
    expect(destination[0].version).toBeGreaterThanOrEqual(170000);
    expect(destination[0].version).toBeLessThan(180000);

    // Sin IF NOT EXISTS: un esquema preexistente no se utiliza ni se elimina.
    await sequelize.query(`CREATE SCHEMA "${schema}"`);
    schemaCreated = true;
    const [activeSchema] = await sequelize.query('SELECT current_schema() AS schema');
    expect(activeSchema).toEqual([{ schema }]);

    const queryInterface = sequelize.getQueryInterface();
    await initialMigration.up(queryInterface, Sequelize);
    await runningMigration.up(queryInterface, Sequelize);
    await constraintsMigration.up(queryInterface);
  }, 30000);

  beforeEach(async () => {
    user = await User.create({
      nombre: 'Usuario de métricas', email: `metrics-${randomUUID()}@example.com`, password: 'ClavePruebas123'
    });
    exercise = await Exercise.create({ nombre: 'Sentadilla', userId: user.id });
    token = jwt.sign({ id: user.id, email: user.email }, process.env.JWT_SECRET);
  });

  afterAll(async () => {
    try {
      if (schemaCreated) {
        await sequelize.query(`DROP SCHEMA "${schema}" CASCADE`);
      }
    } finally {
      await sequelize.close();
    }
  });

  test('el resumen de fuerza calcula entrenamientos, series, repeticiones y volumen desde los registros persistidos', async () => {
    const [first, second] = await Workout.bulkCreate([
      { nombre: 'Fuerza uno', userId: user.id, modalidad: 'fuerza', timestamp: new Date('2026-11-01T12:00:00Z') },
      { nombre: 'Fuerza dos', userId: user.id, modalidad: 'fuerza', timestamp: new Date('2026-11-02T12:00:00Z') }
    ], { returning: true });
    const sets = await WorkoutSet.bulkCreate([
      { workoutId: first.id, exerciseId: exercise.id, repeticiones: 10, peso: 20 },
      { workoutId: first.id, exerciseId: exercise.id, repeticiones: 8, peso: 25 },
      { workoutId: second.id, exerciseId: exercise.id, repeticiones: 5, peso: 40 }
    ], { returning: true });

    expect(await Workout.count({ where: { userId: user.id } })).toBe(2);
    expect(await WorkoutSet.findAll({
      where: { exerciseId: exercise.id }, attributes: ['workoutId', 'repeticiones', 'peso'],
      order: [['id', 'ASC']], raw: true
    })).toEqual([
      { workoutId: first.id, repeticiones: 10, peso: 20 },
      { workoutId: first.id, repeticiones: 8, peso: 25 },
      { workoutId: second.id, repeticiones: 5, peso: 40 }
    ]);

    const response = await request(app).get('/api/metrics/summary')
      .set('Authorization', `Bearer ${token}`).expect(200);
    // Repeticiones: 10 + 8 + 5 = 23. Volumen: 200 + 200 + 200 = 600.
    expect(response.body).toEqual({ summary: {
      workouts: 2, completedScheduledWorkouts: 0, freeWorkouts: 2,
      totalSets: 3, totalRepetitions: 23, totalVolume: 600,
      averageSetsPerWorkout: 1.5, averageRpe: null, averageRir: null,
      range: { from: null, to: null }
    } });

    // Una modificación real en PostgreSQL debe reflejarse en una nueva consulta.
    await sets[0].update({ peso: 30 });
    const recalculated = await request(app).get('/api/metrics/summary')
      .set('Authorization', `Bearer ${token}`).expect(200);
    expect(recalculated.body.summary).toMatchObject({
      workouts: 2, totalSets: 3, totalRepetitions: 23, totalVolume: 700
    });
  });

  test('running resume los totales y el progreso con ritmo agregado ponderado por distancia', async () => {
    // Se insertan en orden inverso al cronológico para comprobar el progreso ordenado.
    const [longRun, shortRun] = await Workout.bulkCreate([
      { nombre: 'Carrera larga', userId: user.id, modalidad: 'running', distanciaKm: 8, duracionSegundos: 3600, timestamp: new Date('2026-11-12T12:00:00Z') },
      { nombre: 'Carrera corta', userId: user.id, modalidad: 'running', distanciaKm: 2, duracionSegundos: 600, timestamp: new Date('2026-11-10T12:00:00Z') }
    ], { returning: true });

    expect(await Workout.findAll({
      where: { userId: user.id }, attributes: ['id', 'distanciaKm', 'duracionSegundos'],
      order: [['timestamp', 'ASC']], raw: true
    })).toEqual([
      { id: shortRun.id, distanciaKm: 2, duracionSegundos: 600 },
      { id: longRun.id, distanciaKm: 8, duracionSegundos: 3600 }
    ]);

    const summary = await request(app).get('/api/metrics/summary').query({ modalidad: 'running' })
      .set('Authorization', `Bearer ${token}`).expect(200);
    // Totales: 10 km y 4200 s => 420 s/km y 8,57 km/h.
    // Promediar 300 y 450 s/km daría 375: ese resultado sería incorrecto.
    expect(summary.body).toEqual({ summary: {
      workouts: 2, totalDistanceKm: 10, totalDurationSeconds: 4200,
      averagePaceSecondsPerKm: 420, averageSpeedKmH: 8.57,
      range: { from: null, to: null }
    } });

    const progress = await request(app).get('/api/metrics/running-progress')
      .set('Authorization', `Bearer ${token}`).expect(200);
    expect(progress.body).toEqual({ progress: [
      {
        date: '2026-11-10T12:00:00.000Z', workoutId: shortRun.id, workoutName: 'Carrera corta',
        distanceKm: 2, durationSeconds: 600, paceSecondsPerKm: 300, speedKmH: 12
      },
      {
        date: '2026-11-12T12:00:00.000Z', workoutId: longRun.id, workoutName: 'Carrera larga',
        distanceKm: 8, durationSeconds: 3600, paceSecondsPerKm: 450, speedKmH: 8
      }
    ] });
  });

  test('los resúmenes separan usuarios y modalidades y el rango de fechas excluye ambos extremos externos', async () => {
    const otherUser = await User.create({ nombre: 'Otro usuario', email: 'other-metrics@example.com', password: 'ClavePruebas123' });
    const otherExercise = await Exercise.create({ nombre: 'Press', userId: otherUser.id });
    const [older, selected, later, foreign] = await Workout.bulkCreate([
      { nombre: 'Fuerza anterior', userId: user.id, modalidad: 'fuerza', timestamp: new Date('2026-11-01T12:00:00Z') },
      { nombre: 'Fuerza incluida', userId: user.id, modalidad: 'fuerza', timestamp: new Date('2026-11-15T12:00:00Z') },
      { nombre: 'Fuerza posterior', userId: user.id, modalidad: 'fuerza', timestamp: new Date('2026-11-30T12:00:00Z') },
      { nombre: 'Fuerza ajena', userId: otherUser.id, modalidad: 'fuerza', timestamp: new Date('2026-11-15T12:00:00Z') }
    ], { returning: true });
    await WorkoutSet.bulkCreate([
      { workoutId: older.id, exerciseId: exercise.id, repeticiones: 10, peso: 10 },
      { workoutId: selected.id, exerciseId: exercise.id, repeticiones: 10, peso: 40 },
      { workoutId: later.id, exerciseId: exercise.id, repeticiones: 10, peso: 90 },
      { workoutId: foreign.id, exerciseId: otherExercise.id, repeticiones: 50, peso: 100 }
    ]);
    await Workout.bulkCreate([
      { nombre: 'Running propio', userId: user.id, modalidad: 'running', distanciaKm: 5, duracionSegundos: 1800, timestamp: new Date('2026-11-15T12:00:00Z') },
      { nombre: 'Running ajeno', userId: otherUser.id, modalidad: 'running', distanciaKm: 100, duracionSegundos: 36000, timestamp: new Date('2026-11-15T12:00:00Z') }
    ]);

    const strength = await request(app).get('/api/metrics/summary').query({ modalidad: 'fuerza' })
      .set('Authorization', `Bearer ${token}`).expect(200);
    expect(strength.body.summary).toMatchObject({
      workouts: 3, totalSets: 3, totalRepetitions: 30, totalVolume: 1400
    });
    const running = await request(app).get('/api/metrics/summary').query({ modalidad: 'running' })
      .set('Authorization', `Bearer ${token}`).expect(200);
    expect(running.body.summary).toMatchObject({
      workouts: 1, totalDistanceKm: 5, totalDurationSeconds: 1800,
      averagePaceSecondsPerKm: 360, averageSpeedKmH: 10
    });

    const filtered = await request(app).get('/api/metrics/summary').query({
      modalidad: 'fuerza', from: '2026-11-10T00:00:00Z', to: '2026-11-20T23:59:59Z'
    }).set('Authorization', `Bearer ${token}`).expect(200);
    expect(filtered.body.summary).toMatchObject({
      workouts: 1, totalSets: 1, totalRepetitions: 10, totalVolume: 400,
      range: { from: '2026-11-10T00:00:00.000Z', to: '2026-11-20T23:59:59.000Z' }
    });
  });
});
