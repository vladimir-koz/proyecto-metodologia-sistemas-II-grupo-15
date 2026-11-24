const { configureIntegrationDatabase } = require('./database');
const { connection, schema } = configureIntegrationDatabase(
  'ROUTINES_TEST_DATABASE_URL', 'powerup_routines_integration_test', 'powerup_routines_test'
);

const { randomUUID } = require('node:crypto');
const request = require('supertest');
const jwt = require('jsonwebtoken');
const { sequelize, Sequelize, User, Exercise, WorkoutTemplate, WorkoutTemplateExercise } = require('../dist/models');
const app = require('../dist/app').default;
const initialMigration = require('../migrations/20260622000000-create-training-schema');
let schemaCreated = false;
let owner;
let other;
let exercise;
let ownerToken;
let otherToken;

if (
  sequelize.config.database !== 'powerup_routines_integration_test' ||
  sequelize.config.host !== connection.hostname ||
  Number(sequelize.config.port) !== Number(connection.port) ||
  sequelize.config.username !== 'powerup_routines_test'
) {
  throw new Error('Sequelize no apunta a la conexión explícita de integración.');
}
sequelize.options.schema = schema;

async function createTemplate() {
  const response = await request(app).post('/api/workout-templates')
    .set('Authorization', `Bearer ${ownerToken}`)
    .send({ nombre: 'Rutina de fuerza', tipo: 'Fuerza' }).expect(201);
  return response.body.workoutTemplate.id;
}

async function addExercise(workoutTemplateId) {
  const response = await request(app).post('/api/workout-template-exercises')
    .set('Authorization', `Bearer ${ownerToken}`)
    .send({ workoutTemplateId, exerciseId: exercise.id, orden: 1, repeticiones: 10, peso: 40 })
    .expect(201);
  return response.body.workoutTemplateExercise.id;
}

