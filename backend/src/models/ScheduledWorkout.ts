import { DataTypes, Model, Optional, Sequelize } from 'sequelize';

export interface ScheduledWorkoutAttributes {
  id: number;
  programWeekId: number;
  workoutTemplateId: number;
  nombre: string;
  diaSemana?: number | null;
  fechaProgramada?: Date | null;
  orden: number;
  notas?: string | null;
  createdAt?: Date;
  updatedAt?: Date;
}

type ScheduledWorkoutCreationAttributes = Optional<
  ScheduledWorkoutAttributes,
  'id' | 'diaSemana' | 'fechaProgramada' | 'notas' | 'createdAt' | 'updatedAt'
>;

export class ScheduledWorkout extends Model<ScheduledWorkoutAttributes, ScheduledWorkoutCreationAttributes>
  implements ScheduledWorkoutAttributes {
  public id!: number;
  public programWeekId!: number;
  public workoutTemplateId!: number;
  public nombre!: string;
  public diaSemana!: number | null;
  public fechaProgramada!: Date | null;
  public orden!: number;
  public notas!: string | null;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

export function initScheduledWorkoutModel(sequelize: Sequelize): typeof ScheduledWorkout {
  ScheduledWorkout.init(
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      programWeekId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: 'program_weeks',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      workoutTemplateId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: 'workout_templates',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      nombre: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
          notEmpty: true,
          len: [2, 120]
        }
      },
      diaSemana: {
        type: DataTypes.INTEGER,
        allowNull: true,
        validate: {
          min: 1,
          max: 7
        }
      },
      fechaProgramada: {
        type: DataTypes.DATE,
        allowNull: true
      },
      orden: {
        type: DataTypes.INTEGER,
        allowNull: false,
        validate: {
          min: 1
        }
      },
      notas: {
        type: DataTypes.TEXT,
        allowNull: true
      }
    },
    {
      sequelize,
      tableName: 'scheduled_workouts',
      timestamps: true
    }
  );

  return ScheduledWorkout;
}
