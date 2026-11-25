-- Prepara las bases descartables que exigen las suites de integración.
-- Ejecutar UNA sola vez, como administrador, sobre un PostgreSQL 17 de prueba
-- (nunca sobre la base de desarrollo). Ver docs/testing.md.
--
-- Cada suite tiene su propia base y su propio usuario: así una suite no puede
-- leer ni borrar datos de otra, y los tests rechazan cualquier otra conexión.
-- Las contraseñas son solo para este entorno local de pruebas.

CREATE ROLE powerup_migration_test LOGIN PASSWORD 'powerup_test';
CREATE DATABASE powerup_running_migration_test OWNER powerup_migration_test;

CREATE ROLE powerup_auth_test LOGIN PASSWORD 'powerup_test';
CREATE DATABASE powerup_auth_integration_test OWNER powerup_auth_test;

CREATE ROLE powerup_workouts_test LOGIN PASSWORD 'powerup_test';
CREATE DATABASE powerup_workouts_integration_test OWNER powerup_workouts_test;

CREATE ROLE powerup_metrics_test LOGIN PASSWORD 'powerup_test';
CREATE DATABASE powerup_metrics_integration_test OWNER powerup_metrics_test;

CREATE ROLE powerup_routines_test LOGIN PASSWORD 'powerup_test';
CREATE DATABASE powerup_routines_integration_test OWNER powerup_routines_test;

CREATE ROLE powerup_planning_test LOGIN PASSWORD 'powerup_test';
CREATE DATABASE powerup_planning_integration_test OWNER powerup_planning_test;
