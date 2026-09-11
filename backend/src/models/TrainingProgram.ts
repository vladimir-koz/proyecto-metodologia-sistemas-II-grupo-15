import { DataTypes, Model, Optional, Sequelize } from 'sequelize';

export interface TrainingProgramAttributes {
  id: number;
  nombre: string;
  descripcion?: string | null;
  objetivo?: string | null;
  userId?: number | null;
  fechaInicio?: Date | null;
  fechaFin?: Date | null;
  estado?: string | null;
  createdAt?: Date;
  updatedAt?: Date;
}

type TrainingProgramCreationAttributes = Optional<
  TrainingProgramAttributes,
  'id' | 'descripcion' | 'objetivo' | 'userId' | 'fechaInicio' | 'fechaFin' | 'estado' | 'createdAt' | 'updatedAt'
>;

export class TrainingProgram extends Model<TrainingProgramAttributes, TrainingProgramCreationAttributes>
  implements TrainingProgramAttributes {
  public id!: number;
  public nombre!: string;
  public descripcion!: string | null;
  public objetivo!: string | null;
  public userId!: number | null;
  public fechaInicio!: Date | null;
  public fechaFin!: Date | null;
  public estado!: string | null;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

export function initTrainingProgramModel(sequelize: Sequelize): typeof TrainingProgram {
  TrainingProgram.init(
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
      descripcion: {
        type: DataTypes.TEXT,
        allowNull: true
      },
      objetivo: {
        type: DataTypes.STRING,
        allowNull: true
      },
      userId: {
        type: DataTypes.INTEGER,
        allowNull: true
      },
      fechaInicio: {
        type: DataTypes.DATE,
        allowNull: true
      },
      fechaFin: {
        type: DataTypes.DATE,
        allowNull: true
      },
      estado: {
        type: DataTypes.STRING,
        allowNull: true,
        defaultValue: 'activo'
      }
    },
    {
      sequelize,
      tableName: 'training_programs',
      timestamps: true
    }
  );

  return TrainingProgram;
}
