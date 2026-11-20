'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.sequelize.query(`
        ALTER TABLE "workouts"
        ADD CONSTRAINT "workouts_modalidad_check"
        CHECK ("modalidad" IN ('fuerza', 'running'))
      `, { transaction });

      await queryInterface.sequelize.query(`
        ALTER TABLE "workouts"
        ADD CONSTRAINT "workouts_modalidad_datos_check"
        CHECK (
          (
            "modalidad" = 'fuerza'
            AND "distanciaKm" IS NULL
            AND "duracionSegundos" IS NULL
          )
          OR
          (
            "modalidad" = 'running'
            AND "distanciaKm" IS NOT NULL
            AND "distanciaKm" > 0
            AND "distanciaKm" < 'Infinity'::double precision
            AND "duracionSegundos" IS NOT NULL
            AND "duracionSegundos" > 0
            AND "workoutTemplateId" IS NULL
            AND "scheduledWorkoutId" IS NULL
          )
        )
      `, { transaction });
    });
  },

  async down(queryInterface) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.sequelize.query(`
        ALTER TABLE "workouts" DROP CONSTRAINT "workouts_modalidad_datos_check"
      `, { transaction });
      await queryInterface.sequelize.query(`
        ALTER TABLE "workouts" DROP CONSTRAINT "workouts_modalidad_check"
      `, { transaction });
    });
  }
};
