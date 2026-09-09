'use strict';

const program = {
  nombre: 'Hipertrofia base 4 semanas',
  descripcion: 'Programa global de ejemplo con tres entrenamientos por semana.',
  objetivo: 'Ganar masa muscular y mejorar tecnica general',
  weeks: [
    { numeroSemana: 1, nombre: 'Semana 1', objetivo: 'Adaptacion', esDescarga: false },
    { numeroSemana: 2, nombre: 'Semana 2', objetivo: 'Subir volumen', esDescarga: false },
    { numeroSemana: 3, nombre: 'Semana 3', objetivo: 'Semana fuerte', esDescarga: false },
    { numeroSemana: 4, nombre: 'Semana 4 - descarga', objetivo: 'Bajar fatiga', esDescarga: true }
  ],
  scheduledWorkouts: [
    { numeroSemana: 1, nombre: 'Dia 1 - Full body', templateName: 'Full body inicial', diaSemana: 1, orden: 1 },
    { numeroSemana: 1, nombre: 'Dia 2 - Tren superior', templateName: 'Fuerza tren superior', diaSemana: 3, orden: 2 },
    { numeroSemana: 1, nombre: 'Dia 3 - Piernas', templateName: 'Piernas y gluteos', diaSemana: 5, orden: 3 },
    { numeroSemana: 2, nombre: 'Dia 1 - Full body', templateName: 'Full body inicial', diaSemana: 1, orden: 1 },
    { numeroSemana: 2, nombre: 'Dia 2 - Tren superior', templateName: 'Fuerza tren superior', diaSemana: 3, orden: 2 },
    { numeroSemana: 2, nombre: 'Dia 3 - Piernas', templateName: 'Piernas y gluteos', diaSemana: 5, orden: 3 },
    { numeroSemana: 3, nombre: 'Dia 1 - Full body', templateName: 'Full body inicial', diaSemana: 1, orden: 1 },
    { numeroSemana: 3, nombre: 'Dia 2 - Tren superior', templateName: 'Fuerza tren superior', diaSemana: 3, orden: 2 },
    { numeroSemana: 3, nombre: 'Dia 3 - Piernas', templateName: 'Piernas y gluteos', diaSemana: 5, orden: 3 },
    { numeroSemana: 4, nombre: 'Dia 1 - Full body liviano', templateName: 'Full body inicial', diaSemana: 1, orden: 1 },
    { numeroSemana: 4, nombre: 'Dia 2 - Tren superior liviano', templateName: 'Fuerza tren superior', diaSemana: 3, orden: 2 },
    { numeroSemana: 4, nombre: 'Dia 3 - Piernas liviano', templateName: 'Piernas y gluteos', diaSemana: 5, orden: 3 }
  ]
};

async function insertProgram(queryInterface) {
  await queryInterface.sequelize.query(
    `
      INSERT INTO "training_programs" (
        "nombre",
        "descripcion",
        "objetivo",
        "userId",
        "estado",
        "createdAt",
        "updatedAt"
      )
      SELECT
        :nombre,
        :descripcion,
        :objetivo,
        NULL,
        'activo',
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
      WHERE NOT EXISTS (
        SELECT 1
        FROM "training_programs"
        WHERE "nombre" = :nombre
          AND "userId" IS NULL
      );
    `,
    {
      replacements: {
        nombre: program.nombre,
        descripcion: program.descripcion,
        objetivo: program.objetivo
      }
    }
  );
}

async function insertWeeks(queryInterface) {
  for (const week of program.weeks) {
    await queryInterface.sequelize.query(
      `
        INSERT INTO "program_weeks" (
          "trainingProgramId",
          "numeroSemana",
          "nombre",
          "objetivo",
          "esDescarga",
          "createdAt",
          "updatedAt"
        )
        SELECT
          tp."id",
          :numeroSemana,
          :nombre,
          :objetivo,
          :esDescarga,
          CURRENT_TIMESTAMP,
          CURRENT_TIMESTAMP
        FROM "training_programs" tp
        WHERE tp."nombre" = :programName
          AND tp."userId" IS NULL
          AND NOT EXISTS (
            SELECT 1
            FROM "program_weeks" pw
            WHERE pw."trainingProgramId" = tp."id"
              AND pw."numeroSemana" = :numeroSemana
          );
      `,
      {
        replacements: {
          programName: program.nombre,
          numeroSemana: week.numeroSemana,
          nombre: week.nombre,
          objetivo: week.objetivo,
          esDescarga: week.esDescarga
        }
      }
    );
  }
}

async function insertScheduledWorkouts(queryInterface) {
  for (const scheduledWorkout of program.scheduledWorkouts) {
    await queryInterface.sequelize.query(
      `
        INSERT INTO "scheduled_workouts" (
          "programWeekId",
          "workoutTemplateId",
          "nombre",
          "diaSemana",
          "orden",
          "createdAt",
          "updatedAt"
        )
        SELECT
          pw."id",
          wt."id",
          :nombre,
          :diaSemana,
          :orden,
          CURRENT_TIMESTAMP,
          CURRENT_TIMESTAMP
        FROM "training_programs" tp
        INNER JOIN "program_weeks" pw
          ON pw."trainingProgramId" = tp."id"
         AND pw."numeroSemana" = :numeroSemana
        INNER JOIN "workout_templates" wt
          ON wt."nombre" = :templateName
         AND wt."userId" IS NULL
        WHERE tp."nombre" = :programName
          AND tp."userId" IS NULL
          AND NOT EXISTS (
            SELECT 1
            FROM "scheduled_workouts" sw
            WHERE sw."programWeekId" = pw."id"
              AND sw."orden" = :orden
          );
      `,
      {
        replacements: {
          programName: program.nombre,
          numeroSemana: scheduledWorkout.numeroSemana,
          templateName: scheduledWorkout.templateName,
          nombre: scheduledWorkout.nombre,
          diaSemana: scheduledWorkout.diaSemana,
          orden: scheduledWorkout.orden
        }
      }
    );
  }
}

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    await insertProgram(queryInterface);
    await insertWeeks(queryInterface);
    await insertScheduledWorkouts(queryInterface);
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query(
      `
        DELETE FROM "scheduled_workouts"
        WHERE "programWeekId" IN (
          SELECT pw."id"
          FROM "program_weeks" pw
          INNER JOIN "training_programs" tp
            ON tp."id" = pw."trainingProgramId"
          WHERE tp."nombre" = :programName
            AND tp."userId" IS NULL
        );
      `,
      { replacements: { programName: program.nombre } }
    );

    await queryInterface.sequelize.query(
      `
        DELETE FROM "program_weeks"
        WHERE "trainingProgramId" IN (
          SELECT "id"
          FROM "training_programs"
          WHERE "nombre" = :programName
            AND "userId" IS NULL
        );
      `,
      { replacements: { programName: program.nombre } }
    );

    await queryInterface.sequelize.query(
      `
        DELETE FROM "training_programs"
        WHERE "nombre" = :programName
          AND "userId" IS NULL;
      `,
      { replacements: { programName: program.nombre } }
    );
  }
};
