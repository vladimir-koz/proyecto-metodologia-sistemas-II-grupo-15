const { configureIntegrationDatabase } = require('../functional-integration/database');
const { connection, schema } = configureIntegrationDatabase(
  'E2E_TEST_DATABASE_URL', 'powerup_e2e_test', 'powerup_e2e_test'
);

const request = require('supertest');
const { sequelize, Sequelize } = require('../dist/models');
const app = require('../dist/app').default;
const initialMigration = require('../migrations/20260622000000-create-training-schema');
const runningMigration = require('../migrations/20261114000000-add-running-to-workouts');
const constraintsMigration = require('../migrations/20261119000000-add-workout-running-constraints');
let schemaCreated = false;

if (
  sequelize.config.database !== 'powerup_e2e_test' ||
  sequelize.config.host !== connection.hostname ||
  Number(sequelize.config.port) !== Number(connection.port) ||
  sequelize.config.username !== 'powerup_e2e_test'
) {
  throw new Error('Sequelize no apunta a la conexión explícita del E2E.');
}
sequelize.options.schema = schema;

describe('E2E del backend: registro, entrenamientos y métricas', () => {
  beforeAll(async () => {
    const [destination] = await sequelize.query(`
      SELECT current_database() AS database, current_user AS username,
             current_setting('search_path') AS search_path,
             current_setting('server_version_num')::integer AS version
    `);
    expect(destination).toEqual([{
      database: 'powerup_e2e_test', username: 'powerup_e2e_test', search_path: schema,
      version: expect.any(Number)
    }]);
    expect(destination[0].version).toBeGreaterThanOrEqual(170000);
    expect(destination[0].version).toBeLessThan(180000);

    // Un esquema preexistente hace fallar CREATE y nunca habilita su limpieza.
    await sequelize.query(`CREATE SCHEMA "${schema}"`);
    schemaCreated = true;
    expect((await sequelize.query('SELECT current_schema() AS schema'))[0]).toEqual([{ schema }]);

    const queryInterface = sequelize.getQueryInterface();
    await initialMigration.up(queryInterface, Sequelize);
    await runningMigration.up(queryInterface, Sequelize);
    await constraintsMigration.up(queryInterface);
  }, 30000);

  afterAll(async () => {
    try {
      if (schemaCreated) await sequelize.query(`DROP SCHEMA "${schema}" CASCADE`);
    } finally {
      await sequelize.close();
    }
  });

  test('un usuario se registra, inicia sesión, registra fuerza y running y consulta sus métricas', async () => {
    // Todos los datos del recorrido se crean mediante HTTP, sin seeders ni modelos.
    const account = { nombre: 'Ana E2E', email: 'ana.e2e@example.com', password: 'ClaveRuta123!' };
    const registered = await request(app).post('/api/auth/register').send(account).expect(201);
    expect(registered.body.message).toBe('Usuario registrado exitosamente');
    expect(registered.body.user).toMatchObject({
      id: expect.any(Number), nombre: account.nombre, email: account.email
    });
    expect(registered.body.user).not.toHaveProperty('password');
    const userId = registered.body.user.id;

    const login = await request(app).post('/api/auth/login')
      .send({ email: account.email, password: account.password }).expect(200);
    expect(login.body.message).toBe('Login exitoso');
    expect(login.body.user).toMatchObject({ id: userId, nombre: account.nombre, email: account.email });
    expect(login.body.user).not.toHaveProperty('password');
    expect(login.body.token).toEqual(expect.any(String));
    // Las peticiones protegidas usan exclusivamente el JWT obtenido en el login.
    const authorization = `Bearer ${login.body.token}`;

    const exercise = await request(app).post('/api/exercises')
      .set('Authorization', authorization).send({ nombre: 'Sentadilla E2E' }).expect(201);
    expect(exercise.body.exercise).toMatchObject({
      id: expect.any(Number), nombre: 'Sentadilla E2E', userId, muscleGroups: []
    });
    const exerciseId = exercise.body.exercise.id;

    const strength = await request(app).post('/api/workouts').set('Authorization', authorization)
      .send({
        nombre: 'Fuerza E2E', modalidad: 'fuerza', timestamp: '2026-11-01T12:00:00.000Z',
        series: [
          { exerciseId, repeticiones: 10, peso: 40 },
          { exerciseId, repeticiones: 8, peso: 50 }
        ]
      }).expect(201);
    const strengthId = strength.body.workout.id;
    expect(strengthId).toEqual(expect.any(Number));
    expect(strength.body.workout).toMatchObject({
      nombre: 'Fuerza E2E', userId, modalidad: 'fuerza', timestamp: '2026-11-01T12:00:00.000Z',
      distanciaKm: null, duracionSegundos: null, workoutTemplateId: null, scheduledWorkoutId: null
    });
    expect(strength.body.workout.series).toHaveLength(2);
    expect(strength.body.workout.series).toEqual(expect.arrayContaining([
      expect.objectContaining({ workoutId: strengthId, exerciseId, repeticiones: 10, peso: 40 }),
      expect.objectContaining({ workoutId: strengthId, exerciseId, repeticiones: 8, peso: 50 })
    ]));

    const running = await request(app).post('/api/workouts').set('Authorization', authorization)
      .send({
        nombre: 'Running E2E', modalidad: 'running', timestamp: '2026-11-02T12:00:00.000Z',
        distanciaKm: 5, duracionSegundos: 1800
      }).expect(201);
    const runningId = running.body.workout.id;
    expect(runningId).toEqual(expect.any(Number));
    expect(runningId).not.toBe(strengthId);
    expect(running.body.workout).toMatchObject({
      nombre: 'Running E2E', userId, modalidad: 'running', timestamp: '2026-11-02T12:00:00.000Z',
      distanciaKm: 5, duracionSegundos: 1800, ritmoSegundosPorKm: 360, velocidadKmH: 10,
      workoutTemplateId: null, scheduledWorkoutId: null, series: []
    });

    // El listado sin modalidad conserva el contrato anterior: devuelve solo fuerza.
    const strengthList = await request(app).get('/api/workouts')
      .set('Authorization', authorization).expect(200);
    expect(strengthList.body.workouts).toHaveLength(1);
    expect(strengthList.body.workouts[0]).toMatchObject({
      id: strengthId, userId, nombre: 'Fuerza E2E', modalidad: 'fuerza',
      timestamp: '2026-11-01T12:00:00.000Z'
    });
    expect(strengthList.body.workouts[0].series).toHaveLength(2);
    expect(strengthList.body.workouts[0].series).toEqual(expect.arrayContaining([
      expect.objectContaining({ workoutId: strengthId, exerciseId, repeticiones: 10, peso: 40,
        exercise: expect.objectContaining({ id: exerciseId, nombre: 'Sentadilla E2E', userId }) }),
      expect.objectContaining({ workoutId: strengthId, exerciseId, repeticiones: 8, peso: 50,
        exercise: expect.objectContaining({ id: exerciseId, nombre: 'Sentadilla E2E', userId }) })
    ]));

    const runningList = await request(app).get('/api/workouts').query({ modalidad: 'running' })
      .set('Authorization', authorization).expect(200);
    expect(runningList.body.workouts).toHaveLength(1);
    expect(runningList.body.workouts[0]).toMatchObject({
      id: runningId, userId, nombre: 'Running E2E', modalidad: 'running',
      timestamp: '2026-11-02T12:00:00.000Z', distanciaKm: 5, duracionSegundos: 1800,
      ritmoSegundosPorKm: 360, velocidadKmH: 10,
      workoutTemplateId: null, scheduledWorkoutId: null, series: []
    });

    // 10 × 40 + 8 × 50 = 800; 10 + 8 = 18 repeticiones.
    const strengthMetrics = await request(app).get('/api/metrics/summary').query({ modalidad: 'fuerza' })
      .set('Authorization', authorization).expect(200);
    expect(strengthMetrics.body).toEqual({ summary: {
      workouts: 1, completedScheduledWorkouts: 0, freeWorkouts: 1,
      totalSets: 2, totalRepetitions: 18, totalVolume: 800,
      averageSetsPerWorkout: 2, averageRpe: null, averageRir: null,
      range: { from: null, to: null }
    } });

    // 1800 / 5 = 360 s/km (6 min/km); 5 / (1800 / 3600) = 10 km/h.
    const runningMetrics = await request(app).get('/api/metrics/summary').query({ modalidad: 'running' })
      .set('Authorization', authorization).expect(200);
    expect(runningMetrics.body).toEqual({ summary: {
      workouts: 1, totalDistanceKm: 5, totalDurationSeconds: 1800,
      averagePaceSecondsPerKm: 360, averageSpeedKmH: 10,
      range: { from: null, to: null }
    } });
  });
});
