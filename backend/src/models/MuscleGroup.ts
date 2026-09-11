import { DataTypes, Model, Optional, Sequelize } from 'sequelize';

export interface MuscleGroupAttributes {
  id: number;
  nombre: string;
  userId?: number | null;
  createdAt?: Date;
  updatedAt?: Date;
}

type MuscleGroupCreationAttributes = Optional<
  MuscleGroupAttributes,
  'id' | 'userId' | 'createdAt' | 'updatedAt'
>;

export class MuscleGroup
  extends Model<MuscleGroupAttributes, MuscleGroupCreationAttributes>
  implements MuscleGroupAttributes {
  public id!: number;
  public nombre!: string;
  public userId!: number | null;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

export function initMuscleGroupModel(sequelize: Sequelize): typeof MuscleGroup {
  MuscleGroup.init(
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
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
        allowNull: true
      }
    },
    {
      sequelize,
      tableName: 'muscle_groups',
      timestamps: true
    }
  );

  return MuscleGroup;
}
