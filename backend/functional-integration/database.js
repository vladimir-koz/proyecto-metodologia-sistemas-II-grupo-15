const { randomUUID } = require('node:crypto');

function configureIntegrationDatabase(variable, database, username) {
  const testingUrl = process.env[variable];
  const connection = testingUrl ? new URL(testingUrl) : null;
  if (
    !connection ||
    !['postgres:', 'postgresql:'].includes(connection.protocol) ||
    !['127.0.0.1', 'localhost', '[::1]'].includes(connection.hostname) ||
    !connection.port ||
    connection.pathname !== `/${database}` ||
    connection.username !== username || !connection.password ||
    connection.search || connection.hash
  ) {
    throw new Error(
      `${variable} debe indicar PostgreSQL local descartable, puerto explícito, usuario ${username} y base ${database}, sin parámetros ni fragmentos.`
    );
  }

  const schema = `integration_test_${randomUUID().replace(/-/g, '')}`;
  // Configurar antes de importar la aplicación: nunca cargar el .env del proyecto.
  process.env.NODE_ENV = 'test';
  process.env.DOTENV_CONFIG_PATH = '/dev/null';
  process.env.DATABASE_URL = testingUrl;
  process.env.DB_HOST = connection.hostname;
  process.env.DB_PORT = connection.port;
  process.env.DB_USER = decodeURIComponent(connection.username);
  process.env.DB_PASSWORD = decodeURIComponent(connection.password);
  process.env.DB_NAME = database.replace(/_test$/, '');
  process.env.DB_SSL = 'false';
  process.env.PGSSLMODE = 'disable';
  // pg aplica este search_path a todas las conexiones del pool, sin incluir public.
  process.env.PGOPTIONS = `-c search_path=${schema}`;
  process.env.JWT_SECRET = 'clave_jwt_exclusiva_para_integracion';

  return { connection, schema };
}

module.exports = { configureIntegrationDatabase };