describe('Rutinas con Express, Sequelize y PostgreSQL reales', () => {
  beforeAll(async () => {
    const [destination] = await sequelize.query(`
      SELECT current_database() AS database, current_setting('search_path') AS search_path,
             current_setting('server_version_num')::integer AS version
    `);
    expect(destination).toEqual([{
      database: 'powerup_routines_integration_test', search_path: schema,
      version: expect.any(Number)
    }]);
    expect(destination[0].version).toBeGreaterThanOrEqual(170000);
    expect(destination[0].version).toBeLessThan(180000);
    await sequelize.query(`CREATE SCHEMA "${schema}"`);
    schemaCreated = true;
    expect((await sequelize.query('SELECT current_schema() AS schema'))[0]).toEqual([{ schema }]);
    await initialMigration.up(sequelize.getQueryInterface(), Sequelize);
  }, 30000);

  beforeEach(async () => {
    const suffix = randomUUID();
    owner = await User.create({ nombre: 'Dueño', email: `owner-${suffix}@example.com`, password: 'ClavePruebas123' });
    other = await User.create({ nombre: 'Otro', email: `other-${suffix}@example.com`, password: 'ClavePruebas123' });
    exercise = await Exercise.create({ nombre: 'Sentadilla', userId: owner.id });
    ownerToken = jwt.sign({ id: owner.id, email: owner.email }, process.env.JWT_SECRET);
    otherToken = jwt.sign({ id: other.id, email: other.email }, process.env.JWT_SECRET);
  });

  afterAll(async () => {
    try {
      if (schemaCreated) await sequelize.query(`DROP SCHEMA "${schema}" CASCADE`);
    } finally {
      await sequelize.close();
    }
  });

  test('crea la rutina, asocia un ejercicio y recupera ambos desde la API y PostgreSQL', async () => {
    const templateId = await createTemplate();
    const associationId = await addExercise(templateId);

    expect(await WorkoutTemplate.findByPk(templateId, { raw: true })).toMatchObject({
      id: templateId, userId: owner.id, nombre: 'Rutina de fuerza'
    });
    expect(await WorkoutTemplateExercise.findByPk(associationId, { raw: true })).toMatchObject({
      id: associationId, workoutTemplateId: templateId, exerciseId: exercise.id,
      orden: 1, repeticiones: 10, peso: 40
    });

    const template = await request(app).get(`/api/workout-templates/${templateId}`)
      .set('Authorization', `Bearer ${ownerToken}`).expect(200);
    expect(template.body.workoutTemplate).toMatchObject({ id: templateId, userId: owner.id });
    const associations = await request(app).get('/api/workout-template-exercises')
      .query({ workoutTemplateId: templateId })
      .set('Authorization', `Bearer ${ownerToken}`).expect(200);
    expect(associations.body.workoutTemplateExercises).toEqual([
      expect.objectContaining({ id: associationId, workoutTemplateId: templateId, exerciseId: exercise.id })
    ]);
  });

  test('modifica una asociación y el cambio persiste', async () => {
    const templateId = await createTemplate();
    const associationId = await addExercise(templateId);

    const response = await request(app).put(`/api/workout-template-exercises/${associationId}`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ repeticiones: 8, peso: 45 }).expect(200);
    expect(response.body.workoutTemplateExercise).toMatchObject({
      id: associationId, workoutTemplateId: templateId, exerciseId: exercise.id,
      repeticiones: 8, peso: 45
    });
    expect(await WorkoutTemplateExercise.findByPk(associationId, { raw: true })).toMatchObject({
      workoutTemplateId: templateId, exerciseId: exercise.id, repeticiones: 8, peso: 45
    });
  });

  test('otro usuario no puede modificar ni borrar la rutina o su asociación', async () => {
    const templateId = await createTemplate();
    const associationId = await addExercise(templateId);
    const originalTemplate = await WorkoutTemplate.findByPk(templateId, { raw: true });
    const originalAssociation = await WorkoutTemplateExercise.findByPk(associationId, { raw: true });

    await request(app).put(`/api/workout-templates/${templateId}`)
      .set('Authorization', `Bearer ${otherToken}`).send({ nombre: 'Rutina ajena' }).expect(404);
    await request(app).delete(`/api/workout-templates/${templateId}`)
      .set('Authorization', `Bearer ${otherToken}`).expect(404);
    await request(app).put(`/api/workout-template-exercises/${associationId}`)
      .set('Authorization', `Bearer ${otherToken}`).send({ repeticiones: 2 }).expect(404);
    await request(app).delete(`/api/workout-template-exercises/${associationId}`)
      .set('Authorization', `Bearer ${otherToken}`).expect(404);

    expect(await WorkoutTemplate.findByPk(templateId, { raw: true })).toEqual(originalTemplate);
    expect(await WorkoutTemplateExercise.findByPk(associationId, { raw: true })).toEqual(originalAssociation);
  });

  test('actualiza campos nullable, conserva los omitidos y persiste los cambios', async () => {
    const created = await request(app).post('/api/workout-templates')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        nombre: 'Rutina nullable', descripcion: 'Descripción inicial', tipo: 'Fuerza',
        grupoMuscularEtiqueta: 'Piernas', dificultad: 'principiante'
      }).expect(201);
    const templateId = created.body.workoutTemplate.id;

    const updated = await request(app).put(`/api/workout-templates/${templateId}`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ descripcion: null, tipo: '  Movilidad  ' }).expect(200);
    const expected = {
      id: templateId, nombre: 'Rutina nullable', descripcion: null, tipo: 'Movilidad',
      grupoMuscularEtiqueta: 'Piernas', dificultad: 'principiante'
    };
    expect(updated.body.workoutTemplate).toMatchObject(expected);
    expect(await WorkoutTemplate.findByPk(templateId, { raw: true })).toMatchObject(expected);

    const cleared = await request(app).put(`/api/workout-templates/${templateId}`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ tipo: null, grupoMuscularEtiqueta: null, dificultad: null }).expect(200);
    const clearedExpected = {
      ...expected, tipo: null, grupoMuscularEtiqueta: null, dificultad: null
    };
    expect(cleared.body.workoutTemplate).toMatchObject(clearedExpected);
    expect(await WorkoutTemplate.findByPk(templateId, { raw: true })).toMatchObject(clearedExpected);
  });
});
