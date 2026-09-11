import {
    DataTypes,
    Model,
    Optional,
    Sequelize
} from 'sequelize';

export interface WorkoutTemplateAttributes {
    id: number;
    nombre: string;
    descripcion?: string | null;
    tipo?: string | null;
    userId?: number | null;
    grupoMuscularEtiqueta?: string | null;
    dificultad?: string | null;
    tiempoEstimado?: number | null;
    createdAt?: Date;
    updatedAt?: Date;
}

type WorkoutTemplateCreationAttributes = Optional<
    WorkoutTemplateAttributes,
    'id' | 'descripcion' | 'tipo' | 'userId' | 'grupoMuscularEtiqueta' | 'dificultad' | 'tiempoEstimado' | 'createdAt' | 'updatedAt'
>;

export class WorkoutTemplate extends Model<WorkoutTemplateAttributes, WorkoutTemplateCreationAttributes> implements WorkoutTemplateAttributes {
    public id!: number;
    public nombre!: string;
    public descripcion!: string | null;
    public tipo!: string | null;
    public userId!: number | null;
    public grupoMuscularEtiqueta!: string | null;
    public dificultad!: string | null;
    public tiempoEstimado!: number | null;
    public readonly createdAt!: Date;
    public readonly updatedAt!: Date;
}

export function initWorkoutTemplateModel(sequelize: Sequelize): typeof WorkoutTemplate {
    WorkoutTemplate.init(
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
            tipo: {
                type: DataTypes.STRING,
                allowNull: true
            },
            userId: {
                type: DataTypes.INTEGER,
                allowNull: true
            },
            grupoMuscularEtiqueta: {
                type: DataTypes.STRING,
                allowNull: true
            },
            dificultad: {
                type: DataTypes.STRING,
                allowNull: true
            },
            tiempoEstimado: {
                type: DataTypes.INTEGER,
                allowNull: true
            }
        },
        {
            sequelize,
            tableName: 'workout_templates',
            timestamps: true
        }
    );

    return WorkoutTemplate;
}
