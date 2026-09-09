process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'clave_jwt_exclusiva_para_tests';

const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../dist/app').default;

const token = jwt.sign(
  { id: 1, email: 'test@example.com' },
  process.env.JWT_SECRET
);

describe('API base', () => {
  test('GET /health responde ok', async () => {
    const response = await request(app).get('/health').expect(200);

    expect(response.body.status).toBe('ok');
    expect(response.body.message).toBe('Backend funcionando');
  });

  test('GET /api/health responde ok', async () => {
    const response = await request(app).get('/api/health').expect(200);

    expect(response.body.status).toBe('OK');
    expect(response.body.message).toBe('API funcionando correctamente');
  });

  test('ruta inexistente devuelve 404', async () => {
    const response = await request(app).get('/api/no-existe').expect(404);

    expect(response.body.error).toBe('Ruta no encontrada');
    expect(response.body.path).toBe('/api/no-existe');
  });

  test('ruta protegida sin token devuelve 401', async () => {
    const response = await request(app).get('/api/workouts').expect(401);

    expect(response.body.error).toBe('Token no proporcionado');
  });

  test('register invalido devuelve errores de validacion', async () => {
    const response = await request(app)
      .post('/api/auth/register')
      .send({
        nombre: '',
        email: 'email-invalido',
        password: '123'
      })
      .expect(400);

    expect(response.body.error).toBe('Datos invalidos');
    expect(Array.isArray(response.body.details)).toBe(true);
    expect(response.body.details.length).toBeGreaterThan(0);
  });

  test('login invalido devuelve errores de validacion', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'email-invalido',
        password: ''
      })
      .expect(400);

    expect(response.body.error).toBe('Datos invalidos');
    expect(Array.isArray(response.body.details)).toBe(true);
    expect(response.body.details.length).toBeGreaterThan(0);
  });

  test('id invalido en ruta protegida devuelve 400', async () => {
    const response = await request(app)
      .get('/api/workouts/abc')
      .set('Authorization', `Bearer ${token}`)
      .expect(400);

    expect(response.body.error).toBe('Datos invalidos');
  });

  test('training program invalido devuelve 400 antes de consultar la base', async () => {
    const response = await request(app)
      .post('/api/training-programs')
      .set('Authorization', `Bearer ${token}`)
      .send({ nombre: '' })
      .expect(400);

    expect(response.body.error).toBe('Datos invalidos');
  });

  test('program weeks exige trainingProgramId en query', async () => {
    const response = await request(app)
      .get('/api/program-weeks')
      .set('Authorization', `Bearer ${token}`)
      .expect(400);

    expect(response.body.error).toBe('Datos invalidos');
  });

  test('scheduled workout invalido devuelve 400 antes de consultar la base', async () => {
    const response = await request(app)
      .post('/api/scheduled-workouts')
      .set('Authorization', `Bearer ${token}`)
      .send({
        programWeekId: 1,
        workoutTemplateId: 1,
        nombre: 'Dia 1',
        orden: 1,
        diaSemana: 8
      })
      .expect(400);

    expect(response.body.error).toBe('Datos invalidos');
  });

  test('exercise invalido devuelve 400 antes de consultar la base', async () => {
    const response = await request(app)
      .post('/api/exercises')
      .set('Authorization', `Bearer ${token}`)
      .send({
        nombre: 'Sentadilla',
        dificultad: 'dificil',
        muscleGroupIds: ['piernas']
      })
      .expect(400);

    expect(response.body.error).toBe('Datos invalidos');
  });

  test('filtro de ejercicios exige muscleGroupId valido', async () => {
    const response = await request(app)
      .get('/api/exercises?muscleGroupId=abc')
      .set('Authorization', `Bearer ${token}`)
      .expect(400);

    expect(response.body.error).toBe('Datos invalidos');
    expect(response.body.details).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ field: 'muscleGroupId' })
      ])
    );
  });

  test('metrics sin token devuelve 401', async () => {
    const response = await request(app)
      .get('/api/metrics/summary')
      .expect(401);

    expect(response.body.error).toBe('Token no proporcionado');
  });

  test('metrics rechaza fechas invalidas', async () => {
    const response = await request(app)
      .get('/api/metrics/summary?from=fecha-invalida')
      .set('Authorization', `Bearer ${token}`)
      .expect(400);

    expect(response.body.error).toBe('Datos invalidos');
  });

  test('exercise progress exige exerciseId valido', async () => {
    const response = await request(app)
      .get('/api/metrics/exercise-progress?exerciseId=abc')
      .set('Authorization', `Bearer ${token}`)
      .expect(400);

    expect(response.body.error).toBe('Datos invalidos');
  });
});
