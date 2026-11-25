const { configureIntegrationDatabase } = require('./database');
const { connection, schema } = configureIntegrationDatabase(
  'PLANNING_TEST_DATABASE_URL', 'powerup_planning_integration_test', 'powerup_planning_test'
);

const { randomUUID } = require('node:crypto');
const request = require('supertest');
const jwt = require('jsonwebtoken');
const { sequelize, Sequelize, User, TrainingProgram, ProgramWeek, ScheduledWorkout, WorkoutTemplate } = require('../dist/models');
const app = require('../dist/app').default;
const initialMigration = require('../migrations/20260622000000-create-training-schema');
let schemaCreated = false;
let owner;
let other;
let ownerToken;
let otherToken;

if (
  sequelize.config.database !== 'powerup_planning_integration_test' ||
  sequelize.config.host !== connection.hostname ||
  Number(sequelize.config.port) !== Number(connection.port) ||
  sequelize.config.username !== 'powerup_planning_test'
) {
  throw new Error('Sequelize no apunta a la conexión explícita de integración.');
}
sequelize.options.schema = schema;

async function createPlan() {
  const template = await request(app).post('/api/workout-templates')
    .set('Authorization', `Bearer ${ownerToken}`)
    .send({ nombre: 'Plantilla de fuerza' }).expect(201);
  const program = await request(app).post('/api/training-programs')
    .set('Authorization', `Bearer ${ownerToken}`)
    .send({ nombre: 'Plan de fuerza' }).expect(201);
  const programId = program.body.trainingProgram.id;
  const week = await request(app).post('/api/program-weeks')
    .set('Authorization', `Bearer ${ownerToken}`)
    .send({ trainingProgramId: programId, numeroSemana: 1, nombre: 'Semana inicial' }).expect(201);
  const weekId = week.body.programWeek.id;
  const session = await request(app).post('/api/scheduled-workouts')
    .set('Authorization', `Bearer ${ownerToken}`)
    .send({ programWeekId: weekId, workoutTemplateId: template.body.workoutTemplate.id,
      nombre: 'Día de fuerza', orden: 1, diaSemana: 1 }).expect(201);
  return { programId, weekId, sessionId: session.body.scheduledWorkout.id,
    templateId: template.body.workoutTemplate.id };
}

describe('Planificación con Express, Sequelize y PostgreSQL reales', () => {
  beforeAll(async () => {
    const [destination] = await sequelize.query(`
      SELECT current_database() AS database, current_setting('search_path') AS search_path,
             current_setting('server_version_num')::integer AS version
    `);
    expect(destination).toEqual([{
      database: 'powerup_planning_integration_test', search_path: schema,
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

  test('crea programa, semana y sesión y comprueba las relaciones persistidas', async () => {
    const { programId, weekId, sessionId, templateId } = await createPlan();
    expect(await TrainingProgram.findByPk(programId, { raw: true })).toMatchObject({
      id: programId, userId: owner.id, nombre: 'Plan de fuerza'
    });
    expect(await ProgramWeek.findByPk(weekId, { raw: true })).toMatchObject({
      id: weekId, trainingProgramId: programId, numeroSemana: 1
    });
    expect(await ScheduledWorkout.findByPk(sessionId, { raw: true })).toMatchObject({
      id: sessionId, programWeekId: weekId, workoutTemplateId: templateId, orden: 1
    });
    expect(await WorkoutTemplate.findByPk(templateId, { raw: true })).toMatchObject({ userId: owner.id });

    const weeks = await request(app).get('/api/program-weeks').query({ trainingProgramId: programId })
      .set('Authorization', `Bearer ${ownerToken}`).expect(200);
    expect(weeks.body.programWeeks).toEqual([expect.objectContaining({ id: weekId, trainingProgramId: programId })]);
    const sessions = await request(app).get('/api/scheduled-workouts').query({ programWeekId: weekId })
      .set('Authorization', `Bearer ${ownerToken}`).expect(200);
    expect(sessions.body.scheduledWorkouts).toEqual([
      expect.objectContaining({ id: sessionId, programWeekId: weekId, workoutTemplateId: templateId })
    ]);
  });

  test('modifica semana y sesión y comprueba la persistencia', async () => {
    const { programId, weekId, sessionId, templateId } = await createPlan();
    await request(app).put(`/api/program-weeks/${weekId}`)
      .set('Authorization', `Bearer ${ownerToken}`).send({ nombre: 'Semana revisada', esDescarga: true })
      .expect(200);
    await request(app).put(`/api/scheduled-workouts/${sessionId}`)
      .set('Authorization', `Bearer ${ownerToken}`).send({ nombre: 'Día revisado', diaSemana: 3 })
      .expect(200);
    expect(await ProgramWeek.findByPk(weekId, { raw: true })).toMatchObject({
      trainingProgramId: programId, nombre: 'Semana revisada', esDescarga: true
    });
    expect(await ScheduledWorkout.findByPk(sessionId, { raw: true })).toMatchObject({
      programWeekId: weekId, workoutTemplateId: templateId, nombre: 'Día revisado', diaSemana: 3
    });
  });

  test('otro usuario no puede modificar ni borrar la planificación ajena', async () => {
    const { programId, weekId, sessionId } = await createPlan();
    const originalProgram = await TrainingProgram.findByPk(programId, { raw: true });
    const originalWeek = await ProgramWeek.findByPk(weekId, { raw: true });
    const originalSession = await ScheduledWorkout.findByPk(sessionId, { raw: true });

    await request(app).put(`/api/training-programs/${programId}`)
      .set('Authorization', `Bearer ${otherToken}`).send({ nombre: 'Plan ajeno' }).expect(404);
    await request(app).delete(`/api/training-programs/${programId}`)
      .set('Authorization', `Bearer ${otherToken}`).expect(404);
    await request(app).put(`/api/program-weeks/${weekId}`)
      .set('Authorization', `Bearer ${otherToken}`).send({ nombre: 'Semana ajena' }).expect(404);
    await request(app).delete(`/api/program-weeks/${weekId}`)
      .set('Authorization', `Bearer ${otherToken}`).expect(404);
    await request(app).put(`/api/scheduled-workouts/${sessionId}`)
      .set('Authorization', `Bearer ${otherToken}`).send({ nombre: 'Sesión ajena' }).expect(404);
    await request(app).delete(`/api/scheduled-workouts/${sessionId}`)
      .set('Authorization', `Bearer ${otherToken}`).expect(404);

    expect(await TrainingProgram.findByPk(programId, { raw: true })).toEqual(originalProgram);
    expect(await ProgramWeek.findByPk(weekId, { raw: true })).toEqual(originalWeek);
    expect(await ScheduledWorkout.findByPk(sessionId, { raw: true })).toEqual(originalSession);
  });
});
