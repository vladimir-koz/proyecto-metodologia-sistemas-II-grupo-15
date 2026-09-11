'use strict';

const bcrypt = require('bcryptjs');
const { QueryTypes } = require('sequelize');

const DEMO_EMAIL = 'demo@powerup.com';
const DEMO_PASSWORD = 'Demo1234!';
const DEMO_USER_NAME = 'Usuario Demo';
const PROGRAM_NAME = 'Hipertrofia base 4 semanas';
const WORKOUT_PREFIX = 'Demo - ';

const weekLoads = [
  {
    sentadilla: 70,
    pesoMuerto: 80,
    pressBanca: 55,
    remo: 40,
    pressMilitar: 30,
    rpe: 7.5,
    rir: 3
  },
  {
    sentadilla: 75,
    pesoMuerto: 85,
    pressBanca: 57.5,
    remo: 42.5,
    pressMilitar: 32.5,
    rpe: 8,
    rir: 2
  },
  {
    sentadilla: 80,
    pesoMuerto: 90,
    pressBanca: 60,
    remo: 45,
    pressMilitar: 35,
    rpe: 9,
    rir: 1
  },
  {
    sentadilla: 65,
    pesoMuerto: 72.5,
    pressBanca: 50,
    remo: 35,
    pressMilitar: 27.5,
    rpe: 6.5,
    rir: 3
  }
];

function getCurrentMondayUtc() {
  const now = new Date();
  const day = now.getUTCDay() || 7;

  return new Date(
    Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate() - day + 1,
      18,
      0,
      0
    )
  );
}

function getWorkoutTimestamp(weekIndex, dayOffset) {
  const monday = getCurrentMondayUtc();
  monday.setUTCDate(monday.getUTCDate() + (weekIndex - 3) * 7 + dayOffset);
  return monday;
}

function createThreeSets(exerciseName, repeticiones, peso, rir, rpe) {
  return [
    { exerciseName, repeticiones, peso, rir, rpe },
    {
      exerciseName,
      repeticiones: Math.max(1, repeticiones - 1),
      peso,
      rir: Math.max(0, rir - 1),
      rpe: Math.min(10, rpe + 0.5)
    },
    { exerciseName, repeticiones, peso, rir, rpe }
  ];
}

function createWeekWorkouts(weekIndex) {
  const load = weekLoads[weekIndex];
  const weekNumber = weekIndex + 1;

  return [
    {
      nombre: `${WORKOUT_PREFIX}Semana ${weekNumber} - Full body`,
      timestamp: getWorkoutTimestamp(weekIndex, 0),
      weekNumber,
      scheduledOrder: 1,
      grupoMuscularEtiqueta: 'Cuerpo completo',
      sets: [
        ...createThreeSets('Sentadilla', 10, load.sentadilla, load.rir, load.rpe),
        ...createThreeSets('Flexiones', 12, 0, load.rir, load.rpe),
        ...createThreeSets('Remo con barra', 10, load.remo, load.rir, load.rpe),
        ...createThreeSets('Plancha', 1, 0, load.rir, load.rpe)
      ]
    },
    {
      nombre: `${WORKOUT_PREFIX}Semana ${weekNumber} - Tren superior`,
      timestamp: getWorkoutTimestamp(weekIndex, 2),
      weekNumber,
      scheduledOrder: 2,
      grupoMuscularEtiqueta: 'Tren superior',
      sets: [
        ...createThreeSets('Press de banca', 8, load.pressBanca, load.rir, load.rpe),
        ...createThreeSets('Remo con barra', 8, load.remo, load.rir, load.rpe),
        ...createThreeSets('Press militar', 10, load.pressMilitar, load.rir, load.rpe),
        ...createThreeSets('Dominadas', 8, 0, load.rir, load.rpe)
      ]
    },
    {
      nombre: `${WORKOUT_PREFIX}Semana ${weekNumber} - Piernas`,
      timestamp: getWorkoutTimestamp(weekIndex, 4),
      weekNumber,
      scheduledOrder: 3,
      grupoMuscularEtiqueta: 'Piernas',
      sets: [
        ...createThreeSets('Sentadilla', 10, load.sentadilla, load.rir, load.rpe),
        ...createThreeSets('Peso muerto', 8, load.pesoMuerto, load.rir, load.rpe),
        ...createThreeSets('Zancadas', 12, 20 + weekIndex * 2.5, load.rir, load.rpe),
        ...createThreeSets('Plancha', 1, 0, load.rir, load.rpe)
      ]
    }
  ];
}

const demoWorkouts = Array.from({ length: 4 }, (_, weekIndex) =>
  createWeekWorkouts(weekIndex)
).flat();

