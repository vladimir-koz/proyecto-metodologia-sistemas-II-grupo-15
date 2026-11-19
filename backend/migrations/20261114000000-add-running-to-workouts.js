'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('workouts', 'modalidad', {
      type: Sequelize.STRING(20),
      allowNull: false,
      defaultValue: 'fuerza'
    });

    await queryInterface.addColumn('workouts', 'distanciaKm', {
      type: Sequelize.DOUBLE,
      allowNull: true
    });

    await queryInterface.addColumn('workouts', 'duracionSegundos', {
      type: Sequelize.INTEGER,
      allowNull: true
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('workouts', 'duracionSegundos');
    await queryInterface.removeColumn('workouts', 'distanciaKm');
    await queryInterface.removeColumn('workouts', 'modalidad');
  }
};