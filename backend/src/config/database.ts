import 'dotenv/config';
import { Options } from 'sequelize';

type Environment = 'development' | 'test' | 'production';

type DatabaseConfig = Options & {
    username?: string;
    password?: string;
    database: string;
    url?: string;
};

const baseDatabaseName = process.env.DB_NAME || 'app_database';
const databaseUrl = process.env.DATABASE_URL;
const useSsl = process.env.DB_SSL === 'true' || process.env.NODE_ENV === 'production';

const dialectOptions = useSsl
    ? {
        ssl: {
            require: true,
            rejectUnauthorized: false
        }
        }
    : undefined;

const databaseConfig: Record<Environment, DatabaseConfig> = {
    development: {
        url: databaseUrl,
        username: process.env.DB_USER || 'app_user',
        password: process.env.DB_PASSWORD || 'app_password',
        database: baseDatabaseName,
        host: process.env.DB_HOST || 'localhost',
        port: Number(process.env.DB_PORT) || 5432,
        dialect: 'postgres',
        logging: console.log,
        pool: {
        max: 5,
        min: 0,
        acquire: 30000,
        idle: 10000
        },
        dialectOptions
    },
    test: {
        url: databaseUrl,
        username: process.env.DB_USER || 'app_user',
        password: process.env.DB_PASSWORD || 'app_password',
        database: `${baseDatabaseName}_test`,
        host: process.env.DB_HOST || 'localhost',
        port: Number(process.env.DB_PORT) || 5432,
        dialect: 'postgres',
        logging: false,
        dialectOptions
    },
    production: {
        url: databaseUrl,
        username: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: baseDatabaseName,
        host: process.env.DB_HOST,
        port: Number(process.env.DB_PORT) || 5432,
        dialect: 'postgres',
        logging: false,
        pool: {
            max: 10,
            min: 2,
            acquire: 30000,
            idle: 10000
        },
        dialectOptions
    }
};

export default databaseConfig;
