import {
    DataTypes,
    Model,
    Optional,
    Sequelize
} from 'sequelize';

export type ExerciseDifficulty = 'principiante' | 'intermedio' | 'avanzado';

export interface ExerciseAttributes {
    id: number;
    nombre: string;
    descripcion?: string | null;
    userId?: number | null;
    dificultad?: ExerciseDifficulty | null;
    imagen?: string | null;
    createdAt?: Date;
    updatedAt?: Date;
}

type ExerciseCreationAttributes = Optional<
    ExerciseAttributes,
    'id' | 'descripcion' | 'userId' | 'dificultad' | 'imagen' | 'createdAt' | 'updatedAt'
>;

export class Exercise extends Model<ExerciseAttributes, ExerciseCreationAttributes> implements ExerciseAttributes {
    public id!: number;
    public nombre!: string;
    public descripcion!: string | null;
    public userId!: number | null;
    public dificultad!: ExerciseDifficulty | null;
    public imagen!: string | null;
    public readonly createdAt!: Date;
    public readonly updatedAt!: Date;
}

export function initExerciseModel(sequelize: Sequelize): typeof Exercise {
    Exercise.init(
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
                    len: [2, 100]
                }
            },
            descripcion: {
                type: DataTypes.TEXT,
                allowNull: true
            },
            userId: {
                type: DataTypes.INTEGER,
                allowNull: true
            },
            dificultad: {
                type: DataTypes.STRING,
                allowNull: true,
                validate: {
                    isIn: [['principiante', 'intermedio', 'avanzado']]
                }
            },
            imagen: {
                type: DataTypes.STRING,
                allowNull: true
            }
        },
        {
            sequelize,
            tableName: 'exercises',
            timestamps: true
        }
    );

    return Exercise;
}
