import { DataTypes, Model, Optional, Sequelize } from 'sequelize';

export interface WorkoutAttributes {
  id: number;
  timestamp: Date;
  nombre: string;
  userId: number;
  grupoMuscularEtiqueta?: string | null;
  workoutTemplateId?: number | null;
  scheduledWorkoutId?: number | null;
  createdAt?: Date;
  updatedAt?: Date;
}

type WorkoutCreationAttributes = Optional<
  WorkoutAttributes,
  'id' | 'timestamp' | 'grupoMuscularEtiqueta' | 'workoutTemplateId' | 'scheduledWorkoutId' | 'createdAt' | 'updatedAt'
>;

export class Workout extends Model<WorkoutAttributes, WorkoutCreationAttributes>
  implements WorkoutAttributes {
  public id!: number;
  public timestamp!: Date;
  public nombre!: string;
  public userId!: number;
  public grupoMuscularEtiqueta!: string | null;
  public workoutTemplateId!: number | null;
  public scheduledWorkoutId!: number | null;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

export function initWorkoutModel(sequelize: Sequelize): typeof Workout {
  Workout.init(
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      timestamp: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
      },
      nombre: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
          notEmpty: true,
          len: [2, 120]
        }
      },
      userId: {
        type: DataTypes.INTEGER,
        allowNull: false
      },
      grupoMuscularEtiqueta: {
        type: DataTypes.STRING,
        allowNull: true
      },
      workoutTemplateId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
          model: 'workout_templates',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      scheduledWorkoutId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
          model: 'scheduled_workouts',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      }
    },
    {
      sequelize,
      tableName: 'workouts',
      timestamps: true
    }
  );

  return Workout;
}
