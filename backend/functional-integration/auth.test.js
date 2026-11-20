const { randomUUID } = require('node:crypto');

const testingUrl = process.env.AUTH_TEST_DATABASE_URL;
const connection = testingUrl ? new URL(testingUrl) : null;
if (
  !connection ||
  !['postgres:', 'postgresql:'].includes(connection.protocol) ||
  !['127.0.0.1', 'localhost', '[::1]'].includes(connection.hostname) ||
  !connection.port ||
  connection.pathname !== '/powerup_auth_integration_test' ||
  connection.username !== 'powerup_auth_test' || !connection.password ||
  connection.search || connection.hash
) {
  throw new Error(
    'AUTH_TEST_DATABASE_URL debe indicar PostgreSQL local descartable, puerto explícito, usuario powerup_auth_test y base powerup_auth_integration_test, sin parámetros ni fragmentos.'
  );
}

const schema = `auth_test_${randomUUID().replace(/-/g, '')}`;
// Configurar antes de importar la aplicación: nunca cargar el .env del proyecto.
process.env.NODE_ENV = 'test';
process.env.DOTENV_CONFIG_PATH = '/dev/null';
process.env.DATABASE_URL = testingUrl;
process.env.DB_HOST = connection.hostname;
process.env.DB_PORT = connection.port;
process.env.DB_USER = decodeURIComponent(connection.username);
process.env.DB_PASSWORD = decodeURIComponent(connection.password);
process.env.DB_NAME = 'powerup_auth_integration';
process.env.DB_SSL = 'false';
process.env.PGSSLMODE = 'disable';
// pg aplica este search_path a todas las conexiones del pool, sin incluir public.
process.env.PGOPTIONS = `-c search_path=${schema}`;
process.env.JWT_SECRET = 'clave_jwt_exclusiva_para_integracion';

const request = require('supertest');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { sequelize, Sequelize, User } = require('../dist/models');
const app = require('../dist/app').default;
const initialMigration = require('../migrations/20260622000000-create-training-schema');
let schemaCreated = false;

// Comprobar el destino calculado por Sequelize antes de abrir una conexión.
if (
  sequelize.config.database !== 'powerup_auth_integration_test' ||
  sequelize.config.host !== connection.hostname ||
  Number(sequelize.config.port) !== Number(connection.port) ||
  sequelize.config.username !== 'powerup_auth_test'
) {
  throw new Error('Sequelize no apunta a la conexión explícita de integración.');
}

describe('Autenticación con Express, Sequelize y PostgreSQL reales', () => {
  beforeAll(async () => {
    const [destination] = await sequelize.query(`
      SELECT current_database() AS database, current_setting('search_path') AS search_path
    `);
    expect(destination).toEqual([{
      database: 'powerup_auth_integration_test', search_path: schema
    }]);

    // Sin IF NOT EXISTS: si colisiona con un esquema preexistente, no se usa ni se borra.
    await sequelize.query(`CREATE SCHEMA "${schema}"`);
    schemaCreated = true;
    const [activeSchema] = await sequelize.query('SELECT current_schema() AS schema');
    expect(activeSchema).toEqual([{ schema }]);

    const queryInterface = sequelize.getQueryInterface();
    // Autenticación solo necesita el esquema inicial, donde se crea users.
    await initialMigration.up(queryInterface, Sequelize);
  }, 30000);

  afterAll(async () => {
    try {
      if (schemaCreated) {
        await sequelize.query(`DROP SCHEMA "${schema}" CASCADE`);
      }
    } finally {
      await sequelize.close();
    }
  });

  test('registro exitoso persiste el usuario con hash y no expone la contraseña', async () => {
    const data = { nombre: 'Ana Registro', email: 'registro@example.com', password: 'ClaveRegistro123' };
    const response = await request(app).post('/api/auth/register').send(data).expect(201);

    expect(response.body.message).toBe('Usuario registrado exitosamente');
    expect(response.body.user).toMatchObject({ id: expect.any(Number), nombre: data.nombre, email: data.email });
    expect(response.body.user).not.toHaveProperty('password');
    expect(jwt.verify(response.body.token, process.env.JWT_SECRET)).toMatchObject({
      id: response.body.user.id, email: data.email
    });

    const stored = await User.findOne({ where: { email: data.email }, raw: true });
    expect(stored).toMatchObject({ id: response.body.user.id, nombre: data.nombre, email: data.email });
    expect(stored.password).not.toBe(data.password);
    expect(await bcrypt.compare(data.password, stored.password)).toBe(true);
    expect(await User.count({ where: { email: data.email } })).toBe(1);
  });

  test('login exitoso entrega un JWT que permite consultar el perfil del usuario', async () => {
    const user = await User.create({ nombre: 'Luis Login', email: 'login@example.com', password: 'ClaveLogin123' });
    const response = await request(app).post('/api/auth/login')
      .send({ email: user.email, password: 'ClaveLogin123' }).expect(200);

    expect(response.body.message).toBe('Login exitoso');
    expect(response.body.user).toMatchObject({ id: user.id, nombre: user.nombre, email: user.email });
    expect(response.body.user).not.toHaveProperty('password');
    expect(jwt.verify(response.body.token, process.env.JWT_SECRET)).toMatchObject({ id: user.id, email: user.email });

    const profile = await request(app).get('/api/auth/perfil')
      .set('Authorization', `Bearer ${response.body.token}`).expect(200);
    expect(profile.body.user).toMatchObject({ id: user.id, nombre: user.nombre, email: user.email });
    expect(profile.body.user).not.toHaveProperty('password');
  });

  test('login con contraseña incorrecta devuelve 401 sin entregar un token', async () => {
    const user = await User.create({ nombre: 'Eva Login', email: 'incorrecta@example.com', password: 'ClaveCorrecta123' });
    const response = await request(app).post('/api/auth/login')
      .send({ email: user.email, password: 'ClaveIncorrecta123' }).expect(401);

    expect(response.body).toEqual({ error: 'Credenciales invalidas' });
  });

  test('registro con email duplicado devuelve 400 y conserva un único usuario sin alterarlo', async () => {
    const user = await User.create({ nombre: 'Juan Original', email: 'duplicado@example.com', password: 'ClaveOriginal123' });
    const original = await User.findByPk(user.id, { raw: true });
    const response = await request(app).post('/api/auth/register').send({
      nombre: 'Otro Nombre', email: user.email, password: 'OtraClave123'
    }).expect(400);

    expect(response.body).toEqual({ error: 'El email ya esta registrado' });
    expect(await User.count({ where: { email: user.email } })).toBe(1);
    expect(await User.findByPk(user.id, { raw: true })).toEqual(original);
  });
});