async function upsertDemoUser(queryInterface, transaction) {
  const password = await bcrypt.hash(DEMO_PASSWORD, 10);

  await queryInterface.sequelize.query(
    `
      INSERT INTO "users" (
        "nombre",
        "email",
        "password",
        "createdAt",
        "updatedAt"
      )
      VALUES (
        :nombre,
        :email,
        :password,
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
      )
      ON CONFLICT ("email")
      DO UPDATE SET
        "nombre" = EXCLUDED."nombre",
        "password" = EXCLUDED."password",
        "updatedAt" = CURRENT_TIMESTAMP;
    `,
    {
      replacements: {
        nombre: DEMO_USER_NAME,
        email: DEMO_EMAIL,
        password
      },
      transaction
    }
  );

  const [user] = await queryInterface.sequelize.query(
    `
      SELECT "id"
      FROM "users"
      WHERE "email" = :email
      LIMIT 1;
    `,
    {
      replacements: { email: DEMO_EMAIL },
      type: QueryTypes.SELECT,
      transaction
    }
  );

  return user.id;
}

async function getExerciseIds(queryInterface, transaction) {
  const rows = await queryInterface.sequelize.query(
    `
      SELECT "id", "nombre"
      FROM "exercises"
      WHERE "userId" IS NULL;
    `,
    {
      type: QueryTypes.SELECT,
      transaction
    }
  );

  return new Map(rows.map((exercise) => [exercise.nombre, exercise.id]));
}

async function getScheduledWorkout(queryInterface, weekNumber, scheduledOrder, transaction) {
  const [scheduledWorkout] = await queryInterface.sequelize.query(
    `
      SELECT
        sw."id",
        sw."workoutTemplateId"
      FROM "scheduled_workouts" sw
      INNER JOIN "program_weeks" pw
        ON pw."id" = sw."programWeekId"
      INNER JOIN "training_programs" tp
        ON tp."id" = pw."trainingProgramId"
      WHERE tp."nombre" = :programName
        AND tp."userId" IS NULL
        AND pw."numeroSemana" = :weekNumber
        AND sw."orden" = :scheduledOrder
      LIMIT 1;
    `,
    {
      replacements: {
        programName: PROGRAM_NAME,
        weekNumber,
        scheduledOrder
      },
      type: QueryTypes.SELECT,
      transaction
    }
  );

  if (!scheduledWorkout) {
    throw new Error(
      `No se encontro la sesion global para semana ${weekNumber}, orden ${scheduledOrder}`
    );
  }

  return scheduledWorkout;
}

async function insertDemoWorkout(
  queryInterface,
  workout,
  userId,
  exerciseIds,
  transaction
) {
  const scheduledWorkout = await getScheduledWorkout(
    queryInterface,
    workout.weekNumber,
    workout.scheduledOrder,
    transaction
  );

  const [insertedRows] = await queryInterface.sequelize.query(
    `
      INSERT INTO "workouts" (
        "timestamp",
        "nombre",
        "userId",
        "grupoMuscularEtiqueta",
        "workoutTemplateId",
        "scheduledWorkoutId",
        "createdAt",
        "updatedAt"
      )
      VALUES (
        :timestamp,
        :nombre,
        :userId,
        :grupoMuscularEtiqueta,
        :workoutTemplateId,
        :scheduledWorkoutId,
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
      )
      RETURNING "id";
    `,
    {
      replacements: {
        timestamp: workout.timestamp,
        nombre: workout.nombre,
        userId,
        grupoMuscularEtiqueta: workout.grupoMuscularEtiqueta,
        workoutTemplateId: scheduledWorkout.workoutTemplateId,
        scheduledWorkoutId: scheduledWorkout.id
      },
      transaction
    }
  );

  const workoutId = insertedRows[0].id;
  const sets = workout.sets.map((set) => {
    const exerciseId = exerciseIds.get(set.exerciseName);

    if (!exerciseId) {
      throw new Error(`No se encontro el ejercicio global ${set.exerciseName}`);
    }

    return {
      repeticiones: set.repeticiones,
      peso: set.peso,
      rir: set.rir,
      rpe: set.rpe,
      exerciseId,
      workoutId,
      createdAt: workout.timestamp,
      updatedAt: workout.timestamp
    };
  });

  await queryInterface.bulkInsert('workout_sets', sets, { transaction });
}

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      const userId = await upsertDemoUser(queryInterface, transaction);
      const exerciseIds = await getExerciseIds(queryInterface, transaction);

      await queryInterface.sequelize.query(
        `
          DELETE FROM "workouts"
          WHERE "userId" = :userId
            AND "nombre" LIKE :namePrefix;
        `,
        {
          replacements: {
            userId,
            namePrefix: `${WORKOUT_PREFIX}%`
          },
          transaction
        }
      );

      for (const workout of demoWorkouts) {
        await insertDemoWorkout(
          queryInterface,
          workout,
          userId,
          exerciseIds,
          transaction
        );
      }

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query(
      `
        DELETE FROM "users"
        WHERE "email" = :email;
      `,
      {
        replacements: { email: DEMO_EMAIL }
      }
    );
  }
};
