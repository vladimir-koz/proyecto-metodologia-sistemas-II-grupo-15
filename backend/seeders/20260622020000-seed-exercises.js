'use strict';

const exercises = [
  {
    nombre: 'Press de banca',
    descripcion: 'Ejercicio compuesto para pecho realizado en banco plano.',
    dificultad: 'intermedio',
    muscleGroups: ['Pecho', 'Triceps', 'Hombros']
  },
  {
    nombre: 'Flexiones',
    descripcion: 'Ejercicio con peso corporal para tren superior.',
    dificultad: 'principiante',
    muscleGroups: ['Pecho', 'Triceps', 'Abdomen']
  },
  {
    nombre: 'Sentadilla',
    descripcion: 'Ejercicio compuesto principal para tren inferior.',
    dificultad: 'intermedio',
    muscleGroups: ['Piernas', 'Gluteos']
  },
  {
    nombre: 'Peso muerto',
    descripcion: 'Ejercicio compuesto para cadena posterior.',
    dificultad: 'avanzado',
    muscleGroups: ['Espalda', 'Piernas', 'Gluteos']
  },
  {
    nombre: 'Remo con barra',
    descripcion: 'Ejercicio de traccion para espalda.',
    dificultad: 'intermedio',
    muscleGroups: ['Espalda', 'Biceps']
  },
  {
    nombre: 'Dominadas',
    descripcion: 'Ejercicio con peso corporal para espalda y brazos.',
    dificultad: 'intermedio',
    muscleGroups: ['Espalda', 'Biceps']
  },
  {
    nombre: 'Press militar',
    descripcion: 'Ejercicio de empuje vertical para hombros.',
    dificultad: 'intermedio',
    muscleGroups: ['Hombros', 'Triceps']
  },
  {
    nombre: 'Curl de biceps',
    descripcion: 'Ejercicio de aislamiento para biceps.',
    dificultad: 'principiante',
    muscleGroups: ['Biceps']
  },
  {
    nombre: 'Extension de triceps',
    descripcion: 'Ejercicio de aislamiento para triceps.',
    dificultad: 'principiante',
    muscleGroups: ['Triceps']
  },
  {
    nombre: 'Plancha',
    descripcion: 'Ejercicio isometrico para abdomen.',
    dificultad: 'principiante',
    muscleGroups: ['Abdomen']
  },
  {
    nombre: 'Zancadas',
    descripcion: 'Ejercicio unilateral para tren inferior.',
    dificultad: 'principiante',
    muscleGroups: ['Piernas', 'Gluteos']
  },
  {
    nombre: 'Burpees',
    descripcion: 'Ejercicio metabolico de cuerpo completo.',
    dificultad: 'intermedio',
    muscleGroups: ['Cardio', 'Cuerpo completo']
  }
];

async function insertExercise(queryInterface, exercise) {
  await queryInterface.sequelize.query(
    `
      INSERT INTO "exercises" ("nombre", "descripcion", "userId", "dificultad", "imagen", "createdAt", "updatedAt")
      SELECT :nombre, :descripcion, NULL, :dificultad, NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
      WHERE NOT EXISTS (
        SELECT 1
        FROM "exercises"
        WHERE "nombre" = :nombre
          AND "userId" IS NULL
      );
    `,
    {
      replacements: {
        nombre: exercise.nombre,
        descripcion: exercise.descripcion,
        dificultad: exercise.dificultad
      }
    }
  );
}

async function linkExerciseMuscleGroup(queryInterface, exerciseName, muscleGroupName) {
  await queryInterface.sequelize.query(
    `
      INSERT INTO "exercise_muscle_groups" ("exerciseId", "muscleGroupId")
      SELECT e."id", mg."id"
      FROM "exercises" e
      INNER JOIN "muscle_groups" mg
        ON mg."nombre" = :muscleGroupName
       AND mg."userId" IS NULL
      WHERE e."nombre" = :exerciseName
        AND e."userId" IS NULL
        AND NOT EXISTS (
          SELECT 1
          FROM "exercise_muscle_groups" emg
          WHERE emg."exerciseId" = e."id"
            AND emg."muscleGroupId" = mg."id"
        );
    `,
    {
      replacements: {
        exerciseName,
        muscleGroupName
      }
    }
  );
}

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    for (const exercise of exercises) {
      await insertExercise(queryInterface, exercise);

      for (const muscleGroupName of exercise.muscleGroups) {
        await linkExerciseMuscleGroup(queryInterface, exercise.nombre, muscleGroupName);
      }
    }
  },

  async down(queryInterface) {
    for (const exercise of exercises) {
      await queryInterface.sequelize.query(
        `
          DELETE FROM "exercise_muscle_groups"
          WHERE "exerciseId" IN (
            SELECT "id"
            FROM "exercises"
            WHERE "nombre" = :nombre
              AND "userId" IS NULL
          );
        `,
        {
          replacements: { nombre: exercise.nombre }
        }
      );

      await queryInterface.sequelize.query(
        `
          DELETE FROM "exercises"
          WHERE "nombre" = :nombre
            AND "userId" IS NULL;
        `,
        {
          replacements: { nombre: exercise.nombre }
        }
      );
    }
  }
};
