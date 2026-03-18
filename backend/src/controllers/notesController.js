const { validationResult } = require('express-validator');
const pool = require('../config/db');
const logger = require('../config/logger');
const { generateEmbedding, formatVectorForPg } = require('../services/embeddingService');

async function tryGenerateVectorLiteral(textToEmbed) {
    try {
        const embedding = await generateEmbedding(textToEmbed);
        return { vectorLiteral: formatVectorForPg(embedding), embeddingWarning: null };
    } catch (err) {
        logger.warn(`Embedding skipped: ${err.message}`);
        return {
            vectorLiteral: null,
            embeddingWarning: 'Embedding generation skipped. Note saved, but semantic search may be limited until embeddings are available.',
        };
    }
}

async function runKeywordFallbackSearch({ userId, query, limit, tag }) {
        const like = `%${query}%`;
        let fallbackQuery;
        let params;

        if (tag) {
                fallbackQuery = `
            SELECT id, user_id, title, content, tags, created_at, updated_at
            FROM notes
            WHERE user_id = $1
                AND $3 = ANY(tags)
                AND (title ILIKE $2 OR content ILIKE $2)
            ORDER BY updated_at DESC
            LIMIT $4
        `;
                params = [userId, like, tag, limit];
        } else {
                fallbackQuery = `
            SELECT id, user_id, title, content, tags, created_at, updated_at
            FROM notes
            WHERE user_id = $1
                AND (title ILIKE $2 OR content ILIKE $2)
            ORDER BY updated_at DESC
            LIMIT $3
        `;
                params = [userId, like, limit];
        }

        const result = await pool.query(fallbackQuery, params);
        return result.rows;
}

// POST /api/notes — Create a note
const createNote = async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { title, content, tags = [] } = req.body;
    const userId = req.user.id;

    try {
        const textToEmbed = `${title}\n${content}`;
        const { vectorLiteral, embeddingWarning } = await tryGenerateVectorLiteral(textToEmbed);

        let result;
        if (vectorLiteral) {
            result = await pool.query(
                `INSERT INTO notes (user_id, title, content, tags, embedding)
       VALUES ($1, $2, $3, $4, $5::vector)
       RETURNING id, user_id, title, content, tags, created_at, updated_at`,
                [userId, title, content, tags, vectorLiteral]
            );
        } else {
            result = await pool.query(
                `INSERT INTO notes (user_id, title, content, tags)
       VALUES ($1, $2, $3, $4)
       RETURNING id, user_id, title, content, tags, created_at, updated_at`,
                [userId, title, content, tags]
            );
        }

        logger.info(`Note created by user ${userId}`);
        res.status(201).json({ success: true, note: result.rows[0], ...(embeddingWarning && { embeddingWarning }) });
    } catch (err) {
        logger.error('Create note error:', err);
        res.status(500).json({ success: false, message: err.message || 'Failed to create note' });
    }
};

// GET /api/notes — Get all notes (paginated + tag filter)
const getNotes = async (req, res) => {
    const userId = req.user.id;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 12;
    const offset = (page - 1) * limit;
    const tag = req.query.tag || null;

    try {
        let query, params;

        if (tag) {
            query = `
        SELECT id, user_id, title, content, tags, created_at, updated_at
        FROM notes
        WHERE user_id = $1 AND $2 = ANY(tags)
        ORDER BY updated_at DESC
        LIMIT $3 OFFSET $4
      `;
            params = [userId, tag, limit, offset];
        } else {
            query = `
        SELECT id, user_id, title, content, tags, created_at, updated_at
        FROM notes
        WHERE user_id = $1
        ORDER BY updated_at DESC
        LIMIT $2 OFFSET $3
      `;
            params = [userId, limit, offset];
        }

        const result = await pool.query(query, params);

        // Count total
        const countQuery = tag
            ? 'SELECT COUNT(*) FROM notes WHERE user_id = $1 AND $2 = ANY(tags)'
            : 'SELECT COUNT(*) FROM notes WHERE user_id = $1';
        const countParams = tag ? [userId, tag] : [userId];
        const countResult = await pool.query(countQuery, countParams);
        const total = parseInt(countResult.rows[0].count);

        res.json({
            success: true,
            notes: result.rows,
            pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
        });
    } catch (err) {
        logger.error('Get notes error:', err);
        res.status(500).json({ success: false, message: 'Failed to fetch notes' });
    }
};

// GET /api/notes/:id — Get a single note
const getNoteById = async (req, res) => {
    const { id } = req.params;
    const userId = req.user.id;
    try {
        const result = await pool.query(
            'SELECT id, user_id, title, content, tags, created_at, updated_at FROM notes WHERE id = $1 AND user_id = $2',
            [id, userId]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Note not found' });
        }
        res.json({ success: true, note: result.rows[0] });
    } catch (err) {
        logger.error('Get note error:', err);
        res.status(500).json({ success: false, message: 'Failed to fetch note' });
    }
};

