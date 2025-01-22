import { Sequelize } from 'sequelize';
import { logger } from '../utils/logger';

const sequelize = new Sequelize(process.env.DATABASE_URL!, {
  dialect: 'postgres',
  logging: (msg) => logger.debug(msg),
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
});

export default sequelize;