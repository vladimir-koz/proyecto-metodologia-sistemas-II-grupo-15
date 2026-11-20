'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.addColumn('workouts', 'modalidad', {
        type: Sequelize.STRING(20),
        allowNull: false,
        defaultValue: 'fuerza'
      }, { transaction });

      await queryInterface.addColumn('workouts', 'distanciaKm', {
        type: Sequelize.DOUBLE,
        allowNull: true
      }, { transaction });

      await queryInterface.addColumn('workouts', 'duracionSegundos', {
        type: Sequelize.INTEGER,
        allowNull: true
      }, { transaction });
    });
  },

  async down(queryInterface) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.removeColumn('workouts', 'duracionSegundos', { transaction });
      await queryInterface.removeColumn('workouts', 'distanciaKm', { transaction });
      await queryInterface.removeColumn('workouts', 'modalidad', { transaction });
    });
  }
};
