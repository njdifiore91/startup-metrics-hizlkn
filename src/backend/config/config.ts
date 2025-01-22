import { config } from 'dotenv';
import { Dialect } from 'sequelize';

// Load environment variables
config({ path: '../.env' });

interface DatabaseConfig {
  url: string;
  dialect: Dialect;
  dialectOptions?: {
    ssl?: {
      require: boolean;
      rejectUnauthorized: boolean;
    } | false;
  };
  pool?: {
    max: number;
    min: number;
    acquire: number;
    idle: number;
  };
  logging?: boolean;
}

interface Config {
  development: DatabaseConfig;
  test: DatabaseConfig;
  production: DatabaseConfig;
}

const configuration: Config = {
  development: {
    url: process.env.DATABASE_URL!,
    dialect: 'postgres',
    dialectOptions: {
      ssl: process.env.DATABASE_SSL === 'true' ? {
        require: true,
        rejectUnauthorized: false
      } : false
    },
    pool: {
      max: parseInt(process.env.DATABASE_MAX_CONNECTIONS || '10'),
      min: 0,
      acquire: 30000,
      idle: parseInt(process.env.DATABASE_IDLE_TIMEOUT || '10000')
    }
  },
  test: {
    url: process.env.DATABASE_URL!,
    dialect: 'postgres',
    logging: false
  },
  production: {
    url: process.env.DATABASE_URL!,
    dialect: 'postgres',
    dialectOptions: {
      ssl: {
        require: true,
        rejectUnauthorized: false
      }
    }
  }
};

export default configuration; 