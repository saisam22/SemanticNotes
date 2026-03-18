const OpenAI = require('openai');
const logger = require('../config/logger');

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Generate a 1536-dimensional embedding for the given text
 * using OpenAI text-embedding-ada-002.
 * @param {string} text
 * @returns {Promise<number[]>}
 */
async function generateEmbedding(text) {
    try {
        const input = text.replace(/\n/g, ' ').trim();
        if (!input) throw new Error('Cannot embed empty text');

        const response = await openai.embeddings.create({
            model: 'text-embedding-ada-002',
            input,
        });

        return response.data[0].embedding;
    } catch (err) {
        logger.error('Embedding generation failed:', err);
        const status = err.status || err.code || null;
        const quotaExceeded = status === 429 || /quota|billing|rate limit/i.test(err.message || '');
        const wrappedError = new Error(
            quotaExceeded
                ? 'OpenAI quota exceeded. Update billing/quota or use a different API key.'
                : 'Failed to generate embedding: ' + err.message
        );
        wrappedError.status = status;
        wrappedError.quotaExceeded = quotaExceeded;
        throw wrappedError;
    }
}

/**
 * Format a JavaScript number[] array as a PostgreSQL vector literal.
 * e.g. [0.1, 0.2, ...] → '[0.1,0.2,...]'
 */
function formatVectorForPg(embedding) {
    return `[${embedding.join(',')}]`;
}

module.exports = { generateEmbedding, formatVectorForPg };
