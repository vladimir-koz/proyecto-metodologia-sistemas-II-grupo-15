import { DataTypes, Model, Optional, Sequelize } from 'sequelize';

export interface WorkoutSetAttributes {
  id: number;
  repeticiones: number;
  peso: number;
  rir?: number | null;
  rpe?: number | null;
  exerciseId: number;
  workoutId: number;
  createdAt?: Date;
  updatedAt?: Date;
}

type WorkoutSetCreationAttributes = Optional<WorkoutSetAttributes, 'id' | 'rir' | 'rpe' | 'createdAt' | 'updatedAt'>;

export class WorkoutSet
  extends Model<WorkoutSetAttributes, WorkoutSetCreationAttributes>
  implements WorkoutSetAttributes {
  public id!: number;
  public repeticiones!: number;
  public peso!: number;
  public rir!: number | null;
  public rpe!: number | null;
  public exerciseId!: number;
  public workoutId!: number;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

export function initWorkoutSetModel(sequelize: Sequelize): typeof WorkoutSet {
  WorkoutSet.init(
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      repeticiones: {
        type: DataTypes.INTEGER,
        allowNull: false,
        validate: {
          min: 1
        }
      },
      peso: {
        type: DataTypes.FLOAT,
        allowNull: false,
        validate: {
          min: 0
        }
      },
      rir: {
        type: DataTypes.INTEGER,
        allowNull: true,
        validate: {
          min: 0,
          max: 10
        }
      },
      rpe: {
        type: DataTypes.FLOAT,
        allowNull: true,
        validate: {
          min: 1,
          max: 10
        }
      },
      exerciseId: {
        type: DataTypes.INTEGER,
        allowNull: false
      },
      workoutId: {
        type: DataTypes.INTEGER,
        allowNull: false
      }
    },
    {
      sequelize,
      tableName: 'workout_sets',
      timestamps: true
    }
  );

  return WorkoutSet;
}
