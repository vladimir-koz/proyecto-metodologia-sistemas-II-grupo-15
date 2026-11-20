const { configureIntegrationDatabase } = require('./database');
const { connection, schema } = configureIntegrationDatabase(
  'WORKOUTS_TEST_DATABASE_URL', 'powerup_workouts_integration_test', 'powerup_workouts_test'
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
let userA;
let userB;
let exercise;
let tokenA;
let tokenB;

if (
  sequelize.config.database !== 'powerup_workouts_integration_test' ||
  sequelize.config.host !== connection.hostname ||
  Number(sequelize.config.port) !== Number(connection.port) ||
  sequelize.config.username !== 'powerup_workouts_test'
) {
  throw new Error('Sequelize no apunta a la conexión explícita de integración.');
}
// Las operaciones DDL de Sequelize también deben apuntar al esquema de prueba.
sequelize.options.schema = schema;

describe('Entrenamientos con Express, Sequelize y PostgreSQL reales', () => {
  beforeAll(async () => {
    const [destination] = await sequelize.query(`
      SELECT current_database() AS database, current_setting('search_path') AS search_path,
             current_setting('server_version_num')::integer AS version
    `);
    expect(destination).toEqual([{
      database: 'powerup_workouts_integration_test', search_path: schema,
      version: expect.any(Number)
    }]);
    expect(destination[0].version).toBeGreaterThanOrEqual(170000);
    expect(destination[0].version).toBeLessThan(180000);

    // Si el esquema ya existe, CREATE falla y no se habilita su limpieza.
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
    // Cada escenario tiene usuarios y ejercicio propios; no depende del anterior.
    const suffix = randomUUID();
    userA = await User.create({ nombre: 'Usuario A', email: `a-${suffix}@example.com`, password: 'ClavePruebas123' });
    userB = await User.create({ nombre: 'Usuario B', email: `b-${suffix}@example.com`, password: 'ClavePruebas123' });
    exercise = await Exercise.create({ nombre: 'Sentadilla', userId: userA.id });
    tokenA = jwt.sign({ id: userA.id, email: userA.email }, process.env.JWT_SECRET);
    tokenB = jwt.sign({ id: userB.id, email: userB.email }, process.env.JWT_SECRET);
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

  test('fuerza crea y recupera el entrenamiento con sus series y ejercicio', async () => {
    const response = await request(app).post('/api/workouts')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        nombre: 'Fuerza libre', modalidad: 'fuerza',
        series: [
          { exerciseId: exercise.id, repeticiones: 10, peso: 40 },
          { exerciseId: exercise.id, repeticiones: 8, peso: 45 }
        ]
      }).expect(201);
    const id = response.body.workout.id;
    expect(id).toEqual(expect.any(Number));
    expect(await Workout.findByPk(id, { raw: true })).toMatchObject({
      id, nombre: 'Fuerza libre', userId: userA.id, modalidad: 'fuerza',
      distanciaKm: null, duracionSegundos: null
    });
    const storedSets = await WorkoutSet.findAll({ where: { workoutId: id }, order: [['id', 'ASC']], raw: true });
    expect(storedSets).toMatchObject([
      { workoutId: id, exerciseId: exercise.id, repeticiones: 10, peso: 40 },
      { workoutId: id, exerciseId: exercise.id, repeticiones: 8, peso: 45 }
    ]);

    const retrieved = await request(app).get(`/api/workouts/${id}`)
      .set('Authorization', `Bearer ${tokenA}`).expect(200);
    expect(retrieved.body.workout).toMatchObject({ id, userId: userA.id, modalidad: 'fuerza' });
    expect(retrieved.body.workout.series).toHaveLength(2);
    expect(retrieved.body.workout.series).toEqual(expect.arrayContaining([
      expect.objectContaining({ exerciseId: exercise.id, repeticiones: 10, peso: 40, exercise: expect.objectContaining({ id: exercise.id, nombre: 'Sentadilla' }) }),
      expect.objectContaining({ exerciseId: exercise.id, repeticiones: 8, peso: 45, exercise: expect.objectContaining({ id: exercise.id, nombre: 'Sentadilla' }) })
    ]));
  });

  test('running persiste distancia y duración, calcula ritmo y velocidad y conserva modalidad al editar', async () => {
    const response = await request(app).post('/api/workouts')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ nombre: 'Carrera libre', modalidad: 'running', distanciaKm: 5, duracionSegundos: 1800 })
      .expect(201);
    const id = response.body.workout.id;
    expect(response.body.workout).toMatchObject({
      modalidad: 'running', distanciaKm: 5, duracionSegundos: 1800,
      ritmoSegundosPorKm: 360, velocidadKmH: 10, series: []
    });
    expect(await Workout.findByPk(id, { raw: true })).toMatchObject({
      userId: userA.id, modalidad: 'running', distanciaKm: 5, duracionSegundos: 1800,
      workoutTemplateId: null, scheduledWorkoutId: null
    });

    const updated = await request(app).put(`/api/workouts/${id}`)
      .set('Authorization', `Bearer ${tokenA}`).send({ duracionSegundos: 1500 }).expect(200);
    expect(updated.body.workout).toMatchObject({
      id, modalidad: 'running', distanciaKm: 5, duracionSegundos: 1500,
      ritmoSegundosPorKm: 300, velocidadKmH: 12
    });
    expect(await Workout.findByPk(id, { raw: true })).toMatchObject({
      userId: userA.id, modalidad: 'running', distanciaKm: 5, duracionSegundos: 1500
    });
    expect(await WorkoutSet.count({ where: { workoutId: id } })).toBe(0);
  });

  test('otro usuario no puede consultar, modificar ni eliminar el entrenamiento y sus datos permanecen intactos', async () => {
    const created = await request(app).post('/api/workouts')
      .set('Authorization', `Bearer ${tokenA}`).send({
        nombre: 'Entrenamiento privado', modalidad: 'fuerza',
        series: [{ exerciseId: exercise.id, repeticiones: 10, peso: 40 }]
      }).expect(201);
    const id = created.body.workout.id;
    const original = await Workout.findByPk(id, { raw: true });
    const originalSets = await WorkoutSet.findAll({ where: { workoutId: id }, raw: true });

    const retrieved = await request(app).get(`/api/workouts/${id}`)
      .set('Authorization', `Bearer ${tokenB}`).expect(404);
    expect(retrieved.body).toEqual({ error: 'Entrenamiento no encontrado' });
    const updated = await request(app).put(`/api/workouts/${id}`)
      .set('Authorization', `Bearer ${tokenB}`).send({ nombre: 'Cambio ajeno', series: [] }).expect(404);
    expect(updated.body).toEqual({ error: 'Entrenamiento no encontrado' });
    const deleted = await request(app).delete(`/api/workouts/${id}`)
      .set('Authorization', `Bearer ${tokenB}`).expect(404);
    expect(deleted.body).toEqual({ error: 'Entrenamiento no encontrado' });

    expect(await Workout.findByPk(id, { raw: true })).toEqual(original);
    expect(await WorkoutSet.findAll({ where: { workoutId: id }, raw: true })).toEqual(originalSets);
    const ownerResponse = await request(app).get(`/api/workouts/${id}`)
      .set('Authorization', `Bearer ${tokenA}`).expect(200);
    expect(ownerResponse.body.workout).toMatchObject({ id, nombre: 'Entrenamiento privado', userId: userA.id });
  });

  test('una serie con ejercicio inexistente falla por FK y revierte toda el alta', async () => {
    const { createWorkoutForUser } = require('../dist/repositories/workout.repository');
    const originalWorkouts = await Workout.findAll({ order: [['id', 'ASC']], raw: true });
    const originalSets = await WorkoutSet.findAll({ order: [['id', 'ASC']], raw: true });
    const missingExerciseId = 2147483647;
    expect(await Exercise.findByPk(missingExerciseId)).toBeNull();

    await expect(createWorkoutForUser(userA.id, {
      nombre: 'Alta que debe revertirse', modalidad: 'fuerza',
      series: [{ exerciseId: missingExerciseId, repeticiones: 10, peso: 40 }]
    })).rejects.toMatchObject({
      name: 'SequelizeForeignKeyConstraintError',
      parent: { code: '23503', table: 'workout_sets' }
    });

    expect(await Workout.findAll({ order: [['id', 'ASC']], raw: true })).toEqual(originalWorkouts);
    expect(await WorkoutSet.findAll({ order: [['id', 'ASC']], raw: true })).toEqual(originalSets);
  });
});
