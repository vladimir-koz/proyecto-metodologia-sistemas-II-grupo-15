import { DataTypes, Model, Sequelize } from 'sequelize';

export interface ExerciseMuscleGroupAttributes {
  exerciseId: number;
  muscleGroupId: number;
}

export class ExerciseMuscleGroup
  extends Model<ExerciseMuscleGroupAttributes>
  implements ExerciseMuscleGroupAttributes {
  public exerciseId!: number;
  public muscleGroupId!: number;
}

export function initExerciseMuscleGroupModel(sequelize: Sequelize): typeof ExerciseMuscleGroup {
  ExerciseMuscleGroup.init(
    {
      exerciseId: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        allowNull: false
      },
      muscleGroupId: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        allowNull: false
      }
    },
    {
      sequelize,
      tableName: 'exercise_muscle_groups',
      timestamps: false
    }
  );

  return ExerciseMuscleGroup;
}
