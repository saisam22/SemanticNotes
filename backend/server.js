require('dotenv').config();
const app = require('./src/app');
const logger = require('./src/config/logger');
const pool = require('./src/config/db');

const PORT = process.env.PORT || 5000;

async function startServer() {
  try {
    await pool.query('SELECT 1');
    logger.info('✅ PostgreSQL connection verified');

    app.listen(PORT, () => {
      logger.info(`🚀 Server running on port ${PORT} in ${process.env.NODE_ENV} mode`);
    });
  } catch (err) {
    logger.error('❌ Failed to connect to PostgreSQL at startup', err);
    process.exit(1);
  }
}

startServer();