// PUT /api/notes/:id — Update a note (re-embed if content changes)
const updateNote = async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { id } = req.params;
    const userId = req.user.id;
    const { title, content, tags } = req.body;

    try {
        // Check ownership
        const existing = await pool.query(
            'SELECT id, title, content, tags FROM notes WHERE id = $1 AND user_id = $2',
            [id, userId]
        );
        if (existing.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Note not found' });
        }

        const oldNote = existing.rows[0];
        const newTitle = title !== undefined ? title : oldNote.title;
        const newContent = content !== undefined ? content : oldNote.content;

        // Regenerate embedding if title or content changed
        const contentChanged =
            (title !== undefined && title !== oldNote.title) ||
            (content !== undefined && content !== oldNote.content);

        let vectorLiteral = null;
        let embeddingWarning = null;
        if (contentChanged) {
            const textToEmbed = `${newTitle}\n${newContent}`;
            const result = await tryGenerateVectorLiteral(textToEmbed);
            vectorLiteral = result.vectorLiteral;
            embeddingWarning = result.embeddingWarning;
        }

        let result;
        if (vectorLiteral) {
            result = await pool.query(
                `UPDATE notes
         SET title = $1, content = $2, tags = $3, embedding = $4::vector
         WHERE id = $5 AND user_id = $6
         RETURNING id, user_id, title, content, tags, created_at, updated_at`,
                [newTitle, newContent, tags !== undefined ? tags : existing.rows[0].tags, vectorLiteral, id, userId]
            );
        } else {
            result = await pool.query(
                `UPDATE notes
         SET title = $1, content = $2, tags = $3
         WHERE id = $4 AND user_id = $5
         RETURNING id, user_id, title, content, tags, created_at, updated_at`,
                [newTitle, newContent, tags !== undefined ? tags : oldNote.tags, id, userId]
            );
        }

        logger.info(`Note ${id} updated by user ${userId}`);
        res.json({ success: true, note: result.rows[0], ...(embeddingWarning && { embeddingWarning }) });
    } catch (err) {
        logger.error('Update note error:', err);
        res.status(500).json({ success: false, message: err.message || 'Failed to update note' });
    }
};

// DELETE /api/notes/:id — Delete a note
const deleteNote = async (req, res) => {
    const { id } = req.params;
    const userId = req.user.id;
    try {
        const result = await pool.query(
            'DELETE FROM notes WHERE id = $1 AND user_id = $2 RETURNING id',
            [id, userId]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Note not found' });
        }
        logger.info(`Note ${id} deleted by user ${userId}`);
        res.json({ success: true, message: 'Note deleted' });
    } catch (err) {
        logger.error('Delete note error:', err);
        res.status(500).json({ success: false, message: 'Failed to delete note' });
    }
};

// POST /api/notes/search — Semantic similarity search
const searchNotes = async (req, res) => {
    const { query, limit = 10, tag } = req.body;
    const userId = req.user.id;

    if (!query || query.trim() === '') {
        return res.status(400).json({ success: false, message: 'Search query is required' });
    }

    try {
        // Generate embedding for the search query
        const queryEmbedding = await generateEmbedding(query.trim());
        const vectorLiteral = formatVectorForPg(queryEmbedding);

        let searchQuery, params;

        if (tag) {
            searchQuery = `
        SELECT id, user_id, title, content, tags, created_at, updated_at,
          (embedding <=> $1::vector) AS distance
        FROM notes
        WHERE user_id = $2 AND $3 = ANY(tags) AND embedding IS NOT NULL
        ORDER BY embedding <=> $1::vector
        LIMIT $4
      `;
            params = [vectorLiteral, userId, tag, limit];
        } else {
            searchQuery = `
        SELECT id, user_id, title, content, tags, created_at, updated_at,
          (embedding <=> $1::vector) AS distance
        FROM notes
        WHERE user_id = $2 AND embedding IS NOT NULL
        ORDER BY embedding <=> $1::vector
        LIMIT $3
      `;
            params = [vectorLiteral, userId, limit];
        }

        const result = await pool.query(searchQuery, params);

        logger.info(`Semantic search for user ${userId}: "${query}" → ${result.rows.length} results`);
        res.json({
            success: true,
            query,
            results: result.rows.map(row => ({
                ...row,
                similarity: parseFloat((1 - row.distance).toFixed(4)),
            })),
        });
    } catch (err) {
        logger.error('Search error:', err);
        if (err.quotaExceeded || err.status === 429) {
            const fallbackResults = await runKeywordFallbackSearch({ userId, query: query.trim(), limit, tag });
            return res.json({
                success: true,
                query,
                results: fallbackResults,
                fallback: true,
                message: 'Semantic search is unavailable due to OpenAI quota limits. Showing keyword-based results instead.',
            });
        }
        res.status(500).json({ success: false, message: err.message || 'Semantic search failed' });
    }
};

// GET /api/notes/tags — Get all unique tags for the user
const getTags = async (req, res) => {
    const userId = req.user.id;
    try {
        const result = await pool.query(
            `SELECT DISTINCT unnest(tags) AS tag FROM notes WHERE user_id = $1 ORDER BY tag`,
            [userId]
        );
        res.json({ success: true, tags: result.rows.map(r => r.tag) });
    } catch (err) {
        logger.error('Get tags error:', err);
        res.status(500).json({ success: false, message: 'Failed to fetch tags' });
    }
};

module.exports = { createNote, getNotes, getNoteById, updateNote, deleteNote, searchNotes, getTags };
