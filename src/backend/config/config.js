require('dotenv').config({ path: '.env' });

const config = {
  development: {
    username: 'startup_metrics',
    password: 'startup_metrics_password',
    database: 'startup_metrics_db',
    host: 'localhost',
    port: 5432,
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
    username: 'startup_metrics',
    password: 'startup_metrics_password',
    database: 'startup_metrics_db',
    host: 'localhost',
    port: 5432,
    dialect: 'postgres',
    logging: false
  },
  production: {
    username: 'startup_metrics',
    password: 'startup_metrics_password',
    database: 'startup_metrics_db',
    host: 'localhost',
    port: 5432,
    dialect: 'postgres',
    dialectOptions: {
      ssl: {
        require: true,
        rejectUnauthorized: false
      }
    }
  }
};

module.exports = config; 