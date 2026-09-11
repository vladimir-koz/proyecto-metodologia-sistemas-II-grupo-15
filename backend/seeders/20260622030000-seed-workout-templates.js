'use strict';

const workoutTemplates = [
  {
    nombre: 'Full body inicial',
    descripcion: 'Plantilla general para empezar a entrenar todo el cuerpo.',
    tipo: 'Full body',
    grupoMuscularEtiqueta: 'Cuerpo completo',
    dificultad: 'principiante',
    tiempoEstimado: 45,
    exercises: [
      { rirObjetivo: 2, rpeObjetivo: 8, exerciseName: 'Sentadilla', orden: 1, repeticiones: 12, peso: null },
      { rirObjetivo: 2, rpeObjetivo: 8, exerciseName: 'Flexiones', orden: 2, repeticiones: 10, peso: null },
      { rirObjetivo: 2, rpeObjetivo: 8, exerciseName: 'Remo con barra', orden: 3, repeticiones: 10, peso: null },
      { rirObjetivo: 2, rpeObjetivo: 8, exerciseName: 'Plancha', orden: 4, repeticiones: 1, peso: null }
    ]
  },
  {
    nombre: 'Fuerza tren superior',
    descripcion: 'Plantilla enfocada en empujes y tracciones de tren superior.',
    tipo: 'Fuerza',
    grupoMuscularEtiqueta: 'Tren superior',
    dificultad: 'intermedio',
    tiempoEstimado: 60,
    exercises: [
      { rirObjetivo: 2, rpeObjetivo: 8, exerciseName: 'Press de banca', orden: 1, repeticiones: 8, peso: null },
      { rirObjetivo: 2, rpeObjetivo: 8, exerciseName: 'Remo con barra', orden: 2, repeticiones: 8, peso: null },
      { rirObjetivo: 2, rpeObjetivo: 8, exerciseName: 'Press militar', orden: 3, repeticiones: 10, peso: null },
      { rirObjetivo: 2, rpeObjetivo: 8, exerciseName: 'Dominadas', orden: 4, repeticiones: 8, peso: null }
    ]
  },
  {
    nombre: 'Piernas y gluteos',
    descripcion: 'Plantilla para tren inferior con ejercicios bilaterales y unilaterales.',
    tipo: 'Hipertrofia',
    grupoMuscularEtiqueta: 'Piernas',
    dificultad: 'intermedio',
    tiempoEstimado: 55,
    exercises: [
      { rirObjetivo: 2, rpeObjetivo: 8, exerciseName: 'Sentadilla', orden: 1, repeticiones: 10, peso: null },
      { rirObjetivo: 2, rpeObjetivo: 8, exerciseName: 'Peso muerto', orden: 2, repeticiones: 8, peso: null },
      { rirObjetivo: 2, rpeObjetivo: 8, exerciseName: 'Zancadas', orden: 3, repeticiones: 12, peso: null },
      { rirObjetivo: 2, rpeObjetivo: 8, exerciseName: 'Plancha', orden: 4, repeticiones: 1, peso: null }
    ]
  }
];

async function insertWorkoutTemplate(queryInterface, workoutTemplate) {
  await queryInterface.sequelize.query(
    `
      INSERT INTO "workout_templates" (
        "nombre",
        "descripcion",
        "tipo",
        "userId",
        "grupoMuscularEtiqueta",
        "dificultad",
        "tiempoEstimado",
        "createdAt",
        "updatedAt"
      )
      SELECT
        :nombre,
        :descripcion,
        :tipo,
        NULL,
        :grupoMuscularEtiqueta,
        :dificultad,
        :tiempoEstimado,
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
      WHERE NOT EXISTS (
        SELECT 1
        FROM "workout_templates"
        WHERE "nombre" = :nombre
          AND "userId" IS NULL
      );
    `,
    {
      replacements: {
        nombre: workoutTemplate.nombre,
        descripcion: workoutTemplate.descripcion,
        tipo: workoutTemplate.tipo,
        grupoMuscularEtiqueta: workoutTemplate.grupoMuscularEtiqueta,
        dificultad: workoutTemplate.dificultad,
        tiempoEstimado: workoutTemplate.tiempoEstimado
      }
    }
  );
}

async function insertWorkoutTemplateExercise(queryInterface, workoutTemplateName, workoutTemplateExercise) {
  await queryInterface.sequelize.query(
    `
      INSERT INTO "workout_template_exercises" (
        "workoutTemplateId",
        "exerciseId",
        "orden",
        "repeticiones",
        "peso",
        "rirObjetivo",
        "rpeObjetivo",
        "createdAt",
        "updatedAt"
      )
      SELECT
        wt."id",
        e."id",
        :orden,
        :repeticiones,
        :peso,
        :rirObjetivo,
        :rpeObjetivo,
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
      FROM "workout_templates" wt
      INNER JOIN "exercises" e
        ON e."nombre" = :exerciseName
       AND e."userId" IS NULL
      WHERE wt."nombre" = :workoutTemplateName
        AND wt."userId" IS NULL
        AND NOT EXISTS (
          SELECT 1
          FROM "workout_template_exercises" wte
          WHERE wte."workoutTemplateId" = wt."id"
            AND wte."orden" = :orden
        );
    `,
    {
      replacements: {
        workoutTemplateName,
        exerciseName: workoutTemplateExercise.exerciseName,
        orden: workoutTemplateExercise.orden,
        repeticiones: workoutTemplateExercise.repeticiones,
        peso: workoutTemplateExercise.peso,
        rirObjetivo: workoutTemplateExercise.rirObjetivo,
        rpeObjetivo: workoutTemplateExercise.rpeObjetivo
      }
    }
  );
}

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    for (const workoutTemplate of workoutTemplates) {
      await insertWorkoutTemplate(queryInterface, workoutTemplate);

      for (const workoutTemplateExercise of workoutTemplate.exercises) {
        await insertWorkoutTemplateExercise(queryInterface, workoutTemplate.nombre, workoutTemplateExercise);
      }
    }
  },

  async down(queryInterface) {
    for (const workoutTemplate of workoutTemplates) {
      await queryInterface.sequelize.query(
        `
          DELETE FROM "workout_template_exercises"
          WHERE "workoutTemplateId" IN (
            SELECT "id"
            FROM "workout_templates"
            WHERE "nombre" = :nombre
              AND "userId" IS NULL
          );
        `,
        {
          replacements: { nombre: workoutTemplate.nombre }
        }
      );

      await queryInterface.sequelize.query(
        `
          DELETE FROM "workout_templates"
          WHERE "nombre" = :nombre
            AND "userId" IS NULL;
        `,
        {
          replacements: { nombre: workoutTemplate.nombre }
        }
      );
    }
  }
};
