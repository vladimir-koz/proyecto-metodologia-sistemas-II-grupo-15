const { Sequelize } = require('sequelize');
const migration = require('../migrations/20261114000000-add-running-to-workouts');
const constraintsMigration = require('../migrations/20261119000000-add-workout-running-constraints');

const testingUrl = process.env.TEST_DATABASE_URL;
const testingConnection = testingUrl ? new URL(testingUrl) : null;

if (
  !testingConnection ||
  !['postgres:', 'postgresql:'].includes(testingConnection.protocol) ||
  !['localhost', '127.0.0.1', '[::1]'].includes(testingConnection.hostname) ||
  testingConnection.pathname !== '/powerup_running_migration_test' ||
  testingConnection.search || testingConnection.hash
) {
  throw new Error(
    'TEST_DATABASE_URL debe ser una URL PostgreSQL local, sin parámetros ni fragmentos, a la base descartable powerup_running_migration_test.'
  );
}

const sequelize = new Sequelize(testingUrl, {
  logging: false,
  dialectOptions: { options: '-c search_path=public' }
});
const queryInterface = sequelize.getQueryInterface();
let tableCreated = false;

describe('Migraciones de running en PostgreSQL', () => {
  beforeAll(async () => {
    await sequelize.authenticate();

    const [existingObjects] = await sequelize.query(`
      SELECT c.relname
      FROM pg_catalog.pg_class AS c
      JOIN pg_catalog.pg_namespace AS n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public'
        AND c.relname IN ('workouts', 'workouts_pkey', 'migration_distance_dependency')
    `);
    if (existingObjects.length > 0) {
      throw new Error(
        'La base ya contiene objetos de la prueba. No se modificarán ni eliminarán objetos preexistentes.'
      );
    }
  });

  beforeEach(async () => {
    tableCreated = false;
    // Solo hace falta la tabla afectada: no se carga la API ni los modelos.
    await sequelize.query(`
      CREATE TABLE workouts (
        id INTEGER PRIMARY KEY,
        nombre VARCHAR(120) NOT NULL,
        "workoutTemplateId" INTEGER,
        "scheduledWorkoutId" INTEGER
      )
    `);
    tableCreated = true;
    await sequelize.query("INSERT INTO workouts (id, nombre) VALUES (1, 'Fuerza histórica')");
  });

  afterEach(async () => {
    if (tableCreated) {
      await sequelize.query('DROP TABLE workouts');
      tableCreated = false;
    }
  });

  afterAll(async () => {
    await sequelize.close();
  });

  test('up conserva los registros y agrega los campos originales; down restaura el esquema anterior', async () => {
    const originalColumns = await queryInterface.describeTable('workouts');

    await migration.up(queryInterface, Sequelize);

    const [columns] = await sequelize.query(`
      SELECT column_name, data_type, is_nullable, character_maximum_length
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'workouts'
        AND column_name IN ('modalidad', 'distanciaKm', 'duracionSegundos')
      ORDER BY ordinal_position
    `);
    expect(columns).toEqual([
      {
        column_name: 'modalidad',
        data_type: 'character varying',
        is_nullable: 'NO',
        character_maximum_length: 20
      },
      {
        column_name: 'distanciaKm',
        data_type: 'double precision',
        is_nullable: 'YES',
        character_maximum_length: null
      },
      {
        column_name: 'duracionSegundos',
        data_type: 'integer',
        is_nullable: 'YES',
        character_maximum_length: null
      }
    ]);

    // El valor predeterminado también debe funcionar en altas posteriores.
    await sequelize.query("INSERT INTO workouts (id, nombre) VALUES (2, 'Fuerza nueva')");
    const [workouts] = await sequelize.query('SELECT * FROM workouts ORDER BY id');
    expect(workouts).toEqual([
      { id: 1, nombre: 'Fuerza histórica', workoutTemplateId: null, scheduledWorkoutId: null, modalidad: 'fuerza', distanciaKm: null, duracionSegundos: null },
      { id: 2, nombre: 'Fuerza nueva', workoutTemplateId: null, scheduledWorkoutId: null, modalidad: 'fuerza', distanciaKm: null, duracionSegundos: null }
    ]);

    await migration.down(queryInterface);

    expect(await queryInterface.describeTable('workouts')).toEqual(originalColumns);
    const [restored] = await sequelize.query('SELECT * FROM workouts ORDER BY id');
    expect(restored).toEqual([
      { id: 1, nombre: 'Fuerza histórica', workoutTemplateId: null, scheduledWorkoutId: null },
      { id: 2, nombre: 'Fuerza nueva', workoutTemplateId: null, scheduledWorkoutId: null }
    ]);
  });

  test('si falla la tercera columna de up, revierte las dos anteriores y conserva el estado inicial', async () => {
    // La colisión SQL sucede después de intentar agregar modalidad y distancia.
    await sequelize.query('ALTER TABLE workouts ADD COLUMN "duracionSegundos" INTEGER');
    await sequelize.query('UPDATE workouts SET "duracionSegundos" = 60 WHERE id = 1');
    const originalColumns = await queryInterface.describeTable('workouts');
    const [originalRows] = await sequelize.query('SELECT * FROM workouts ORDER BY id');

    await expect(migration.up(queryInterface, Sequelize)).rejects.toMatchObject({
      parent: { code: '42701' } // PostgreSQL: columna duplicada.
    });

    expect(await queryInterface.describeTable('workouts')).toEqual(originalColumns);
    const [rowsAfterFailure] = await sequelize.query('SELECT * FROM workouts ORDER BY id');
    expect(rowsAfterFailure).toEqual(originalRows);
  });

  test('si falla la segunda eliminación de down, restaura la primera columna y los datos de running', async () => {
    await migration.up(queryInterface, Sequelize);
    await sequelize.query(`
      INSERT INTO workouts (id, nombre, modalidad, "distanciaKm", "duracionSegundos")
      VALUES (2, 'Carrera', 'running', 5, 1800)
    `);
    // Esta dependencia real bloquea eliminar distancia, después de duración.
    await sequelize.query('CREATE VIEW migration_distance_dependency AS SELECT "distanciaKm" FROM workouts');

    try {
      const originalColumns = await queryInterface.describeTable('workouts');
      const [originalRows] = await sequelize.query('SELECT * FROM workouts ORDER BY id');

      await expect(migration.down(queryInterface)).rejects.toMatchObject({
        parent: { code: '2BP01' } // PostgreSQL: existen objetos dependientes.
      });

      expect(await queryInterface.describeTable('workouts')).toEqual(originalColumns);
      const [rowsAfterFailure] = await sequelize.query('SELECT * FROM workouts ORDER BY id');
      expect(rowsAfterFailure).toEqual(originalRows);
    } finally {
      await sequelize.query('DROP VIEW migration_distance_dependency');
    }
  });

  describe('Restricciones SQL de fuerza y running', () => {
    test('conserva históricos, acepta datos válidos y down retira solo las restricciones', async () => {
      await migration.up(queryInterface, Sequelize);
      await sequelize.query(`
        UPDATE workouts SET "workoutTemplateId" = 10, "scheduledWorkoutId" = 20 WHERE id = 1
      `);
      await sequelize.query(`
        INSERT INTO workouts (id, nombre, modalidad, "distanciaKm", "duracionSegundos")
        VALUES (2, 'Running histórico', 'running', 5, 1800)
      `);
      const [historicalRows] = await sequelize.query('SELECT * FROM workouts ORDER BY id');

      await constraintsMigration.up(queryInterface);

      const [preservedRows] = await sequelize.query('SELECT * FROM workouts ORDER BY id');
      expect(preservedRows).toEqual(historicalRows);
      const [constraints] = await sequelize.query(`
        SELECT conname, convalidated FROM pg_catalog.pg_constraint
        WHERE conrelid = 'public.workouts'::regclass AND contype = 'c'
        ORDER BY conname
      `);
      expect(constraints).toEqual([
        { conname: 'workouts_modalidad_check', convalidated: true },
        { conname: 'workouts_modalidad_datos_check', convalidated: true }
      ]);

      await sequelize.query(`
        INSERT INTO workouts (id, nombre, modalidad, "distanciaKm", "duracionSegundos")
        VALUES (3, 'Fuerza válida', 'fuerza', NULL, NULL),
               (4, 'Running válido', 'running', 2.5, 900)
      `);
      const [newRows] = await sequelize.query(`
        SELECT id, modalidad, "distanciaKm", "duracionSegundos"
        FROM workouts WHERE id IN (3, 4) ORDER BY id
      `);
      expect(newRows).toEqual([
        { id: 3, modalidad: 'fuerza', distanciaKm: null, duracionSegundos: null },
        { id: 4, modalidad: 'running', distanciaKm: 2.5, duracionSegundos: 900 }
      ]);
      const columnsBeforeDown = await queryInterface.describeTable('workouts');
      const [rowsBeforeDown] = await sequelize.query('SELECT * FROM workouts ORDER BY id');

      await constraintsMigration.down(queryInterface);

      expect(await queryInterface.describeTable('workouts')).toEqual(columnsBeforeDown);
      const [rowsAfterDown] = await sequelize.query('SELECT * FROM workouts ORDER BY id');
      expect(rowsAfterDown).toEqual(rowsBeforeDown);
      const [remainingConstraints] = await sequelize.query(`
        SELECT conname FROM pg_catalog.pg_constraint
        WHERE conrelid = 'public.workouts'::regclass AND contype = 'c'
      `);
      expect(remainingConstraints).toEqual([]);
    });

    test.each([
      ['modalidad desconocida', 'ciclismo', null, null, null, null],
      ['distancia en fuerza', 'fuerza', 5, null, null, null],
      ['duración en fuerza', 'fuerza', null, 1800, null, null],
      ['running sin distancia', 'running', null, 1800, null, null],
      ['running sin duración', 'running', 5, null, null, null],
      ['distancia cero', 'running', 0, 1800, null, null],
      ['distancia negativa', 'running', -5, 1800, null, null],
      ['distancia infinita', 'running', 'Infinity', 1800, null, null],
      ['distancia menos infinita', 'running', '-Infinity', 1800, null, null],
      ['distancia NaN', 'running', 'NaN', 1800, null, null],
      ['duración cero', 'running', 5, 0, null, null],
      ['duración negativa', 'running', 5, -1800, null, null],
      ['running con rutina', 'running', 5, 1800, 10, null],
      ['running con sesión programada', 'running', 5, 1800, null, 20]
    ])(
      'rechaza la inserción por CHECK: %s, sin modificar registros',
      async (_case, modalidad, distancia, duracion, rutina, sesion) => {
        await migration.up(queryInterface, Sequelize);
        await constraintsMigration.up(queryInterface);
        const [originalRows] = await sequelize.query('SELECT * FROM workouts ORDER BY id');

        await expect(sequelize.query(`
          INSERT INTO workouts (
            id, nombre, modalidad, "distanciaKm", "duracionSegundos",
            "workoutTemplateId", "scheduledWorkoutId"
          ) VALUES (2, 'No guardar', :modalidad, :distancia, :duracion, :rutina, :sesion)
        `, {
          replacements: { modalidad, distancia, duracion, rutina, sesion }
        })).rejects.toMatchObject({
          parent: { code: '23514' } // PostgreSQL: violación de CHECK, no de tipo o FK.
        });

        const [rowsAfterFailure] = await sequelize.query('SELECT * FROM workouts ORDER BY id');
        expect(rowsAfterFailure).toEqual(originalRows);
      }
    );

    test('rechaza una actualización inválida de running y conserva el registro completo', async () => {
      await migration.up(queryInterface, Sequelize);
      await constraintsMigration.up(queryInterface);
      await sequelize.query(`
        INSERT INTO workouts (id, nombre, modalidad, "distanciaKm", "duracionSegundos")
        VALUES (2, 'Carrera válida', 'running', 5, 1800)
      `);
      const [originalRows] = await sequelize.query('SELECT * FROM workouts ORDER BY id');

      await expect(sequelize.query(`
        UPDATE workouts SET nombre = 'No guardar', "duracionSegundos" = 0 WHERE id = 2
      `)).rejects.toMatchObject({
        parent: { code: '23514', constraint: 'workouts_modalidad_datos_check' }
      });

      const [rowsAfterFailure] = await sequelize.query('SELECT * FROM workouts ORDER BY id');
      expect(rowsAfterFailure).toEqual(originalRows);
    });

    test('datos incompatibles revierten ambas restricciones y permiten reintentar tras corregirlos', async () => {
      await migration.up(queryInterface, Sequelize);
      await sequelize.query(`
        INSERT INTO workouts (id, nombre, modalidad, "distanciaKm", "duracionSegundos")
        VALUES (2, 'Carrera incompatible', 'running', -5, 1800)
      `);
      const originalColumns = await queryInterface.describeTable('workouts');
      const [originalRows] = await sequelize.query('SELECT * FROM workouts ORDER BY id');

      // La modalidad es válida: el primer CHECK se agrega y el segundo falla.
      await expect(constraintsMigration.up(queryInterface)).rejects.toMatchObject({
        parent: { code: '23514', constraint: 'workouts_modalidad_datos_check' }
      });

      const [remainingConstraints] = await sequelize.query(`
        SELECT conname FROM pg_catalog.pg_constraint
        WHERE conrelid = 'public.workouts'::regclass AND contype = 'c'
      `);
      expect(remainingConstraints).toEqual([]);
      expect(await queryInterface.describeTable('workouts')).toEqual(originalColumns);
      const [rowsAfterFailure] = await sequelize.query('SELECT * FROM workouts ORDER BY id');
      expect(rowsAfterFailure).toEqual(originalRows);

      // Se corrige únicamente el dato ficticio de esta prueba; la migración no lo hace.
      await sequelize.query('UPDATE workouts SET "distanciaKm" = 5 WHERE id = 2');
      await constraintsMigration.up(queryInterface);

      const [constraints] = await sequelize.query(`
        SELECT conname, convalidated FROM pg_catalog.pg_constraint
        WHERE conrelid = 'public.workouts'::regclass AND contype = 'c'
        ORDER BY conname
      `);
      expect(constraints).toEqual([
        { conname: 'workouts_modalidad_check', convalidated: true },
        { conname: 'workouts_modalidad_datos_check', convalidated: true }
      ]);
      const [correctedRow] = await sequelize.query('SELECT * FROM workouts WHERE id = 2');
      expect(correctedRow).toEqual([{ ...originalRows[1], distanciaKm: 5 }]);
    });
  });
});
