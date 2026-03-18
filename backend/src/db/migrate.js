require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const pool = require('../config/db');
const logger = require('../config/logger');

async function migrate() {
    const client = await pool.connect();
    try {
        logger.info('Starting database migration...');

        // Enable pgvector extension
        await client.query('CREATE EXTENSION IF NOT EXISTS vector;');
        logger.info('✅ pgvector extension enabled');

        // Create users table
        await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(100) NOT NULL,
        email VARCHAR(150) UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
        logger.info('✅ users table ready');

        // Create notes table with vector column
        await client.query(`
      CREATE TABLE IF NOT EXISTS notes (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        title VARCHAR(255) NOT NULL DEFAULT '',
        content TEXT NOT NULL DEFAULT '',
        tags TEXT[] DEFAULT '{}',
        embedding VECTOR(1536),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
        logger.info('✅ notes table ready');

        // Create IVFFlat vector index for cosine similarity
        await client.query(`
      CREATE INDEX IF NOT EXISTS notes_embedding_idx
      ON notes
      USING ivfflat (embedding vector_cosine_ops)
      WITH (lists = 100);
    `);
        logger.info('✅ vector index (ivfflat) created');

        // Create updated_at trigger function
        await client.query(`
      CREATE OR REPLACE FUNCTION update_updated_at_column()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = CURRENT_TIMESTAMP;
        RETURN NEW;
      END;
      $$ language 'plpgsql';
    `);

        await client.query(`
      DROP TRIGGER IF EXISTS update_notes_updated_at ON notes;
      CREATE TRIGGER update_notes_updated_at
        BEFORE UPDATE ON notes
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();
    `);
        logger.info('✅ updated_at trigger ready');

        logger.info('🎉 Migration completed successfully!');
    } catch (err) {
        logger.error('Migration failed:', err);
        throw err;
    } finally {
        client.release();
        await pool.end();
    }
}

migrate().catch(() => process.exit(1));
