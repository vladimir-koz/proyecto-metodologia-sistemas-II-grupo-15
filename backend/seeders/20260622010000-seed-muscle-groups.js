'use strict';

const muscleGroups = [
  'Pecho',
  'Espalda',
  'Piernas',
  'Hombros',
  'Biceps',
  'Triceps',
  'Abdomen',
  'Gluteos',
  'Cardio',
  'Cuerpo completo'
];

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    for (const nombre of muscleGroups) {
      await queryInterface.sequelize.query(
        `
          INSERT INTO "muscle_groups" ("nombre", "userId", "createdAt", "updatedAt")
          SELECT :nombre, NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
          WHERE NOT EXISTS (
            SELECT 1
            FROM "muscle_groups"
            WHERE "nombre" = :nombre
              AND "userId" IS NULL
          );
        `,
        {
          replacements: { nombre }
        }
      );
    }
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete('muscle_groups', {
      nombre: muscleGroups,
      userId: null
    });
  }
};
