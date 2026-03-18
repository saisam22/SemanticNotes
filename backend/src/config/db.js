const { Pool } = require('pg');
const logger = require('./logger');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
});

pool.on('connect', () => {
    logger.info('PostgreSQL connected');
});

pool.on('error', (err) => {
    logger.error('Unexpected PostgreSQL error', err);
    process.exit(-1);
});

module.exports = pool;
