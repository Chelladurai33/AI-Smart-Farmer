require('dotenv').config();
const { execSync } = require('child_process');
const path = require('path');
const logger = require('../utils/logger');

async function main() {
  const dbUrl = process.env.DATABASE_URL;

  if (!dbUrl) {
    logger.warn('⚠️  DATABASE_URL is not set in Environment Variables!');
    logger.warn('👉 Please set DATABASE_URL in your Render Dashboard -> Environment tab.');
  } else {
    logger.info('🔄 Synchronizing database schema with Prisma...');
    try {
      execSync('npx prisma db push --accept-data-loss', {
        stdio: 'inherit',
        cwd: path.resolve(__dirname, '../../'),
        env: { ...process.env },
        timeout: 25000,
      });
      logger.info('✅ Database schema is up to date.');
    } catch (err) {
      logger.error('⚠️  Prisma database sync failed: ' + (err.message || err));
      logger.info('ℹ️  Starting server anyway. Check DATABASE_URL and database connectivity in Render.');
    }
  }

  // Start the Express app
  require('../index');
}

main();
