import bcrypt from 'bcryptjs';
import {
    DataTypes,
    Model,
    Optional,
    Sequelize
} from 'sequelize';

export interface UserAttributes {
    id: number;
    nombre: string;
    email: string;
    password: string;
    createdAt?: Date;
    updatedAt?: Date;
}

type UserCreationAttributes = Optional<UserAttributes, 'id' | 'createdAt' | 'updatedAt'>;

export class User extends Model<UserAttributes, UserCreationAttributes> implements UserAttributes {
    public id!: number;
    public nombre!: string;
    public email!: string;
    public password!: string;
    public readonly createdAt!: Date;
    public readonly updatedAt!: Date;

    public async validarPassword(password: string): Promise<boolean> {
        return bcrypt.compare(password, this.password);
    }

    public toJSON(): Record<string, unknown> {
        const values = { ...this.get() } as Record<string, unknown>;
        delete values.password;
        return values;
    }
}

export function initUserModel(sequelize: Sequelize): typeof User {
    User.init(
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
        email: {
            type: DataTypes.STRING,
            allowNull: false,
            unique: true,
            validate: {
            isEmail: true
            }
        },
        password: {
            type: DataTypes.STRING,
            allowNull: false,
            validate: {
            len: [6, 255]
            }
        }
        },
        {
        sequelize,
        tableName: 'users',
        timestamps: true,
        hooks: {
            beforeCreate: async (user: User) => {
            user.password = await bcrypt.hash(user.password, 10);
            },
            beforeUpdate: async (user: User) => {
            if (user.changed('password')) {
                user.password = await bcrypt.hash(user.password, 10);
            }
            }
        }
        }
    );
    return User;
}
