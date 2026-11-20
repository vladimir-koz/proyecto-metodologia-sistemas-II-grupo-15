process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'clave_jwt_exclusiva_para_tests';

const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../../dist/app').default;
const workoutService = require('../../dist/services/workout.service');

const token = jwt.sign(
  { id: 1, email: 'test@example.com' },
  process.env.JWT_SECRET
);

describe('Validación HTTP del límite de duración de running', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  test.each([
    ['crear', 'post', '/api/workouts', 'createWorkoutService'],
    ['actualizar', 'put', '/api/workouts/1', 'updateWorkoutService']
  ])('%s rechaza 2147483648 segundos antes de invocar el servicio', async (_accion, method, path, serviceMethod) => {
    const service = jest.spyOn(workoutService, serviceMethod)
      .mockRejectedValue(new Error('El servicio no debe ejecutarse para una duración inválida'));

    const response = await request(app)[method](path)
      .set('Authorization', `Bearer ${token}`)
      .send({
        nombre: 'Carrera libre',
        modalidad: 'running',
        distanciaKm: 5,
        duracionSegundos: 2147483648
      })
      .expect(400);

    expect(response.body).toEqual({
      error: 'Datos invalidos',
      details: [{
        field: 'duracionSegundos',
        message: 'duracionSegundos debe ser un entero entre 1 y 2147483647',
        value: 2147483648
      }]
    });
    expect(service).not.toHaveBeenCalled();
  });
});
