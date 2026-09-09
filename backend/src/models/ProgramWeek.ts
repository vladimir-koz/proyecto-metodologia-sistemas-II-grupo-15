import { DataTypes, Model, Optional, Sequelize } from 'sequelize';

export interface ProgramWeekAttributes {
  id: number;
  trainingProgramId: number;
  numeroSemana: number;
  nombre?: string | null;
  objetivo?: string | null;
  notas?: string | null;
  esDescarga: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

type ProgramWeekCreationAttributes = Optional<
  ProgramWeekAttributes,
  'id' | 'nombre' | 'objetivo' | 'notas' | 'esDescarga' | 'createdAt' | 'updatedAt'
>;

export class ProgramWeek extends Model<ProgramWeekAttributes, ProgramWeekCreationAttributes>
  implements ProgramWeekAttributes {
  public id!: number;
  public trainingProgramId!: number;
  public numeroSemana!: number;
  public nombre!: string | null;
  public objetivo!: string | null;
  public notas!: string | null;
  public esDescarga!: boolean;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

export function initProgramWeekModel(sequelize: Sequelize): typeof ProgramWeek {
  ProgramWeek.init(
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      trainingProgramId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: 'training_programs',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      numeroSemana: {
        type: DataTypes.INTEGER,
        allowNull: false,
        validate: {
          min: 1
        }
      },
      nombre: {
        type: DataTypes.STRING,
        allowNull: true
      },
      objetivo: {
        type: DataTypes.STRING,
        allowNull: true
      },
      notas: {
        type: DataTypes.TEXT,
        allowNull: true
      },
      esDescarga: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false
      }
    },
    {
      sequelize,
      tableName: 'program_weeks',
      timestamps: true
    }
  );

  return ProgramWeek;
}
